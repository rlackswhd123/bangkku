// store/actions/index.ts: 복잡한 비즈니스 로직을 담은 액션 함수들
import { useRoomStore } from '../index';
import { FaceId } from '../../models/roomShape';
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
  newDimensions: { widthMm?: number; heightMm?: number; depthMm?: number },
  clearFurniture: boolean = false
) {
  const store = useRoomStore();
  
  if (clearFurniture) {
    store.clearFaceFurniture(faceId);
  }
  
  store.updateFaceDimensions(faceId, newDimensions);
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
 * 기둥 삭제 (연결된 선반도 함께)
 */
export function deletePillarFromActiveFace(pillarId: string) {
  const store = useRoomStore();
  
  // 기둥 제거
  const newPillars = store.activeFacePillars.value.filter((p) => p.id !== pillarId);
  
  // 연결된 선반 제거
  const newShelves = store.activeFaceShelves.value.filter(
    (s) => s.startPillarId !== pillarId && s.endPillarId !== pillarId
  );
  
  store.setActiveFacePillars(newPillars);
  store.setActiveFaceShelves(newShelves);
}

/**
 * 선반 삭제
 */
export function deleteShelfFromActiveFace(shelfId: string) {
  const store = useRoomStore();
  const newShelves = store.activeFaceShelves.value.filter((s) => s.id !== shelfId);
  store.setActiveFaceShelves(newShelves);
}

