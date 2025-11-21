<!-- RoomHeader.vue: 방 정보 및 면 전환/크기 설정 헤더 컴포넌트 -->
<template>
  <div :style="containerStyle">
    <!-- 좌측: 방 이름 및 형태 표시 -->
    <div :style="leftSectionStyle">
      <div :style="roomNameStyle">{{ roomName }}</div>
      <div :style="roomShapeStyle">{{ roomShapeLabel }}</div>
    </div>

    <!-- 중앙: 면 탭 -->
    <div :style="centerSectionStyle">
      <div :style="tabsContainerStyle">
        <div
          v-for="faceId in availableFaces"
          :key="faceId"
          @click="handleFaceSwitch(faceId)"
          :style="getTabStyle(faceId)"
          @mouseenter="handleTabHover(faceId, $event)"
          @mouseleave="handleTabLeave(faceId, $event)"
        >
          <span :style="tabLabelStyle">{{ faceId }}면</span>
          <span v-if="getFaceStatus(faceId)" :style="badgeStyle">●</span>
        </div>
      </div>
    </div>

    <!-- 우측: 크기 입력 및 설정 버튼 -->
    <div :style="rightSectionStyle">
      <!-- 폭 입력 -->
      <div :style="inputGroupStyle">
        <label :style="inputLabelStyle">폭</label>
        <input
          type="number"
          :value="activeFaceDimensions.widthMm"
          @input="handleWidthChange"
          :style="inputStyle"
          min="1200"
          max="6000"
          step="100"
        />
        <span :style="unitStyle">mm</span>
      </div>

      <!-- 높이 입력 -->
      <div :style="inputGroupStyle">
        <label :style="inputLabelStyle">높이</label>
        <input
          type="number"
          :value="activeFaceDimensions.heightMm"
          @input="handleHeightChange"
          :style="inputStyle"
          min="2000"
          max="3000"
          step="100"
        />
        <span :style="unitStyle">mm</span>
      </div>

      <!-- 방 형태 변경 버튼 -->
      <button
        @click="handleShapeChangeClick"
        :style="shapeButtonStyle"
        @mouseenter="handleButtonHover"
        @mouseleave="handleButtonLeave"
      >
        형태 변경
      </button>

      <!-- 편집 버튼 -->
      <button
        @click="handleEditClick"
        :style="editButtonStyle"
        @mouseenter="handleButtonHover"
        @mouseleave="handleButtonLeave"
      >
        편집
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoomStore } from '../modules/roomCanvas/store';
import { useFaceHasShelf } from '../modules/roomCanvas/store/selectors';
import { FaceId } from '../modules/roomCanvas/models/roomShape';

const emit = defineEmits<{
  shapeChange: [];
  edit: [];
}>();

const store = useRoomStore();

// 상태 가져오기
const roomName = computed(() => store.roomName.value);
const roomShape = computed(() => store.roomShape.value);
const activeFaceId = computed(() => store.activeFaceId.value);
const availableFaces = computed(() => store.availableFaces.value);
const activeFaceDimensions = computed(() => store.activeFaceDimensions.value);

const roomShapeLabel = computed(() => {
  const shapeMap: Record<string, string> = {
    'ㄱ': 'ㄱ자 방',
    'ㄴ': 'ㄴ자 방',
    'ㄷ': 'ㄷ자 방',
    'ㅁ': 'ㅁ자 방',
  };
  return shapeMap[roomShape.value] || '';
});

// 면별 상태 확인
const getFaceStatus = (faceId: FaceId): boolean => {
  const hasShelf = useFaceHasShelf(faceId);
  return hasShelf.value;
};

// 이벤트 핸들러
const handleFaceSwitch = (faceId: FaceId) => {
  store.setActiveFaceId(faceId);
};

const handleWidthChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(value)) {
    store.updateActiveFaceDimensions({ widthMm: value });
  }
};

const handleHeightChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(value)) {
    store.updateActiveFaceDimensions({ heightMm: value });
  }
};

const handleShapeChangeClick = () => {
  emit('shapeChange');
};

const handleEditClick = () => {
  emit('edit');
};

// 탭 스타일 계산
const getTabStyle = (faceId: FaceId) => ({
  ...tabBaseStyle,
  backgroundColor: activeFaceId.value === faceId ? '#007AFF' : '#f5f5f5',
  color: activeFaceId.value === faceId ? '#fff' : '#666',
  fontWeight: activeFaceId.value === faceId ? '600' : '400',
  borderBottom: activeFaceId.value === faceId ? '3px solid #0056b3' : 'none',
});

// Hover 핸들러
const handleTabHover = (faceId: FaceId, e: MouseEvent) => {
  if (activeFaceId.value !== faceId) {
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = '#e8e8e8';
  }
};

const handleTabLeave = (faceId: FaceId, e: MouseEvent) => {
  if (activeFaceId.value !== faceId) {
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = '#f5f5f5';
  }
};

const handleButtonHover = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLButtonElement;
  target.style.backgroundColor = '#0056b3';
};

const handleButtonLeave = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLButtonElement;
  target.style.backgroundColor = '#007AFF';
};

// 스타일 정의
const containerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 32px',
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  borderBottom: '1px solid #e0e0e0',
  gap: '24px',
};

const leftSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const roomNameStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
};

const roomShapeStyle = {
  fontSize: '13px',
  color: '#999',
};

const centerSectionStyle = {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
};

const tabsContainerStyle = {
  display: 'flex',
  gap: '8px',
  backgroundColor: '#f5f5f5',
  padding: '4px',
  borderRadius: '8px',
};

const tabBaseStyle = {
  padding: '10px 24px',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  position: 'relative' as const,
};

const tabLabelStyle = {
  display: 'inline-block',
};

const badgeStyle = {
  fontSize: '8px',
  color: '#4CAF50',
};

const rightSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const inputGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const inputLabelStyle = {
  fontSize: '13px',
  color: '#666',
  fontWeight: '500',
};

const inputStyle = {
  width: '80px',
  padding: '6px 10px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  fontSize: '13px',
  textAlign: 'center' as const,
};

const unitStyle = {
  fontSize: '12px',
  color: '#999',
};

const shapeButtonStyle = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#fff',
  backgroundColor: '#007AFF',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const editButtonStyle = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#fff',
  backgroundColor: '#007AFF',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};
</script>

