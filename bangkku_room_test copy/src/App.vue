<!-- App.vue: 전체 페이지 레이아웃과 핵심 상태를 관리하는 루트 컴포넌트 -->
<template>
  <div :style="styles.container">
    <!-- 상단 헤더: 새로운 RoomHeader 컴포넌트 -->
    <RoomHeader
      @shape-change="isShapeSelectorOpen = true"
      @settings="isGlobalSettingsModalOpen = true"
      @save="handleSave"
      @load="handleLoad"
      @productPurchase="handleProductPurchase"
    />

    <!-- 메인 콘텐츠 -->
    <div :style="styles.mainContent">
      <!-- 캔버스 영역 -->
      <div :style="styles.canvasContainer">
        <RoomCanvas
          ref="roomCanvasRef"
          @scale-change="setScaleInfo"
          @object-select="handleObjectSelect"
          @show-toast="showToast"
          @section-delete-request="handleSectionDeleteRequest"
          @pillar-move-request="handlePillarMoveRequest"
          @section-deleted="handleSectionDeleted"
        />
      </div>

      <!-- 오브젝트 정보 패널 -->
      <ObjectInfoPanel
        :selected-type="selectedType"
        :selected-key="selectedKey"
        :pillar="selectedPillar"
        :shelf="selectedShelf"
        :pillars="uiPillars"
        :sections="uiSections"
        @close="handleClose"
        @delete="handleDelete"
      />
    </div>

    <!-- 방 형태 선택 모달 -->
    <ShapeSelector
      :is-open="isShapeSelectorOpen"
      @close="isShapeSelectorOpen = false"
      @select="handleShapeSelect"
    />

    <!-- 글로벌 설정 모달 -->
    <GlobalSettingsModal
      :is-open="isGlobalSettingsModalOpen"
      @close="isGlobalSettingsModalOpen = false"
      @confirm="handleGlobalSettingsConfirm"
    />

    <!-- 토스트 메시지 -->
    <Toast
      :message="toastMessage"
      :is-visible="isToastVisible"
      @close="hideToast"
    />

    <!-- 섹션 삭제 확인 모달 -->
    <Teleport to="body">
      <div v-if="sectionDeleteModal && sectionDeleteModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="handleSectionDeleteConfirm(false)"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="modalStyle"
          @click.stop
        >
          <div :style="modalTitleStyle">섹션 삭제 확인</div>
          <div :style="modalTextStyle">
            이 섹션에 포함된 선반 {{ sectionDeleteModal.shelvesCount }}개가 함께 삭제됩니다.
            <br />
            정말 삭제하시겠습니까?
          </div>
          <div :style="modalButtonGroupStyle">
            <button
              @click="handleSectionDeleteConfirm(false)"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handleSectionDeleteConfirm(true)"
              :style="modalConfirmButtonStyle"
              @mouseenter="handleModalConfirmButtonHover"
              @mouseleave="handleModalConfirmButtonLeave"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 선반 삭제 확인 모달 -->
    <Teleport to="body">
      <div v-if="shelfDeleteModal && shelfDeleteModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="handleShelfDeleteConfirm(false)"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="modalStyle"
          @click.stop
        >
          <div :style="modalTitleStyle">선반 삭제 확인</div>
          <div :style="modalTextStyle">
            이 선반을 삭제하시겠습니까?
          </div>
          <div :style="modalButtonGroupStyle">
            <button
              @click="handleShelfDeleteConfirm(false)"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handleShelfDeleteConfirm(true)"
              :style="modalConfirmButtonStyle"
              @mouseenter="handleModalConfirmButtonHover"
              @mouseleave="handleModalConfirmButtonLeave"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 기둥 이동 확인 모달 -->
    <Teleport to="body">
      <div v-if="pillarMoveModal && pillarMoveModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="handlePillarMoveConfirm(false)"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="modalStyle"
          @click.stop
        >
          <div :style="modalTitleStyle">기둥 이동 확인</div>
          <div :style="modalTextStyle">
            선반 때문에 섹션 간격을 조절할 수 없습니다.
            <br />
            모든 선반({{ pillarMoveModal.totalShelvesCount }}개)을 삭제하고 진행하시겠습니까?
          </div>
          <div :style="modalButtonGroupStyle">
            <button
              @click="handlePillarMoveConfirm(false)"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handlePillarMoveConfirm(true)"
              :style="modalConfirmButtonStyle"
              @mouseenter="handleModalConfirmButtonHover"
              @mouseleave="handleModalConfirmButtonLeave"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RoomCanvas from './components/RoomCanvas.vue';
import RoomHeader from './components/RoomHeader.vue';
import ShapeSelector from './components/ShapeSelector.vue';
import GlobalSettingsModal from './components/GlobalSettingsModal.vue';
import ObjectInfoPanel from './components/ObjectInfoPanel.vue';
import Toast from './components/Toast.vue';
import type { ScaleInfo, Pillar, Section, Shelf } from './types';
import { useRoomStore } from './modules/roomCanvas/store';
import { RoomShape } from './modules/roomCanvas/models/roomShape';
import { deleteShelfFromActiveFace } from './modules/roomCanvas/store/actions';
import { serializeRoomState, deserializeRoomState, type MultiRoomState } from './modules/roomCanvas/models/roomState';
import { downloadRoomStateFile } from './utils/export';
import { importJsonFile } from './utils/import';

const store = useRoomStore();

const scaleInfo = ref<ScaleInfo | null>(null);
const isShapeSelectorOpen = ref(false);
const isGlobalSettingsModalOpen = ref(false);
const roomCanvasRef = ref<InstanceType<typeof RoomCanvas> | null>(null);

const selectedType = ref<'pillar' | 'shelf' | null>(null);
const selectedKey = ref<number | null>(null);

const toastMessage = ref<string>('');
const isToastVisible = ref(false);

const sectionDeleteModal = ref<{
  show: boolean;
  sectionKey: number;
  shelvesCount: number;
} | null>(null);

const shelfDeleteModal = ref<{
  show: boolean;
  shelfKey: number;
} | null>(null);

const pillarMoveModal = ref<{
  show: boolean;
  pillarKey: number;
  totalShelvesCount: number;
} | null>(null);

// 가구 구매 버튼 클릭 시 RoomCanvas 내부의 상품 구매 모달 열기
const handleProductPurchase = () => {
  roomCanvasRef.value?.openProductPurchaseModal();
};

// ObjectInfoPanel에 전달할 가변 배열 뷰 (스토어는 readonly이므로 UI 용도로만 타입 캐스팅)
const uiPillars = computed<Pillar[]>(() => store.activeFacePillars.value as unknown as Pillar[]);
const uiSections = computed<Section[]>(() => store.activeFaceSections.value as unknown as Section[]);

const selectedPillar = computed(() => {
  return selectedType.value === 'pillar' && selectedKey.value != null
    ? store.activeFacePillars.value.find((p) => p.pillarKey === selectedKey.value) || null
    : null;
});

const selectedShelf = computed(() => {
  return selectedType.value === 'shelf' && selectedKey.value != null
    ? store.activeFaceShelves.value.find((s) => s.shelfKey === selectedKey.value) || null
    : null;
});

/** 캔버스에서 전달된 최신 스케일 정보를 저장해 UI 전반에서 활용합니다. */
const setScaleInfo = (info: ScaleInfo) => {
  scaleInfo.value = info;
};

/** 캔버스에서 전달된 선택 대상을 패널과 모달이 참조할 수 있게 저장합니다. */
const handleObjectSelect = (type: 'pillar' | 'shelf' | null, key: number | null) => {
  selectedType.value = type;
  selectedKey.value = key;
};

const handleClose = () => {
  selectedType.value = null;
  selectedKey.value = null;
};

/** 선택된 선반을 제거합니다. */
const handleDelete = () => {
  if (selectedType.value === 'shelf' && selectedKey.value != null) {
    shelfDeleteModal.value = {
      show: true,
      shelfKey: selectedKey.value,
    };
  }
};

/** 선반 삭제 확인 모달에서 응답을 받아 실제 삭제를 수행합니다. */
const handleShelfDeleteConfirm = (confirmed: boolean) => {
  if (!shelfDeleteModal.value) return;

  if (confirmed) {
    deleteShelfFromActiveFace(shelfDeleteModal.value.shelfKey);
    selectedType.value = null;
    selectedKey.value = null;
  }

  shelfDeleteModal.value = null;
};

/** 섹션 삭제 요청 핸들러 */
const handleSectionDeleteRequest = (sectionKey: number, shelvesCount: number) => {
  sectionDeleteModal.value = {
    show: true,
    sectionKey,
    shelvesCount,
  };
};

/** 섹션 삭제 확인 모달에서 응답을 받아 실제 삭제를 수행합니다. */
const handleSectionDeleteConfirm = (confirmed: boolean) => {
  if (!sectionDeleteModal.value) return;

  if (confirmed) {
    store.removeSection(sectionDeleteModal.value.sectionKey);
    // 섹션 삭제 후 스냅샷 캡처 (다음 프레임에서 실행하여 렌더링 완료 보장)
    setTimeout(() => {
      roomCanvasRef.value?.captureCurrentFaceSnapshot();
    }, 50);
  }

  sectionDeleteModal.value = null;
};

/** 섹션 삭제 완료 이벤트 핸들러 */
const handleSectionDeleted = () => {
  // RoomCanvas에서 직접 삭제한 경우에도 스냅샷이 캡처되므로 여기서는 추가 처리 불필요
  // (이미 RoomCanvas에서 처리됨)
};

/** 기둥 이동 요청 핸들러 */
const handlePillarMoveRequest = (pillarKey: number, totalShelvesCount: number) => {
  pillarMoveModal.value = {
    show: true,
    pillarKey,
    totalShelvesCount,
  };
};

/** 기둥 이동 확인 모달에서 응답을 받아 선반 삭제 후 기둥 이동을 허용합니다. */
const handlePillarMoveConfirm = (confirmed: boolean) => {
  if (!pillarMoveModal.value) return;

  if (confirmed) {
    // 해당 기둥을 공유하는 섹션들의 모든 선반 삭제
    const sections = [...store.activeFaceSections.value];
    const sectionsWithPillar = sections.filter(
      (s) => s.startPillarKey === pillarMoveModal.value!.pillarKey || s.endPillarKey === pillarMoveModal.value!.pillarKey
    );
    
    // 해당 섹션들의 선반을 모두 제거
    const updatedSections = sections.map((section) => {
      if (sectionsWithPillar.some((s) => s.sectionKey === section.sectionKey)) {
        return {
          ...section,
          shelves: [] as Shelf[],
        };
      }
      return { ...section };
    });
    
    store.setActiveFaceSections(updatedSections as Section[]);
  }

  pillarMoveModal.value = null;
};

/** 방 형태 선택 핸들러 */
const handleShapeSelect = (shape: RoomShape) => {
  store.setRoomShape(shape);
  isShapeSelectorOpen.value = false;
};

/** 글로벌 설정 확인 핸들러 */
const handleGlobalSettingsConfirm = () => {
  showToast('설정이 저장되었습니다');
};

/** 방 상태를 JSON 파일로 저장합니다. */
const handleSave = () => {
  try {
    const currentState = store.state.value as unknown as MultiRoomState;
    const jsonString = serializeRoomState(currentState);
    const roomName = currentState.roomName || '내 방';
    
    downloadRoomStateFile(jsonString, roomName);
    showToast('파일이 저장되었습니다.');
  } catch (error) {
    console.error('저장 오류:', error);
    showToast('파일 저장에 실패했습니다.');
  }
};

/** JSON 파일에서 방 상태를 불러옵니다. */
const handleLoad = async () => {
  try {
    const jsonString = await importJsonFile();
    const loadedState = deserializeRoomState(jsonString);
    
    // 스토어에 불러온 상태 적용
    store.loadRoomState(loadedState);
    
    showToast('파일을 불러왔습니다.');
  } catch (error) {
    console.error('불러오기 오류:', error);
    
    if (error instanceof Error) {
      // 사용자가 파일 선택을 취소한 경우는 메시지를 표시하지 않음
      if (error.message.includes('취소') || error.message.includes('선택되지 않았습니다')) {
        return;
      }
      showToast(error.message || '파일 불러오기에 실패했습니다.');
    } else {
      showToast('파일 불러오기에 실패했습니다.');
    }
  }
};

/** 사용자에게 알림을 표시합니다. */
const showToast = (message: string) => {
  toastMessage.value = message;
  isToastVisible.value = true;
};

/** 토스트를 숨깁니다. */
const hideToast = () => {
  isToastVisible.value = false;
};

const handleModalButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
};

const handleModalButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
};

const handleModalConfirmButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0056b3';
};

const handleModalConfirmButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007AFF';
};

const styles: { [key: string]: Record<string, string> } = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  mainContent: {
    flex: '1',
    display: 'flex',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: '1',
    backgroundColor: '#e8e4d9',
    position: 'relative',
  },
};

const modalOverlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: '999',
};

const modalStyle = {
  position: 'fixed' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: '#fff',
  borderRadius: '12px',
  width: '400px',
  padding: '24px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  zIndex: '1000',
  display: 'flex',
  flexDirection: 'column' as const,
};

const modalTitleStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '16px',
};

const modalTextStyle = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '24px',
};

const modalButtonGroupStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const modalCancelButtonStyle = {
  padding: '10px 24px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'all 0.2s',
};

const modalConfirmButtonStyle = {
  padding: '10px 24px',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#007AFF',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'all 0.2s',
};
</script>

