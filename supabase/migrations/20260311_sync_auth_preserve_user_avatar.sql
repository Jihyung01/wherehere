-- 사용자가 앱에서 설정한 프로필 사진을 Auth/카카오가 덮어쓰지 않도록: 이미 값이 있으면 유지

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER AS $$
DECLARE
  new_display_name TEXT;
  new_avatar TEXT;
  meta JSONB;
  cur_avatar TEXT;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);

  new_display_name := COALESCE(
    meta->>'full_name',
    meta->>'name',
    meta->>'display_name',
    meta->>'user_name',
    meta->'kakao_account'->'profile'->>'nickname',
    meta->'provider_meta'->>'name'
  );

  new_avatar := COALESCE(
    meta->>'avatar_url',
    meta->>'picture',
    meta->>'profile_image_url',
    meta->'kakao_account'->'profile'->>'profile_image_url',
    meta->'kakao_account'->'profile'->>'thumbnail_image_url'
  );

  SELECT profile_image_url INTO cur_avatar FROM public.users WHERE id = NEW.id;

  UPDATE public.users
  SET
    display_name = COALESCE(NULLIF(TRIM(new_display_name), ''), display_name),
    profile_image_url = CASE
      WHEN cur_avatar IS NOT NULL AND TRIM(cur_avatar) <> '' THEN cur_avatar
      WHEN new_avatar IS NOT NULL AND TRIM(new_avatar) <> '' THEN new_avatar
      ELSE profile_image_url
    END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
