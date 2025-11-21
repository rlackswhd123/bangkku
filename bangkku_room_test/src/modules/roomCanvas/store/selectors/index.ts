// store/selectors/index.ts: 유용한 selector 함수들
import { computed, ComputedRef } from 'vue';
import { FaceId } from '../../models/roomShape';
import { RoomFaceState } from '../../models/roomFace';
import { useRoomStore } from '../index';

/**
 * 특정 면의 가구 설치 여부를 반환하는 selector
 */
export function useFaceHasShelf(faceId: FaceId): ComputedRef<boolean> {
  const store = useRoomStore();
  return computed(() => {
    const face = store.getFaceState(faceId);
    return face.hasShelf || face.pillars.length > 0 || face.shelves.length > 0;
  });
}

/**
 * 현재 활성 면의 가구 개수를 반환하는 selector
 */
export function useActiveFaceFurnitureCount(): ComputedRef<{ pillars: number; shelves: number }> {
  const store = useRoomStore();
  return computed(() => ({
    pillars: store.activeFacePillars.value.length,
    shelves: store.activeFaceShelves.value.length,
  }));
}

/**
 * 모든 면의 상태 요약 정보를 반환
 */
export function useAllFacesSummary(): ComputedRef<
  Array<{
    faceId: FaceId;
    hasShelf: boolean;
    pillarCount: number;
    shelfCount: number;
  }>
> {
  const store = useRoomStore();
  return computed(() =>
    store.allFaces.value.map((face) => ({
      faceId: face.faceId,
      hasShelf: face.hasShelf || face.pillars.length > 0 || face.shelves.length > 0,
      pillarCount: face.pillars.length,
      shelfCount: face.shelves.length,
    }))
  );
}

