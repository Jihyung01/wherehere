-- Storage 버킷 "uploads" 업로드/읽기 정책
-- 버킷이 이미 있고 Policies가 0개일 때 "업로드 권한이 없어요" 해결용.
-- Supabase 대시보드 > SQL Editor에서 이 파일 내용 붙여넣고 Run.

DROP POLICY IF EXISTS "Allow uploads to posts folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update in posts folder" ON storage.objects;

-- 1) 업로드 허용: anon + authenticated → uploads 버킷의 posts/ 폴더
CREATE POLICY "Allow uploads to posts folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = 'posts'
);

-- 2) 읽기 허용: 누구나 uploads 버킷 파일 조회 (public 버킷용)
CREATE POLICY "Allow public read uploads bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- 3) 업데이트(덮어쓰기) 허용: upsert 시 필요
CREATE POLICY "Allow update in posts folder"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'posts')
WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'posts');
