<!-- ShapeSelector.vue: 방 형태 선택 모달 컴포넌트 -->
<template>
  <Teleport to="body">
    <div v-if="isOpen" :style="overlayStyle" @click="handleClose">
      <div :style="modalStyle" @click.stop>
        <!-- 헤더 -->
        <div :style="headerStyle">
          <div :style="titleStyle">방 형태 선택</div>
          <div :style="subtitleStyle">원하시는 방 형태를 선택해주세요</div>
        </div>

        <!-- 본문: 형태 카드 그리드 -->
        <div :style="bodyStyle">
          <div :style="gridStyle">
            <!-- ㄱ자 방 -->
            <div
              @click="handleShapeSelect('ㄱ')"
              :style="getCardStyle('ㄱ')"
              @mouseenter="handleCardHover('ㄱ', $event)"
              @mouseleave="handleCardLeave('ㄱ', $event)"
            >
              <div :style="shapeIconStyle">ㄱ</div>
              <div :style="shapeNameStyle">ㄱ자 방</div>
              <div :style="shapeDescStyle">2개 면 사용</div>
            </div>

            <!-- ㄴ자 방 -->
            <div
              @click="handleShapeSelect('ㄴ')"
              :style="getCardStyle('ㄴ')"
              @mouseenter="handleCardHover('ㄴ', $event)"
              @mouseleave="handleCardLeave('ㄴ', $event)"
            >
              <div :style="shapeIconStyle">ㄴ</div>
              <div :style="shapeNameStyle">ㄴ자 방</div>
              <div :style="shapeDescStyle">3개 면 사용</div>
            </div>

            <!-- ㄷ자 방 -->
            <div
              @click="handleShapeSelect('ㄷ')"
              :style="getCardStyle('ㄷ')"
              @mouseenter="handleCardHover('ㄷ', $event)"
              @mouseleave="handleCardLeave('ㄷ', $event)"
            >
              <div :style="shapeIconStyle">ㄷ</div>
              <div :style="shapeNameStyle">ㄷ자 방</div>
              <div :style="shapeDescStyle">4개 면 사용</div>
            </div>

            <!-- ㅁ자 방 -->
            <div
              @click="handleShapeSelect('ㅁ')"
              :style="getCardStyle('ㅁ')"
              @mouseenter="handleCardHover('ㅁ', $event)"
              @mouseleave="handleCardLeave('ㅁ', $event)"
            >
              <div :style="shapeIconStyle">ㅁ</div>
              <div :style="shapeNameStyle">ㅁ자 방</div>
              <div :style="shapeDescStyle">4개 면 사용</div>
            </div>
          </div>
        </div>

        <!-- 푸터 -->
        <div :style="footerStyle">
          <button
            @click="handleClose"
            :style="cancelButtonStyle"
            @mouseenter="handleCancelButtonHover"
            @mouseleave="handleCancelButtonLeave"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RoomShape } from '../modules/roomCanvas/models/roomShape';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  select: [shape: RoomShape];
}>();

const selectedShape = ref<RoomShape | null>(null);
const hoveredShape = ref<RoomShape | null>(null);

const handleShapeSelect = (shape: RoomShape) => {
  selectedShape.value = shape;
  emit('select', shape);
  emit('close');
};

const handleClose = () => {
  emit('close');
};

const getCardStyle = (shape: RoomShape) => ({
  ...cardBaseStyle,
  borderColor: selectedShape.value === shape ? '#007AFF' : '#e0e0e0',
  backgroundColor: selectedShape.value === shape ? '#E3F2FD' : '#fff',
});

const handleCardHover = (shape: RoomShape, e: MouseEvent) => {
  hoveredShape.value = shape;
  const target = e.currentTarget as HTMLElement;
  target.style.borderColor = '#007AFF';
  target.style.boxShadow = '0 6px 20px rgba(0,122,255,0.25)';
  target.style.transform = 'translateY(-4px)';
};

const handleCardLeave = (shape: RoomShape, e: MouseEvent) => {
  hoveredShape.value = null;
  const target = e.currentTarget as HTMLElement;
  if (selectedShape.value !== shape) {
    target.style.borderColor = '#e0e0e0';
  }
  target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  target.style.transform = 'translateY(0)';
};

const handleCancelButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
};

const handleCancelButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
};

// 스타일 정의
const overlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  width: '700px',
  maxHeight: '80vh',
  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};

const headerStyle = {
  padding: '32px 32px 24px',
  borderBottom: '1px solid #e0e0e0',
};

const titleStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '8px',
};

const subtitleStyle = {
  fontSize: '14px',
  color: '#666',
};

const bodyStyle = {
  padding: '32px',
  flex: 1,
  overflowY: 'auto' as const,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '24px',
};

const cardBaseStyle = {
  border: '2px solid #e0e0e0',
  borderRadius: '12px',
  padding: '32px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: '#fff',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '180px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const shapeIconStyle = {
  fontSize: '64px',
  fontWeight: 'bold',
  color: '#007AFF',
  marginBottom: '16px',
  fontFamily: 'monospace',
};

const shapeNameStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '8px',
};

const shapeDescStyle = {
  fontSize: '14px',
  color: '#999',
};

const footerStyle = {
  padding: '20px 32px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const cancelButtonStyle = {
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
</script>

