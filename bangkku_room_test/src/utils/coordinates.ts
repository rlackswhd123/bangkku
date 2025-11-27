// coordinates.ts: mm↔px 변환, 스케일 계산, 그리드 스냅 유틸리티
import { ScaleInfo } from '../types';

/**
 * mm 좌표를 화면 픽셀 좌표로 변환
 */
export function mmToPixel(
  mmValue: number,
  scale: number
): number {
  return mmValue * scale;
}

/**
 * 화면 픽셀 좌표를 mm 좌표로 변환
 */
export function pixelToMm(
  pixelValue: number,
  scale: number
): number {
  return pixelValue / scale;
}

/**
 * 방 크기에 맞는 스케일 및 사각형 위치 계산 (PRD 기준)
 * - 파란 사각형: 고정된 외곽 프레임
 * - 빨간 사각형: 방 크기에 따라 시각적으로 커지거나 작아짐
 * - 화면에 표시되는 시각적 폭은 설정값으로 제한됨 (사용자 입력은 그 이상/이하 가능)
 */
export function calculateScale(
  canvasWidth: number,
  canvasHeight: number,
  roomWidthMm: number,
  roomHeightMm: number,
  visualWidthConstraints?: { min: number; max: number },
  wallVerticalPaddingPx: number = 0,
): ScaleInfo {
  // 화면 표현용 폭 제한 (실제 입력 값은 제한 없음)
  const MIN_VISUAL_WIDTH_MM = visualWidthConstraints?.min ?? 2000;
  const MAX_VISUAL_WIDTH_MM = visualWidthConstraints?.max ?? 5000;
  
  // 파란 사각형: 캔버스의 90% 정도를 차지하도록 고정
  const BLUE_RECT_MARGIN = 0.05; // 5% 여백
  const blueWidth = canvasWidth * (1 - BLUE_RECT_MARGIN * 2);
  const blueHeight = canvasHeight * (1 - BLUE_RECT_MARGIN * 2);
  const blueX = canvasWidth * BLUE_RECT_MARGIN;
  const blueY = canvasHeight * BLUE_RECT_MARGIN;
  
  // 빨간 사각형 높이는 고정 (캔버스 높이의 60% 정도)
  const FIXED_RED_HEIGHT = canvasHeight * 0.6;
  
  // 기본 스케일 계산 (기본 방 크기 기준)
  // 기본 방 크기(DEFAULT_ROOM.roomWidthMm = 5000mm)가 파란 네모의 70%를 차지하도록 설정
  const DEFAULT_ROOM_WIDTH_MM = 5000;
  const marginFactor = 0.7; // 파란 사각형 안에 여백을 남김
  const baseScaleX = (blueWidth * marginFactor) / DEFAULT_ROOM_WIDTH_MM;
  
  // 실제 방 폭을 기본 스케일로 계산한 픽셀 폭
  const unclampedWidthPx = roomWidthMm * baseScaleX;
  
  // 최소/최대 시각적 폭을 픽셀로 변환
  const minWidthPx = MIN_VISUAL_WIDTH_MM * baseScaleX;
  const maxWidthPx = MAX_VISUAL_WIDTH_MM * baseScaleX;
  
  // 시각적 폭을 2000~5000mm 범위로 제한
  const visualWidthPx = Math.min(Math.max(unclampedWidthPx, minWidthPx), maxWidthPx);
  
  // 제한된 시각적 폭을 기준으로 새 scaleX 계산
  const scaleX = roomWidthMm > 0 ? visualWidthPx / roomWidthMm : baseScaleX;
  
  // scaleY: 높이용 스케일 (roomHeightMm 기준으로 고정, 폭 변경과 무관)
  const scaleY = FIXED_RED_HEIGHT / roomHeightMm;
  
  // 빨간 사각형 크기 계산
  const redWidthPx = roomWidthMm * scaleX;
  const redHeightPx = roomHeightMm * scaleY;
  
  // 빨간 사각형이 파란 사각형을 벗어나지 않도록 제한
  const maxRedWidth = blueWidth * 0.95; // 파란 네모의 95%를 넘지 않도록
  const constrainedRedWidth = Math.min(redWidthPx, maxRedWidth);
  
  // 빨간 사각형 위치 (파란 사각형 기준 중앙 정렬)
  const blueCenterX = blueX + blueWidth / 2;
  const blueCenterY = blueY + blueHeight / 2;
  const redX = blueCenterX - constrainedRedWidth / 2;
  const redY = blueCenterY - redHeightPx / 2;
  
  // 왼쪽/오른쪽 파란 벽 사다리꼴 좌표 계산
  // 일점 투시도 기준: 소실점을 화면 중앙으로 설정
  // const vanishingPointX = blueCenterX; // 현재는 사용되지 않지만 향후 투시 계산에 필요할 수 있음
  const vanishingPointY = blueCenterY;
  
  // 왼쪽 파란 벽 사다리꼴 (blueRect 왼쪽 여백 ~ redRect 왼쪽 경계)
  const leftWallLeft = blueX;
  const leftWallRight = redX;
  const SNAPSHOT_OFFSET_Y = 2; // 스냅샷 사다리꼴 전체를 위로 올리는 오프셋(px)
  const leftWallTop = redY - wallVerticalPaddingPx - SNAPSHOT_OFFSET_Y;
  const leftWallBottom = redY + redHeightPx + wallVerticalPaddingPx - SNAPSHOT_OFFSET_Y;
  
  // 소실점으로 수렴하는 각도 계산 (간단한 선형 근사)
  const perspectiveFactor = 0.27; // 투시 강도 (0~1)
  
  // 왼쪽 벽: 오른쪽 엣지(코너 쪽)를 소실점으로 당겨서 안쪽으로 좁아지게
  const leftWallQuad = {
    topLeft: {
      x: leftWallLeft,
      y: leftWallTop,
    },
    topRight: {
      x: leftWallRight,
      y: leftWallTop + (vanishingPointY - leftWallTop) * perspectiveFactor,
    },
    bottomRight: {
      x: leftWallRight,
      y: leftWallBottom - (leftWallBottom - vanishingPointY) * perspectiveFactor,
    },
    bottomLeft: {
      x: leftWallLeft,
      y: leftWallBottom,
    },
  };
  
  // 오른쪽 파란 벽 사다리꼴 (redRect 오른쪽 경계 ~ blueRect 오른쪽 여백)
  const rightWallLeft = redX + constrainedRedWidth;
  const rightWallRight = blueX + blueWidth;
  const rightWallTop = redY - wallVerticalPaddingPx - SNAPSHOT_OFFSET_Y;
  const rightWallBottom = redY + redHeightPx + wallVerticalPaddingPx - SNAPSHOT_OFFSET_Y;
  
  // 오른쪽 벽: 왼쪽 엣지(코너 쪽)를 소실점으로 당겨서 안쪽으로 좁아지게
  const rightWallQuad = {
    topLeft: {
      x: rightWallLeft,
      y: rightWallTop + (vanishingPointY - rightWallTop) * perspectiveFactor,
    },
    topRight: {
      x: rightWallRight,
      y: rightWallTop,
    },
    bottomRight: {
      x: rightWallRight,
      y: rightWallBottom,
    },
    bottomLeft: {
      x: rightWallLeft,
      y: rightWallBottom - (rightWallBottom - vanishingPointY) * perspectiveFactor,
    },
  };
  
  return {
    scaleX, // 시각적 폭 제한이 반영된 scaleX
    scaleY,
    blueRect: {
      x: blueX,
      y: blueY,
      width: blueWidth,
      height: blueHeight,
    },
    redRect: {
      x: redX,
      y: redY,
      width: constrainedRedWidth,
      height: redHeightPx,
    },
    wallVerticalPaddingPx,
    leftWallQuad,
    rightWallQuad,
  };
}

/**
 * X축: mm를 px로 변환 (PRD 기준)
 * 방 왼쪽 벽(0mm) → redRect.x
 */
export function mmToPxX(xMm: number, scaleInfo: ScaleInfo): number {
  return scaleInfo.redRect.x + xMm * scaleInfo.scaleX;
}

/**
 * Y축: mm를 px로 변환 (PRD 기준)
 * 바닥(0mm) → redRect.y + redRect.height
 * 위로 올라갈수록 yMm 증가, yPx 감소
 */
export function mmToPxY(yMm: number, scaleInfo: ScaleInfo): number {
  const { redRect, scaleY } = scaleInfo;
  return redRect.y + redRect.height - (yMm * scaleY);
}

/**
 * X축: px를 mm로 변환 (PRD 기준)
 */
export function pxToMmX(xPx: number, scaleInfo: ScaleInfo): number {
  return (xPx - scaleInfo.redRect.x) / scaleInfo.scaleX;
}

/**
 * Y축: px를 mm로 변환 (PRD 기준)
 */
export function pxToMmY(yPx: number, scaleInfo: ScaleInfo): number {
  const { redRect, scaleY } = scaleInfo;
  return (redRect.y + redRect.height - yPx) / scaleY;
}

/**
 * 그리드 스냅: 값을 그리드 간격 단위로 반올림
 */
export function snapToGrid(valueMm: number, gridSizeMm: number): number {
  return Math.round(valueMm / gridSizeMm) * gridSizeMm;
}

