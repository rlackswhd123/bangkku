// types.ts: 방/기둥/선반 편집 도메인의 공용 타입과 상수를 정의
// 방 상태 타입 정의
export interface RoomState {
  roomWidthMm: number;  // 방 폭 (mm)
  roomHeightMm: number; // 방 높이 (mm)
  roomDepthMm: number;  // 방 깊이 (mm) - 3D 효과용
}

// 화면 표시용 좌표계
export interface WallRect {
  x: number;      // 캔버스 상 x 좌표 (px)
  y: number;      // 캔버스 상 y 좌표 (px)
  width: number;  // 폭 (px)
  height: number; // 높이 (px)
}

// 스케일 정보
export interface ScaleInfo {
  scaleX: number;          // 폭용 mm → px 변환 비율 (roomWidthMm 기준)
  scaleY: number;          // 높이용 mm → px 변환 비율 (roomHeightMm 기준, 고정)
  blueRect: WallRect;      // 파란 사각형 (외곽 프레임, 고정)
  redRect: WallRect;       // 빨간 사각형 (정면 벽, 변동)
}

// 기둥 타입 (PRD 기준)
export interface Pillar {
  id: string;
  xMm: number;  // 방 왼쪽 벽 기준 x 위치 (mm)
  type: 'wall' | 'normal';  // 벽 기둥 vs 일반 기둥
  cornerPillar?: boolean;  // 코너장 기둥 여부
  pillarStyle?: 'rear-single' | 'center-single' | 'dual';  // 기둥 스타일: 후면 싱글, 센터 싱글, 듀얼
}

// 선반 타입 (PRD 기준)
export interface Shelf {
  id: string;
  startPillarId: string;  // 시작 기둥 ID
  endPillarId: string;    // 끝 기둥 ID
  heightMm: number;       // 바닥 기준 높이 (mm)
  type: 'normal' | 'hanger' | 'drawer';  // 선반 종류: 일반, 옷걸이, 서랍
  cornerShelf?: boolean;  // 코너장 여부
}

// 드래그 상태 타입
export interface DragState {
  type: 'pillar' | 'shelf' | null;
  targetId: string | null;
  startX?: number;        // 드래그 시작 마우스 위치 (px)
  startY?: number;        // 드래그 시작 마우스 위치 (px)
  originalXMm?: number;   // 기둥 원래 x 위치 (mm)
  originalHeightMm?: number;  // 선반 원래 높이 (mm)
}

// 방 크기 제약
export const ROOM_CONSTRAINTS = {
  MIN_WIDTH_MM: 1200,
  MAX_WIDTH_MM: 6000,
  MIN_HEIGHT_MM: 2000,
  MAX_HEIGHT_MM: 3000,
  MIN_DEPTH_MM: 400,
  MAX_DEPTH_MM: 600,
};

// 기둥/선반 제약
export const PILLAR_SHELF_CONSTRAINTS = {
  PILLAR_WIDTH_PX: 10,        // 기둥 폭 (px, 고정)
  MIN_PILLAR_SPACING_MM: 400, // 기둥 간 최소 간격 (mm)
  MAX_PILLAR_SPACING_MM: 1000, // 기둥 간 최대 간격 (mm)
  MIN_SHELF_SPACING_MM: 300,  // 선반 간 최소 간격 (mm)
  MIN_SHELF_LENGTH_MM: 500,   // 선반 최소 길이 (mm)
  SHELF_THICKNESS_PX: 10,     // 선반 두께 (px)
};

// 기본값
export const DEFAULT_ROOM: RoomState = {
  roomWidthMm: 5000,
  roomHeightMm: 3400,  // 높이 고정값
  roomDepthMm: 500,
};

