<!-- RoomSizeModal.vue: 방 크기(폭) 입력과 검증을 담당하는 모달 -->
<template>
  <div v-if="isOpen" :style="styles.overlay" @click="handleCancel">
    <div :style="styles.modal" @click.stop>
      <!-- 헤더 -->
      <div :style="styles.header">
        <h2 :style="styles.title">방 크기 설정</h2>
        <button :style="styles.closeButton" @click="handleCancel">×</button>
      </div>

      <!-- 내용 -->
      <div :style="styles.content">
        <div :style="styles.inputGroup">
          <label :style="styles.label">폭 (mm)</label>
          <input
            type="number"
            :value="widthInput"
            @input="(e) => widthInput = (e.target as HTMLInputElement).value"
            :style="styles.input"
            :min="ROOM_CONSTRAINTS.MIN_WIDTH_MM"
            :max="ROOM_CONSTRAINTS.MAX_WIDTH_MM"
            placeholder="방 폭을 입력하세요"
          />
          <span :style="styles.hint">
            {{ ROOM_CONSTRAINTS.MIN_WIDTH_MM }} ~ {{ ROOM_CONSTRAINTS.MAX_WIDTH_MM }}mm
          </span>
        </div>

        <div :style="styles.inputGroup">
          <label :style="styles.label">높이 (mm)</label>
          <div :style="styles.fixedValue">
            {{ FIXED_HEIGHT_MM }}mm (고정)
          </div>
          <span :style="styles.hint">
            방 높이는 3400mm로 고정되어 있습니다.
          </span>
        </div>

        <div v-if="error" :style="styles.error">{{ error }}</div>

        <div v-if="hasFurniture" :style="styles.warning">
          <div :style="styles.warningIcon">⚠️</div>
          <div :style="styles.warningText">
            방 크기를 변경하면 모든 가구(기둥, 선반) 정보가 삭제됩니다.
          </div>
        </div>
      </div>

      <!-- 푸터 -->
      <div :style="styles.footer">
        <button :style="styles.cancelButton" @click="handleCancel">취소</button>
        <button :style="styles.saveButton" @click="handleSave">저장</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RoomState, ROOM_CONSTRAINTS } from '../types';
import { validateRoomWidth } from '../utils/validation';

interface Props {
  isOpen: boolean;
  room: RoomState;
  hasFurniture?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasFurniture: false,
});

const emit = defineEmits<{
  close: [];
  save: [room: RoomState];
}>();

const FIXED_HEIGHT_MM = 3400;
const widthInput = ref(props.room.roomWidthMm.toString());
const error = ref<string | null>(null);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      widthInput.value = props.room.roomWidthMm.toString();
      error.value = null;
    }
  }
);

watch(
  () => props.room,
  () => {
    if (props.isOpen) {
      widthInput.value = props.room.roomWidthMm.toString();
    }
  }
);

/** 폭 입력을 검증하고 부모에게 저장 이벤트를 보냅니다. */
const handleSave = () => {
  const width = parseInt(widthInput.value, 10);

  // 폭 검증
  const widthValidation = validateRoomWidth(width);
  if (!widthValidation.isValid) {
    error.value = widthValidation.message || '잘못된 폭 값입니다.';
    return;
  }

  // 에러 없으면 저장 (높이는 항상 고정값 사용)
  error.value = null;
  emit('save', {
    ...props.room,
    roomWidthMm: width,
    roomHeightMm: FIXED_HEIGHT_MM,
  });
  emit('close');
};

/** 입력과 에러 상태를 초기화하고 모달을 닫습니다. */
const handleCancel = () => {
  error.value = null;
  widthInput.value = props.room.roomWidthMm.toString();
  emit('close');
};

const styles: { [key: string]: Record<string, string> } = {
  overlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '90vw',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: '0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#999',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
  },
  fixedValue: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  error: {
    padding: '12px',
    fontSize: '14px',
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    borderRadius: '8px',
    border: '1px solid #ef9a9a',
  },
  warning: {
    padding: '12px',
    fontSize: '14px',
    color: '#f57c00',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    border: '1px solid #ffb74d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  warningIcon: {
    fontSize: '18px',
    flexShrink: '0',
  },
  warningText: {
    flex: '1',
    lineHeight: '1.5',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e0e0e0',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  saveButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
</script>

