import React, { useState } from 'react';
import { RoomState, ROOM_CONSTRAINTS } from '../types';
import { validateRoomWidth, validateRoomHeight } from '../utils/validation';
import { formatMmToDisplay } from '../utils/coordinates';

interface RoomSettingsPanelProps {
  room: RoomState;
  onRoomChange: (room: RoomState) => void;
}

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({ room, onRoomChange }) => {
  const [widthInput, setWidthInput] = useState(room.roomWidthMm.toString());
  const [heightInput, setHeightInput] = useState(room.roomHeightMm.toString());
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const width = parseInt(widthInput, 10);
    const height = parseInt(heightInput, 10);

    // 폭 검증
    const widthValidation = validateRoomWidth(width);
    if (!widthValidation.isValid) {
      setError(widthValidation.message || '잘못된 폭 값입니다.');
      return;
    }

    // 높이 검증
    const heightValidation = validateRoomHeight(height);
    if (!heightValidation.isValid) {
      setError(heightValidation.message || '잘못된 높이 값입니다.');
      return;
    }

    // 에러 없으면 적용
    setError(null);
    onRoomChange({
      ...room,
      roomWidthMm: width,
      roomHeightMm: height,
    });
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>방 크기 설정</h2>

      <div style={styles.infoSection}>
        <div style={styles.infoItem}>
          <span style={styles.label}>현재 폭:</span>
          <span style={styles.value}>{formatMmToDisplay(room.roomWidthMm)}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.label}>현재 높이:</span>
          <span style={styles.value}>{formatMmToDisplay(room.roomHeightMm)}</span>
        </div>
      </div>

      <div style={styles.inputSection}>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>폭 (mm)</label>
          <input
            type="number"
            value={widthInput}
            onChange={(e) => setWidthInput(e.target.value)}
            style={styles.input}
            min={ROOM_CONSTRAINTS.MIN_WIDTH_MM}
            max={ROOM_CONSTRAINTS.MAX_WIDTH_MM}
          />
          <span style={styles.hint}>
            {ROOM_CONSTRAINTS.MIN_WIDTH_MM} ~ {ROOM_CONSTRAINTS.MAX_WIDTH_MM}mm
          </span>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>높이 (mm)</label>
          <input
            type="number"
            value={heightInput}
            onChange={(e) => setHeightInput(e.target.value)}
            style={styles.input}
            min={ROOM_CONSTRAINTS.MIN_HEIGHT_MM}
            max={ROOM_CONSTRAINTS.MAX_HEIGHT_MM}
          />
          <span style={styles.hint}>
            {ROOM_CONSTRAINTS.MIN_HEIGHT_MM} ~ {ROOM_CONSTRAINTS.MAX_HEIGHT_MM}mm
          </span>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button onClick={handleApply} style={styles.button}>
          적용
        </button>
      </div>

      <div style={styles.guideSection}>
        <p style={styles.guideText}>
          💡 이 벽 안에서 시스템 기둥과 선반을 배치하게 됩니다.
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    width: '320px',
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: '14px',
    color: '#333',
    fontWeight: 'bold',
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  inputLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: {
    padding: '12px',
    fontSize: '14px',
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    borderRadius: '6px',
    border: '1px solid #ef9a9a',
  },
  guideSection: {
    padding: '16px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    borderLeft: '4px solid #2196F3',
  },
  guideText: {
    margin: 0,
    fontSize: '14px',
    color: '#1565c0',
    lineHeight: '1.6',
  },
};

