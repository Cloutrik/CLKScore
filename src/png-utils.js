export function boxDownscale({ data, width, height }, targetSize) {
  if (width <= targetSize && height <= targetSize) return { data, width, height };
  const scale = targetSize / Math.max(width, height);
  const newW = Math.max(1, Math.round(width * scale));
  const newH = Math.max(1, Math.round(height * scale));
  const out = Buffer.alloc(newW * newH * 4);

  for (let ny = 0; ny < newH; ny++) {
    const sy0 = Math.floor((ny / newH) * height);
    const sy1 = Math.max(sy0 + 1, Math.floor(((ny + 1) / newH) * height));
    for (let nx = 0; nx < newW; nx++) {
      const sx0 = Math.floor((nx / newW) * width);
      const sx1 = Math.max(sx0 + 1, Math.floor(((nx + 1) / newW) * width));
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const idx = (sy * width + sx) * 4;
          const alpha = data[idx + 3];
          r += data[idx] * alpha;
          g += data[idx + 1] * alpha;
          b += data[idx + 2] * alpha;
          a += alpha;
          count++;
        }
      }
      const outIdx = (ny * newW + nx) * 4;
      if (a > 0) {
        out[outIdx] = Math.round(r / a);
        out[outIdx + 1] = Math.round(g / a);
        out[outIdx + 2] = Math.round(b / a);
      }
      out[outIdx + 3] = Math.round(a / count);
    }
  }
  return { data: out, width: newW, height: newH };
}
