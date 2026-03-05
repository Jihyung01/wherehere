/**
 * 인스타그램 스토리/피드 공유용 카드 이미지 생성 (canvas)
 * - 스토리: 1080 x 1920
 * - 피드: 1080 x 1350 (4:5)
 * Web Share API(파일) 또는 다운로드 + 캡션 복사
 */

export type StoryCardOptions = {
  title: string
  body: string
  imageUrl?: string
  placeLine?: string
  moodLine?: string
  ratingLine?: string
  commentLines?: string[]
}

export type FeedCardOptions = {
  title: string
  body: string
  imageUrl?: string
  placeLine?: string
  moodLine?: string
  ratingLine?: string
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = String(text).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  let line = ''
  let offsetY = y
  let count = 0
  for (const word of words) {
    if (count >= maxLines) break
    const test = line ? line + ' ' + word : word
    const metrics = ctx.measureText(test)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, offsetY)
      line = word
      offsetY += lineHeight
      count += 1
    } else {
      line = test
    }
  }
  if (line && count < maxLines) {
    ctx.fillText(line, x, offsetY)
    count += 1
  }
  return count
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 이미지 비율 유지하며 영역을 가득 채움(cover). 잘리는 부분은 중앙 기준 크롭 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  const scale = Math.max(dw / iw, dh / ih)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

/** 스토리 크기 1080 x 1920 PNG Blob */
export async function makeStoryCard(options: StoryCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0f1722'
  ctx.fillRect(0, 0, 1080, 1920)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#ffbe5c')
  gradient.addColorStop(1, '#4fd28b')
  ctx.fillStyle = gradient
  ctx.fillRect(60, 80, 960, 8)
  ctx.fillStyle = '#f3f7fb'
  ctx.font = '700 54px sans-serif'
  ctx.fillText('WHEREHERE', 80, 180)

  let y = 260
  const image = await loadImage(options.imageUrl || '')
  if (image) {
    ctx.save()
    roundRect(ctx, 80, y, 920, 540, 28)
    ctx.clip()
    drawImageCover(ctx, image, 80, y, 920, 540)
    ctx.restore()
    y += 620
  }

  ctx.font = 'italic 82px serif'
  const titleLines = wrapText(ctx, options.title, 80, y, 920, 94, 3)
  y += titleLines * 94 + 40
  ctx.font = '400 40px sans-serif'
  ctx.fillStyle = '#b8c6d5'
  const bodyLines = wrapText(ctx, options.body, 80, y, 900, 60, 5)
  y += bodyLines * 60 + 24

  if (options.placeLine) {
    ctx.fillStyle = '#ffbe5c'
    ctx.font = '600 34px sans-serif'
    const placeLines = wrapText(ctx, options.placeLine, 80, y, 900, 48, 2)
    y += placeLines * 48 + 16
  }
  if (options.moodLine) {
    ctx.fillStyle = '#b8c6d5'
    ctx.font = '500 30px sans-serif'
    wrapText(ctx, options.moodLine, 80, y, 900, 40, 1)
    y += 44
  }
  if (options.ratingLine) {
    ctx.fillStyle = '#ffbe5c'
    ctx.font = '600 28px sans-serif'
    ctx.fillText(options.ratingLine, 80, y)
    y += 40
  }
  if (options.commentLines?.length) {
    ctx.fillStyle = '#f3f7fb'
    ctx.font = '700 30px sans-serif'
    ctx.fillText('실제 댓글', 80, y)
    y += 48
    ctx.fillStyle = '#b8c6d5'
    ctx.font = '400 28px sans-serif'
    options.commentLines.slice(0, 2).forEach((line) => {
      const n = wrapText(ctx, '• ' + line, 80, y, 900, 40, 2)
      y += n * 40 + 16
    })
  }

  ctx.fillStyle = '#ffbe5c'
  ctx.font = '600 38px sans-serif'
  ctx.fillText('공유하고 인스타그램에서 바로 올려보세요', 80, 1680)
  ctx.fillStyle = '#f3f7fb'
  ctx.font = '500 28px sans-serif'
  const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://wherehere.app/'
  wrapText(ctx, appUrl, 80, 1740, 900, 38, 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png'
    )
  })
}

/** 피드 크기 1080 x 1350 (4:5) PNG Blob */
export async function makeFeedCard(options: FeedCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0f1722'
  ctx.fillRect(0, 0, 1080, 1350)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#ffbe5c')
  gradient.addColorStop(1, '#4fd28b')
  ctx.fillStyle = gradient
  ctx.fillRect(60, 60, 960, 6)
  ctx.fillStyle = '#f3f7fb'
  ctx.font = '700 42px sans-serif'
  ctx.fillText('WHEREHERE', 80, 130)

  let y = 200
  const image = await loadImage(options.imageUrl || '')
  if (image) {
    ctx.save()
    roundRect(ctx, 80, y, 920, 460, 24)
    ctx.clip()
    drawImageCover(ctx, image, 80, y, 920, 460)
    ctx.restore()
    y += 520
  }
  ctx.font = 'italic 56px serif'
  const titleLines = wrapText(ctx, options.title, 80, y, 920, 64, 2)
  y += titleLines * 64 + 24
  ctx.font = '400 32px sans-serif'
  ctx.fillStyle = '#b8c6d5'
  wrapText(ctx, options.body, 80, y, 900, 44, 4)
  let bottomY = 1180
  if (options.placeLine) {
    ctx.fillStyle = '#ffbe5c'
    ctx.font = '600 28px sans-serif'
    ctx.fillText(options.placeLine, 80, bottomY)
    bottomY += 36
  }
  if (options.moodLine) {
    ctx.fillStyle = '#b8c6d5'
    ctx.font = '500 24px sans-serif'
    ctx.fillText(options.moodLine, 80, bottomY)
    bottomY += 32
  }
  if (options.ratingLine) {
    ctx.fillStyle = '#ffbe5c'
    ctx.font = '600 24px sans-serif'
    ctx.fillText(options.ratingLine, 80, bottomY)
  }
  ctx.fillStyle = '#f3f7fb'
  ctx.font = '500 24px sans-serif'
  const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://wherehere.app/'
  ctx.fillText(appUrl, 80, 1280)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png'
    )
  })
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: 'image/png' })
}

/** 캡션 생성 (게시글 공유용) */
export function makeCaption(post: { title: string; body?: string; place_name?: string; place_address?: string }): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://wherehere.app/'
  return [
    post.title,
    post.body || '',
    post.place_name ? `📍 ${post.place_name}` : '',
    post.place_address ? `   ${post.place_address}` : '',
    '#동네생활 #wherehere #맛집 #카페',
    appUrl,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * 카드 파일 공유: Web Share(파일) 시도 → 실패 시 다운로드 + 캡션 복사
 */
export async function shareOrDownload(options: {
  file: File
  caption: string
  filename?: string
  onToast?: (msg: string) => void
}): Promise<void> {
  const { file, caption, filename = 'wherehere-card.png', onToast = (m) => alert(m) } = options
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'WhereHere',
        text: caption,
      })
      onToast('공유 시트에서 인스타그램을 선택해 공유하세요.')
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  try {
    await navigator.clipboard.writeText(caption)
    onToast('카드를 저장했어요. 인스타에 올릴 때 캡션을 붙여넣기 하세요.')
  } catch {
    onToast('카드를 저장했어요. 캡션은 수동으로 복사해 주세요.')
  }
}
