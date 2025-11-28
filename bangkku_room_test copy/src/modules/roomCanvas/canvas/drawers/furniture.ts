// furniture.ts: 바닥 가구를 캔버스에 도형으로 그리는 드로어
import { PlacedFurniture } from '../../models/furniture';
import { ScaleInfo } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';

export function drawFurniture(ctx: CanvasRenderingContext2D, furniture: PlacedFurniture, scaleInfo: ScaleInfo) {
  const xPx = mmToPxX(furniture.xMm, scaleInfo);
  const widthPx = furniture.widthMm * scaleInfo.scaleX;

  const bottomPx = mmToPxY(furniture.yMm, scaleInfo);
  const topPx = mmToPxY(furniture.yMm + furniture.heightMm, scaleInfo);
  const heightPx = bottomPx - topPx;

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

export function drawGhostFurniture(ctx: CanvasRenderingContext2D, furniture: PlacedFurniture, ghostXMm: number, scaleInfo: ScaleInfo) {
  const ghostFurniture = { ...furniture, xMm: ghostXMm };
  const xPx = mmToPxX(ghostFurniture.xMm, scaleInfo);
  const widthPx = ghostFurniture.widthMm * scaleInfo.scaleX;

  const bottomPx = mmToPxY(ghostFurniture.yMm, scaleInfo);
  const topPx = mmToPxY(ghostFurniture.yMm + ghostFurniture.heightMm, scaleInfo);
  const heightPx = bottomPx - topPx;

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(0, 122, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(xPx, topPx, widthPx, heightPx);
  ctx.restore();
}
