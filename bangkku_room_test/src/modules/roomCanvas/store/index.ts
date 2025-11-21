// store/index.ts: 방 상태 관리를 위한 Vue Composition API 기반 전역 스토어
import { ref, computed, readonly } from 'vue';
import { MultiRoomState, createInitialRoomState, reinitializeFacesForShape } from '../models/roomState';
import { RoomShape, FaceId, getActiveFaces } from '../models/roomShape';
import { RoomFaceState, FaceDimensions } from '../models/roomFace';
import { Pillar, Shelf } from '../../../types';

/**
 * 전역 방 상태
 */
const roomState = ref<MultiRoomState>(createInitialRoomState());

/**
 * 방 스토어 훅
 */
export function useRoomStore() {
  // ===== Getters =====
  
  /**
   * 현재 방 전체 상태 (읽기 전용)
   */
  const state = computed(() => roomState.value);

  /**
   * 현재 선택된 면 ID
   */
  const activeFaceId = computed(() => roomState.value.activeFaceId);

  /**
   * 현재 방 형태
   */
  const roomShape = computed(() => roomState.value.roomShape);

  /**
   * 방 이름
   */
  const roomName = computed(() => roomState.value.roomName);

  /**
   * 현재 활성 면 상태
   */
  const activeFace = computed(() => roomState.value.faces[roomState.value.activeFaceId]);

  /**
   * 현재 활성 면의 치수
   */
  const activeFaceDimensions = computed(() => activeFace.value.dimensions);

  /**
   * 현재 활성 면의 기둥 배열
   */
  const activeFacePillars = computed(() => activeFace.value.pillars);

  /**
   * 현재 활성 면의 선반 배열
   */
  const activeFaceShelves = computed(() => activeFace.value.shelves);

  /**
   * 현재 방 형태에서 사용 가능한 면 ID 배열
   */
  const availableFaces = computed(() => getActiveFaces(roomState.value.roomShape));

  /**
   * 모든 면 상태 배열
   */
  const allFaces = computed(() => Object.values(roomState.value.faces));

  // ===== Actions =====

  /**
   * 방 이름 변경
   */
  const setRoomName = (name: string) => {
    roomState.value.roomName = name;
  };

  /**
   * 방 형태 변경 (면 재초기화)
   */
  const setRoomShape = (shape: RoomShape) => {
    roomState.value = reinitializeFacesForShape(roomState.value, shape);
  };

  /**
   * 활성 면 전환
   */
  const setActiveFaceId = (faceId: FaceId) => {
    // 현재 방 형태에서 사용 가능한 면인지 확인
    if (availableFaces.value.includes(faceId)) {
      roomState.value.activeFaceId = faceId;
    } else {
      console.warn(`Face ${faceId} is not available in shape ${roomState.value.roomShape}`);
    }
  };

  /**
   * 특정 면의 치수 업데이트
   */
  const updateFaceDimensions = (faceId: FaceId, dimensions: Partial<FaceDimensions>) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.dimensions = {
        ...face.dimensions,
        ...dimensions,
      };
    }
  };

  /**
   * 현재 활성 면의 치수 업데이트
   */
  const updateActiveFaceDimensions = (dimensions: Partial<FaceDimensions>) => {
    updateFaceDimensions(roomState.value.activeFaceId, dimensions);
  };

  /**
   * 특정 면의 기둥 배열 설정
   */
  const setFacePillars = (faceId: FaceId, pillars: Pillar[]) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.pillars = pillars;
      face.hasShelf = pillars.length > 0 || face.shelves.length > 0;
    }
  };

  /**
   * 현재 활성 면의 기둥 배열 설정
   */
  const setActiveFacePillars = (pillars: Pillar[]) => {
    setFacePillars(roomState.value.activeFaceId, pillars);
  };

  /**
   * 특정 면의 선반 배열 설정
   */
  const setFaceShelves = (faceId: FaceId, shelves: Shelf[]) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.shelves = shelves;
      face.hasShelf = face.pillars.length > 0 || shelves.length > 0;
    }
  };

  /**
   * 현재 활성 면의 선반 배열 설정
   */
  const setActiveFaceShelves = (shelves: Shelf[]) => {
    setFaceShelves(roomState.value.activeFaceId, shelves);
  };

  /**
   * 특정 면의 모든 가구(기둥/선반) 초기화
   */
  const clearFaceFurniture = (faceId: FaceId) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.pillars = [];
      face.shelves = [];
      face.hasShelf = false;
    }
  };

  /**
   * 현재 활성 면의 모든 가구 초기화
   */
  const clearActiveFaceFurniture = () => {
    clearFaceFurniture(roomState.value.activeFaceId);
  };

  /**
   * 전체 방 상태 리셋
   */
  const resetRoom = (name?: string, shape?: RoomShape) => {
    roomState.value = createInitialRoomState(name, shape);
  };

  /**
   * 모든 면의 기둥 스타일을 일괄 변경
   */
  const setPillarStyleAllFaces = (style: Pillar['pillarStyle']) => {
    Object.values(roomState.value.faces).forEach((face) => {
      face.pillars = face.pillars.map((pillar) =>
        pillar.type === 'wall' ? pillar : { ...pillar, pillarStyle: style }
      );
    });
  };

  /**
   * 방 상태 전체 교체 (불러오기 등)
   */
  const loadRoomState = (newState: MultiRoomState) => {
    roomState.value = newState;
  };

  /**
   * 특정 면 상태 가져오기
   */
  const getFaceState = (faceId: FaceId): RoomFaceState => {
    return roomState.value.faces[faceId];
  };

  return {
    // Getters
    state: readonly(state),
    activeFaceId: readonly(activeFaceId),
    roomShape: readonly(roomShape),
    roomName: readonly(roomName),
    activeFace: readonly(activeFace),
    activeFaceDimensions: readonly(activeFaceDimensions),
    activeFacePillars: readonly(activeFacePillars),
    activeFaceShelves: readonly(activeFaceShelves),
    availableFaces: readonly(availableFaces),
    allFaces: readonly(allFaces),
    
    // Actions
    setRoomName,
    setRoomShape,
    setActiveFaceId,
    updateFaceDimensions,
    updateActiveFaceDimensions,
    setFacePillars,
    setActiveFacePillars,
    setFaceShelves,
    setActiveFaceShelves,
    setPillarStyleAllFaces,
    clearFaceFurniture,
    clearActiveFaceFurniture,
    resetRoom,
    loadRoomState,
    getFaceState,
  };
}

