import { parseLevelData } from '@/files/LevelData.ts';
import { WAD } from '@/files/WAD.ts';
import { decodePatch } from '@/graphics/Patch.ts';
import { WallTextures } from '@/graphics/WallTextures.ts';

export function debugFlat(name: string) {
  const dataRaw = WAD.getEntry(name);
  const palette = new Uint8Array(WAD.getEntry('PLAYPAL')!);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.position = 'fixed';
  canvas.style.top = '16px';
  canvas.style.left = '16px';
  canvas.style.border = '1px solid #000';
  canvas.style.width = `${canvas.width * 4}px`;
  canvas.style.height = `${canvas.width * 4}px`;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const view = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (dataRaw) {
    const data = new Uint8Array(dataRaw);
    for (let i = 0; i < 4096; i++) {
      const v = i * 4;
      const p = data[i] * 3;
      view.data[v] = palette[p];
      view.data[v + 1] = palette[p + 1];
      view.data[v + 2] = palette[p + 2];
      view.data[v + 3] = 255;
    }
  }
  ctx.putImageData(view, 0, 0);
}

export function debugPatch(name: string) {
  const data = decodePatch(name);
  if (!data) {
    return;
  }
  const palette = new Uint8Array(WAD.getEntry('PLAYPAL')!);

  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.position = 'fixed';
  canvas.style.top = '16px';
  canvas.style.left = '16px';
  canvas.style.border = '1px solid #000';
  canvas.style.width = `${canvas.width * 4}px`;
  canvas.style.height = `${canvas.height * 4}px`;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const view = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < data.colorMap.length; i++) {
    const v = i * 4;
    const p = data.colorMap[i] * 3;
    view.data[v] = palette[p];
    view.data[v + 1] = palette[p + 1];
    view.data[v + 2] = palette[p + 2];
    view.data[v + 3] = data.alphaMap[i] > 0 ? 255 : 0;
  }
  ctx.putImageData(view, 0, 0);
}

export function debugWallTexture(name: string) {
  const data = WallTextures.getRawTexture(name);
  if (!data) {
    return;
  }
  const palette = new Uint8Array(WAD.getEntry('PLAYPAL')!);

  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.position = 'fixed';
  canvas.style.top = '16px';
  canvas.style.left = '16px';
  canvas.style.border = '1px solid #000';
  canvas.style.width = `${canvas.width * 4}px`;
  canvas.style.height = `${canvas.height * 4}px`;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const view = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < data.colorMap.length; i++) {
    const v = i * 4;
    const p = data.colorMap[i] * 3;
    view.data[v] = palette[p];
    view.data[v + 1] = palette[p + 1];
    view.data[v + 2] = palette[p + 2];
    view.data[v + 3] = data.alphaMap[i] > 0 ? 255 : 0;
  }
  ctx.putImageData(view, 0, 0);
}

export function debugLevel(
  name: string,
  debugSize: number = Math.min(1000, window.innerHeight - 32),
) {
  const data = parseLevelData(name);
  if (!data) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = debugSize * window.devicePixelRatio;
  canvas.height = debugSize * window.devicePixelRatio;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.position = 'fixed';
  canvas.style.top = '16px';
  canvas.style.left = '16px';
  canvas.style.border = '1px solid #000';
  canvas.style.width = `${debugSize}px`;
  canvas.style.height = `${debugSize}px`;
  document.body.appendChild(canvas);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of data.vertices) {
    minX = Math.min(v.x, minX);
    minY = Math.min(v.y, minY);
    maxX = Math.max(v.x, maxX);
    maxY = Math.max(v.y, maxY);
  }
  const scaleFactor = debugSize / Math.max(maxX - minX, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  for (const v of data.vertices) {
    v.x = (v.x - centerX) * scaleFactor + debugSize * 0.5;
    v.y = (v.y - centerY) * scaleFactor + debugSize * 0.5;
  }

  const draw = (sectorID: number) => {
    const g = canvas.getContext('2d')!;
    g.resetTransform();
    g.scale(window.devicePixelRatio, window.devicePixelRatio);
    g.clearRect(0, 0, debugSize, debugSize);
    g.strokeStyle = '#fff';

    const drawSector = (id: number, active: boolean, groups: boolean) => {
      if (groups) {
        for (let j = 0; j < data.sectors[id].vertexLoops.length; j++) {
          g.strokeStyle = data.sectors[id].vertexLoops[j].parent === null ? '#0f0' : '#04d';
          g.beginPath();
          for (let i = 0; i < data.sectors[id].vertexLoops[j].indices.length; i++) {
            const v = data.sectors[id].vertexLoops[j].indices[i];
            g[i === 0 ? 'moveTo' : 'lineTo'](data.vertices[v].x, data.vertices[v].y);
          }
          g.closePath();
          g.stroke();
        }
      } else {
        for (const ldef of data.lineDefs) {
          let needDraw = false;
          if (ldef.sideDef1 !== -1) {
            needDraw = data.sideDefs[ldef.sideDef1].sector === id;
          }
          if (ldef.sideDef2 !== -1 && !needDraw) {
            needDraw = data.sideDefs[ldef.sideDef2].sector === id;
          }
          if (needDraw) {
            g.strokeStyle = active ? '#fff' : '#777';
            g.beginPath();
            g.moveTo(data.vertices[ldef.v1].x, data.vertices[ldef.v1].y);
            g.lineTo(data.vertices[ldef.v2].x, data.vertices[ldef.v2].y);
            g.stroke();
          }
        }
      }
    };

    for (let i = 0; i < data.sectors.length; i++) {
      if (i !== currentSector) {
        drawSector(i, currentSector === -1, false);
      }
    }
    if (currentSector !== -1) {
      drawSector(currentSector, true, true);

      // const sideDefsIDs = Array(data.sideDefs.length)
      //   .fill(0)
      //   .map((_, idx) => idx)
      //   .filter((idx) => data.sideDefs[idx].sector === sectorID);
      // const lineDefs = [...data.lineDefs].filter(
      //   (ld) => sideDefsIDs.includes(ld.sideDef1) || sideDefsIDs.includes(ld.sideDef2),
      // );

      // for (const ld of lineDefs) {
      //
      // }
      // console.debug(
      //   lineDefs,
      //   sideDefsIDs.map((v) => data.sideDefs[v]),
      // );
    }

    g.fillStyle = '#fff';
    g.font = '16px sans-serif';
    g.fillText(
      sectorID === -1 ? 'All sectors' : `Sector ${sectorID} / ${data.sectors.length - 1}`,
      10,
      debugSize - 10,
    );
  };

  let currentSector = -1;
  draw(currentSector);

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp') {
      currentSector = Math.min(currentSector + 1, data.sectors.length - 1);
    } else if (ev.key === 'ArrowDown') {
      currentSector = Math.max(currentSector - 1, -1);
    }
    draw(currentSector);
  });
}
