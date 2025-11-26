// store/actions/index.ts: 복잡한 비즈니스 로직을 담은 액션 함수들
import { useRoomStore } from '../index';
import { FaceId } from '../../models/roomShape';
import { RoomFaceState } from '../../models/roomFace';
import { Pillar, Shelf } from '../../../../types';

/**
 * 면 전환 시 호출할 액션 (필요시 부가 로직 추가 가능)
 */
export function switchToFace(faceId: FaceId) {
  const store = useRoomStore();
  store.setActiveFaceId(faceId);
}

/**
 * 방 크기 변경 시 가구 초기화 여부를 확인하고 처리
 */
export function updateRoomDimensionsWithConfirmation(
  faceId: FaceId,
  newMetrics: Partial<Pick<RoomFaceState, 'space_x' | 'space_y' | 'face_x' | 'face_y' | 'face_count'>>,
  clearFurniture: boolean = false
) {
  const store = useRoomStore();
  
  if (clearFurniture) {
    store.clearFaceFurniture(faceId);
  }
  
  store.updateFaceMetrics(faceId, newMetrics);
}

/**
 * 기둥 추가
 */
export function addPillarToActiveFace(pillar: Pillar) {
  const store = useRoomStore();
  const currentPillars = [...store.activeFacePillars.value];
  currentPillars.push(pillar);
  store.setActiveFacePillars(currentPillars);
}

/**
 * 선반 추가
 */
export function addShelfToActiveFace(shelf: Shelf) {
  const store = useRoomStore();
  const currentShelves = [...store.activeFaceShelves.value];
  currentShelves.push(shelf);
  store.setActiveFaceShelves(currentShelves);
}

/**
 * 선반 삭제
 */
export function deleteShelfFromActiveFace(shelfKey: number) {
  const store = useRoomStore();
  const newShelves = store.activeFaceShelves.value.filter((s) => s.selfKey !== shelfKey);
  store.setActiveFaceShelves(newShelves);
}

