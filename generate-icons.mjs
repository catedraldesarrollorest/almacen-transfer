import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/logo.svg')

async function generate() {
  // 192x192
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile('./public/pwa-192x192.png')
  console.log('Created pwa-192x192.png')

  // 512x512
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile('./public/pwa-512x512.png')
  console.log('Created pwa-512x512.png')

  // apple-touch-icon 180x180
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon.png')
  console.log('Created apple-touch-icon.png')

  // favicon 32x32
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile('./public/favicon-32.png')
  console.log('Created favicon-32.png')
}

generate().catch(console.error)
