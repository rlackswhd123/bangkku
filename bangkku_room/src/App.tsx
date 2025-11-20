import React, { useState } from 'react';
import { RoomCanvas } from './components/RoomCanvas';
import { RoomSizeModal } from './components/RoomSizeModal';
import { ObjectInfoPanel } from './components/ObjectInfoPanel';
import { Toast } from './components/Toast';
import { RoomState, DEFAULT_ROOM, Pillar, Shelf, ScaleInfo } from './types';

function App() {
  const [room, setRoom] = useState<RoomState>(DEFAULT_ROOM);
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);
  const [isRoomSizeModalOpen, setIsRoomSizeModalOpen] = useState(false);
  
  // 기둥들 (초기에는 빈 배열)
  const [pillars, setPillars] = useState<Pillar[]>([]);

  // 선반들 (초기에는 빈 배열)
  const [shelves, setShelves] = useState<Shelf[]>([]);

  // 선택된 오브젝트
  const [selectedType, setSelectedType] = useState<'pillar' | 'shelf' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 토스트 메시지 상태
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  };

  const hideToast = () => {
    setIsToastVisible(false);
  };

  // 선택된 오브젝트 정보
  const selectedPillar = selectedType === 'pillar' && selectedId
    ? pillars.find(p => p.id === selectedId) || null
    : null;
  const selectedShelf = selectedType === 'shelf' && selectedId
    ? shelves.find(s => s.id === selectedId) || null
    : null;

  // 오브젝트 선택 핸들러
  const handleObjectSelect = (type: 'pillar' | 'shelf' | null, id: string | null) => {
    setSelectedType(type);
    setSelectedId(id);
  };

  // 오브젝트 삭제 핸들러
  const handleDelete = () => {
    if (selectedType === 'pillar' && selectedId) {
      // 기둥 삭제
      setPillars(pillars.filter(p => p.id !== selectedId));
      // 해당 기둥을 사용하는 선반도 삭제
      setShelves(shelves.filter(s => 
        s.startPillarId !== selectedId && s.endPillarId !== selectedId
      ));
    } else if (selectedType === 'shelf' && selectedId) {
      // 선반 삭제
      setShelves(shelves.filter(s => s.id !== selectedId));
    }
    setSelectedType(null);
    setSelectedId(null);
  };

  // 방 폭을 미터로 표시
  const roomWidthM = (room.roomWidthMm / 1000).toFixed(1);

  return (
    <div style={styles.container}>
      {/* 상단 타이틀 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>{roomWidthM}m</h1>
          <p style={styles.headerSubtitle}>시스템 선반 레이아웃 편집기</p>
        </div>
        <button 
          style={styles.sizeButton}
          onClick={() => setIsRoomSizeModalOpen(true)}
        >
          방 크기 설정
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={styles.mainContent}>
        {/* 캔버스 영역 */}
        <div style={styles.canvasContainer}>
          <RoomCanvas 
            room={room} 
            pillars={pillars}
            shelves={shelves}
            onScaleChange={setScaleInfo}
            onRoomChange={setRoom}
            onPillarsChange={setPillars}
            onShelvesChange={setShelves}
            onObjectSelect={handleObjectSelect}
            onShowToast={showToast}
          />
        </div>

        {/* 오브젝트 정보 패널 */}
        <ObjectInfoPanel
          selectedType={selectedType}
          selectedId={selectedId}
          pillar={selectedPillar}
          shelf={selectedShelf}
          pillars={pillars}
          onClose={() => {
            setSelectedType(null);
            setSelectedId(null);
          }}
          onDelete={handleDelete}
        />
      </div>

      {/* 방 크기 설정 모달 */}
      <RoomSizeModal
        isOpen={isRoomSizeModalOpen}
        room={room}
        onClose={() => setIsRoomSizeModalOpen(false)}
        onSave={(newRoom) => {
          // 방 크기 변경 시 모든 가구 정보 삭제
          setPillars([]);
          setShelves([]);
          setSelectedType(null);
          setSelectedId(null);
          setRoom(newRoom);
          setIsRoomSizeModalOpen(false);
        }}
        hasFurniture={pillars.length > 0 || shelves.length > 0}
      />

      {/* 토스트 메시지 */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#5B7FA6',
    color: '#fff',
    padding: '8px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: '1.2',
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    opacity: 0.9,
    textAlign: 'left',
  },
  sizeButton: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#5B7FA6',
    backgroundColor: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#e8e4d9',
    position: 'relative',
  },
};

export default App;

