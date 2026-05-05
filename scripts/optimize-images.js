import sharp from 'sharp'
import { readdirSync } from 'fs'
import { join, extname, basename } from 'path'

const assetsDir = join(process.cwd(), 'landing', 'assets')

// Max display widths at 2x retina for each image group
const sizeMap = {
  'scroll1.png': 812,
  'scroll2.png': 812,
  'scroll3.png': 812,
  'phone1.png': 530,
  'phone2.png': 530,
  'phone3.png': 530,
  'logo.png': 74,
}

const files = readdirSync(assetsDir).filter(f => extname(f) === '.png')

for (const file of files) {
  const src = join(assetsDir, file)
  const dest = join(assetsDir, basename(file, '.png') + '.webp')
  const maxWidth = sizeMap[file]

  try {
    const pipeline = sharp(src).webp({ quality: 82 })
    if (maxWidth) pipeline.resize({ width: maxWidth, withoutEnlargement: true })
    await pipeline.toFile(dest)
    console.log(`✓ ${file} → ${basename(dest)}`)
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`)
  }
}
