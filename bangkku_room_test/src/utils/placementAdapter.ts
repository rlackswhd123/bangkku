// placementAdapter.ts: PlacementRect를 기존 렌더링 파이프라인의 AvailableRect로 변환

import type { PlacementRect, FilteredPlacementRect } from '../types';
import type { AvailableRect } from '../modules/roomCanvas/utils/rectCalculator';

/**
 * PlacementRect를 AvailableRect로 변환합니다.
 * 기존 초록색 rect 렌더링 파이프라인을 재사용하기 위한 어댑터입니다.
 * 
 * @param placementRect 배치 가능 공간 정보
 * @param furnitureHeightMm 가구 높이 (mm) - 가구 중심 y 계산용
 * @returns AvailableRect 형식으로 변환된 객체
 */
export function convertPlacementRectToAvailableRect(
  placementRect: PlacementRect,
  furnitureHeightMm: number
): AvailableRect {
  // 가구는 항상 바닥에 닿아야 하므로 중심 y = furnitureHeightMm / 2
  const furnitureY = furnitureHeightMm / 2;

  return {
    // sectionKey: 단일 섹션이면 그 섹션 key, 여러 섹션 결합이면 가상 key 생성
    // 여러 섹션 결합이나 빈벽인 경우 음수 key 사용 (충돌 방지)
    sectionKey: placementRect.sectionIndices.length === 1 && !placementRect.isEmptyWallIncluded
      ? placementRect.sectionIndices[0]
      : -Math.abs(placementRect.x + placementRect.width), // 고유한 음수 key 생성
    
    x: placementRect.x,
    y: furnitureY,
    width: placementRect.width,
    height: placementRect.height,
    shelfBottom: placementRect.lowestShelfY,
    bLimit: undefined, // PlacementRect는 b_limit를 따로 추적 안함 (이미 height에 반영됨)
    isValid: true, // 배치 가능한 영역만 전달되므로 항상 true
  };
}

/**
 * 여러 PlacementRect를 AvailableRect 배열로 변환합니다.
 * 
 * @param placementRects 배치 가능 공간 배열
 * @param furnitureHeightMm 가구 높이 (mm)
 * @returns AvailableRect 배열
 */
export function convertPlacementRectsToAvailableRects(
  placementRects: PlacementRect[],
  furnitureHeightMm: number
): AvailableRect[] {
  return placementRects.map(rect => 
    convertPlacementRectToAvailableRect(rect, furnitureHeightMm)
  );
}

/**
 * FilteredPlacementRect를 AvailableRect로 변환합니다.
 * 가구 크기로 필터링된 결과를 변환할 때 사용합니다.
 * 
 * @param filteredRect 필터링된 배치 가능 공간
 * @returns AvailableRect 형식으로 변환된 객체
 */
export function convertFilteredPlacementRectToAvailableRect(
  filteredRect: FilteredPlacementRect
): AvailableRect {
  // FilteredPlacementRect는 이미 furnitureHeight 정보를 포함하고 있음
  return convertPlacementRectToAvailableRect(
    filteredRect,
    filteredRect.furnitureHeight
  );
}

/**
 * 여러 FilteredPlacementRect를 AvailableRect 배열로 변환합니다.
 * 
 * @param filteredRects 필터링된 배치 가능 공간 배열
 * @returns AvailableRect 배열
 */
export function convertFilteredPlacementRectsToAvailableRects(
  filteredRects: FilteredPlacementRect[]
): AvailableRect[] {
  return filteredRects.map(rect => 
    convertFilteredPlacementRectToAvailableRect(rect)
  );
}

