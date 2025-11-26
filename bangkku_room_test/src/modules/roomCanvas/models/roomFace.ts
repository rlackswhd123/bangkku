// roomFace.ts: 면별 상태 인터페이스 정의
import { Pillar, Shelf, Section } from '../../../types';
import { FaceId } from './roomShape';

/**
 * 각 면의 상태
 */
export interface RoomFaceState {
  faceKey: FaceId;
  space_x: number;      // 평형
  space_y: number;
  face_x: number;       // 벽면의 길이 (mm)
  face_y: number;       // 벽면의 높이 (mm)
  face_count: number;   // 면 개수
  pillars: Pillar[];      // 이 면에 배치된 기둥 배열
  sections: Section[];    // 이 면의 섹션(칸) 배열 (선반은 sections[].shelves에만 저장)
  hasShelf: boolean;      // 시스템 선반 설치 여부
}

const DEFAULT_FACE_METRICS = {
  space_x: 0,
  space_y: 0,
  face_x: 5000,
  face_y: 3400,
  face_count: 1,
};

/**
 * 새로운 면 상태 생성
 */
export function createEmptyFaceState(
  faceKey: FaceId,
  overrides?: Partial<Pick<RoomFaceState, 'space_x' | 'space_y' | 'face_x' | 'face_y' | 'face_count'>>
): RoomFaceState {
  return {
    faceKey,
    space_x: overrides?.space_x ?? DEFAULT_FACE_METRICS.space_x,
    space_y: overrides?.space_y ?? DEFAULT_FACE_METRICS.space_y,
    face_x: overrides?.face_x ?? DEFAULT_FACE_METRICS.face_x,
    face_y: overrides?.face_y ?? DEFAULT_FACE_METRICS.face_y,
    face_count: overrides?.face_count ?? DEFAULT_FACE_METRICS.face_count,
    pillars: [],
    sections: [],
    hasShelf: false,
  };
}

/**
 * 면에 시스템 선반이 설치되어 있는지 확인 (섹션 중심 구조)
 */
export function hasFaceShelf(face: RoomFaceState): boolean {
  const hasShelves = face.sections.some(section => section.shelves.length > 0);
  return face.hasShelf || face.pillars.length > 0 || hasShelves;
}

