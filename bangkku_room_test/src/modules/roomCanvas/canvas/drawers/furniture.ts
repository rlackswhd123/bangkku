// furniture.ts: 바닥 가구를 캔버스에 도형으로 그리는 드로어
import { PlacedFurniture } from '../../models/furniture';
import { ScaleInfo } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';

// 이미지 경로별로 1회만 로드하도록 캐시
const furnitureImageCache = new Map<string, HTMLImageElement>();
const getCachedImage = (src: string | undefined | null): HTMLImageElement | null => {
  if (!src) return null;
  const cached = furnitureImageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  furnitureImageCache.set(src, img);
  return img;
};

export function drawFurniture(ctx: CanvasRenderingContext2D, furniture: PlacedFurniture, scaleInfo: ScaleInfo) {
  const xPx = mmToPxX(furniture.xMm, scaleInfo);
  const widthPx = furniture.widthMm * scaleInfo.scaleX;

  const bottomPx = mmToPxY(furniture.yMm, scaleInfo);
  const topPx = mmToPxY(furniture.yMm + furniture.heightMm, scaleInfo);
  const heightPx = bottomPx - topPx;

  // 이미지가 있으면 이미지 렌더링, 없으면 기존 박스 렌더링
  const furnitureImage = furniture.image ? getCachedImage(furniture.image) : null;

  if (furnitureImage && furnitureImage.complete && furnitureImage.naturalWidth > 0 && furnitureImage.naturalHeight > 0) {
    // 이미지 렌더링
    ctx.drawImage(
      furnitureImage,
      0,
      0,
      furnitureImage.naturalWidth,
      furnitureImage.naturalHeight,
      xPx,
      topPx,
      widthPx,
      heightPx
    );
  } else {
    // Fallback: 기존 박스 렌더링
    ctx.save();
    ctx.fillStyle = 'rgba(0, 122, 255, 0.2)';
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.fillRect(xPx, topPx, widthPx, heightPx);
    ctx.strokeRect(xPx, topPx, widthPx, heightPx);

    ctx.fillStyle = '#0a0a0a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(furniture.name || `가구 ${furniture.prodKey}`, xPx + widthPx / 2, topPx + heightPx / 2);
    ctx.restore();
  }
}

export function drawGhostFurniture(ctx: CanvasRenderingContext2D, furniture: PlacedFurniture, ghostXMm: number, scaleInfo: ScaleInfo) {
  const ghostFurniture = { ...furniture, xMm: ghostXMm };
  const xPx = mmToPxX(ghostFurniture.xMm, scaleInfo);
  const widthPx = ghostFurniture.widthMm * scaleInfo.scaleX;

  const bottomPx = mmToPxY(ghostFurniture.yMm, scaleInfo);
  const topPx = mmToPxY(ghostFurniture.yMm + ghostFurniture.heightMm, scaleInfo);
  const heightPx = bottomPx - topPx;

  const furnitureImage = furniture.image ? getCachedImage(furniture.image) : null;

  ctx.save();

  if (furnitureImage && furnitureImage.complete && furnitureImage.naturalWidth > 0 && furnitureImage.naturalHeight > 0) {
    // 고스트 이미지: 반투명하게 렌더링
    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      furnitureImage,
      0,
      0,
      furnitureImage.naturalWidth,
      furnitureImage.naturalHeight,
      xPx,
      topPx,
      widthPx,
      heightPx
    );
  } else {
    // Fallback: 점선 박스만 표시
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(xPx, topPx, widthPx, heightPx);
  }

  ctx.restore();
}
