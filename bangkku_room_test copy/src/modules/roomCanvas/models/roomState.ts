// roomState.ts: 전체 방 상태 타입 및 직렬화 로직
import { RoomShape, FaceId, getActiveFaces } from './roomShape';
import { RoomFaceState, createEmptyFaceState } from './roomFace';
import { Shelf, Section } from '../../../types';

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
 * 선반을 y 좌표 기준 오름차순 정렬 (위에서 아래로)
 */
function sortShelvesByY(shelves: Shelf[]): Shelf[] {
  return [...shelves].sort((a, b) => a.y - b.y);
}

/**
 * 섹션 내 선반들을 y 좌표 기준으로 정렬
 */
function sortSectionsShelves(sections: Section[]): Section[] {
  return sections.map(section => ({
    ...section,
    shelves: sortShelvesByY(section.shelves),
  }));
}

/**
 * 면 상태의 선반들을 정렬 (섹션 중심 구조: sections[].shelves만 정렬)
 */
function sortFaceShelves(face: RoomFaceState): RoomFaceState {
  return {
    ...face,
    sections: sortSectionsShelves(face.sections),
  };
}

/**
 * 방 상태의 모든 면의 선반들을 정렬
 */
function sortAllShelves(state: MultiRoomState): MultiRoomState {
  return {
    ...state,
    faces: {
      1: sortFaceShelves(state.faces[1]),
      2: sortFaceShelves(state.faces[2]),
      3: sortFaceShelves(state.faces[3]),
      4: sortFaceShelves(state.faces[4]),
    },
  };
}

/**
 * 방 상태 직렬화 (저장용)
 * 저장 전에 선반들을 y 좌표 기준으로 정렬합니다.
 */
export function serializeRoomState(state: MultiRoomState): string {
  // 저장 직전에 선반 정렬
  const sortedState = sortAllShelves(state);
  return JSON.stringify(sortedState, null, 2);
}

/**
 * 방 상태 역직렬화 (불러오기용)
 */
export function deserializeRoomState(json: string): MultiRoomState {
  const parsed = JSON.parse(json);
  
  const faces: Record<FaceId, RoomFaceState> = {
    1: migrateFace(parsed.faces?.[1], 1),
    2: migrateFace(parsed.faces?.[2], 2),
    3: migrateFace(parsed.faces?.[3], 3),
    4: migrateFace(parsed.faces?.[4], 4),
  };

  return {
    roomName: parsed.roomName || '내 방',
    roomShape: parsed.roomShape || 'ㅁ',
    activeFaceId: parsed.activeFaceId || 1,
    faces,
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
  
  // 레거시 데이터를 1번 면에 배치 (섹션 중심 구조: shelves 필드 제거)
  state.faces[1] = {
    faceKey: 1,
    space_x: 0,
    space_y: 0,
    face_x: legacyRoom.roomWidthMm ?? 5000,
    face_y: legacyRoom.roomHeightMm ?? 3400,
    face_count: 1,
    pillars: legacyPillars || [],
    sections: [], // 레거시 선반은 섹션이 없으므로 빈 배열 (필요시 섹션으로 마이그레이션 가능)
    hasShelf: (legacyPillars?.length ?? 0) > 0 || (legacyShelves?.length ?? 0) > 0,
  };

  return state;
}

function migrateFace(face: RoomFaceState | undefined, faceKey: FaceId): RoomFaceState {
  if (!face) {
    return createEmptyFaceState(faceKey);
  }

  if ('faceKey' in face) {
    return face;
  }

  const width = (face as any).dimensions?.widthMm ?? 5000;
  const height = (face as any).dimensions?.heightMm ?? 3400;

  return {
    faceKey,
    space_x: 0,
    space_y: 0,
    face_x: width,
    face_y: height,
    face_count: 1,
    pillars: (face as any).pillars ?? [],
    sections: (face as any).sections ?? [],
    hasShelf: (face as any).hasShelf ?? false,
  };
}

