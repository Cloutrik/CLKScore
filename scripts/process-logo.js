import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { boxDownscale } from '../src/png-utils.js';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const inputPath = process.argv[2] ?? path.join(rootDir, 'assets', 'cloutrik-logo-source.png');
const outputPath = process.argv[3] ?? path.join(rootDir, 'assets', 'cloutrik-logo.png');
const maxSize = Number(process.argv[4] ?? 220);

const DARK_FLOOR = 12;
const DARK_CEIL = 60;

function removeBlackBackground(png) {
  const { data, width, height } = png;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const maxC = Math.max(r, g, b);
    let alphaScale = 1;
    if (maxC <= DARK_FLOOR) alphaScale = 0;
    else if (maxC < DARK_CEIL) alphaScale = (maxC - DARK_FLOOR) / (DARK_CEIL - DARK_FLOOR);
    data[i + 3] = Math.round(data[i + 3] * alphaScale);
  }
  return { data, width, height };
}

function boundingBox({ data, width, height }) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function crop({ data, width, height }, { minX, minY, maxX, maxY }, padding = 4) {
  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const x1 = Math.min(width - 1, maxX + padding);
  const y1 = Math.min(height - 1, maxY + padding);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const srcStart = ((y0 + y) * width + x0) * 4;
    data.copy(out, y * cw * 4, srcStart, srcStart + cw * 4);
  }
  return { data: out, width: cw, height: ch };
}

async function main() {
  const buf = await readFile(inputPath);
  const png = PNG.sync.read(buf);

  const withoutBg = removeBlackBackground(png);
  const box = boundingBox(withoutBg);
  const cropped = crop(withoutBg, box);
  const resized = boxDownscale(cropped, maxSize);

  const out = new PNG({ width: resized.width, height: resized.height });
  resized.data.copy(out.data);
  const outBuf = PNG.sync.write(out);
  await writeFile(outputPath, outBuf);

  console.log(`OK: ${inputPath} (${png.width}x${png.height}) -> ${outputPath} (${resized.width}x${resized.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
