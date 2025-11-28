// constraints.ts: 기둥/선반 이동 시 적용되는 제약 로직을 정의
import { Pillar, RoomState, Shelf, FURNITURE_DIMENSIONS } from '../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';
import { useRoomStore } from '../store';
import type { PlacedFurniture } from '../models/furniture';

/**
 * 선반이 가구와 충돌하는지 검사하고 유효한 Y 위치를 반환합니다.
 * @param shelf - 검사할 선반
 * @param newYMm - 선반의 새로운 Y 위치 (mm)
 * @param sectionStartXMm - 섹션 시작 X 위치 (mm)
 * @param sectionWidth - 섹션 너비 (mm)
 * @param furnitures - 배치된 가구 목록
 * @returns 충돌 여부와 유효한 Y 위치
 */
export function checkShelfFurnitureCollision(
  shelf: Shelf,
  newYMm: number,
  sectionStartXMm: number,
  sectionWidth: number,
  furnitures: PlacedFurniture[]
): { hasCollision: boolean; validYMm: number } {
  const shelfType = shelf.type || 'normal';
  const shelfDimensions = FURNITURE_DIMENSIONS[shelfType];
  const shelfThickness = shelfDimensions.heightMm;

  // 선반의 AABB 경계 (b_limit 포함)
  const shelfLeft = sectionStartXMm;
  const shelfRight = sectionStartXMm + sectionWidth;
  const shelfTop = newYMm + shelfThickness / 2;
  const shelfBottom = newYMm - shelfThickness / 2 - shelf.b_limit; // b_limit 영역 포함

  let hasCollision = false;
  let validYMm = newYMm;

  // 각 가구와 충돌 검사
  for (const furniture of furnitures) {
    const furnitureLeft = furniture.xMm;
    const furnitureRight = furniture.xMm + furniture.widthMm;
    const furnitureTop = furniture.yMm + furniture.heightMm;
    const furnitureBottom = furniture.yMm;

    // AABB 충돌 검사 (X축 겹침 확인)
    const xOverlap = shelfLeft < furnitureRight && shelfRight > furnitureLeft;

    if (xOverlap) {
      // Y축 충돌 검사 (b_limit 영역 포함)
      const yOverlap = shelfBottom < furnitureTop && shelfTop > furnitureBottom;

      if (yOverlap) {
        hasCollision = true;
        // 충돌 시: 선반 하단(중심 - 두께/2)이 가구 상단보다 b_limit 만큼 위에 위치
        // 즉, 중심 Y = 가구상단 + b_limit + 두께/2
        const safeYMm = furnitureTop + shelf.b_limit + shelfThickness / 2;
        console.log('🚨 선반-가구 충돌:', {
          furnitureTop,
          b_limit: shelf.b_limit,
          shelfThickness,
          safeYMm,
          계산식: `${furnitureTop} + ${shelf.b_limit} + ${shelfThickness / 2} = ${safeYMm}`
        });
        validYMm = Math.max(validYMm, safeYMm);
      }
    }
  }

  return { hasCollision, validYMm };
}

/**
 * 기둥이 가구와 충돌하는지 검사하고 유효한 X 위치를 반환합니다.
 * @param pillar - 검사할 기둥
 * @param newXMm - 기둥의 새로운 X 위치 (mm)
 * @param furnitures - 배치된 가구 목록
 * @param pillarThicknessMm - 기둥 두께 (mm)
 * @param roomHeightMm - 방 높이 (mm)
 * @returns 충돌 여부와 유효한 X 위치
 */
export function checkPillarFurnitureCollision(
  pillar: Pillar,
  newXMm: number,
  furnitures: PlacedFurniture[],
  pillarThicknessMm: number,
  roomHeightMm: number
): { hasCollision: boolean; validXMm: number } {
  // RS 스타일 기둥은 충돌 검사 제외
  const pillarStyle = pillar.pillarStyle || 'RS';
  if (pillarStyle === 'RS') {
    return { hasCollision: false, validXMm: newXMm };
  }

  // 기둥의 AABB 경계 (두께 고려)
  const pillarLeft = newXMm - pillarThicknessMm / 2;
  const pillarRight = newXMm + pillarThicknessMm / 2;
  const pillarTop = roomHeightMm;
  const pillarBottom = 0;

  let hasCollision = false;
  let validXMm = newXMm;

  // 각 가구와 충돌 검사
  for (const furniture of furnitures) {
    const furnitureLeft = furniture.xMm;
    const furnitureRight = furniture.xMm + furniture.widthMm;
    const furnitureTop = furniture.yMm + furniture.heightMm;
    const furnitureBottom = furniture.yMm;

    // AABB 충돌 검사
    const xOverlap = pillarLeft < furnitureRight && pillarRight > furnitureLeft;
    const yOverlap = pillarBottom < furnitureTop && pillarTop > furnitureBottom;

    if (xOverlap && yOverlap) {
      hasCollision = true;
      // 충돌 시: 가구 왼쪽 또는 오른쪽으로 기둥 배치
      // 더 가까운 쪽 선택
      const distanceToLeft = Math.abs(newXMm - furnitureLeft);
      const distanceToRight = Math.abs(newXMm - furnitureRight);

      if (distanceToLeft < distanceToRight) {
        validXMm = furnitureLeft - pillarThicknessMm / 2;
      } else {
        validXMm = furnitureRight + pillarThicknessMm / 2;
      }
    }
  }

  return { hasCollision, validXMm };
}

/**
 * 기둥이 서로 겹치지 않도록 인접 기둥과 방 폭을 기준으로 이동 가능 범위를 제한합니다.
 * 가구 정보도 받아서 가구를 넘어가지 않도록 제한합니다.
 */
export function createPillarPositionValidator(room: RoomState) {
  return (targetPillarKey: number, newX: number, pillars: Pillar[], furnitures: PlacedFurniture[] = [], pillarThicknessMm: number = 0, roomHeightMm: number = 0) => {
    const sortedPillars = [...pillars].sort((a, b) => a.x - b.x);

    const targetIndex = sortedPillars.findIndex((p) => p.pillarKey === targetPillarKey);
    if (targetIndex === -1) return newX;

    const targetPillar = sortedPillars[targetIndex];
    const leftNeighbor = targetIndex > 0 ? sortedPillars[targetIndex - 1] : null;
    const rightNeighbor = targetIndex < sortedPillars.length - 1 ? sortedPillars[targetIndex + 1] : null;

    let minXMm = 0;
    let maxXMm = room.roomWidthMm;

    if (leftNeighbor) {
      minXMm = leftNeighbor.x + PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      const maxAllowedXMm = leftNeighbor.x + PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newX > maxAllowedXMm) {
        maxXMm = Math.min(maxXMm, maxAllowedXMm);
      }
    }

    if (rightNeighbor) {
      const maxFromRight = rightNeighbor.x - PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      maxXMm = Math.min(maxXMm, maxFromRight);
      const minAllowedXMm = rightNeighbor.x - PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newX < minAllowedXMm) {
        minXMm = Math.max(minXMm, minAllowedXMm);
      }
    }

    // 가구 충돌 체크 추가 (RS 기둥 제외)
    const pillarStyle = targetPillar.pillarStyle || 'RS';
    if (pillarStyle !== 'RS' && furnitures.length > 0) {
      const currentX = targetPillar.x; // 현재 기둥 위치

      for (const furniture of furnitures) {
        const furnitureLeft = furniture.xMm;
        const furnitureRight = furniture.xMm + furniture.widthMm;
        const furnitureTop = furniture.yMm + furniture.heightMm;
        const furnitureBottom = furniture.yMm;

        // Y축 겹침 확인 (가구와 기둥이 같은 높이 범위에 있는지)
        const yOverlap = 0 < furnitureTop && roomHeightMm > furnitureBottom;

        if (yOverlap) {
          // 오른쪽으로 이동 중인 경우
          if (newX > currentX && currentX <= furnitureLeft && newX > furnitureLeft) {
            // 가구 왼쪽을 넘지 못하도록 제한
            maxXMm = Math.min(maxXMm, furnitureLeft - pillarThicknessMm / 2);
          }

          // 왼쪽으로 이동 중인 경우
          if (newX < currentX && currentX >= furnitureRight && newX < furnitureRight) {
            // 가구 오른쪽을 넘지 못하도록 제한
            minXMm = Math.max(minXMm, furnitureRight + pillarThicknessMm / 2);
          }
        }
      }
    }

    return Math.max(minXMm, Math.min(maxXMm, newX));
  };
}

/**
 * 같은 기둥 쌍에 연결된 선반들의 간격 규칙을 만족하도록 세로 위치를 제한합니다.
 * 거리 계산 기반으로 충돌 방지 및 간격 규칙을 적용합니다.
 */
export function createShelfPositionValidator(_pillars: Pillar[]) {
  return (targetShelfKey: number, newHeightMm: number, shelves: Shelf[], originalHeightMm?: number, maxHeightMm?: number) => {
    const targetShelf = shelves.find((s) => s.shelfKey === targetShelfKey);
    if (!targetShelf) return newHeightMm;

    // 스토어에서 글로벌 설정 가져오기
    const store = useRoomStore();
    const gridSize = store.settings.value.gridSizeMm;
    
    // 경계 범위 설정 (빨간 네모 범위)
    const minHeightMm = 0;
    const maxAllowedHeightMm = maxHeightMm !== undefined ? maxHeightMm : Infinity;
    
    // 드래그 방향 감지
    const dragDirection = originalHeightMm !== undefined && newHeightMm !== originalHeightMm
      ? (newHeightMm > originalHeightMm ? 'up' : 'down')  // heightMm 증가 = 위로
      : null;

    const targetDimensions = FURNITURE_DIMENSIONS[targetShelf.type || 'normal'];
    const targetThickness = targetDimensions.heightMm;

    // 같은 기둥 쌍의 선반들만 체크 (X축 범위가 겹치는 선반들)
    const samePairShelves = shelves.filter(
      (s) =>
        s.shelfKey !== targetShelfKey &&
        s.sectionKey === targetShelf.sectionKey
    );

    const getRequiredSpacing = (upperShelf: Shelf, lowerShelf: Shelf): number => {
      // 위쪽 선반의 b_limit과 아래쪽 선반의 t_limit 중 큰 값 사용
      return Math.max(upperShelf.b_limit, lowerShelf.t_limit);
    };

    // 경계선 제한값 계산 함수 (하단 경계선만 간격 규칙 포함, 상단은 경계선만 체크)
    const getBoundaryLimits = (shelf: Shelf, thickness: number): { min: number; max: number } => {
      return {
        min: minHeightMm + shelf.b_limit + thickness / 2, // 하단: b_limit 포함
        max: maxAllowedHeightMm - thickness / 2, // 상단: 경계선만 체크
      };
    };

    // 위치 유효성 검증 함수: 특정 높이에서 선반이 모든 제약을 만족하는지 확인
    const isValidPosition = (testHeightMm: number): boolean => {
      // 경계선 체크 (하단만 간격 규칙 포함, 상단은 경계선만 체크)
      const boundaryLimits = getBoundaryLimits(targetShelf, targetThickness);
      if (testHeightMm < boundaryLimits.min) {
        return false; // 하단: 간격 규칙 위반
      }
      // 상단: 경계선만 체크 (간격 규칙 제거)
      const maxAllowedCenter = maxAllowedHeightMm - targetThickness / 2;
      if (testHeightMm > maxAllowedCenter) {
        return false; // 상단: 경계선 초과
      }

      // 모든 선반과의 충돌 및 간격 체크 (거리 계산 기반)
      for (const otherShelf of samePairShelves) {
        const otherShelfType = otherShelf.type || 'normal';
        const otherDimensions = FURNITURE_DIMENSIONS[otherShelfType];
        const otherThickness = otherDimensions.heightMm;
        const spacing = getRequiredSpacing(
          testHeightMm > otherShelf.y ? targetShelf : otherShelf,
          testHeightMm > otherShelf.y ? otherShelf : targetShelf
        );

        let distance: number;
        if (testHeightMm > otherShelf.y) {
          // 테스트 선반이 위에 있음
          // 거리 = (위 선반 하단) - (아래 선반 상단)
          distance = (testHeightMm - targetThickness / 2) - (otherShelf.y + otherThickness / 2);
        } else {
          // 테스트 선반이 아래에 있음
          // 거리 = (위 선반 하단) - (아래 선반 상단)
          distance = (otherShelf.y - otherThickness / 2) - (testHeightMm + targetThickness / 2);
        }

        // 간격이 0보다 작거나 같으면 겹침, 간격이 최소 간격보다 작으면 간격 규칙 위반
        if (distance <= 0) {
          return false; // 겹침 발생
        }
        if (distance < spacing) {
          return false; // 간격 규칙 위반
        }
      }

      return true; // 모든 검증 통과
    };

    // 거리 계산 기반 충돌 체크 및 위치 조정
    let adjustedHeightMm = newHeightMm;

    // 경계선 제한값 계산 (항상 필요)
    const boundaryLimits = getBoundaryLimits(targetShelf, targetThickness);
    const maxAllowedCenter = maxAllowedHeightMm - targetThickness / 2;
    
    // 경계선 체크 및 조정 (단일 선반일 때도 필요)
    if (newHeightMm < boundaryLimits.min) {
      adjustedHeightMm = boundaryLimits.min;
    } else if (newHeightMm > maxAllowedCenter) {
      adjustedHeightMm = maxAllowedCenter;
    }
    
    // 드래그 방향이 있고 다른 선반이 있을 때만 충돌 체크 및 위치 조정 수행
    if (dragDirection && samePairShelves.length > 0) {
      const collisions: { shelf: Shelf | null; height: number; isBoundary: boolean }[] = [];
      
      // 다른 선반들과의 충돌 체크 (거리 계산 기반)
      for (const otherShelf of samePairShelves) {
        const otherShelfType = otherShelf.type || 'normal';
        const otherDimensions = FURNITURE_DIMENSIONS[otherShelfType];
        const otherThickness = otherDimensions.heightMm;
        
        let distance: number;
        if (newHeightMm > otherShelf.y) {
          // 드래그 중인 선반이 위에 있음
          distance = (newHeightMm - targetThickness / 2) - (otherShelf.y + otherThickness / 2);
        } else {
          // 드래그 중인 선반이 아래에 있음
          distance = (otherShelf.y - otherThickness / 2) - (newHeightMm + targetThickness / 2);
        }
        
        // 간격이 0보다 작거나 같으면 충돌
        if (distance <= 0) {
          collisions.push({
            shelf: otherShelf,
            height: otherShelf.y,
            isBoundary: false
          });
        }
      }
      
      // 경계선 충돌 체크 (이미 위에서 조정했지만, 충돌 배열에 추가)
      if (newHeightMm < boundaryLimits.min) {
        collisions.push({
          shelf: null,
          height: boundaryLimits.min,
          isBoundary: true
        });
      }
      
      if (newHeightMm > maxAllowedCenter) {
        collisions.push({
          shelf: null,
          height: maxAllowedCenter,
          isBoundary: true
        });
      }

      // 충돌이 있으면 드래그 방향에 따라 위치 후보 계산 및 유효성 검증
      if (collisions.length > 0) {
        let candidateHeight: number | null = null;
        let fallbackHeight: number | null = null; // 넘어가지 못할 때 대체 위치

        if (dragDirection === 'up') {
          // 위로 드래그 중: 가장 위쪽 충돌 대상의 위로 이동
          let topmostCollision = collisions[0];
          for (const collision of collisions) {
            if (collision.isBoundary && collision.height === maxAllowedCenter) {
              topmostCollision = collision;
              break;
            }
            if (!collision.isBoundary && collision.shelf) {
              const collisionTop = collision.shelf.y + 
                (FURNITURE_DIMENSIONS[collision.shelf.type || 'normal'].heightMm / 2);
              const topmostTop = topmostCollision.isBoundary 
                ? (topmostCollision.height === maxAllowedCenter ? maxAllowedCenter + targetThickness / 2 : -Infinity)
                : (topmostCollision.shelf ? topmostCollision.shelf.y + 
                   (FURNITURE_DIMENSIONS[topmostCollision.shelf.type || 'normal'].heightMm / 2) : -Infinity);
              if (collisionTop > topmostTop) {
                topmostCollision = collision;
              }
            }
          }
          
          if (topmostCollision.isBoundary && topmostCollision.height === maxAllowedCenter) {
            // 상단 경계선과 충돌
            candidateHeight = maxAllowedCenter;
            fallbackHeight = candidateHeight;
          } else if (topmostCollision.shelf) {
            // 다른 선반과 충돌: 선반 위로 이동 시도
            const collisionShelf = topmostCollision.shelf;
            const collisionShelfType = collisionShelf.type || 'normal';
            const collisionDimensions = FURNITURE_DIMENSIONS[collisionShelfType];
            const collisionThickness = collisionDimensions.heightMm;
            const spacing = getRequiredSpacing(targetShelf, collisionShelf);
            // 선반 중심 = 충돌 선반 상단 + 간격 + 내 두께/2
            candidateHeight = collisionShelf.y + collisionThickness / 2 + spacing + targetThickness / 2;
            // 넘어가지 못할 경우: 충돌하는 선반 바로 아래, 간격 규칙 만족하는 위치
            fallbackHeight = collisionShelf.y - collisionThickness / 2 - spacing - targetThickness / 2;
          }
        } else {
          // 아래로 드래그 중: 가장 아래쪽 충돌 대상의 아래로 이동
          let bottommostCollision = collisions[0];
          for (const collision of collisions) {
            if (collision.isBoundary && collision.height === boundaryLimits.min) {
              bottommostCollision = collision;
              break;
            }
            if (!collision.isBoundary && collision.shelf) {
              const collisionBottom = collision.shelf.y - 
                (FURNITURE_DIMENSIONS[collision.shelf.type || 'normal'].heightMm / 2);
              const bottommostBottom = bottommostCollision.isBoundary
                ? (bottommostCollision.height === boundaryLimits.min ? boundaryLimits.min - targetThickness / 2 : Infinity)
                : (bottommostCollision.shelf ? bottommostCollision.shelf.y - 
                   (FURNITURE_DIMENSIONS[bottommostCollision.shelf.type || 'normal'].heightMm / 2) : Infinity);
              if (collisionBottom < bottommostBottom) {
                bottommostCollision = collision;
              }
            }
          }
          
          if (bottommostCollision.isBoundary && bottommostCollision.height === boundaryLimits.min) {
            // 하단 경계선과 충돌
            candidateHeight = boundaryLimits.min;
            fallbackHeight = candidateHeight;
          } else if (bottommostCollision.shelf) {
            // 다른 선반과 충돌: 선반 아래로 이동 시도
            const collisionShelf = bottommostCollision.shelf;
            const collisionShelfType = collisionShelf.type || 'normal';
            const collisionDimensions = FURNITURE_DIMENSIONS[collisionShelfType];
            const collisionThickness = collisionDimensions.heightMm;
            const spacing = getRequiredSpacing(collisionShelf, targetShelf);
            // 선반 중심 = 충돌 선반 하단 - 간격 - 내 두께/2
            candidateHeight = collisionShelf.y - collisionThickness / 2 - spacing - targetThickness / 2;
            // 넘어가지 못할 경우: 충돌하는 선반 바로 위, 간격 규칙 만족하는 위치
            fallbackHeight = collisionShelf.y + collisionThickness / 2 + spacing + targetThickness / 2;
          }
        }

        // 후보 위치가 유효한지 검증
        if (candidateHeight !== null && isValidPosition(candidateHeight)) {
          adjustedHeightMm = candidateHeight;
        } else if (fallbackHeight !== null && isValidPosition(fallbackHeight)) {
          // 넘어가지 못하면 충돌하는 선반과 간격 규칙을 만족하는 최대한 가까운 위치에서 멈춤
          adjustedHeightMm = fallbackHeight;
        } else {
          // 대체 위치도 유효하지 않으면 원래 위치 유지
          adjustedHeightMm = newHeightMm;
        }
      }
    }

    // 기존 간격 규칙 적용 (최소 간격 보장)
    let minAllowedHeight = -Infinity;
    let maxAllowedHeight = Infinity;

    for (const shelf of samePairShelves) {
      const otherShelfType = shelf.type || 'normal';
      const otherDimensions = FURNITURE_DIMENSIONS[shelf.type || 'normal'];
      const otherThickness = otherDimensions.heightMm;

      // 조정된 높이 기준으로 간격 체크
      // heightMm은 중심이므로, 선반 간 거리 = 내 하단과 다른 선반 상단 간의 거리
      if (adjustedHeightMm > shelf.y) {
        // 드래그 중인 선반이 위에 있음
        // 거리 = (내 중심 - 내 두께/2) - (다른 중심 + 다른 두께/2)
        const spacing = getRequiredSpacing(targetShelf, shelf);
        const distance = (adjustedHeightMm - targetThickness / 2) - (shelf.y + otherThickness / 2);
        if (distance < spacing) {
          // 최소 간격을 만족하는 높이 = 다른 중심 + 다른 두께/2 + 간격 + 내 두께/2
          const allowedHeight = shelf.y + otherThickness / 2 + spacing + targetThickness / 2;
          minAllowedHeight = Math.max(minAllowedHeight, allowedHeight);
        }
      } else if (adjustedHeightMm < shelf.y) {
        // 드래그 중인 선반이 아래에 있음
        // 거리 = (다른 중심 - 다른 두께/2) - (내 중심 + 내 두께/2)
        const spacing = getRequiredSpacing(shelf, targetShelf);
        const distance = (shelf.y - otherThickness / 2) - (adjustedHeightMm + targetThickness / 2);
        if (distance < spacing) {
          // 최소 간격을 만족하는 높이 = 다른 중심 - 다른 두께/2 - 간격 - 내 두께/2
          const allowedHeight = shelf.y - otherThickness / 2 - spacing - targetThickness / 2;
          maxAllowedHeight = Math.min(maxAllowedHeight, allowedHeight);
        }
      }
    }

    // 최종 높이 계산
    let constrainedHeight = adjustedHeightMm;
    if (minAllowedHeight !== -Infinity) {
      constrainedHeight = Math.max(constrainedHeight, minAllowedHeight);
    }
    if (maxAllowedHeight !== Infinity) {
      constrainedHeight = Math.min(constrainedHeight, maxAllowedHeight);
    }

    // 경계 체크 (하단만 간격 규칙 포함, 상단은 경계선만 체크)
    // boundaryLimits와 maxAllowedCenter는 위에서 이미 선언됨
    constrainedHeight = Math.min(constrainedHeight, maxAllowedCenter);
    constrainedHeight = Math.max(constrainedHeight, boundaryLimits.min); // 하단: 간격 규칙 포함

    // 100mm 그리드 스냅 적용
    const snappedHeight = Math.round(constrainedHeight / gridSize) * gridSize;

    // 스냅 후에도 경계 체크 (스냅으로 인해 범위를 벗어날 수 있음)
    const finalHeight = Math.max(boundaryLimits.min, Math.min(snappedHeight, maxAllowedCenter));

    return finalHeight;
  };
}

