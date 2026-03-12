-- Auth(관리 패널)의 display name / 프로필 사진이 갱신될 때 public.users에 반영
-- → 피드 API가 public.users를 읽으므로, 여기서 동기화해야 피드에 실제 이름이 노출됨

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER AS $$
DECLARE
  new_display_name TEXT;
  new_avatar TEXT;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);

  -- display_name: Auth/카카오 등에서 오는 값 우선
  new_display_name := COALESCE(
    meta->>'full_name',
    meta->>'name',
    meta->>'display_name',
    meta->>'user_name',
    meta->'kakao_account'->'profile'->>'nickname',
    meta->'provider_meta'->>'name'
  );

  -- profile_image_url
  new_avatar := COALESCE(
    meta->>'avatar_url',
    meta->>'picture',
    meta->>'profile_image_url',
    meta->'kakao_account'->'profile'->>'profile_image_url',
    meta->'kakao_account'->'profile'->>'thumbnail_image_url'
  );

  UPDATE public.users
  SET
    display_name = COALESCE(NULLIF(TRIM(new_display_name), ''), display_name),
    profile_image_url = CASE WHEN new_avatar IS NOT NULL AND TRIM(new_avatar) <> '' THEN new_avatar ELSE profile_image_url END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users가 업데이트될 때마다(재로그인, 메타데이터 갱신 등) public.users 동기화
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_to_public();

-- 기존 사용자: public.users에 이미 행이 있지만 display_name이 비어있거나 'Explorer'인 경우 Auth 값으로 한 번 갱신
UPDATE public.users p
SET
  display_name = COALESCE(
    NULLIF(TRIM(COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->'kakao_account'->'profile'->>'nickname'
    )), ''),
    p.display_name
  ),
  profile_image_url = COALESCE(
    NULLIF(TRIM(COALESCE(
      u.raw_user_meta_data->>'avatar_url',
      u.raw_user_meta_data->>'picture',
      u.raw_user_meta_data->'kakao_account'->'profile'->>'profile_image_url'
    )), ''),
    p.profile_image_url
  )
FROM auth.users u
WHERE p.id = u.id
  AND (p.display_name IS NULL OR p.display_name = 'Explorer');
