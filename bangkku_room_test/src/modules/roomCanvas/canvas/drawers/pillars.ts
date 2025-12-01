// pillars.ts: 기둥 본체 및 고스트 기둥을 캔버스에 그리는 함수 모음
import { Pillar, ScaleInfo, PillarImages } from '../../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../../types';
import { mmToPxX } from '../../../../utils/coordinates';
import { useRoomStore } from '../../store';

export function drawPillar(
  ctx: CanvasRenderingContext2D,
  pillar: Pillar,
  scaleInfo: ScaleInfo,
  pillarImages?: PillarImages
) {
  const { redRect } = scaleInfo;
  const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
  const pillarX = mmToPxX(pillar.x, scaleInfo) - pillarWidthPx / 2;
  const pillarY = redRect.y;
  const pillarHeight = redRect.height;

  const pillarStyle = pillar.pillarStyle || 'RS';
  const store = useRoomStore();
  const pillarStyleColors = store.settings.value.pillarStyleColors;
  let pillarColor: string;
  switch (pillarStyle) {
    case 'RS':
      pillarColor = pillarStyleColors.RS;
      break;
    case 'CS':
      pillarColor = pillarStyleColors.CS;
      break;
    case 'DU':
      pillarColor = pillarStyleColors.DU;
      break;
    default:
      pillarColor = pillarStyleColors.default;
  }

  const img = pillarImages ? pillarImages[pillarStyle] : null;
  if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    ctx.drawImage(img, pillarX, pillarY, pillarWidthPx, pillarHeight);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(pillarX, pillarY, pillarWidthPx, pillarHeight);
  } else {
    ctx.fillStyle = pillarColor;
    ctx.fillRect(pillarX, pillarY, pillarWidthPx, pillarHeight);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(pillarX, pillarY, pillarWidthPx, pillarHeight);
  }
}

export function drawGhostPillar(
  ctx: CanvasRenderingContext2D,
  pillar: Pillar,
  scaleInfo: ScaleInfo,
  pillarImages?: PillarImages
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawPillar(ctx, pillar, scaleInfo, pillarImages);
  ctx.restore();
}
