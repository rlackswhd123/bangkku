// placement.example.ts: 배치 가능 공간 계산 사용 예시

import type { Section, Pillar } from '../types';
import {
  calculatePlacementRects,
  filterPlacementRectsByFurniture,
  sortPlacementRectsByWidth,
  sortPlacementRectsByArea,
} from './placement';

/**
 * 사용 예시 1: 기본적인 배치 가능 공간 계산
 */
export function example1_BasicPlacement() {
  // 예시 데이터: 3개의 기둥 (0, 800, 1500mm), 2개의 칸
  const pillars: Pillar[] = [
    { pillarKey: 1, x: 0 },
    { pillarKey: 2, x: 800 },
    { pillarKey: 3, x: 1500 },
  ];

  const sections: Section[] = [
    {
      sectionKey: 1,
      startPillarKey: 1,
      endPillarKey: 2,
      x: 800,
      shelves: [
        { shelfKey: 1, prodKey: 101, type: 'normal', x: 800, y: 600, z: 400, t_limit: 300, b_limit: 300 },
      ],
    },
    {
      sectionKey: 2,
      startPillarKey: 2,
      endPillarKey: 3,
      x: 700,
      shelves: [
        { shelfKey: 2, prodKey: 102, type: 'normal', x: 700, y: 400, z: 400, t_limit: 300, b_limit: 300 },
      ],
    },
  ];

  const faceWidthMm = 3000; // 벽 전체 너비
  const roomHeightMm = 2400; // 방 높이

  // 모든 배치 가능 공간 계산
  const allRects = calculatePlacementRects('front', sections, pillars, faceWidthMm, roomHeightMm);

  console.log('=== 모든 배치 가능 공간 ===');
  allRects.forEach((rect, idx) => {
    console.log(`${idx + 1}. x: ${rect.x}, width: ${rect.width}, height: ${rect.height}`);
    console.log(`   칸 인덱스: [${rect.sectionIndices.join(', ')}]`);
    console.log(`   빈벽 포함: ${rect.isEmptyWallIncluded}`);
    console.log(`   가장 낮은 선반 y: ${rect.lowestShelfY ?? '없음'}`);
    console.log('');
  });

  return allRects;
}

/**
 * 사용 예시 2: 특정 가구 크기에 맞는 공간 필터링
 */
export function example2_FilterByFurniture() {
  // 예시 1의 결과 사용
  const allRects = example1_BasicPlacement();

  // 가구 크기: 800mm x 500mm
  const furnitureWidthMm = 800;
  const furnitureHeightMm = 500;

  // 가구에 맞는 공간만 필터링
  const fittableRects = filterPlacementRectsByFurniture(allRects, furnitureWidthMm, furnitureHeightMm);

  console.log('=== 가구(800x500)가 들어갈 수 있는 공간 ===');
  fittableRects.forEach((rect, idx) => {
    console.log(`${idx + 1}. x: ${rect.x}, width: ${rect.width}, height: ${rect.height}`);
    console.log(`   칸 인덱스: [${rect.sectionIndices.join(', ')}]`);
    console.log(`   남은 공간: ${rect.remainingWidth}mm(가로) x ${rect.remainingHeight}mm(세로)`);
    console.log('');
  });

  return fittableRects;
}

/**
 * 사용 예시 3: 정렬 기능 활용
 */
export function example3_Sorting() {
  const fittableRects = example2_FilterByFurniture();

  // 너비 기준 내림차순 정렬
  const sortedByWidth = sortPlacementRectsByWidth(fittableRects, true);
  console.log('=== 너비 큰 순서 ===');
  sortedByWidth.forEach((rect, idx) => {
    console.log(`${idx + 1}. width: ${rect.width}mm, height: ${rect.height}mm`);
  });

  // 면적 기준 내림차순 정렬
  const sortedByArea = sortPlacementRectsByArea(fittableRects, true);
  console.log('\n=== 면적 큰 순서 ===');
  sortedByArea.forEach((rect, idx) => {
    const area = rect.width * rect.height;
    console.log(`${idx + 1}. 면적: ${area}mm², width: ${rect.width}mm, height: ${rect.height}mm`);
  });

  return { sortedByWidth, sortedByArea };
}

/**
 * 사용 예시 4: 빈 벽 영역 포함 케이스
 */
export function example4_EmptyWall() {
  // 예시 데이터: 2개의 기둥만 (벽 중간까지만 차지)
  const pillars: Pillar[] = [
    { pillarKey: 1, x: 0 },
    { pillarKey: 2, x: 800 },
  ];

  const sections: Section[] = [
    {
      sectionKey: 1,
      startPillarKey: 1,
      endPillarKey: 2,
      x: 800,
      shelves: [
        { shelfKey: 1, prodKey: 101, type: 'normal', x: 800, y: 600, z: 400, t_limit: 300, b_limit: 300 },
      ],
    },
  ];

  const faceWidthMm = 3000; // 벽 전체 너비 (1500mm ~ 3000mm는 빈 벽)
  const roomHeightMm = 2400;

  const allRects = calculatePlacementRects('front', sections, pillars, faceWidthMm, roomHeightMm);

  console.log('=== 빈 벽 영역 포함 케이스 ===');
  allRects.forEach((rect, idx) => {
    console.log(`${idx + 1}. x: ${rect.x}, width: ${rect.width}, height: ${rect.height}`);
    console.log(`   칸 인덱스: [${rect.sectionIndices.join(', ')}]`);
    console.log(`   빈벽 포함: ${rect.isEmptyWallIncluded}`);
    console.log('');
  });

  // 큰 가구 (1500mm x 800mm) 필터링
  const bigFurniture = filterPlacementRectsByFurniture(allRects, 1500, 800);
  console.log(`큰 가구(1500x800)가 들어갈 수 있는 공간: ${bigFurniture.length}개`);
  bigFurniture.forEach((rect, idx) => {
    console.log(`${idx + 1}. x: ${rect.x}, width: ${rect.width}mm (빈벽 포함: ${rect.isEmptyWallIncluded})`);
  });

  return allRects;
}

/**
 * 사용 예시 5: 선반이 없는 칸들
 */
export function example5_NoShelves() {
  const pillars: Pillar[] = [
    { pillarKey: 1, x: 0 },
    { pillarKey: 2, x: 800 },
    { pillarKey: 3, x: 1600 },
  ];

  const sections: Section[] = [
    {
      sectionKey: 1,
      startPillarKey: 1,
      endPillarKey: 2,
      x: 800,
      shelves: [], // 선반 없음
    },
    {
      sectionKey: 2,
      startPillarKey: 2,
      endPillarKey: 3,
      x: 800,
      shelves: [], // 선반 없음
    },
  ];

  const faceWidthMm = 2000;
  const roomHeightMm = 2400;

  const allRects = calculatePlacementRects('front', sections, pillars, faceWidthMm, roomHeightMm);

  console.log('=== 선반이 없는 경우 (전체 높이 사용 가능) ===');
  allRects.forEach((rect, idx) => {
    console.log(`${idx + 1}. x: ${rect.x}, width: ${rect.width}, height: ${rect.height}`);
    console.log(`   높이가 roomHeightMm과 같음: ${rect.height === roomHeightMm}`);
  });

  return allRects;
}

// 모든 예시 실행
export function runAllExamples() {
  console.log('\n🔍 예시 1: 기본 배치 공간 계산\n');
  example1_BasicPlacement();

  console.log('\n🔍 예시 2: 가구 크기로 필터링\n');
  example2_FilterByFurniture();

  console.log('\n🔍 예시 3: 정렬 기능\n');
  example3_Sorting();

  console.log('\n🔍 예시 4: 빈 벽 영역 포함\n');
  example4_EmptyWall();

  console.log('\n🔍 예시 5: 선반이 없는 경우\n');
  example5_NoShelves();
}

