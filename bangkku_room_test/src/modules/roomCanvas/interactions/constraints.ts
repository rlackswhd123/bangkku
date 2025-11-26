// constraints.ts: 기둥/선반 이동 시 적용되는 제약 로직을 정의
import { Pillar, RoomState, Shelf, FURNITURE_DIMENSIONS } from '../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';
import { useRoomStore } from '../store';

/**
 * 기둥이 서로 겹치지 않도록 인접 기둥과 방 폭을 기준으로 이동 가능 범위를 제한합니다.
 */
export function createPillarPositionValidator(room: RoomState) {
  return (targetPillarKey: number, newX: number, pillars: Pillar[]) => {
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
    const SHELF_SPACING = store.settings.value.shelfSpacingRules;
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
    
    const targetShelfType = targetShelf.type || 'normal';

    const getRequiredSpacing = (upperShelfType: string, lowerShelfType: string): number => {
      const upperSpacing = SHELF_SPACING[upperShelfType as keyof typeof SHELF_SPACING] || SHELF_SPACING.normal;
      const lowerSpacing = SHELF_SPACING[lowerShelfType as keyof typeof SHELF_SPACING] || SHELF_SPACING.normal;
      return Math.max(upperSpacing.below, lowerSpacing.above);
    };

    // 경계선 제한값 계산 함수 (하단 경계선만 간격 규칙 포함, 상단은 경계선만 체크)
    const getBoundaryLimits = (shelfType: string, thickness: number): { min: number; max: number } => {
      const spacing = SHELF_SPACING[shelfType as keyof typeof SHELF_SPACING] || SHELF_SPACING.normal;
      return {
        min: minHeightMm + spacing.below + thickness / 2, // 하단: 간격 규칙 포함
        max: maxAllowedHeightMm - thickness / 2, // 상단: 경계선만 체크 (간격 규칙 제거)
      };
    };

    // 위치 유효성 검증 함수: 특정 높이에서 선반이 모든 제약을 만족하는지 확인
    const isValidPosition = (testHeightMm: number): boolean => {
      // 경계선 체크 (하단만 간격 규칙 포함, 상단은 경계선만 체크)
      const boundaryLimits = getBoundaryLimits(targetShelfType, targetThickness);
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
          testHeightMm > otherShelf.y ? targetShelfType : otherShelfType,
          testHeightMm > otherShelf.y ? otherShelfType : targetShelfType
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
    
    // 드래그 방향이 있을 때만 충돌 체크 및 위치 조정 수행
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
      
      // 경계선 충돌 체크 (Y축만 체크, 같은 기둥 쌍이므로 X축은 항상 겹침)
      const boundaryLimits = getBoundaryLimits(targetShelfType, targetThickness);
      const maxAllowedCenter = maxAllowedHeightMm - targetThickness / 2;
      
      // 하단 경계선 충돌
      if (newHeightMm < boundaryLimits.min) {
        collisions.push({
          shelf: null,
          height: boundaryLimits.min,
          isBoundary: true
        });
      }
      
      // 상단 경계선 충돌
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
            const spacing = getRequiredSpacing(targetShelfType, collisionShelfType);
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
            const spacing = getRequiredSpacing(collisionShelfType, targetShelfType);
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
        const spacing = getRequiredSpacing(targetShelfType, otherShelfType);
        const distance = (adjustedHeightMm - targetThickness / 2) - (shelf.y + otherThickness / 2);
        if (distance < spacing) {
          // 최소 간격을 만족하는 높이 = 다른 중심 + 다른 두께/2 + 간격 + 내 두께/2
          const allowedHeight = shelf.y + otherThickness / 2 + spacing + targetThickness / 2;
          minAllowedHeight = Math.max(minAllowedHeight, allowedHeight);
        }
      } else if (adjustedHeightMm < shelf.y) {
        // 드래그 중인 선반이 아래에 있음
        // 거리 = (다른 중심 - 다른 두께/2) - (내 중심 + 내 두께/2)
        const spacing = getRequiredSpacing(otherShelfType, targetShelfType);
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
    const boundaryLimits = getBoundaryLimits(targetShelfType, targetThickness);
    const maxAllowedCenter = maxAllowedHeightMm - targetThickness / 2; // 상단: 경계선만 체크
    constrainedHeight = Math.min(constrainedHeight, maxAllowedCenter);
    constrainedHeight = Math.max(constrainedHeight, boundaryLimits.min); // 하단: 간격 규칙 포함

    // 100mm 그리드 스냅 적용
    const snappedHeight = Math.round(constrainedHeight / gridSize) * gridSize;

    // 스냅 후에도 경계 체크 (스냅으로 인해 범위를 벗어날 수 있음)
    const finalHeight = Math.max(boundaryLimits.min, Math.min(snappedHeight, maxAllowedCenter));

    return finalHeight;
  };
}

