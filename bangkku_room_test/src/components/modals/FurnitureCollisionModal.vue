<!-- FurnitureCollisionModal.vue: 가구 겹침 확인용 모달 -->
<template>
  <Teleport to="body">
    <div v-if="isOpen">
      <div :style="overlayStyle" @click="$emit('cancel')" />
      <div :style="modalStyle" @click.stop>
        <div :style="headerStyle">
          <div :style="titleStyle">가구와 겹치는 위치입니다</div>
          <div :style="subtitleStyle">
            {{ targetLabel }}을(를) 생성하려면 겹치는 가구를 삭제해야 합니다.
          </div>
        </div>

        <div :style="bodyStyle">
          <div :style="descriptionStyle">
            적용을 누르면 아래 가구를 삭제한 뒤 {{ targetLabel }}을(를) 생성합니다.
          </div>
          <div :style="listWrapperStyle">
            <div
              v-for="furniture in conflictingFurnitures"
              :key="furniture.id"
              :style="listItemStyle"
            >
              <div :style="listItemNameStyle">{{ furniture.name }}</div>
              <div :style="listItemMetaStyle">
                {{ furniture.widthMm }}mm × {{ furniture.heightMm }}mm
              </div>
            </div>
          </div>
        </div>

        <div :style="footerStyle">
          <button
            :style="cancelButtonStyle"
            @mouseenter="handleButtonHover($event, 'cancel')"
            @mouseleave="handleButtonLeave($event, 'cancel')"
            @click="$emit('cancel')"
          >
            취소
          </button>
          <button
            :style="confirmButtonStyle"
            @mouseenter="handleButtonHover($event, 'confirm')"
            @mouseleave="handleButtonLeave($event, 'confirm')"
            @click="$emit('confirm')"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { PlacedFurniture } from '../../modules/roomCanvas/models/furniture';

defineProps<{
  isOpen: boolean;
  targetLabel: string;
  conflictingFurnitures: PlacedFurniture[];
}>();

defineEmits<{
  cancel: [];
  confirm: [];
}>();

const overlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  zIndex: 999,
};

const modalStyle = {
  position: 'fixed' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '520px',
  maxWidth: '90vw',
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  zIndex: 1000,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
};

const headerStyle = {
  padding: '20px 24px',
  borderBottom: '1px solid #e5e5e5',
  backgroundColor: '#f9fbff',
};

const titleStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#1d1d1f',
  marginBottom: '6px',
};

const subtitleStyle = {
  fontSize: '13px',
  color: '#555',
};

const bodyStyle = {
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const descriptionStyle = {
  fontSize: '14px',
  color: '#444',
  lineHeight: 1.6,
};

const listWrapperStyle = {
  maxHeight: '220px',
  overflowY: 'auto' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const listItemStyle = {
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '12px',
  backgroundColor: '#fafafa',
};

const listItemNameStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1d1d1f',
  marginBottom: '4px',
};

const listItemMetaStyle = {
  fontSize: '12px',
  color: '#777',
};

const footerStyle = {
  padding: '16px 24px',
  borderTop: '1px solid #e5e5e5',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
};

const baseButtonStyle = {
  padding: '10px 18px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const cancelButtonStyle = {
  ...baseButtonStyle,
  border: '1px solid #d0d0d0',
  backgroundColor: '#fff',
  color: '#555',
};

const confirmButtonStyle = {
  ...baseButtonStyle,
  border: '1px solid #007aff',
  backgroundColor: '#007aff',
  color: '#fff',
};

const handleButtonHover = (e: MouseEvent, type: 'cancel' | 'confirm') => {
  const target = e.currentTarget as HTMLButtonElement;
  if (type === 'cancel') {
    target.style.backgroundColor = '#f5f5f5';
  } else {
    target.style.backgroundColor = '#0056b3';
  }
};

const handleButtonLeave = (e: MouseEvent, type: 'cancel' | 'confirm') => {
  const target = e.currentTarget as HTMLButtonElement;
  if (type === 'cancel') {
    target.style.backgroundColor = '#fff';
  } else {
    target.style.backgroundColor = '#007aff';
  }
};
</script>
