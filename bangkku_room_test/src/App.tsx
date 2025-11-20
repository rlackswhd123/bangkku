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

  // 기둥 삭제 확인 모달 상태
  const [pillarDeleteModal, setPillarDeleteModal] = useState<{
    show: boolean;
    pillarId: string;
    connectedShelvesCount: number;
  } | null>(null);

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
      // 해당 기둥을 사용하는 선반이 있는지 확인
      const connectedShelves = shelves.filter(s => 
        s.startPillarId === selectedId || s.endPillarId === selectedId
      );
      
      if (connectedShelves.length > 0) {
        // 연결된 선반이 있으면 확인 모달 표시
        setPillarDeleteModal({
          show: true,
          pillarId: selectedId,
          connectedShelvesCount: connectedShelves.length,
        });
        return;
      }
      
      // 연결된 선반이 없으면 바로 삭제
      setPillars(pillars.filter(p => p.id !== selectedId));
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'shelf' && selectedId) {
      // 선반 삭제
      setShelves(shelves.filter(s => s.id !== selectedId));
      setSelectedType(null);
      setSelectedId(null);
    }
  };

  // 기둥 삭제 확인 핸들러
  const handlePillarDeleteConfirm = (confirmed: boolean) => {
    if (!pillarDeleteModal) return;

    if (confirmed) {
      // 확인: 기둥과 연결된 선반 모두 삭제
      setPillars(pillars.filter(p => p.id !== pillarDeleteModal.pillarId));
      setShelves(shelves.filter(s => 
        s.startPillarId !== pillarDeleteModal.pillarId && 
        s.endPillarId !== pillarDeleteModal.pillarId
      ));
      setSelectedType(null);
      setSelectedId(null);
    }
    
    setPillarDeleteModal(null);
  };

  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>방 설계</h1>
        <button
          onClick={() => setIsRoomSizeModalOpen(true)}
          style={styles.roomSizeButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
          }}
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

      {/* 기둥 삭제 확인 모달 */}
      {pillarDeleteModal && pillarDeleteModal.show && (
        <>
          {/* 모달 외부 배경 (어두운 오버레이) */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => handlePillarDeleteConfirm(false)}
          />
          {/* 모달 컨테이너 */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '400px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '16px',
              }}
            >
              기둥 삭제 확인
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '24px',
              }}
            >
              이 기둥과 연결된 선반 {pillarDeleteModal.connectedShelvesCount}개가 함께 삭제됩니다.
              <br />
              정말 삭제하시겠습니까?
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => handlePillarDeleteConfirm(false)}
                style={{
                  padding: '10px 24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#666',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                취소
              </button>
              <button
                onClick={() => handlePillarDeleteConfirm(true)}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#007AFF',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0056b3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#007AFF';
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    borderBottom: '1px solid #e0e0e0',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  roomSizeButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#007AFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
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

