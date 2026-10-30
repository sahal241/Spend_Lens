import sharp from "sharp";
import { readFile } from "node:fs/promises";
const svg = await readFile("public/logo.svg");
for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icon-${size}.png`);
  const inner = await sharp(svg)
    .resize(Math.round(size * 0.68), Math.round(size * 0.68))
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#4F46E5" },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(`public/maskable-${size}.png`);
}
await sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png");
