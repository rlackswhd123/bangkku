import { Pillar, ScaleInfo, Shelf } from '../../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';
import { CornerImages, ShelfImages } from '../../hooks/useImageAssets';

export function drawShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  shelfImages: ShelfImages
) {
  const startPillar = pillars.find((p) => p.id === shelf.startPillarId);
  const endPillar = pillars.find((p) => p.id === shelf.endPillarId);
  if (!startPillar || !endPillar) return;

  const startX = mmToPxX(startPillar.xMm, scaleInfo);
  const endX = mmToPxX(endPillar.xMm, scaleInfo);
  const shelfY = mmToPxY(shelf.heightMm, scaleInfo);
  const shelfWidth = endX - startX;

  const shelfType = shelf.type || 'normal';
  const shelfImage = shelfImages[shelfType];

  let fixedShelfHeight: number;
  if (shelfType === 'normal') {
    fixedShelfHeight = Math.max(scaleInfo.redRect.height * 0.04, 20);
  } else {
    fixedShelfHeight = Math.max(scaleInfo.redRect.height * 0.08, 30);
  }

  if (shelfImage && shelfImage.complete && shelfImage.naturalWidth > 0 && shelfImage.naturalHeight > 0) {
    const drawWidth = shelfWidth;
    const drawHeight = fixedShelfHeight;
    const drawX = startX;
    const drawY = shelfY - drawHeight / 2;

    ctx.drawImage(
      shelfImage,
      0,
      0,
      shelfImage.naturalWidth,
      shelfImage.naturalHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
    return;
  }

  const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;
  const shelfCenterX = (startX + endX) / 2;

  ctx.fillStyle = '#CD853F';
  ctx.fillRect(startX, shelfY - shelfThickness / 2, shelfWidth, shelfThickness);

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, shelfY - shelfThickness / 2, shelfWidth, shelfThickness);

  if (shelfType === 'hanger') {
    const triangleSize = 30;
    const triangleY = shelfY + shelfThickness / 2;

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(shelfCenterX, triangleY);
    ctx.lineTo(shelfCenterX - triangleSize / 2, triangleY + triangleSize);
    ctx.lineTo(shelfCenterX + triangleSize / 2, triangleY + triangleSize);
    ctx.closePath();
    ctx.fill();
  } else if (shelfType === 'drawer') {
    const drawerSize = Math.min(shelfWidth * 0.6, 40);
    const drawerX = shelfCenterX - drawerSize / 2;
    const drawerY = shelfY - shelfThickness / 2 - drawerSize;

    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(drawerX, drawerY, drawerSize, drawerSize);
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawerX, drawerY, drawerSize, drawerSize);

    const circleRadius = drawerSize * 0.15;
    const circleCenterX = drawerX + drawerSize / 2;
    const circleCenterY = drawerY + drawerSize / 2;
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawGhostShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  shelfImages: ShelfImages
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawShelf(ctx, shelf, pillars, scaleInfo, shelfImages);
  ctx.restore();
}

export function drawCornerShelfImages(
  ctx: CanvasRenderingContext2D,
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  roomWidthMm: number,
  cornerImages: CornerImages
) {
  const { redRect } = scaleInfo;
  const cornerPillars = pillars.filter((p) => p.cornerPillar && p.type !== 'wall');

  for (const cornerPillar of cornerPillars) {
    const isLeft = cornerPillar.xMm < roomWidthMm / 2;
    const startPillarX = mmToPxX(cornerPillar.xMm, scaleInfo);

    const sortedPillars = pillars.filter((p) => p.type !== 'wall').sort((a, b) => a.xMm - b.xMm);
    const pillarIndex = sortedPillars.findIndex((p) => p.id === cornerPillar.id);
    let pairPillar: Pillar | null = null;

    if (pillarIndex > 0) {
      pairPillar = sortedPillars[pillarIndex - 1];
    } else if (pillarIndex < sortedPillars.length - 1) {
      pairPillar = sortedPillars[pillarIndex + 1];
    }

    if (!pairPillar) continue;

    const endPillarX = mmToPxX(pairPillar.xMm, scaleInfo);
    const shelfStartX = Math.min(startPillarX, endPillarX);
    const shelfEndX = Math.max(startPillarX, endPillarX);
    const shelfWidth = shelfEndX - shelfStartX;

    const topImageY = redRect.y;
    const bottomImageY = redRect.y + redRect.height;

    const topImage = isLeft ? cornerImages[111] : cornerImages[333];
    const bottomImage = isLeft ? cornerImages[222] : cornerImages[444];

    const fixedImageHeight = Math.max(redRect.height * 0.08, 20);

    const drawCornerImage = (image: HTMLImageElement | null, isTop: boolean) => {
      if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return;
      }

      const drawWidth = shelfWidth;
      const drawHeight = fixedImageHeight;
      const drawX = shelfStartX;
      const drawY = isTop ? topImageY : bottomImageY - drawHeight;

      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, drawX, drawY, drawWidth, drawHeight);
    };

    drawCornerImage(topImage, true);
    drawCornerImage(bottomImage, false);
  }
}

