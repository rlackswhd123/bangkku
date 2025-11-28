// roomShape.ts: 방 형태(ㄱ/ㄴ/ㄷ/ㅁ) 정의 및 Face 구성 매핑

/**
 * 방 형태 타입
 */
export type RoomShape = 'ㄱ' | 'ㄴ' | 'ㄷ' | 'ㅁ';

/**
 * 면 ID (1~4면)
 */
export type FaceId = 1 | 2 | 3 | 4;

/**
 * 방 형태별 사용 가능한 면 구성
 */
export interface RoomShapeConfig {
  shape: RoomShape;
  activeFaces: FaceId[]; // 해당 형태에서 사용되는 면 ID 배열
  description: string;
}

/**
 * 방 형태별 설정 맵핑
 */
export const ROOM_SHAPE_CONFIGS: Record<RoomShape, RoomShapeConfig> = {
  'ㄱ': {
    shape: 'ㄱ',
    activeFaces: [1, 2],
    description: 'ㄱ자 형태 방 (2개 면)',
  },
  'ㄴ': {
    shape: 'ㄴ',
    activeFaces: [1, 4],
    description: 'ㄴ자 형태 방 (2개 면)',
  },
  'ㄷ': {
    shape: 'ㄷ',
    activeFaces: [1, 2, 3],
    description: 'ㄷ자 형태 방 (3개 면)',
  },
  'ㅁ': {
    shape: 'ㅁ',
    activeFaces: [1, 2, 3, 4],
    description: 'ㅁ자 형태 방 (4개 면)',
  },
};

/**
 * 주어진 방 형태에 대해 활성화된 면 ID 배열을 반환
 */
export function getActiveFaces(shape: RoomShape): FaceId[] {
  return ROOM_SHAPE_CONFIGS[shape].activeFaces;
}

/**
 * 특정 면이 해당 방 형태에서 사용 가능한지 확인
 */
export function isFaceActiveInShape(shape: RoomShape, faceId: FaceId): boolean {
  return ROOM_SHAPE_CONFIGS[shape].activeFaces.includes(faceId);
}

/**
 * 현재 면에서 이동 가능한 면 목록 반환
 * @param shape - 방 형태
 * @param currentFaceId - 현재 면 ID
 * @returns 이동 가능한 면 ID 배열
 */
export function getNavigableFaces(shape: RoomShape, currentFaceId: FaceId): FaceId[] {
  const activeFaces = ROOM_SHAPE_CONFIGS[shape].activeFaces;
  
  // 현재 면이 이동 가능한 면 목록에 없으면 빈 배열 반환
  if (!activeFaces.includes(currentFaceId)) {
    return [];
  }
  
  // 현재 면을 제외한 이동 가능한 면들 반환
  return activeFaces.filter(faceId => faceId !== currentFaceId);
}

/**
 * 물리적 인접 면 계산 (1면의 왼쪽=4면, 오른쪽=2면)
 * @param currentFaceId - 현재 면 ID
 * @param direction - 'left' 또는 'right'
 * @returns 인접 면 ID
 */
export function getPhysicalAdjacentFace(currentFaceId: FaceId, direction: 'left' | 'right'): FaceId {
  if (direction === 'left') {
    // 왼쪽: 1->4, 2->1, 3->2, 4->3
    return (currentFaceId === 1 ? 4 : (currentFaceId - 1)) as FaceId;
  } else {
    // 오른쪽: 1->2, 2->3, 3->4, 4->1
    return (currentFaceId === 4 ? 1 : (currentFaceId + 1)) as FaceId;
  }
}

