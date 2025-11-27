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

// 2D 좌표
export interface Point2D {
  x: number;
  y: number;
}

// 사다리꼴 (4개 꼭짓점)
export interface Quadrilateral {
  topLeft: Point2D;     // 왼쪽 위
  topRight: Point2D;    // 오른쪽 위
  bottomRight: Point2D; // 오른쪽 아래
  bottomLeft: Point2D;  // 왼쪽 아래
}

// 스케일 정보
export interface ScaleInfo {
  scaleX: number;          // 폭용 mm → px 변환 비율 (roomWidthMm 기준)
  scaleY: number;          // 높이용 mm → px 변환 비율 (roomHeightMm 기준, 고정)
  blueRect: WallRect;      // 파란 사각형 (외곽 프레임, 고정)
  redRect: WallRect;       // 빨간 사각형 (정면 벽, 변동)
  wallVerticalPaddingPx?: number; // 벽 이미지 상하 패딩(px) - 정면/측면 일관 스케일링용
  leftWallQuad: Quadrilateral;  // 왼쪽 파란 벽 사다리꼴 영역
  rightWallQuad: Quadrilateral; // 오른쪽 파란 벽 사다리꼴 영역
}

// 기둥 타입 (PRD 기준)
export interface Pillar {
  pillarKey: number;
  x: number;  // 방 왼쪽 벽 기준 x 위치 (mm)
  cornerYn?: boolean;  // 코너장 기둥 여부
  pillarStyle?: 'RS' | 'CS' | 'DU';  // 기둥 스타일: 후면 싱글, 센터 싱글, 듀얼
}

// 선반 타입 정의 (공통)
export type ShelfType = 'normal' | 'hanger' | 'drawer';
export type ShelfMaterial = 'wood' | 'white_sheet';

// 선반 타입 (카탈로그 + 배치된 인스턴스 통합)
export interface Shelf {
  shelfKey: number;        // 배치 시 생성되는 인스턴스 ID (카탈로그에선 0)
  prodKey: number;         // 상품 고유 ID
  sectionKey?: number;     // 섹션 참조 ID (배치 후 설정)
  type: ShelfType;         // 선반 종류: 일반, 옷걸이, 서랍
  x: number;               // 선반 폭/길이 (mm)
  y: number;               // 높이 위치 (mm) (카탈로그에선 0)
  z: number;               // 깊이 (mm)
  t_limit: number;         // 상단 제약
  b_limit: number;         // 하단 제약
  // 상품 정보 (카탈로그용, 선택적)
  name?: string;           // 상품명
  material?: ShelfMaterial; // 재질
  materialName?: string;   // 재질 한글명
  price?: number;          // 가격
  image?: string;          // 이미지 경로
}

// 섹션(칸) 타입
export interface Section {
  sectionKey: number;
  startPillarKey: number;  // 시작 기둥 ID
  endPillarKey: number;    // 끝 기둥 ID
  x: number;               // 섹션 너비 (mm)
  shelves: Shelf[];       // 이 섹션에 속한 선반 배열
}

// 드래그 상태 타입
export interface DragState {
  type: 'pillar' | 'shelf' | 'furniture' | null;
  targetKey: number | null;
  startX?: number;        // 드래그 시작 마우스 위치 (px)
  startY?: number;        // 드래그 시작 마우스 위치 (px)
  originalX?: number;     // 기둥/가구 원래 x 위치 (mm)
  originalHeightMm?: number;  // 선반 원래 높이 (mm)
  ghostXMm?: number;      // 가구 드래그 시 고스트 x (mm)
  lastValidXMm?: number;  // 가구 드래그 시 마지막 유효 x (mm)
  offsetXMm?: number;     // 가구 드래그 시 마우스 기준 offset (mm)
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
  PILLAR_THICKNESS_MM: 0,     // 기둥 두께 (mm, 기본값 0) - 나중에 설정 가능하도록 GlobalSettings에 추가
  MIN_PILLAR_SPACING_MM: 400, // 기둥 간 최소 간격 (mm)
  MAX_PILLAR_SPACING_MM: 1000, // 기둥 간 최대 간격 (mm)
  MIN_SHELF_SPACING_MM: 300,  // 선반 간 최소 간격 (mm)
  MIN_SHELF_LENGTH_MM: 500,   // 선반 최소 길이 (mm)
  SHELF_THICKNESS_PX: 10,     // 선반 두께 (px)
};

// 가구 크기 정보 (AABB 충돌 감지용)
// 각 가구 타입별로 실제 물리적 크기를 mm 단위로 정의
export interface FurnitureDimensions {
  widthMm?: number;   // 가로 크기 (mm) - 가변인 경우 undefined
  heightMm: number;   // 세로 크기/두께 (mm) - AABB 계산 시 사용
  depthMm: number;    // 깊이 (mm)
}

// 가구 메타 정보 (카탈로그/배치 공통)
export interface FurnitureProduct {
  prodKey: number;
  name: string;
  widthMm: number;
  heightMm: number;
  price?: number;
  image?: string;
}

// 선반 타입별 크기 정보
export const FURNITURE_DIMENSIONS: Record<'normal' | 'hanger' | 'drawer', FurnitureDimensions> = {
  normal: {
    heightMm: 20,   // 일반 선반 두께
    depthMm: 400,   // 깊이
  },
  hanger: {
    heightMm: 20,   // 옷걸이 선반 두께
    depthMm: 400,   // 깊이
  },
  drawer: {
    heightMm: 150,  // 서랍 선반 높이 (서랍이 있어서 더 두꺼움)
    depthMm: 400,   // 깊이
  },
};

// 글로벌 설정 타입 정의
export interface GlobalSettings {
  roomInputStepMm: number;  // 방 크기 입력 필드 step 값
  shelfSpacingRules: {      // 선반 간격 규칙
    normal: { above: number; below: number };
    hanger: { above: number; below: number };
    drawer: { above: number; below: number };
  };
  gridSizeMm: number;  // 그리드 크기 (mm)
  pillarButtonOffsetMm: number;  // 기둥 추가 버튼 위치 오프셋 (mm)
  defaultSectionWidthMm: number;  // 섹션 기본 폭 (mm)
  shelfButtonDefaultOffsetMm: number;  // 선반 추가 버튼 기본 오프셋 (mm)
  shelfCreateDefaultOffsetMm: number;  // 새 선반 생성 시 오프셋 (mm)
  buttonSizes: {  // 버튼 크기 (px)
    pillarAdd: { width: number; height: number };
    shelfAdd: { radius: number };
    sectionDelete: { width: number; height: number };
  };
  sectionDeleteButtonOffsetMm: number;  // 섹션 삭제 버튼 위치 오프셋 (mm)
  maxPillarOutsideMm: number;  // 기둥 외부 이동 허용 범위 (mm)
  wallVerticalPaddingPx: number;  // 벽 이미지 수직 패딩 (px)
  visualWidthConstraints: {  // 시각적 폭 제한 (mm)
    min: number;
    max: number;
  };
  roomShapeLabels: {  // 방 형태 라벨 매핑
    'ㄱ': string;
    'ㄴ': string;
    'ㄷ': string;
    'ㅁ': string;
  };
  pillarStyleColors: {  // 기둥 스타일 색상
    RS: string;
    CS: string;
    DU: string;
    default: string;
  };
  uiColors: {  // UI 색상 테마
    primary: string;
    primaryDark: string;
    gray: string;
    lightGray: string;
    green: string;
  };
  modalSizes: {  // 모달 크기 (px)
    small: number;
    medium: number;
    large: number;
  };
  zIndexLayers: {  // z-index 레이어
    modal: number;
    overlay: number;
  };
  pillarThicknessMm: number;  // 기둥 두께 (mm) - CS/DU 기둥 충돌 체크 시 사용, 기본값 0
}

// 글로벌 설정 기본값
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  roomInputStepMm: 50,
  shelfSpacingRules: {
    normal: { above: 300, below: 300 },
    hanger: { above: 300, below: 1000 },
    drawer: { above: 500, below: 300 },
  },
  gridSizeMm: 100,
  pillarButtonOffsetMm: 600,
  defaultSectionWidthMm: 800,
  shelfButtonDefaultOffsetMm: 400,
  shelfCreateDefaultOffsetMm: 300,
  buttonSizes: {
    pillarAdd: { width: 70, height: 30 },
    shelfAdd: { radius: 11 },
    sectionDelete: { width: 24, height: 14 },
  },
  sectionDeleteButtonOffsetMm: 50,
  maxPillarOutsideMm: 300,
  wallVerticalPaddingPx: 110,
  visualWidthConstraints: {
    min: 2000,
    max: 5000,
  },
  roomShapeLabels: {
    'ㄱ': 'ㄱ자 방',
    'ㄴ': 'ㄴ자 방',
    'ㄷ': 'ㄷ자 방',
    'ㅁ': 'ㅁ자 방',
  },
  pillarStyleColors: {
    RS: '#000000',
    CS: '#808080',
    DU: '#D3D3D3',
    default: '#FF8C00',
  },
  uiColors: {
    primary: '#007AFF',
    primaryDark: '#0056b3',
    gray: '#e0e0e0',
    lightGray: '#f5f5f5',
    green: '#4CAF50',
  },
  modalSizes: {
    small: 400,
    medium: 700,
    large: 900,
  },
  zIndexLayers: {
    modal: 9999,
    overlay: 999,
  },
  pillarThicknessMm: PILLAR_SHELF_CONSTRAINTS.PILLAR_THICKNESS_MM,  // 기둥 두께 (mm, 기본값 0)
};

// ShelfProduct 타입은 제거하고 Shelf 타입으로 통일
// JSON 카탈로그도 Shelf 구조 사용

// 바닥 가구 배치 가능 공간 정보
export interface PlacementRect {
  // 위치 및 크기 정보
  x: number;           // 시작 x 좌표 (mm)
  y: number;           // 시작 y 좌표 (바닥 위치, mm)
  width: number;       // 가로 길이 (mm)
  height: number;      // 배치 가능한 세로 높이 (mm) - 선반 제약 고려
  
  // 메타 정보
  faceId: string;      // 어느 벽면인지 (예: 'front', 'left', 'right')
  sectionIndices: number[];  // 포함된 칸 인덱스들 (예: [0], [0,1], [1,2])
  isEmptyWallIncluded: boolean;  // 빈 벽 영역이 포함되었는지
  
  // 제약 정보
  lowestShelfY?: number;  // 가장 낮은 선반의 y 위치 (mm, 없으면 undefined)
  affectedShelves: number[];  // 이 영역에 영향을 주는 선반 shelfKey들
}

// 특정 가구에 맞는 배치 가능 공간 (필터링된 결과)
export interface FilteredPlacementRect extends PlacementRect {
  furnitureWidth: number;   // 확인한 가구 가로 (mm)
  furnitureHeight: number;  // 확인한 가구 세로 (mm)
  canFit: boolean;          // 배치 가능 여부
  remainingWidth: number;   // 남는 가로 공간 (mm)
  remainingHeight: number;  // 남는 세로 공간 (mm)
}

// 기본값
export const DEFAULT_ROOM: RoomState = {
  roomWidthMm: 5000,
  roomHeightMm: 3400,  // 높이 고정값
  roomDepthMm: 500,
};
