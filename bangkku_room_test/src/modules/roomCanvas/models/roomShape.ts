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
    activeFaces: [1, 2, 3],
    description: 'ㄴ자 형태 방 (3개 면)',
  },
  'ㄷ': {
    shape: 'ㄷ',
    activeFaces: [1, 2, 3, 4],
    description: 'ㄷ자 형태 방 (4개 면)',
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

