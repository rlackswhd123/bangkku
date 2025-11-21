<!-- App.vue: 전체 페이지 레이아웃과 핵심 상태를 관리하는 루트 컴포넌트 -->
<template>
  <div :style="styles.container">
    <!-- 상단 헤더: 새로운 RoomHeader 컴포넌트 -->
    <RoomHeader
      @shape-change="isShapeSelectorOpen = true"
      @edit="handleEdit"
    />

    <!-- 메인 콘텐츠 -->
    <div :style="styles.mainContent">
      <!-- 캔버스 영역 -->
      <div :style="styles.canvasContainer">
        <RoomCanvas
          @scale-change="setScaleInfo"
          @object-select="handleObjectSelect"
          @show-toast="showToast"
        />
      </div>

      <!-- 오브젝트 정보 패널 -->
      <ObjectInfoPanel
        :selected-type="selectedType"
        :selected-id="selectedId"
        :pillar="selectedPillar"
        :shelf="selectedShelf"
        :pillars="store.activeFacePillars.value"
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

    <!-- 토스트 메시지 -->
    <Toast
      :message="toastMessage"
      :is-visible="isToastVisible"
      @close="hideToast"
    />

    <!-- 기둥 삭제 확인 모달 -->
    <Teleport to="body">
      <div v-if="pillarDeleteModal && pillarDeleteModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="handlePillarDeleteConfirm(false)"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="modalStyle"
          @click.stop
        >
          <div :style="modalTitleStyle">기둥 삭제 확인</div>
          <div :style="modalTextStyle">
            이 기둥과 연결된 선반 {{ pillarDeleteModal.connectedShelvesCount }}개가 함께 삭제됩니다.
            <br />
            정말 삭제하시겠습니까?
          </div>
          <div :style="modalButtonGroupStyle">
            <button
              @click="handlePillarDeleteConfirm(false)"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handlePillarDeleteConfirm(true)"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RoomCanvas from './components/RoomCanvas.vue';
import RoomHeader from './components/RoomHeader.vue';
import ShapeSelector from './components/ShapeSelector.vue';
import ObjectInfoPanel from './components/ObjectInfoPanel.vue';
import Toast from './components/Toast.vue';
import { Pillar, Shelf, ScaleInfo } from './types';
import { useRoomStore } from './modules/roomCanvas/store';
import { RoomShape } from './modules/roomCanvas/models/roomShape';
import { deletePillarFromActiveFace, deleteShelfFromActiveFace } from './modules/roomCanvas/store/actions';

const store = useRoomStore();

const scaleInfo = ref<ScaleInfo | null>(null);
const isShapeSelectorOpen = ref(false);

const selectedType = ref<'pillar' | 'shelf' | null>(null);
const selectedId = ref<string | null>(null);

const toastMessage = ref<string>('');
const isToastVisible = ref(false);

const pillarDeleteModal = ref<{
  show: boolean;
  pillarId: string;
  connectedShelvesCount: number;
} | null>(null);

const selectedPillar = computed(() => {
  return selectedType.value === 'pillar' && selectedId.value
    ? store.activeFacePillars.value.find((p) => p.id === selectedId.value) || null
    : null;
});

const selectedShelf = computed(() => {
  return selectedType.value === 'shelf' && selectedId.value
    ? store.activeFaceShelves.value.find((s) => s.id === selectedId.value) || null
    : null;
});

/** 캔버스에서 전달된 최신 스케일 정보를 저장해 UI 전반에서 활용합니다. */
const setScaleInfo = (info: ScaleInfo) => {
  scaleInfo.value = info;
};

/** 캔버스에서 전달된 선택 대상을 패널과 모달이 참조할 수 있게 저장합니다. */
const handleObjectSelect = (type: 'pillar' | 'shelf' | null, id: string | null) => {
  selectedType.value = type;
  selectedId.value = id;
};

const handleClose = () => {
  selectedType.value = null;
  selectedId.value = null;
};

/** 선택된 기둥/선반을 제거하고 필요 시 연관 선반 삭제 모달을 띄웁니다. */
const handleDelete = () => {
  if (selectedType.value === 'pillar' && selectedId.value) {
    const connectedShelves = store.activeFaceShelves.value.filter(
      (s) => s.startPillarId === selectedId.value || s.endPillarId === selectedId.value
    );

    if (connectedShelves.length > 0) {
      pillarDeleteModal.value = {
        show: true,
        pillarId: selectedId.value,
        connectedShelvesCount: connectedShelves.length,
      };
      return;
    }

    deletePillarFromActiveFace(selectedId.value);
    selectedType.value = null;
    selectedId.value = null;
  } else if (selectedType.value === 'shelf' && selectedId.value) {
    deleteShelfFromActiveFace(selectedId.value);
    selectedType.value = null;
    selectedId.value = null;
  }
};

/** 기둥 삭제 확인 모달에서 응답을 받아 실제 삭제를 수행합니다. */
const handlePillarDeleteConfirm = (confirmed: boolean) => {
  if (!pillarDeleteModal.value) return;

  if (confirmed) {
    deletePillarFromActiveFace(pillarDeleteModal.value.pillarId);
    selectedType.value = null;
    selectedId.value = null;
  }

  pillarDeleteModal.value = null;
};

/** 방 형태 선택 핸들러 */
const handleShapeSelect = (shape: RoomShape) => {
  store.setRoomShape(shape);
  isShapeSelectorOpen.value = false;
};

/** 편집 버튼 클릭 핸들러 */
const handleEdit = () => {
  // 추후 편집 모드 진입 로직 추가 가능
  showToast('편집 모드');
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

