// services/initializeFacesByShape.ts: 형태별 면 초기화 로직
import { RoomShape, getActiveFaces } from '../models/roomShape';
import { MultiRoomState } from '../models/roomState';
import { createEmptyFaceState } from '../models/roomFace';

/**
 * 방 형태에 따라 면별 초기 치수를 다르게 설정할 수 있음 (선택 사항)
 */
export function initializeFacesForShape(
  currentState: MultiRoomState,
  shape: RoomShape
): MultiRoomState {
  const activeFaces = getActiveFaces(shape);

  // 새로운 면 상태 생성
  const newFaces = {
    1: currentState.faces[1] || createEmptyFaceState(1),
    2: currentState.faces[2] || createEmptyFaceState(2),
    3: currentState.faces[3] || createEmptyFaceState(3),
    4: currentState.faces[4] || createEmptyFaceState(4),
  };

  return {
    ...currentState,
    roomShape: shape,
    activeFaceId: activeFaces[0] || 1,
    faces: newFaces,
  };
}

