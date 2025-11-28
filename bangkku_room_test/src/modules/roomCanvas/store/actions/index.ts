// store/actions/index.ts: 복잡한 비즈니스 로직을 담은 액션 함수들
import { useRoomStore } from '../index';
import { FaceId } from '../../models/roomShape';
import { RoomFaceState } from '../../models/roomFace';
import { Pillar, Shelf, Section } from '../../../../types';

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
 * 선반 추가 (섹션 중심 구조: 사용되지 않음)
 * 선반은 RoomCanvas.vue에서 직접 섹션에 추가됨
 * @deprecated 섹션 중심 구조에서는 더 이상 사용되지 않음
 */
export function addShelfToActiveFace(_shelf: Shelf) {
  console.warn('addShelfToActiveFace는 섹션 중심 구조에서 더 이상 사용되지 않습니다. 섹션에 직접 추가하세요.');
  // 섹션 중심 구조에서는 이 함수를 사용하지 않음
}

/**
 * 선반 삭제 (섹션 중심 구조: 해당 선반이 속한 섹션에서 제거)
 */
export function deleteShelfFromActiveFace(shelfKey: number) {
  const store = useRoomStore();
  const sections = store.activeFaceSections.value;
  
  const updatedSections: Section[] = sections.map((section) => {
    const clonedShelves = section.shelves.map((shelf) => ({
      ...shelf,
      accessories: shelf.accessories ? [...shelf.accessories] : undefined,
    }));
    const filteredShelves = clonedShelves.filter((s) => s.shelfKey !== shelfKey);
    return {
      ...section,
      shelves: filteredShelves,
    };
  });
  
  store.setActiveFaceSections(updatedSections);
}
