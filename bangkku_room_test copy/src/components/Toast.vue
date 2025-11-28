<!-- Toast.vue: 사용자 알림 메시지를 잠시 표시하는 오버레이 -->
<template>
  <div v-if="isVisible" :style="styles.overlay">
    <div :style="styles.toast">
      <div :style="styles.content">
        <span :style="styles.message">{{ message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue';

interface Props {
  message: string;
  isVisible: boolean;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3000,
});

const emit = defineEmits<{
  close: [];
}>();

watch(
  () => props.isVisible,
  (visible) => {
    if (visible) {
      const timer = setTimeout(() => {
        emit('close');
      }, props.duration);
      return () => clearTimeout(timer);
    }
  }
);

const styles: { [key: string]: Record<string, string> } = {
  overlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '20px',
    pointerEvents: 'none',
    zIndex: '10000',
  },
  toast: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    minWidth: '300px',
    maxWidth: '500px',
    animation: 'slideDown 0.3s ease-out',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: '14px',
    lineHeight: '1.5',
    textAlign: 'center',
  },
};

onMounted(() => {
  // CSS 애니메이션 추가
  if (!document.head.querySelector('style[data-toast-animation]')) {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-toast-animation', 'true');
    styleSheet.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
});
</script>

