// spacings.ts: 기둥·선반 사이의 거리(mm)를 표기하는 드로잉 유틸
import { Pillar, ScaleInfo, Section, Shelf } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';

export function drawPillarSpacings(ctx: CanvasRenderingContext2D, pillars: Pillar[], scaleInfo: ScaleInfo) {
  const sortedPillars = [...pillars].sort((a, b) => a.x - b.x);
  if (sortedPillars.length < 2) return;

  const { redRect } = scaleInfo;
  const bottomY = redRect.y + redRect.height + 25;

  for (let i = 0; i < sortedPillars.length - 1; i += 1) {
    const leftPillar = sortedPillars[i];
    const rightPillar = sortedPillars[i + 1];

    const spacingMm = rightPillar.x - leftPillar.x;
    const spacingMmInt = Math.round(spacingMm);

    const leftXPx = mmToPxX(leftPillar.x, scaleInfo);
    const rightXPx = mmToPxX(rightPillar.x, scaleInfo);
    const centerXPx = (leftXPx + rightXPx) / 2;

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${spacingMmInt}mm`, centerXPx, bottomY);
  }
}

export function drawShelfSpacings(
  ctx: CanvasRenderingContext2D,
  shelves: Shelf[],
  pillars: Pillar[],
  sections: Section[],
  scaleInfo: ScaleInfo
) {
  const shelfGroups = new Map<string, Shelf[]>();

  shelves.forEach((shelf) => {
    const key = `${shelf.sectionKey ?? 'unknown'}`;
    if (!shelfGroups.has(key)) {
      shelfGroups.set(key, []);
    }
    shelfGroups.get(key)!.push(shelf);
  });

  shelfGroups.forEach((groupShelves) => {
    if (groupShelves.length < 2) return;

    const sortedShelves = [...groupShelves].sort((a, b) => b.y - a.y);

    const firstShelf = sortedShelves[0];
    const sectionKey = firstShelf.sectionKey;
    if (sectionKey == null) return;
    const section = sections.find((s) => s.sectionKey === sectionKey);
    if (!section) return;
    const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);

    if (!startPillar || !endPillar) return;

    const rightPillarXPx = mmToPxX(endPillar.x, scaleInfo);
    const offsetX = 15;

    for (let i = 0; i < sortedShelves.length - 1; i += 1) {
      const upperShelf = sortedShelves[i];
      const lowerShelf = sortedShelves[i + 1];

      const spacingMm = upperShelf.y - lowerShelf.y;
      const spacingMmInt = Math.round(spacingMm);

      const upperShelfYPx = mmToPxY(upperShelf.y, scaleInfo);
      const lowerShelfYPx = mmToPxY(lowerShelf.y, scaleInfo);
      const centerYPx = (upperShelfYPx + lowerShelfYPx) / 2;

      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${spacingMmInt}mm`, rightPillarXPx - offsetX, centerYPx);
    }
  });
}

