import { ScaleInfo, WallRect, ROOM_CONSTRAINTS } from '../types';

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
 * - scaleX는 고정되어 내부 요소들의 시각적 거리는 유지됨
 */
export function calculateScale(
  canvasWidth: number,
  canvasHeight: number,
  roomWidthMm: number,
  roomHeightMm: number
): ScaleInfo {
  // 파란 사각형: 캔버스의 90% 정도를 차지하도록 고정
  const BLUE_RECT_MARGIN = 0.05; // 5% 여백
  const blueWidth = canvasWidth * (1 - BLUE_RECT_MARGIN * 2);
  const blueHeight = canvasHeight * (1 - BLUE_RECT_MARGIN * 2);
  const blueX = canvasWidth * BLUE_RECT_MARGIN;
  const blueY = canvasHeight * BLUE_RECT_MARGIN;
  
  // 빨간 사각형 높이는 고정 (캔버스 높이의 60% 정도)
  const FIXED_RED_HEIGHT = canvasHeight * 0.6;
  
  // scaleX를 고정값으로 설정 (기본 방 크기 기준)
  // 기본 방 크기(DEFAULT_ROOM.roomWidthMm = 5000mm)가 파란 네모의 70%를 차지하도록 설정
  const DEFAULT_ROOM_WIDTH_MM = 5000;
  const marginFactor = 0.7; // 파란 사각형 안에 여백을 남김
  const scaleX = (blueWidth * marginFactor) / DEFAULT_ROOM_WIDTH_MM;
  
  // scaleY: 높이용 스케일 (roomHeightMm 기준으로 고정, 폭 변경과 무관)
  const scaleY = FIXED_RED_HEIGHT / roomHeightMm;
  
  // 빨간 사각형 크기 계산 (방 크기에 따라 시각적으로 커지거나 작아짐)
  const redWidthPx = roomWidthMm * scaleX;
  const redHeightPx = roomHeightMm * scaleY;  // 또는 FIXED_RED_HEIGHT와 동일
  
  // 빨간 사각형이 파란 사각형을 벗어나지 않도록 제한
  const maxRedWidth = blueWidth * 0.95; // 파란 네모의 95%를 넘지 않도록
  const constrainedRedWidth = Math.min(redWidthPx, maxRedWidth);
  
  // 빨간 사각형 위치 (파란 사각형 기준 중앙 정렬)
  const blueCenterX = blueX + blueWidth / 2;
  const blueCenterY = blueY + blueHeight / 2;
  const redX = blueCenterX - constrainedRedWidth / 2;
  const redY = blueCenterY - redHeightPx / 2;
  
  return {
    scaleX, // 고정된 scaleX 사용
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
 * mm를 미터로 변환하여 표시용 문자열 생성
 */
export function formatMmToDisplay(mm: number): string {
  const meters = (mm / 1000).toFixed(1);
  return `${mm}mm (${meters}m)`;
}

/**
 * 그리드 스냅: 값을 그리드 간격(100mm) 단위로 반올림
 */
export function snapToGrid(valueMm: number, gridSizeMm: number = 100): number {
  return Math.round(valueMm / gridSizeMm) * gridSizeMm;
}

