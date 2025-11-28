// rectCalculator.ts: 가구 배치 가능 위치(Rect) 계산 로직
import { Pillar, Section, Shelf, ScaleInfo, GlobalSettings, FURNITURE_DIMENSIONS } from '../../../types';

/**
 * 배치 가능한 Rect 정보
 */
export interface AvailableRect {
  sectionKey: number;
  x: number;        // 섹션 시작 X 위치 (mm)
  y: number;        // 가구 중심 Y 위치 (mm) - 항상 furnitureHeightMm / 2
  width: number;    // 섹션 폭 (mm)
  height: number;   // rect 최대 높이 (mm) - 선반이 있으면 선반 바닥까지, 없으면 방 최대 높이
  shelfBottom?: number;  // 선반 바닥 위치 (mm, 선반이 있는 경우)
  bLimit?: number;       // 선반의 b_limit 값 (mm, 선반이 있는 경우)
  isValid: boolean; // 배치 가능 여부
}

/**
 * 기둥 충돌 체크
 * RS (후면 싱글)는 제외, CS/DU만 충돌 체크
 * 기둥 두께는 0으로 간주 (점으로 취급)
 */
function checkPillarCollision(
  furnitureX: number,      // 가구 시작 X 위치 (mm)
  furnitureWidth: number,  // 가구 폭 (mm)
  section: Section,
  pillars: Pillar[],
  scaleInfo: ScaleInfo
): boolean {
  const sectionPillars = pillars.filter(
    p => p.pillarKey === section.startPillarKey || 
         p.pillarKey === section.endPillarKey
  );
  
  for (const pillar of sectionPillars) {
    // RS 기둥은 충돌 체크 제외
    if ((pillar.pillarStyle || 'RS') === 'RS') {
      continue;
    }
    
    // CS/DU 기둥만 충돌 체크
    // 기둥 두께를 0으로 간주하여 기둥 X 위치가 가구 X 범위 안에 있는지만 체크
    const furnitureRight = furnitureX + furnitureWidth;
    
    // 기둥 위치가 가구 X 범위 안에 있으면 충돌
    if (furnitureX < pillar.x && pillar.x < furnitureRight) {
      return true; // 충돌 발생
    }
  }
  
  return false; // 충돌 없음
}

/**
 * 선반과의 충돌 및 배치 가능 여부 체크
 * - 선반 위에 배치 불가
 * - 선반 아래에만 배치 가능 (b_limit 활용)
 * - 선반과 같은 높이 배치 불가
 */
function checkShelfCollision(
  furnitureY: number,        // 가구 중심 Y 위치 (mm)
  furnitureHeight: number,  // 가구 높이 (mm)
  furnitureTop: number,      // 가구 상단 Y 위치 (mm)
  sectionShelves: Shelf[],   // 같은 섹션의 선반들
  settings: GlobalSettings
): boolean {
  for (const shelf of sectionShelves) {
    const shelfType = shelf.type || 'normal';
    const shelfDimensions = FURNITURE_DIMENSIONS[shelfType];
    const shelfThickness = shelfDimensions.heightMm;
    const shelfTop = shelf.y + shelfThickness / 2;
    const shelfBottom = shelf.y - shelfThickness / 2;
    const furnitureBottom = furnitureY - furnitureHeight / 2;
    
    // 선반과 같은 높이 체크 (같은 높이는 배치 불가)
    // 가구 중심과 선반 중심이 거의 같으면 충돌
    if (Math.abs(furnitureY - shelf.y) < 1) {
      return true; // 같은 높이 - 충돌
    }
    
    // 선반 위에 배치 불가 (가구 하단이 선반 상단보다 위에 있으면 충돌)
    if (furnitureBottom > shelfTop) {
      return true; // 선반 위 - 충돌
    }
    
    // 선반 아래에 배치 가능 여부 체크 (b_limit 활용)
    if (furnitureTop < shelfBottom) {
      // 가구가 선반 아래에 있음
      // b_limit 범위 내에 있어야 함
      const distanceFromShelf = shelfBottom - furnitureTop;
      
      // b_limit이 0이면 선반 아래 배치 불가
      if (shelf.b_limit === 0) {
        return true; // b_limit이 0이면 배치 불가
      }
      
      // b_limit 범위를 초과하면 충돌
      if (distanceFromShelf > shelf.b_limit) {
        return true; // b_limit 범위 초과 - 충돌
      }
      
      // 간격 규칙도 확인 (선반의 b_limit과 간격 규칙 중 더 작은 값 사용)
      const spacing = settings.shelfSpacingRules[shelfType] || settings.shelfSpacingRules.normal;
      const minSpacing = Math.min(shelf.b_limit, spacing.below);
      if (distanceFromShelf < minSpacing) {
        return true; // 최소 간격 미만 - 충돌
      }
    }
  }
  
  return false; // 충돌 없음
}

/**
 * 기존 가구와의 충돌 체크
 */
function checkFurnitureCollision(
  furnitureX: number,
  furnitureY: number,
  furnitureWidth: number,
  furnitureHeight: number,
  existingFurniture: Array<{ x: number; y: number; width: number; height: number }>
): boolean {
  const furnitureRight = furnitureX + furnitureWidth;
  const furnitureTop = furnitureY + furnitureHeight / 2;
  const furnitureBottom = furnitureY - furnitureHeight / 2;
  
  for (const existing of existingFurniture) {
    const existingRight = existing.x + existing.width;
    const existingTop = existing.y + existing.height / 2;
    const existingBottom = existing.y - existing.height / 2;
    
    // AABB 충돌 체크
    if (furnitureX < existingRight && 
        furnitureRight > existing.x &&
        furnitureBottom < existingTop && 
        furnitureTop > existingBottom) {
      return true; // 충돌 발생
    }
  }
  
  return false; // 충돌 없음
}

/**
 * 가구 배치 가능한 Rect 리스트 계산
 * 
 * @param sections - 현재 활성 면의 모든 섹션
 * @param pillars - 현재 활성 면의 모든 기둥
 * @param shelves - 현재 활성 면의 모든 선반
 * @param roomHeightMm - 방 높이 (mm)
 * @param settings - 글로벌 설정
 * @param scaleInfo - 스케일 정보
 * @param furnitureHeightMm - 가구 높이 (mm)
 * @param existingFurniture - 기존에 배치된 가구 목록 (선택적)
 */
export function calculateAvailableRects(
  sections: Section[],
  pillars: Pillar[],
  shelves: Shelf[],
  roomHeightMm: number,
  settings: GlobalSettings,
  scaleInfo: ScaleInfo,
  furnitureHeightMm: number,
  existingFurniture: Array<{ x: number; y: number; width: number; height: number }> = []
): AvailableRect[] {
  const rects: AvailableRect[] = [];
  
  // 가구는 항상 바닥에 닿아야 함
  const furnitureY = furnitureHeightMm / 2; // 고정값
  const furnitureTop = furnitureY + furnitureHeightMm / 2;
  const furnitureBottom = 0; // 바닥
  
  // 각 섹션별로 독립적으로 계산
  for (const section of sections) {
    const startPillar = pillars.find(p => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find(p => p.pillarKey === section.endPillarKey);
    
    if (!startPillar || !endPillar) continue;
    
    const sectionX = startPillar.x;
    const sectionWidth = endPillar.x - startPillar.x;
    
    // 같은 섹션의 선반들 필터링
    const sectionShelves = shelves.filter(s => s.sectionKey === section.sectionKey);
    
    // rect 높이 계산: 선반이 있으면 가장 낮은 선반의 바닥까지
    let rectMaxHeight = roomHeightMm; // 기본값: 방 최대 높이
    let shelfBottom: number | undefined = undefined;
    let bLimit: number | undefined = undefined;
    
    if (sectionShelves.length > 0) {
      // 가장 낮은 선반 찾기 (y 값이 가장 작은 선반)
      const lowestShelf = sectionShelves.reduce((lowest, current) => 
        current.y < lowest.y ? current : lowest
      );
      
      const shelfType = lowestShelf.type || 'normal';
      const shelfDimensions = FURNITURE_DIMENSIONS[shelfType];
      const shelfThickness = shelfDimensions.heightMm;
      shelfBottom = lowestShelf.y - shelfThickness / 2;
      bLimit = lowestShelf.b_limit;
      
      // rect 높이는 선반 바닥까지 표시 (b_limit 값과 무관하게)
      // b_limit이 0이면 배치 불가능하지만, 시각적으로는 선반 바닥까지 표시
      rectMaxHeight = shelfBottom;
      
      console.log('📐 Rect 높이 계산:', {
        sectionKey: section.sectionKey,
        lowestShelfY: lowestShelf.y,
        shelfType,
        shelfThickness,
        shelfBottom,
        bLimit,
        rectMaxHeight,
        roomHeightMm,
      });
    }
    
    // 선반 충돌 체크 (b_limit 범위 밖에서 배치 가능한지 확인)
    const hasShelfCollision = checkShelfCollision(
      furnitureY,
      furnitureHeightMm,
      furnitureTop,
      sectionShelves,
      settings
    );
    
    // 기둥 충돌 체크
    // RS 기둥일 경우 기둥 충돌 체크 제외
    const sectionPillars = pillars.filter(
      p => p.pillarKey === section.startPillarKey || 
           p.pillarKey === section.endPillarKey
    );
    const hasRSOnlyPillars = sectionPillars.every(
      p => (p.pillarStyle || 'RS') === 'RS'
    );
    
    let hasPillarCollision = false;
    if (!hasRSOnlyPillars) {
      // RS만 있는 경우가 아니면 기둥 충돌 체크
      hasPillarCollision = checkPillarCollision(
        sectionX,
        sectionWidth,
        section,
        pillars,
        scaleInfo
      );
    }
    
    // 기존 가구 충돌 체크
    const hasFurnitureCollision = checkFurnitureCollision(
      sectionX,
      furnitureY,
      sectionWidth,
      furnitureHeightMm,
      existingFurniture
    );
    
    // 경계 체크 (가구 상단이 rect 최대 높이를 넘지 않아야 함)
    const isWithinBounds = furnitureTop <= rectMaxHeight;
    
    // 모든 조건을 만족하면 배치 가능
    const isValid = !hasShelfCollision && 
                    !hasPillarCollision && 
                    !hasFurnitureCollision && 
                    isWithinBounds &&
                    rectMaxHeight > 0; // rect 높이가 0보다 커야 함
    
    rects.push({
      sectionKey: section.sectionKey,
      x: sectionX,
      y: furnitureY,
      width: sectionWidth,
      height: rectMaxHeight, // 선반이 있으면 선반 바닥까지, 없으면 방 최대 높이
      shelfBottom,
      bLimit,
      isValid,
    });
  }
  
  return rects;
}

