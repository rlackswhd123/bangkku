// spacings.ts: 기둥·선반 사이의 거리(mm)를 표기하는 드로잉 유틸
import { Pillar, ScaleInfo, Shelf } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';

export function drawPillarSpacings(ctx: CanvasRenderingContext2D, pillars: Pillar[], scaleInfo: ScaleInfo) {
  const sortedPillars = [...pillars].sort((a, b) => a.xMm - b.xMm);
  if (sortedPillars.length < 2) return;

  const { redRect } = scaleInfo;
  const bottomY = redRect.y + redRect.height + 25;

  for (let i = 0; i < sortedPillars.length - 1; i += 1) {
    const leftPillar = sortedPillars[i];
    const rightPillar = sortedPillars[i + 1];

    const spacingMm = rightPillar.xMm - leftPillar.xMm;
    const spacingMmInt = Math.round(spacingMm);

    const leftXPx = mmToPxX(leftPillar.xMm, scaleInfo);
    const rightXPx = mmToPxX(rightPillar.xMm, scaleInfo);
    const centerXPx = (leftXPx + rightXPx) / 2;

    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${spacingMmInt}mm`, centerXPx, bottomY);
  }
}

export function drawShelfSpacings(
  ctx: CanvasRenderingContext2D,
  shelves: Shelf[],
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  const shelfGroups = new Map<string, Shelf[]>();

  shelves.forEach((shelf) => {
    const key = `${shelf.startPillarId}-${shelf.endPillarId}`;
    if (!shelfGroups.has(key)) {
      shelfGroups.set(key, []);
    }
    shelfGroups.get(key)!.push(shelf);
  });

  shelfGroups.forEach((groupShelves) => {
    if (groupShelves.length < 2) return;

    const sortedShelves = [...groupShelves].sort((a, b) => b.heightMm - a.heightMm);

    const firstShelf = sortedShelves[0];
    const startPillar = pillars.find((p) => p.id === firstShelf.startPillarId);
    const endPillar = pillars.find((p) => p.id === firstShelf.endPillarId);

    if (!startPillar || !endPillar) return;

    const rightPillarXPx = mmToPxX(endPillar.xMm, scaleInfo);
    const offsetX = 15;

    for (let i = 0; i < sortedShelves.length - 1; i += 1) {
      const upperShelf = sortedShelves[i];
      const lowerShelf = sortedShelves[i + 1];

      const spacingMm = upperShelf.heightMm - lowerShelf.heightMm;
      const spacingMmInt = Math.round(spacingMm);

      const upperShelfYPx = mmToPxY(upperShelf.heightMm, scaleInfo);
      const lowerShelfYPx = mmToPxY(lowerShelf.heightMm, scaleInfo);
      const centerYPx = (upperShelfYPx + lowerShelfYPx) / 2;

      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${spacingMmInt}mm`, rightPillarXPx - offsetX, centerYPx);
    }
  });
}

