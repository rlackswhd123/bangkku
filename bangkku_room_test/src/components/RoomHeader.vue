<!-- RoomHeader.vue: 방 정보 및 면 전환/크기 설정 헤더 컴포넌트 -->
<template>
  <div :style="containerStyle">
    <!-- 좌측: 방 이름 -->
    <div :style="leftSectionStyle">
      <div :style="roomNameStyle">{{ roomName }}</div>
    </div>

    <!-- 중앙: 방 형태 표시 및 면 탭 -->
    <div :style="centerSectionStyle">
      <div :style="roomShapeContainerStyle">
        <div :style="roomShapeStyle">{{ roomShapeLabel }}</div>
        <!-- 방 형태 변경 버튼 -->
        <button
          @click="handleShapeChangeClick"
          :style="shapeButtonStyle"
          @mouseenter="handleButtonHover"
          @mouseleave="handleButtonLeave"
        >
          구조 변경
        </button>
      </div>
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

    <!-- 우측: 설정 버튼 -->
    <div :style="rightSectionStyle">
      <!-- 설정 버튼 -->
      <button
        @click="handleSettingsClick"
        :style="settingsButtonStyle"
        @mouseenter="handleButtonHover"
        @mouseleave="handleButtonLeave"
      >
        설정
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
  settings: [];
}>();

const store = useRoomStore();

// 상태 가져오기
const roomName = computed(() => store.roomName.value);
const roomShape = computed(() => store.roomShape.value);
const activeFaceId = computed(() => store.activeFaceId.value);
const availableFaces = computed(() => store.availableFaces.value);

const roomShapeLabel = computed(() => {
  const shapeMap = store.settings.value.roomShapeLabels;
  return shapeMap[roomShape.value as keyof typeof shapeMap] || '';
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

const handleShapeChangeClick = () => {
  emit('shapeChange');
};

const handleSettingsClick = () => {
  emit('settings');
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

const centerSectionStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const roomShapeContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const roomShapeStyle = {
  fontSize: '20px',
  color: '#999',
  fontWeight: 'bold',
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

const settingsButtonStyle = {
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

