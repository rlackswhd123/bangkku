// shelves.ts: 선반/코너장 이미지를 캔버스에 렌더하고 고스트 상태를 처리
import { Pillar, ScaleInfo, Section, Shelf, FURNITURE_DIMENSIONS } from '../../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';
import { CornerImages, ShelfImages } from '../../hooks/useImageAssets';

// 이미지 경로별로 1회만 로드하도록 캐시
const shelfImageCache = new Map<string, HTMLImageElement>();
const getCachedImage = (src: string | undefined | null): HTMLImageElement | null => {
  if (!src) return null;
  const cached = shelfImageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  shelfImageCache.set(src, img);
  return img;
};

export function drawShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  sections: Section[],
  scaleInfo: ScaleInfo,
  shelfImages: ShelfImages
) {
  const section = shelf.sectionKey != null ? sections.find((s) => s.sectionKey === shelf.sectionKey) : null;
  if (!section) return;

  const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
  const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
  if (!startPillar) return;

  const startXMm = startPillar.x;
  const fallbackEndXMm = startXMm + (section.x ?? shelf.x ?? 0);
  const endXMm = endPillar ? endPillar.x : fallbackEndXMm;

  const startX = mmToPxX(startXMm, scaleInfo);
  const endX = mmToPxX(endXMm, scaleInfo);
  const shelfY = mmToPxY(shelf.y, scaleInfo);
  const shelfWidth = endX - startX;

  const shelfType = shelf.type || 'normal';
  const shelfImage = shelf.image ? getCachedImage(shelf.image) : shelfImages[shelfType];
  const shelfDimensions = shelfType ? FURNITURE_DIMENSIONS[shelfType] : FURNITURE_DIMENSIONS.normal;
  const shelfThicknessMm = shelf.thickness ?? shelfDimensions.heightMm;
  const drawHeight = shelfThicknessMm * scaleInfo.scaleY;

  if (shelfImage && shelfImage.complete && shelfImage.naturalWidth > 0 && shelfImage.naturalHeight > 0) {
    const drawWidth = shelfWidth;
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

  const shelfThickness = drawHeight || PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;
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
  sections: Section[],
  scaleInfo: ScaleInfo,
  shelfImages: ShelfImages
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawShelf(ctx, shelf, pillars, sections, scaleInfo, shelfImages);
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
  const cornerPillars = pillars.filter((p) => p.cornerYn);

  for (const cornerPillar of cornerPillars) {
    const isLeft = cornerPillar.x < roomWidthMm / 2;
    const startPillarX = mmToPxX(cornerPillar.x, scaleInfo);

    const sortedPillars = [...pillars].sort((a, b) => a.x - b.x);
    const pillarIndex = sortedPillars.findIndex((p) => p.pillarKey === cornerPillar.pillarKey);
    let pairPillar: Pillar | null = null;

    if (pillarIndex > 0) {
      pairPillar = sortedPillars[pillarIndex - 1];
    } else if (pillarIndex < sortedPillars.length - 1) {
      pairPillar = sortedPillars[pillarIndex + 1];
    }

    if (!pairPillar) continue;

    const endPillarX = mmToPxX(pairPillar.x, scaleInfo);
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
