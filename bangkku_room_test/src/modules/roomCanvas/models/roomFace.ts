// roomFace.ts: 면별 상태 인터페이스 정의
import { Pillar, Shelf } from '../../../types';
import { FaceId } from './roomShape';

/**
 * 각 면의 치수 정보
 */
export interface FaceDimensions {
  widthMm: number;  // 면의 폭 (mm)
  heightMm: number; // 면의 높이 (mm)
  depthMm: number;  // 면의 깊이 (mm) - 3D 효과용
}

/**
 * 각 면의 상태
 */
export interface RoomFaceState {
  faceId: FaceId;
  dimensions: FaceDimensions;
  pillars: Pillar[];      // 이 면에 배치된 기둥 배열
  shelves: Shelf[];       // 이 면에 배치된 선반 배열
  hasShelf: boolean;      // 시스템 선반 설치 여부
}

/**
 * 기본 면 치수 값
 */
export const DEFAULT_FACE_DIMENSIONS: FaceDimensions = {
  widthMm: 5000,
  heightMm: 3400,
  depthMm: 500,
};

/**
 * 새로운 면 상태 생성
 */
export function createEmptyFaceState(faceId: FaceId, dimensions?: Partial<FaceDimensions>): RoomFaceState {
  return {
    faceId,
    dimensions: {
      ...DEFAULT_FACE_DIMENSIONS,
      ...dimensions,
    },
    pillars: [],
    shelves: [],
    hasShelf: false,
  };
}

/**
 * 면에 시스템 선반이 설치되어 있는지 확인
 */
export function hasFaceShelf(face: RoomFaceState): boolean {
  return face.hasShelf || face.pillars.length > 0 || face.shelves.length > 0;
}

