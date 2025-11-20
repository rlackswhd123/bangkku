import React, { useRef, useState, useCallback, useMemo } from 'react';
import { RoomState, Pillar, Shelf, DragState, PILLAR_SHELF_CONSTRAINTS, ScaleInfo } from '../types';
import { mmToPxX, mmToPxY, pxToMmX, pxToMmY, snapToGrid } from '../utils/coordinates';
import { useImageAssets } from '../modules/roomCanvas/hooks/useImageAssets';
import { useRoomCanvasRenderer, useCursorUpdater } from '../modules/roomCanvas/hooks/useRoomCanvasRenderer';
import { calculateShelfButtonPositions } from '../modules/roomCanvas/canvas/drawers/buttons';
import { createPillarPositionValidator, createShelfPositionValidator } from '../modules/roomCanvas/interactions/constraints';

interface RoomCanvasProps {
  room: RoomState;
  pillars: Pillar[];
  shelves: Shelf[];
  onScaleChange: (scaleInfo: ScaleInfo) => void;
  onRoomChange: (room: RoomState) => void;
  onPillarsChange: (pillars: Pillar[]) => void;
  onShelvesChange: (shelves: Shelf[]) => void;
  onObjectSelect: (type: 'pillar' | 'shelf' | null, id: string | null) => void;
  onShowToast: (message: string) => void;
}

export const RoomCanvas: React.FC<RoomCanvasProps> = ({ 
  room, 
  pillars, 
  shelves, 
  onScaleChange, 
  onRoomChange: _onRoomChange, 
  onPillarsChange, 
  onShelvesChange,
  onObjectSelect,
  onShowToast
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { cornerImages, shelfImages } = useImageAssets();
  
  // 기둥/선반 드래그 상태
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    targetId: null,
  });

  const scaleInfo = useRoomCanvasRenderer({
    canvasRef,
    containerRef,
    room,
    pillars,
    shelves,
    dragState,
    cornerImages,
    shelfImages,
    onScaleChange,
  });

  useCursorUpdater(canvasRef, scaleInfo, pillars, shelves);

  const validatePillarPosition = useMemo(() => createPillarPositionValidator(room), [room]);

  const validateShelfPosition = useMemo(
    () => createShelfPositionValidator(),
    []
  );

  // 선반 종류 선택 모달 상태
  const [shelfTypeModal, setShelfTypeModal] = useState<{
    show: boolean;
    startPillarId: string;
    endPillarId: string;
    x: number;  // 모달 표시 위치 (px)
    y: number;  // 모달 표시 위치 (px)
  } | null>(null);

  // 코너장 확인 모달 상태 (기둥 드래그 시 빨간 네모 밖으로 나갈 때)
  const [cornerPillarModal, setCornerPillarModal] = useState<{
    show: boolean;
    pillarId: string;
  } | null>(null);

  // 기둥 스타일 선택 상태
  const [selectedPillarStyle, setSelectedPillarStyle] = useState<'rear-single' | 'center-single' | 'dual'>('rear-single');
  
  // 기둥 스타일 컨텍스트 메뉴 열림 상태
  const [isPillarStyleMenuOpen, setIsPillarStyleMenuOpen] = useState(false);

  const renderShelfPreview = (type: Shelf['type']) => {
    const image = shelfImages[type];
    if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      return (
        <img
          src={image.src}
          alt={`${type} shelf preview`}
          style={{
            width: '90%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: '70%',
          height: '18px',
          borderRadius: '999px',
          backgroundColor: '#d0d0d0',
        }}
      />
    );
  };


  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scaleInfo) return;
    
    // 선반 타입 선택 모달이 열려있으면 닫기
    if (shelfTypeModal) {
      setShelfTypeModal(null);
      return;
    }
    
    // 코너장 확인 모달이 열려있으면 닫기
    if (cornerPillarModal) {
      setCornerPillarModal(null);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { redRect } = scaleInfo;

    // 1순위: 기둥 추가 버튼 클릭 체크
    // 동적 위치 계산
    const normalPillars = pillars.filter(p => p.type !== 'wall');
    let buttonX: number;
    if (normalPillars.length === 0) {
      buttonX = mmToPxX(600, scaleInfo);
    } else {
      const rightmostPillar = normalPillars.reduce((rightmost, current) =>
        current.xMm > rightmost.xMm ? current : rightmost
      );
      const buttonXMm = rightmostPillar.xMm + 600;
      buttonX = mmToPxX(buttonXMm, scaleInfo);
    }
    const buttonY = redRect.y + redRect.height * 0.5;
    const pillarButtonWidth = 70;
    const pillarButtonHeight = 30;
    
    if (
      x >= buttonX - pillarButtonWidth / 2 &&
      x <= buttonX + pillarButtonWidth / 2 &&
      y >= buttonY - pillarButtonHeight / 2 &&
      y <= buttonY + pillarButtonHeight / 2
    ) {
      // 칸 추가 (기둥 추가)
      // 일반 기둥들만 필터링 (벽 기둥 제외)
      const normalPillars = pillars.filter(p => p.type !== 'wall');
      
      if (normalPillars.length === 0) {
        // 첫 번째 칸 추가: 기둥 2개를 한 번에 생성
        const firstXMm = 0;
        const secondXMm = 700;
        
        // 빨간 네모 범위 체크 (0 ~ roomWidthMm)
        if (firstXMm < 0 || firstXMm > room.roomWidthMm || 
            secondXMm < 0 || secondXMm > room.roomWidthMm) {
          onShowToast('기둥은 정면 벽 내에만 생성할 수 있습니다.');
          return;
        }
        
        const firstPillar: Pillar = {
          id: `pillar-${Date.now()}`,
          xMm: firstXMm,
          type: 'normal',
          pillarStyle: selectedPillarStyle
        };
        const secondPillar: Pillar = {
          id: `pillar-${Date.now() + 1}`,
          xMm: secondXMm,
          type: 'normal',
          pillarStyle: selectedPillarStyle
        };
        onPillarsChange([...pillars, firstPillar, secondPillar]);
      } else {
        // 이후 칸 추가: 기둥 1개씩 생성
        const rightmostPillar = normalPillars.reduce((rightmost, current) => 
          current.xMm > rightmost.xMm ? current : rightmost
        );
        const newXMm = rightmostPillar.xMm + 700;
        
        // 빨간 네모 범위 체크 (0 ~ roomWidthMm)
        if (newXMm < 0 || newXMm > room.roomWidthMm) {
          onShowToast('기둥은 정면 벽 내에만 생성할 수 있습니다.');
          return;
        }
        
        const newPillar: Pillar = {
          id: `pillar-${Date.now()}`,
          xMm: newXMm,
          type: 'normal',
          pillarStyle: selectedPillarStyle
        };
        onPillarsChange([...pillars, newPillar]);
      }
      return;
    }

    // 1-2순위: 선반 추가 버튼들 클릭 체크 (원형)
    const normalPillarsForShelf = pillars.filter(p => p.type !== 'wall');
    if (normalPillarsForShelf.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(pillars, shelves, scaleInfo);
      const shelfButtonRadius = 17.5;
      for (const button of shelfButtons) {
        const distanceToShelfButton = Math.sqrt(
          Math.pow(x - button.x, 2) + Math.pow(y - button.y, 2)
        );
        if (distanceToShelfButton <= shelfButtonRadius) {
          // 선반 종류 선택 모달 표시
          setShelfTypeModal({
            show: true,
            startPillarId: button.startPillarId,
            endPillarId: button.endPillarId,
            x: button.x,
            y: button.y,
          });
          return;
        }
      }
      
    }

    // 2순위: 선반 클릭 체크
    for (const shelf of shelves) {
      const startPillar = pillars.find(p => p.id === shelf.startPillarId);
      const endPillar = pillars.find(p => p.id === shelf.endPillarId);
      if (!startPillar || !endPillar) continue;

      const startX = mmToPxX(startPillar.xMm, scaleInfo);
      const endX = mmToPxX(endPillar.xMm, scaleInfo);
      const shelfY = mmToPxY(shelf.heightMm, scaleInfo);
      const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

      if (
        x >= startX &&
        x <= endX &&
        y >= shelfY - shelfThickness / 2 - 5 &&
        y <= shelfY + shelfThickness / 2 + 5
      ) {
        // 선반 선택
        onObjectSelect('shelf', shelf.id);
        // 드래그 상태도 설정 (높이 조절용)
        setDragState({
          type: 'shelf',
          targetId: shelf.id,
          startY: y,
          originalHeightMm: shelf.heightMm,
        });
        return;
      }
    }

    // 4순위: 기둥 클릭 체크 (벽 기둥 제외)
    const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
    for (const pillar of pillars) {
      if (pillar.type === 'wall') continue; // 벽 기둥은 드래그 불가

      const pillarX = mmToPxX(pillar.xMm, scaleInfo);
      if (
        x >= pillarX - pillarWidthPx / 2 - 5 &&
        x <= pillarX + pillarWidthPx / 2 + 5 &&
        y >= redRect.y &&
        y <= redRect.y + redRect.height
      ) {
        // 기둥 선택
        onObjectSelect('pillar', pillar.id);
        // 드래그 상태도 설정 (위치 이동용)
        setDragState({
          type: 'pillar',
          targetId: pillar.id,
          startX: x,
          originalXMm: pillar.xMm,
        });
        return;
      }
    }

    // 아무것도 클릭하지 않았으면 선택 해제
    onObjectSelect(null, null);
  }, [scaleInfo, room.roomWidthMm, pillars, shelves, onObjectSelect, shelfTypeModal, cornerPillarModal, selectedPillarStyle, onPillarsChange, onShowToast]);


  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scaleInfo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 기둥 드래그
    if (dragState.type === 'pillar' && dragState.targetId) {
      const newXMm = pxToMmX(x, scaleInfo);
      
      // 100mm 그리드로 스냅 (빨간 네모 왼쪽 기준)
      const snappedXMm = snapToGrid(newXMm, 100);
      
      // 빨간 네모 밖으로 나갈 때 최대 300mm까지만 허용
      const MAX_OUTSIDE_MM = 300;
      const minXMm = -MAX_OUTSIDE_MM; // 왼쪽으로 최대 300mm
      const maxXMm = room.roomWidthMm + MAX_OUTSIDE_MM; // 오른쪽으로 최대 300mm
      
      // 범위 제한
      const clampedXMm = Math.max(minXMm, Math.min(maxXMm, snappedXMm));
      
      // 기둥 간격 제약 체크는 빨간 네모 안에 있을 때만 적용
      let constrainedXMm = clampedXMm;
      if (clampedXMm >= 0 && clampedXMm <= room.roomWidthMm) {
        constrainedXMm = validatePillarPosition(dragState.targetId, clampedXMm, pillars);
      }

      onPillarsChange(
        pillars.map(p =>
          p.id === dragState.targetId ? { ...p, xMm: constrainedXMm } : p
        )
      );
      return;
    }

    // 선반 높이 드래그
    if (dragState.type === 'shelf' && dragState.targetId) {
      const newHeightMm = pxToMmY(y, scaleInfo);
      
      // 빨간 네모의 최대 높이 계산 (mm 단위)
      const maxHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY;
      
      // 범위 제한 (0 ~ 빨간 네모 최대 높이, 빨간 네모 아래쪽 기준)
      const clampedHeightMm = Math.max(0, Math.min(maxHeightMm, newHeightMm));
      
      // 100mm 그리드로 스냅 (빨간 네모 아래쪽 기준)
      const snappedHeightMm = snapToGrid(clampedHeightMm, 100);
      
      // 선반 간격 제약 체크 (최소 200mm만, 최대 간격은 체크 안 함)
      // 넘어가는 경우 허용, 같은 방향에 있을 때만 간격 체크
      const constrainedHeightMm = validateShelfPosition(dragState.targetId, snappedHeightMm, shelves);
      
      // 제약 후에도 그리드 스냅 유지 (제약으로 인해 그리드에서 벗어날 수 있으므로)
      const finalHeightMm = snapToGrid(constrainedHeightMm, 100);

      onShelvesChange(
        shelves.map(s =>
          s.id === dragState.targetId ? { ...s, heightMm: finalHeightMm } : s
        )
      );
      return;
    }
  }, [
    dragState,
    scaleInfo,
    room,
    pillars,
    shelves,
    onPillarsChange,
    onShelvesChange,
    validatePillarPosition,
    validateShelfPosition,
  ]);

  const handleMouseUp = useCallback(() => {
    // 기둥/선반 드래그 종료
    if (dragState.type === 'pillar' && dragState.targetId && scaleInfo) {
      const draggedPillar = pillars.find(p => p.id === dragState.targetId);
      if (draggedPillar) {
        // 빨간 네모 밖으로 나갔는지 체크
        const isOutsideRedRect = draggedPillar.xMm < 0 || draggedPillar.xMm > room.roomWidthMm;
        
        if (isOutsideRedRect && !draggedPillar.cornerPillar) {
          // 코너장 확인 모달 표시
          setCornerPillarModal({
            show: true,
            pillarId: draggedPillar.id,
          });
        } else {
          // 빨간 네모 안으로 제한
          const clampedXMm = Math.max(0, Math.min(room.roomWidthMm, draggedPillar.xMm));
          const snappedXMm = snapToGrid(clampedXMm, 100);
          const constrainedXMm = validatePillarPosition(dragState.targetId, snappedXMm, pillars);
          
          onPillarsChange(
            pillars.map(p =>
              p.id === dragState.targetId ? { ...p, xMm: constrainedXMm } : p
            ).sort((a, b) => a.xMm - b.xMm)
          );
        }
      }
    }
    
    setDragState({ type: null, targetId: null });
  }, [dragState, pillars, scaleInfo, room.roomWidthMm, onPillarsChange, validatePillarPosition]);

  const handleMouseLeave = useCallback(() => {
    setDragState({ type: null, targetId: null });
  }, []);

  // 선반 타입 선택 핸들러
  const handleShelfTypeSelect = useCallback((shelfType: 'normal' | 'hanger' | 'drawer') => {
    if (!shelfTypeModal || !scaleInfo) return;

    // 현재 클릭한 버튼의 기둥 쌍과 동일한 기둥 쌍을 가진 선반들만 필터링
    const samePairShelves = shelves.filter(shelf =>
      shelf.startPillarId === shelfTypeModal.startPillarId &&
      shelf.endPillarId === shelfTypeModal.endPillarId
    );
    
    // 빨간 네모의 최대 높이 계산
    const maxHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY;
    
    let newHeightMm: number;
    if (samePairShelves.length === 0) {
      // 해당 기둥 쌍의 첫 번째 선반: 빨간 네모의 최대 높이(위쪽)에서 300mm 아래에서 시작
      newHeightMm = maxHeightMm - 300;
    } else {
      // 해당 기둥 쌍의 다음 선반들: 가장 위 선반(가장 작은 heightMm)에서 400mm 아래로
      const topmostShelf = samePairShelves.reduce((topmost, current) => 
        current.heightMm < topmost.heightMm ? current : topmost
      );
      newHeightMm = topmostShelf.heightMm - 400;
    }
    
    // 빨간 네모 범위 체크 (0 ~ maxHeightMm)
    if (newHeightMm < 0 || newHeightMm > maxHeightMm) {
      onShowToast('선반은 정면 벽 범위 내에만 생성할 수 있습니다.');
      setShelfTypeModal(null);
      return;
    }
    
    // 코너장 기둥 체크: 시작 기둥 또는 끝 기둥이 코너장이면 선반도 코너장으로 설정
    const startPillar = pillars.find(p => p.id === shelfTypeModal.startPillarId);
    const endPillar = pillars.find(p => p.id === shelfTypeModal.endPillarId);
    const isCornerShelf = startPillar?.cornerPillar || endPillar?.cornerPillar || false;
    
    const newShelf: Shelf = {
      id: `shelf-${Date.now()}`,
      startPillarId: shelfTypeModal.startPillarId,
      endPillarId: shelfTypeModal.endPillarId,
      heightMm: newHeightMm,
      type: shelfType,
      cornerShelf: isCornerShelf,
    };
    onShelvesChange([...shelves, newShelf]);
    setShelfTypeModal(null);
  }, [shelfTypeModal, scaleInfo, shelves, pillars, onShelvesChange, onShowToast]);

  // 코너장 확인 핸들러
  const handleCornerPillarConfirm = useCallback((confirmed: boolean) => {
    if (!cornerPillarModal || !scaleInfo) return;

    const draggedPillar = pillars.find(p => p.id === cornerPillarModal.pillarId);
    if (!draggedPillar) {
      setCornerPillarModal(null);
      return;
    }

    // 확인/취소 모두 빨간 네모 안으로 제한
    const clampedXMm = Math.max(0, Math.min(room.roomWidthMm, draggedPillar.xMm));
    const snappedXMm = snapToGrid(clampedXMm, 100);
    const constrainedXMm = validatePillarPosition(cornerPillarModal.pillarId, snappedXMm, pillars);
    
    if (confirmed) {
      // 확인: 기둥을 코너장으로 설정하고 빨간 네모 안으로 이동
      onPillarsChange(
        pillars.map(p =>
          p.id === cornerPillarModal.pillarId
            ? { ...p, cornerPillar: true, xMm: constrainedXMm }
            : p
        ).sort((a, b) => a.xMm - b.xMm)
      );
    } else {
      // 취소: 빨간 네모 안으로만 이동
      onPillarsChange(
        pillars.map(p =>
          p.id === cornerPillarModal.pillarId ? { ...p, xMm: constrainedXMm } : p
        ).sort((a, b) => a.xMm - b.xMm)
      );
    }
    
    setCornerPillarModal(null);
  }, [cornerPillarModal, pillars, scaleInfo, room.roomWidthMm, onPillarsChange, validatePillarPosition]);

  // 기둥 스타일 변경 핸들러
  const handlePillarStyleChange = useCallback((style: 'rear-single' | 'center-single' | 'dual') => {
    setSelectedPillarStyle(style);
    setIsPillarStyleMenuOpen(false);
    // 모든 기둥의 pillarStyle 업데이트 (벽 기둥 제외)
    onPillarsChange(
      pillars.map(p =>
        p.type === 'wall' ? p : { ...p, pillarStyle: style }
      )
    );
  }, [pillars, onPillarsChange]);
  
  // 기둥 스타일 이름 매핑
  const pillarStyleNames = {
    'rear-single': '후면 싱글',
    'center-single': '센터 싱글',
    'dual': '듀얼 기둥',
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {/* 기둥 스타일 선택 컨텍스트 메뉴 */}
      {scaleInfo && (
        <div
          style={{
            position: 'absolute',
            top: scaleInfo.blueRect.y - 35,
            left: scaleInfo.blueRect.x + scaleInfo.blueRect.width / 2 + 60,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsPillarStyleMenuOpen(!isPillarStyleMenuOpen)}
              style={{
                padding: '6px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#333',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '400',
                transition: 'all 0.2s',
                minWidth: '120px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              <span>{pillarStyleNames[selectedPillarStyle]}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            
            {isPillarStyleMenuOpen && (
              <>
                {/* 메뉴 외부 클릭 감지용 오버레이 */}
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998,
                  }}
                  onClick={() => setIsPillarStyleMenuOpen(false)}
                />
                {/* 드롭다운 메뉴 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 999,
                    minWidth: '120px',
                    overflow: 'hidden',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(['rear-single', 'center-single', 'dual'] as const).map((style) => (
                    <div
                      key={style}
                      onClick={() => handlePillarStyleChange(style)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: selectedPillarStyle === style ? '#E3F2FD' : '#fff',
                        color: selectedPillarStyle === style ? '#007AFF' : '#333',
                        fontSize: '12px',
                        fontWeight: selectedPillarStyle === style ? '600' : '400',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPillarStyle !== style) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPillarStyle !== style) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      {pillarStyleNames[style]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 선반 종류 선택 모달 */}
      {shelfTypeModal && shelfTypeModal.show && (
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
            onClick={() => setShelfTypeModal(null)}
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
              width: '900px',
              maxHeight: '80vh',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div
              style={{
                padding: '24px 32px',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '8px',
                }}
              >
                가구 선택
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                }}
              >
                추가할 가구를 선택해주세요
              </div>
            </div>

            {/* 모달 본문 */}
            <div
              style={{
                padding: '24px 32px',
                flex: 1,
                overflowY: 'auto',
              }}
            >
              {/* 카테고리 섹션 (비활성화, 표시만) */}
              <div
                style={{
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '12px',
                  }}
                >
                  카테고리
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007AFF',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  >
                    전체
                  </div>
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  >
                    선반
                  </div>
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  >
                    하부장
                  </div>
                </div>
              </div>

              {/* 선반 종류 카드 그리드 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '20px',
                }}
              >
                {/* 일반 선반 카드 */}
                <div
                  onClick={() => handleShelfTypeSelect('normal')}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007AFF';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,122,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* 선반 이미지 영역 */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderShelfPreview('normal')}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px',
                    }}
                  >
                    일반 선반
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '8px',
                    }}
                  >
                    wood
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '12px',
                    }}
                  >
                    가변 × 200 × 400 (mm)
                  </div>
                </div>

                {/* 옷걸이 선반 카드 */}
                <div
                  onClick={() => handleShelfTypeSelect('hanger')}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007AFF';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,122,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* 선반 이미지 영역 */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderShelfPreview('hanger')}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px',
                    }}
                  >
                    옷걸이 선반
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '8px',
                    }}
                  >
                    wood
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '12px',
                    }}
                  >
                    가변 × 200 × 400 (mm)
                  </div>
                </div>

                {/* 서랍 선반 카드 */}
                <div
                  onClick={() => handleShelfTypeSelect('drawer')}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007AFF';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,122,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* 선반 이미지 영역 */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderShelfPreview('drawer')}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px',
                    }}
                  >
                    서랍 선반
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '8px',
                    }}
                  >
                    wood
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '12px',
                    }}
                  >
                    가변 × 200 × 400 (mm)
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div
              style={{
                padding: '20px 32px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => setShelfTypeModal(null)}
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
            </div>
          </div>
        </>
      )}
      {/* 코너장 확인 모달 */}
      {cornerPillarModal && cornerPillarModal.show && (
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
            onClick={() => handleCornerPillarConfirm(false)}
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
              코너장으로 구성하시겠습니까?
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '24px',
              }}
            >
              해당 기둥을 코너장으로 설정합니다. 이 기둥에 연결된 모든 선반이 코너장으로 표시됩니다.
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => handleCornerPillarConfirm(false)}
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
                onClick={() => handleCornerPillarConfirm(true)}
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
                확인
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};