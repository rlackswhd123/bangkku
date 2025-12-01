// placement.ts: 바닥 가구 배치 가능 공간 계산 유틸리티

import type { PlacementRect, FilteredPlacementRect, Section, Pillar } from '../types';
import { FURNITURE_DIMENSIONS } from '../types';

/**
 * 특정 벽면(face)의 모든 배치 가능한 공간(rect)을 계산합니다.
 * - 단일 칸, 연속된 칸들의 조합, 빈 벽 영역까지 포함
 * 
 * @param faceId 벽면 ID (예: 'front', 'left', 'right')
 * @param sections 해당 벽면의 칸(section) 배열
 * @param pillars 해당 벽면의 기둥(pillar) 배열 (x 좌표 기준 정렬됨)
 * @param faceWidthMm 벽면 전체 너비 (mm)
 * @param roomHeightMm 방 높이 (mm)
 * @returns 배치 가능한 모든 공간 배열
 */
export function calculatePlacementRects(
  faceId: string,
  sections: Section[],
  pillars: Pillar[],
  faceWidthMm: number,
  roomHeightMm: number
): PlacementRect[] {
  const rects: PlacementRect[] = [];
  const sortedPillars = [...pillars].sort((a, b) => a.x - b.x);
  const blockerPillars = sortedPillars.filter(p => (p.pillarStyle || 'RS') !== 'RS');

  // 기둥이 없는 경우: 빈 벽 전체
  if (pillars.length === 0) {
    rects.push({
      x: 0,
      y: 0, // 바닥 위치
      width: faceWidthMm,
      height: roomHeightMm,
      faceId,
      sectionIndices: [],
      isEmptyWallIncluded: true,
      lowestShelfY: undefined,
      affectedShelves: [],
    });
    return rects;
  }

  // 센터/듀얼 기둥이 있는 경우: 기둥 기준으로 구간을 나눠 Rect 생성
  // 섹션 여부와 무관하게 기둥 경계로 자른다.
  if (blockerPillars.length > 0) {
    const pillarXMap = new Map<number, number>();
    sortedPillars.forEach(p => pillarXMap.set(p.pillarKey, p.x));

    const getSectionSpan = (section: Section): { start: number; end: number } | null => {
      const start = pillarXMap.get(section.startPillarKey);
      const end = pillarXMap.get(section.endPillarKey);
      if (start === undefined || end === undefined) return null;
      return { start, end };
    };

    let startX = 0;
    blockerPillars.forEach((pillar, idx) => {
      const endX = pillar.x;
      if (endX > startX) {
        const segmentSections = sections
          .map(s => ({ section: s, span: getSectionSpan(s) }))
          .filter((s): s is { section: Section; span: { start: number; end: number } } =>
            !!s.span && s.span.start >= startX && s.span.end <= endX
          );

        const segmentShelves = segmentSections.flatMap(({ section }) => section.shelves);
        const lowestShelfY = segmentShelves.length > 0
          ? Math.min(...segmentShelves.map(sh => sh.y))
          : undefined;
        const rectHeight = lowestShelfY !== undefined ? lowestShelfY : roomHeightMm;

        rects.push({
          x: startX,
          y: 0,
          width: endX - startX,
          height: rectHeight,
          faceId,
          sectionIndices: [], // 기둥 단위 분할이므로 섹션 조합 정보는 비움
          isEmptyWallIncluded: true,
          lowestShelfY,
          affectedShelves: segmentShelves.map(sh => sh.shelfKey),
        });
      }
      startX = pillar.x;
      // 마지막 기둥이면 끝까지
      if (idx === blockerPillars.length - 1 && startX < faceWidthMm) {
        const segmentSections = sections
          .map(s => ({ section: s, span: getSectionSpan(s) }))
          .filter((s): s is { section: Section; span: { start: number; end: number } } =>
            !!s.span && s.span.start >= startX && s.span.end <= faceWidthMm
          );

        const segmentShelves = segmentSections.flatMap(({ section }) => section.shelves);
        const lowestShelfY = segmentShelves.length > 0
          ? Math.min(...segmentShelves.map(sh => sh.y))
          : undefined;
        const rectHeight = lowestShelfY !== undefined ? lowestShelfY : roomHeightMm;

        rects.push({
          x: startX,
          y: 0,
          width: faceWidthMm - startX,
          height: rectHeight,
          faceId,
          sectionIndices: [],
          isEmptyWallIncluded: true,
          lowestShelfY,
          affectedShelves: segmentShelves.map(sh => sh.shelfKey),
        });
      }
    });

    return rects;
  }

  // 1. 모든 섹션 조합 생성 (단일 칸, 연속된 칸들)
  for (let startIdx = 0; startIdx < sections.length; startIdx++) {
    for (let endIdx = startIdx; endIdx < sections.length; endIdx++) {
      const combinedSections = sections.slice(startIdx, endIdx + 1);
      const sectionIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);

      // 시작 x: 첫 번째 칸의 시작 기둥 x
      const startPillar = pillars.find(p => p.pillarKey === combinedSections[0].startPillarKey);
      // 끝 x: 마지막 칸의 끝 기둥 x
      const endPillar = pillars.find(p => p.pillarKey === combinedSections[combinedSections.length - 1].endPillarKey);

      if (!startPillar || !endPillar) continue;

      const rectX = startPillar.x;
      const rectWidth = endPillar.x - startPillar.x;

      // 모든 칸의 선반들 중 가장 낮은 y 위치 찾기
      const allShelves = combinedSections.flatMap(s => s.shelves);
      const lowestShelfY = allShelves.length > 0
        ? Math.min(...allShelves.map(shelf => shelf.y))
        : undefined;

      const rectHeight = lowestShelfY !== undefined ? lowestShelfY : roomHeightMm;

      rects.push({
        x: rectX,
        y: 0, // 바닥 위치
        width: rectWidth,
        height: rectHeight,
        faceId,
        sectionIndices,
        isEmptyWallIncluded: false,
        lowestShelfY,
        affectedShelves: allShelves.map(s => s.shelfKey),
      });
    }
  }

  // 2. 빈 벽 영역 처리
  const lastPillar = sortedPillars[sortedPillars.length - 1];
  const emptyWallWidth = faceWidthMm - lastPillar.x;

  if (emptyWallWidth > 0) {
    // 빈 벽 영역 단독 (가장 오른쪽만)
    rects.push({
      x: lastPillar.x,
      y: 0,
      width: emptyWallWidth,
      height: roomHeightMm, // 선반 없으므로 전체 높이
      faceId,
      sectionIndices: [],
      isEmptyWallIncluded: true,
      lowestShelfY: undefined,
      affectedShelves: [],
    });
  }

  // 3. 가장 오른쪽에 위치한 선반을 기준으로 오른쪽 벽 끝까지 확장하는 rect 추가
  const shelvesWithSection = sections.flatMap(section =>
    section.shelves.map(shelf => ({ shelf, section }))
  );

  if (shelvesWithSection.length > 0) {
    const pillarXMap = new Map<number, number>();
    sortedPillars.forEach(p => pillarXMap.set(p.pillarKey, p.x));

    const rightmost = shelvesWithSection.reduce((acc, cur) => {
      const accEnd = pillarXMap.get(acc.section.endPillarKey) ?? -Infinity;
      const curEnd = pillarXMap.get(cur.section.endPillarKey) ?? -Infinity;
      return curEnd > accEnd ? cur : acc;
    }, shelvesWithSection[0]);

    const startX = pillarXMap.get(rightmost.section.startPillarKey);
    const endX = faceWidthMm;
    if (startX !== undefined && endX > startX) {
      const type = rightmost.shelf.type || 'normal';
      const dim = FURNITURE_DIMENSIONS[type];
      const thickness = rightmost.shelf.thickness ?? dim.heightMm;
      const shelfBottom = rightmost.shelf.y - thickness / 2;

      if (shelfBottom > 0) {
        rects.push({
          x: startX,
          y: 0,
          width: endX - startX,
          height: shelfBottom,
          faceId,
          sectionIndices: [],
          isEmptyWallIncluded: true,
          lowestShelfY: shelfBottom,
          affectedShelves: [rightmost.shelf.shelfKey],
        });
      }
    }
  }

  return rects;
}

/**
 * 특정 가구 크기에 맞는 배치 가능한 공간만 필터링합니다.
 * 
 * @param placementRects 모든 배치 가능 공간 배열
 * @param furnitureWidthMm 가구 가로 크기 (mm)
 * @param furnitureHeightMm 가구 세로 크기 (mm)
 * @returns 가구가 배치 가능한 공간 배열
 */
export function filterPlacementRectsByFurniture(
  placementRects: PlacementRect[],
  furnitureWidthMm: number,
  furnitureHeightMm: number
): FilteredPlacementRect[] {
  return placementRects
    .map(rect => {
      const canFit = rect.width >= furnitureWidthMm && rect.height >= furnitureHeightMm;
      const remainingWidth = rect.width - furnitureWidthMm;
      const remainingHeight = rect.height - furnitureHeightMm;

      return {
        ...rect,
        furnitureWidth: furnitureWidthMm,
        furnitureHeight: furnitureHeightMm,
        canFit,
        remainingWidth: Math.max(0, remainingWidth),
        remainingHeight: Math.max(0, remainingHeight),
      };
    })
    .filter(rect => rect.canFit);
}

/**
 * 배치 가능한 공간을 너비 기준으로 정렬합니다.
 * 
 * @param rects 배치 가능 공간 배열
 * @param descending true면 내림차순, false면 오름차순 (기본값: true)
 * @returns 정렬된 배치 가능 공간 배열
 */
export function sortPlacementRectsByWidth<T extends PlacementRect>(
  rects: T[],
  descending: boolean = true
): T[] {
  return [...rects].sort((a, b) => 
    descending ? b.width - a.width : a.width - b.width
  );
}

/**
 * 배치 가능한 공간을 높이 기준으로 정렬합니다.
 * 
 * @param rects 배치 가능 공간 배열
 * @param descending true면 내림차순, false면 오름차순 (기본값: true)
 * @returns 정렬된 배치 가능 공간 배열
 */
export function sortPlacementRectsByHeight<T extends PlacementRect>(
  rects: T[],
  descending: boolean = true
): T[] {
  return [...rects].sort((a, b) => 
    descending ? b.height - a.height : a.height - b.height
  );
}

/**
 * 배치 가능한 공간을 면적 기준으로 정렬합니다.
 * 
 * @param rects 배치 가능 공간 배열
 * @param descending true면 내림차순, false면 오름차순 (기본값: true)
 * @returns 정렬된 배치 가능 공간 배열
 */
export function sortPlacementRectsByArea<T extends PlacementRect>(
  rects: T[],
  descending: boolean = true
): T[] {
  return [...rects].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return descending ? areaB - areaA : areaA - areaB;
  });
}
