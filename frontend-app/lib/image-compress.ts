/**
 * 클라이언트 이미지 압축 - Vercel 4.5MB body 제한 대응
 * 최대 1600px, 품질 0.85, 4MB 이하로 리사이즈
 */

const MAX_DIM = 1600
const MAX_BYTES = 4 * 1024 * 1024 // 4MB
const DEFAULT_QUALITY = 0.85
const MIN_QUALITY = 0.5

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= MAX_BYTES) return file

  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) {
          h = Math.round((h * MAX_DIM) / w)
          w = MAX_DIM
        } else {
          w = Math.round((w * MAX_DIM) / h)
          h = MAX_DIM
        }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)

      let quality = DEFAULT_QUALITY
      const tryBlob = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            if (blob.size <= MAX_BYTES || quality <= MIN_QUALITY) {
              const name = file.name.replace(/\.[^.]+$/, '.jpg')
              resolve(new File([blob], name, { type: 'image/jpeg' }))
              return
            }
            quality -= 0.1
            tryBlob()
          },
          'image/jpeg',
          quality
        )
      }
      tryBlob()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}
