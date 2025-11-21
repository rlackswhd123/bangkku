// roomState.ts: 전체 방 상태 타입 및 직렬화 로직
import { RoomShape, FaceId, getActiveFaces } from './roomShape';
import { RoomFaceState, createEmptyFaceState, DEFAULT_FACE_DIMENSIONS } from './roomFace';

/**
 * 전체 방 상태
 */
export interface MultiRoomState {
  roomName: string;        // 방 이름
  roomShape: RoomShape;    // 방 형태 (ㄱ/ㄴ/ㄷ/ㅁ)
  activeFaceId: FaceId;    // 현재 선택된 면 ID
  faces: Record<FaceId, RoomFaceState>; // 면별 상태 맵
}

/**
 * 초기 방 상태 생성
 */
export function createInitialRoomState(
  roomName: string = '내 방',
  roomShape: RoomShape = 'ㅁ'
): MultiRoomState {
  const activeFaces = getActiveFaces(roomShape);
  
  // 모든 면(1~4)에 대한 기본 상태 생성
  const faces: Record<FaceId, RoomFaceState> = {
    1: createEmptyFaceState(1),
    2: createEmptyFaceState(2),
    3: createEmptyFaceState(3),
    4: createEmptyFaceState(4),
  };

  return {
    roomName,
    roomShape,
    activeFaceId: activeFaces[0] || 1, // 첫 번째 활성 면을 기본 선택
    faces,
  };
}

/**
 * 방 형태 변경 시 면 상태 재초기화
 */
export function reinitializeFacesForShape(
  currentState: MultiRoomState,
  newShape: RoomShape
): MultiRoomState {
  const activeFaces = getActiveFaces(newShape);
  
  // 기존 면 데이터 유지하되, 새 형태에 맞게 재구성
  const faces: Record<FaceId, RoomFaceState> = {
    1: currentState.faces[1] || createEmptyFaceState(1),
    2: currentState.faces[2] || createEmptyFaceState(2),
    3: currentState.faces[3] || createEmptyFaceState(3),
    4: currentState.faces[4] || createEmptyFaceState(4),
  };

  return {
    ...currentState,
    roomShape: newShape,
    activeFaceId: activeFaces[0] || 1,
    faces,
  };
}

/**
 * 방 상태 직렬화 (저장용)
 */
export function serializeRoomState(state: MultiRoomState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * 방 상태 역직렬화 (불러오기용)
 */
export function deserializeRoomState(json: string): MultiRoomState {
  const parsed = JSON.parse(json);
  
  // 기본값 병합 (하위 호환성 유지)
  return {
    roomName: parsed.roomName || '내 방',
    roomShape: parsed.roomShape || 'ㅁ',
    activeFaceId: parsed.activeFaceId || 1,
    faces: parsed.faces || {
      1: createEmptyFaceState(1),
      2: createEmptyFaceState(2),
      3: createEmptyFaceState(3),
      4: createEmptyFaceState(4),
    },
  };
}

/**
 * 레거시 단일 면 상태에서 마이그레이션
 */
export interface LegacyRoomState {
  roomWidthMm: number;
  roomHeightMm: number;
  roomDepthMm: number;
}

export function migrateFromLegacyState(
  legacyRoom: LegacyRoomState,
  legacyPillars: any[],
  legacyShelves: any[]
): MultiRoomState {
  const state = createInitialRoomState('내 방', 'ㅁ');
  
  // 레거시 데이터를 1번 면에 배치
  state.faces[1] = {
    faceId: 1,
    dimensions: {
      widthMm: legacyRoom.roomWidthMm || DEFAULT_FACE_DIMENSIONS.widthMm,
      heightMm: legacyRoom.roomHeightMm || DEFAULT_FACE_DIMENSIONS.heightMm,
      depthMm: legacyRoom.roomDepthMm || DEFAULT_FACE_DIMENSIONS.depthMm,
    },
    pillars: legacyPillars || [],
    shelves: legacyShelves || [],
    hasShelf: legacyPillars.length > 0 || legacyShelves.length > 0,
  };

  return state;
}

