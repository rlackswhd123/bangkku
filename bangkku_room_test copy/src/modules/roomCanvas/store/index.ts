// store/index.ts: 방 상태 관리를 위한 Vue Composition API 기반 전역 스토어
import { ref, computed, readonly } from 'vue';
import { MultiRoomState, createInitialRoomState, reinitializeFacesForShape } from '../models/roomState';
import { RoomShape, FaceId, getActiveFaces } from '../models/roomShape';
import { RoomFaceState } from '../models/roomFace';
import { Pillar, Section, GlobalSettings, DEFAULT_GLOBAL_SETTINGS } from '../../../types';

/**
 * 전역 방 상태
 */
const roomState = ref<MultiRoomState>(createInitialRoomState());

/**
 * 전역 설정 상태
 */
const globalSettings = ref<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

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
   * 현재 활성 면의 치수/공간 정보
   */
  const activeFaceMetrics = computed(() => ({
    space_x: activeFace.value.space_x,
    space_y: activeFace.value.space_y,
    face_x: activeFace.value.face_x,
    face_y: activeFace.value.face_y,
    face_count: activeFace.value.face_count,
  }));

  /**
   * 현재 활성 면의 기둥 배열
   * 
   */
  const activeFacePillars = computed(() => activeFace.value.pillars);

  /**
   * 현재 활성 면의 선반 배열 (섹션 중심 구조: sections에서 모든 선반을 평탄화)
   */
  const activeFaceShelves = computed(() => {
    return activeFace.value.sections.flatMap(section => section.shelves);
  });

  /**
   * 현재 활성 면의 섹션 배열
   */
  const activeFaceSections = computed(() => activeFace.value.sections);

  /**
   * 현재 방 형태에서 사용 가능한 면 ID 배열
   */
  const availableFaces = computed(() => getActiveFaces(roomState.value.roomShape));

  /**
   * 모든 면 상태 배열
   */
  const allFaces = computed(() => Object.values(roomState.value.faces));

  /**
   * 전역 설정
   */
  const settings = computed(() => globalSettings.value);

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
   * 활성 면 전환 (스냅샷 처리 포함)
   */
  const setActiveFaceId = async (
    faceId: FaceId,
    options?: {
      captureSnapshot?: boolean;
      snapshotData?: {
        imageDataUrl: string;
        imageElement: HTMLImageElement;
        sourceFaceX: number;
        sourceFaceY: number;
        contentHash?: string;
      };
    }
  ) => {
    // 현재 방 형태에서 사용 가능한 면인지 확인
    if (!availableFaces.value.includes(faceId)) {
      console.warn(`Face ${faceId} is not available in shape ${roomState.value.roomShape}`);
      return;
    }

    const currentFaceId = roomState.value.activeFaceId;
    const currentFace = roomState.value.faces[currentFaceId];

    // 면 전환 시: 현재 면(떠나는 면)의 스냅샷 캡처
    if (options?.captureSnapshot && options?.snapshotData) {
      const { imageDataUrl, imageElement, sourceFaceX, sourceFaceY, contentHash } = options.snapshotData;
      
      // 현재 면(currentFaceId)의 스냅샷을 저장 (떠나는 면을 캡처)
      currentFace.projectedSnapshot = {
        imageDataUrl,
        imageElement,
        sourceFaceId: currentFaceId, // 자기 자신의 ID
        sourceFaceX,
        sourceFaceY,
        timestamp: Date.now(),
        contentHash, // 해시 저장
      };
      
      console.log(`스냅샷 캡처 & 저장: 면 ${currentFaceId} (자신을 캡처)`);
    }

    // 활성 면 변경
    roomState.value.activeFaceId = faceId;
  };

  /**
   * 특정 면의 치수/공간 정보 업데이트
   */
  const updateFaceMetrics = (
    faceId: FaceId,
    metrics: Partial<Pick<RoomFaceState, 'space_x' | 'space_y' | 'face_x' | 'face_y' | 'face_count'>>
  ) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      Object.assign(face, metrics);
    }
  };

  /**
   * 현재 활성 면의 치수/공간 정보 업데이트
   */
  const updateActiveFaceMetrics = (
    metrics: Partial<Pick<RoomFaceState, 'space_x' | 'space_y' | 'face_x' | 'face_y' | 'face_count'>>
  ) => {
    updateFaceMetrics(roomState.value.activeFaceId, metrics);
  };

  /**
   * 특정 면의 기둥 배열 설정
   */
  const setFacePillars = (faceId: FaceId, pillars: Pillar[]) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.pillars = pillars;
      const hasShelves = face.sections.some(section => section.shelves.length > 0);
      face.hasShelf = pillars.length > 0 || hasShelves;
    }
  };

  /**
   * 현재 활성 면의 기둥 배열 설정
   */
  const setActiveFacePillars = (pillars: Pillar[]) => {
    setFacePillars(roomState.value.activeFaceId, pillars);
  };

  // 섹션 중심 구조: setFaceShelves와 setActiveFaceShelves는 더 이상 필요 없음
  // 선반은 sections[].shelves에만 저장되며, activeFaceShelves는 computed로 자동 계산됨

  /**
   * 특정 면의 섹션 배열 설정
   */
  const setFaceSections = (faceId: FaceId, sections: Section[]) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.sections = sections;
    }
  };

  /**
   * 현재 활성 면의 섹션 배열 설정
   */
  const setActiveFaceSections = (sections: Section[]) => {
    setFaceSections(roomState.value.activeFaceId, sections);
  };

  /**
   * 섹션 추가
   */
  const addSection = (section: Section) => {
    const face = activeFace.value;
    face.sections = [...face.sections, section];
  };

  /**
   * 섹션 삭제 (경계 기둥 처리 및 오른쪽 섹션 왼쪽 정렬 포함)
   */
  const removeSection = (sectionKey: number) => {
    const face = activeFace.value;
    const sectionToRemove = face.sections.find((s) => s.sectionKey === sectionKey);
    
    if (!sectionToRemove) return;

    // 삭제할 섹션의 기둥 위치 확인
    const startPillar = face.pillars.find((p) => p.pillarKey === sectionToRemove.startPillarKey);
    const endPillar = face.pillars.find((p) => p.pillarKey === sectionToRemove.endPillarKey);
    
    if (!startPillar || !endPillar) return;

    // 삭제할 섹션의 너비 계산 (이만큼 오른쪽 기둥들을 왼쪽으로 이동)
    const sectionWidth = endPillar.x - startPillar.x;

    // 섹션 중심 구조: 섹션 삭제 시 선반은 자동으로 함께 삭제됨 (별도 처리 불필요)

    // 섹션들을 기둥 위치 기준으로 정렬 (startPillar의 x 기준)
    const sortedSections = [...face.sections]
      .filter((s) => s.sectionKey !== sectionKey)
      .map((s) => {
        const sStartPillar = face.pillars.find((p) => p.pillarKey === s.startPillarKey);
        return { section: s, startX: sStartPillar?.x ?? 0 };
      })
      .sort((a, b) => a.startX - b.startX);

    // 삭제할 섹션의 오른쪽 섹션들 찾기
    const rightSections = sortedSections
      .filter(({ section, startX }) => {
        return startX >= endPillar.x || section.startPillarKey === sectionToRemove.endPillarKey;
      })
      .map(({ section }) => section);

    // 오른쪽 섹션들의 모든 기둥들을 왼쪽으로 이동
    if (rightSections.length > 0) {
      // 오른쪽 섹션들에 포함된 모든 기둥 키 수집 (endPillar 제외)
      const rightSectionPillarKeys = new Set<number>();
      rightSections.forEach((section) => {
        if (section.startPillarKey !== sectionToRemove.endPillarKey) {
          rightSectionPillarKeys.add(section.startPillarKey);
        }
        rightSectionPillarKeys.add(section.endPillarKey);
      });
      rightSectionPillarKeys.delete(sectionToRemove.endPillarKey);

      face.pillars = face.pillars.map((pillar) => {
        if (rightSectionPillarKeys.has(pillar.pillarKey)) {
          return {
            ...pillar,
            x: pillar.x - sectionWidth,
          };
        }
        return pillar;
      });

      const firstRightSection = rightSections[0];
      firstRightSection.startPillarKey = sectionToRemove.startPillarKey;
      
      const newStartPillar = face.pillars.find((p) => p.pillarKey === firstRightSection.startPillarKey);
      const newEndPillar = face.pillars.find((p) => p.pillarKey === firstRightSection.endPillarKey);
      if (newStartPillar && newEndPillar) {
        firstRightSection.x = newEndPillar.x - newStartPillar.x;
      }
      
      firstRightSection.shelves.forEach((shelf) => {
        shelf.sectionKey = sectionToRemove.sectionKey;
      });

      for (let i = 1; i < rightSections.length; i++) {
        const currentSection = rightSections[i];
        const previousSection = rightSections[i - 1];
        
        currentSection.startPillarKey = previousSection.endPillarKey;
        
        const currentStartPillar = face.pillars.find((p) => p.pillarKey === currentSection.startPillarKey);
        const currentEndPillar = face.pillars.find((p) => p.pillarKey === currentSection.endPillarKey);
        if (currentStartPillar && currentEndPillar) {
          currentSection.x = currentEndPillar.x - currentStartPillar.x;
        }
        
        currentSection.shelves.forEach((shelf) => {
          shelf.sectionKey = previousSection.sectionKey;
        });
      }
    }

    // 섹션 삭제
    face.sections = face.sections.filter((s) => s.sectionKey !== sectionKey);

    // 경계 기둥 처리: 다른 섹션에서 사용하지 않는 기둥 삭제
    const pillarsToCheck = [sectionToRemove.startPillarKey, sectionToRemove.endPillarKey];
    const pillarsToRemove = pillarsToCheck.filter((pillarKey) =>
      !isPillarUsedByOtherSections(pillarKey, sectionKey, face.sections)
    );
    
    face.pillars = face.pillars.filter((p) => !pillarsToRemove.includes(p.pillarKey));
  };

  /**
   * 기둥이 다른 섹션에서 사용 중인지 확인
   */
  const isPillarUsedByOtherSections = (pillarKey: number, currentSectionKey: number, sections: Section[]): boolean => {
    return sections
      .filter((s) => s.sectionKey !== currentSectionKey)
      .some((s) => s.startPillarKey === pillarKey || s.endPillarKey === pillarKey);
  };

  /**
   * 특정 면의 모든 가구(기둥/선반/섹션) 초기화 (섹션 중심 구조)
   */
  const clearFaceFurniture = (faceId: FaceId) => {
    const face = roomState.value.faces[faceId];
    if (face) {
      face.pillars = [];
      face.sections = []; // 섹션 삭제 시 선반도 자동으로 삭제됨
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
      face.pillars = face.pillars.map((pillar) => ({
        ...pillar,
        pillarStyle: style,
      }));
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

  /**
   * 전역 설정 업데이트
   */
  const updateGlobalSettings = (newSettings: Partial<GlobalSettings>) => {
    globalSettings.value = {
      ...globalSettings.value,
      ...newSettings,
    };
  };

  /**
   * 전역 설정 초기화
   */
  const resetGlobalSettings = () => {
    globalSettings.value = DEFAULT_GLOBAL_SETTINGS;
  };

  /**
   * 특정 면의 스냅샷을 업데이트합니다.
   * 섹션 삭제 등으로 면이 변경되었을 때 호출됩니다.
   */
  const updateFaceSnapshot = (
    faceId: FaceId,
    snapshotData: {
      imageDataUrl: string;
      imageElement: HTMLImageElement;
      sourceFaceX: number;
      sourceFaceY: number;
      contentHash?: string;
    }
  ) => {
    const face = roomState.value.faces[faceId];
    if (!face) return;

    const { imageDataUrl, imageElement, sourceFaceX, sourceFaceY, contentHash } = snapshotData;

    face.projectedSnapshot = {
      imageDataUrl,
      imageElement,
      sourceFaceId: faceId,
      sourceFaceX,
      sourceFaceY,
      timestamp: Date.now(),
      contentHash,
    };

    console.log(`면 ${faceId} 스냅샷 업데이트 완료`);
  };

  /**
   * 특정 면이 변경되었을 때 모든 면에서 해당 면의 투영 스냅샷을 무효화합니다.
   * 섹션 삭제, 기둥 추가/삭제 등으로 면의 콘텐츠가 변경되었을 때 호출됩니다.
   * @param sourceFaceId - 변경된 면의 ID (이 면의 스냅샷을 다른 면에서 제거)
   */
  const invalidateSnapshotsOfFace = (sourceFaceId: FaceId) => {
    Object.values(roomState.value.faces).forEach((face) => {
      // 각 면의 projectedSnapshot이 sourceFaceId를 참조하고 있으면 null로 설정
      if (face.projectedSnapshot?.sourceFaceId === sourceFaceId) {
        face.projectedSnapshot = null;
        console.log(`면 ${face.faceKey}의 투영 스냅샷 무효화 (sourceFaceId: ${sourceFaceId})`);
      }
    });

    console.log(`✅ 면 ${sourceFaceId}의 모든 투영 스냅샷 무효화 완료`);
  };

  return {
    // Getters
    state: readonly(state),
    activeFaceId: readonly(activeFaceId),
    roomShape: readonly(roomShape),
    roomName: readonly(roomName),
    activeFace: readonly(activeFace),
    activeFaceMetrics: readonly(activeFaceMetrics),
    activeFacePillars: readonly(activeFacePillars),
    activeFaceShelves: readonly(activeFaceShelves),
    activeFaceSections: readonly(activeFaceSections),
    availableFaces: readonly(availableFaces),
    allFaces: readonly(allFaces),
    settings: readonly(settings),

    // Actions
    setRoomName,
    setRoomShape,
    setActiveFaceId,
    updateFaceMetrics,
    updateActiveFaceMetrics,
    setFacePillars,
    setActiveFacePillars,
    setActiveFaceSections,
    addSection,
    removeSection,
    setPillarStyleAllFaces,
    clearFaceFurniture,
    clearActiveFaceFurniture,
    resetRoom,
    loadRoomState,
    getFaceState,
    updateFaceSnapshot,
    invalidateSnapshotsOfFace,
    updateGlobalSettings,
    resetGlobalSettings,
  };
}

