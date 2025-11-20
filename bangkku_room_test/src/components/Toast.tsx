import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.toast}>
        <div style={styles.content}>
          <span style={styles.message}>{message}</span>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '20px',
    pointerEvents: 'none',
    zIndex: 10000,
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

// CSS 애니메이션 추가를 위한 스타일 태그 (index.css에 추가하거나 여기에 인라인으로)
const styleSheet = document.createElement('style');
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
if (!document.head.querySelector('style[data-toast-animation]')) {
  styleSheet.setAttribute('data-toast-animation', 'true');
  document.head.appendChild(styleSheet);
}

