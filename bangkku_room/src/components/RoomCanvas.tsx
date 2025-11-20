import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RoomState, ScaleInfo, Pillar, Shelf, DragState, PILLAR_SHELF_CONSTRAINTS } from '../types';
import { calculateScale, mmToPixel, pixelToMm, mmToPxX, mmToPxY, pxToMmX, pxToMmY, snapToGrid } from '../utils/coordinates';

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
  onRoomChange, 
  onPillarsChange, 
  onShelvesChange,
  onObjectSelect,
  onShowToast
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleInfo, setScaleInfoState] = useState<ScaleInfo | null>(null);
  
  // 기둥/선반 드래그 상태
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    targetId: null,
  });

  // 스케일 정보 업데이트 (높이는 고정이므로 폭만 의존)
  const updateScaleInfo = useCallback((canvas: HTMLCanvasElement) => {
    const newScaleInfo = calculateScale(
      canvas.width,
      canvas.height,
      room.roomWidthMm,
      room.roomHeightMm
    );
    setScaleInfoState(newScaleInfo);
    onScaleChange(newScaleInfo);
    return newScaleInfo;
  }, [room.roomWidthMm, room.roomHeightMm, onScaleChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 스케일 계산
    const currentScaleInfo = updateScaleInfo(canvas);

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 흰색
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 스켈레톤 형식 방 그리기
    drawSkeletonRoom(ctx, currentScaleInfo, room);

    // 기둥 추가 버튼 그리기
    drawAddPillarButton(ctx, pillars, currentScaleInfo);

    // 선반 추가 버튼들 그리기 (기둥이 2개 이상일 때)
    const normalPillars = pillars.filter(p => p.type !== 'wall');
    if (normalPillars.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(pillars, shelves, currentScaleInfo);
      drawAddShelfButtons(ctx, shelfButtons);
    }

    // 기둥 그리기 (벽 기둥 제외)
    pillars
      .filter(pillar => pillar.type !== 'wall')  // 벽 기둥은 렌더링하지 않음
      .forEach(pillar => {
        const isGhost = dragState.type === 'pillar' && dragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    // 선반 그리기
    shelves.forEach(shelf => {
      const isGhost = dragState.type === 'shelf' && dragState.targetId === shelf.id;
      if (!isGhost) {
        drawShelf(ctx, shelf, pillars, currentScaleInfo);
      }
    });

    // Ghost 기둥/선반 그리기
    if (dragState.type === 'pillar' && dragState.targetId && dragState.originalXMm !== undefined) {
      const ghostPillar = pillars.find(p => p.id === dragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
      }
    }
    if (dragState.type === 'shelf' && dragState.targetId && dragState.originalHeightMm !== undefined) {
      const ghostShelf = shelves.find(s => s.id === dragState.targetId);
      if (ghostShelf) {
        drawGhostShelf(ctx, ghostShelf, pillars, currentScaleInfo);
      }
    }

    // 기둥 간격 표시 (기둥이 2개 이상일 때)
    const normalPillarsForSpacing = pillars.filter(p => p.type !== 'wall');
    if (normalPillarsForSpacing.length >= 2) {
      drawPillarSpacings(ctx, normalPillarsForSpacing, currentScaleInfo);
    }

    // 같은 기둥 쌍을 공유하는 선반 간격 표시
    if (shelves.length > 0) {
      drawShelfSpacings(ctx, shelves, pillars, currentScaleInfo);
    }

  }, [room, pillars, shelves, dragState, updateScaleInfo]);

  // 마우스 커서 업데이트
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scaleInfo) return;

    const updateCursor = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const { redRect } = scaleInfo;

      // 기둥 추가 버튼 위에 있는지 체크
      const buttonX = redRect.x + redRect.width * 0.3;
      const buttonY = redRect.y + redRect.height * 0.5;
      const pillarButtonWidth = 70;
      const pillarButtonHeight = 30;
      
      if (
        x >= buttonX - pillarButtonWidth / 2 &&
        x <= buttonX + pillarButtonWidth / 2 &&
        y >= buttonY - pillarButtonHeight / 2 &&
        y <= buttonY + pillarButtonHeight / 2
      ) {
        canvas.style.cursor = 'pointer';
        return;
      }

      // 선반 추가 버튼들 위에 있는지 체크 (원형)
      const normalPillars = pillars.filter(p => p.type !== 'wall');
      if (normalPillars.length >= 2) {
        const shelfButtons = calculateShelfButtonPositions(pillars, shelves, scaleInfo);
        const shelfButtonRadius = 17.5;
        for (const button of shelfButtons) {
          const distanceToShelfButton = Math.sqrt(
            Math.pow(x - button.x, 2) + Math.pow(y - button.y, 2)
          );
          if (distanceToShelfButton <= shelfButtonRadius) {
            canvas.style.cursor = 'pointer';
            return;
          }
        }
      }

      // 선반 위에 있는지 체크
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
          canvas.style.cursor = 'ns-resize';
          return;
        }
      }

      // 기둥 위에 있는지 체크
      const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
      for (const pillar of pillars) {
        if (pillar.type === 'wall') continue;

        const pillarX = mmToPxX(pillar.xMm, scaleInfo);
        if (
          x >= pillarX - pillarWidthPx / 2 - 5 &&
          x <= pillarX + pillarWidthPx / 2 + 5 &&
          y >= redRect.y &&
          y <= redRect.y + redRect.height
        ) {
          canvas.style.cursor = 'move';
          return;
        }
      }

      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('mousemove', updateCursor);
    return () => {
      canvas.removeEventListener('mousemove', updateCursor);
    };
  }, [scaleInfo, pillars, shelves]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scaleInfo) return;
    
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
      // 기둥 추가
      // 일반 기둥들만 필터링 (벽 기둥 제외)
      const normalPillars = pillars.filter(p => p.type !== 'wall');
      
      let newXMm: number;
      if (normalPillars.length === 0) {
        // 첫 번째 기둥: 빨간 네모 왼쪽 기준 (0mm)
        newXMm = 0;
      } else {
        // 다음 기둥: 가장 오른쪽 기둥에서 700mm 떨어진 위치
        const rightmostPillar = normalPillars.reduce((rightmost, current) => 
          current.xMm > rightmost.xMm ? current : rightmost
        );
        newXMm = rightmostPillar.xMm + 700;
      }
      
      // 빨간 네모 범위 체크 (0 ~ roomWidthMm)
      if (newXMm < 0 || newXMm > room.roomWidthMm) {
        onShowToast('기둥은 정면 벽 내에만 생성할 수 있습니다.');
        return;
      }
      
      const newPillar: Pillar = {
        id: `pillar-${Date.now()}`,
        xMm: newXMm,
        type: 'normal'
      };
      onPillarsChange([...pillars, newPillar]);
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
          // 선반 생성
          // 현재 클릭한 버튼의 기둥 쌍과 동일한 기둥 쌍을 가진 선반들만 필터링
          const samePairShelves = shelves.filter(shelf =>
            shelf.startPillarId === button.startPillarId &&
            shelf.endPillarId === button.endPillarId
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
            return;
          }
          
          const newShelf: Shelf = {
            id: `shelf-${Date.now()}`,
            startPillarId: button.startPillarId,
            endPillarId: button.endPillarId,
            heightMm: newHeightMm,
          };
          onShelvesChange([...shelves, newShelf]);
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
  }, [scaleInfo, room.roomWidthMm, pillars, shelves, onObjectSelect]);

  // 기둥 위치 제약 체크 함수
  const validatePillarPosition = useCallback((
    targetPillarId: string,
    newXMm: number,
    pillars: Pillar[]
  ): number => {
    // 정렬된 일반 기둥 배열 (wall 타입 제외)
    const normalPillars = pillars
      .filter(p => p.type !== 'wall')
      .sort((a, b) => a.xMm - b.xMm);
    
    const targetPillar = normalPillars.find(p => p.id === targetPillarId);
    if (!targetPillar) return newXMm;
    
    const targetIndex = normalPillars.findIndex(p => p.id === targetPillarId);
    const leftNeighbor = targetIndex > 0 ? normalPillars[targetIndex - 1] : null;
    const rightNeighbor = targetIndex < normalPillars.length - 1 ? normalPillars[targetIndex + 1] : null;
    
    let minXMm = 0;
    let maxXMm = room.roomWidthMm;
    
    // 왼쪽 이웃 기둥 체크
    if (leftNeighbor) {
      minXMm = leftNeighbor.xMm + PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      // 최대 간격 체크: 왼쪽 이웃과의 거리가 최대 간격을 초과하면 제한
      const maxAllowedXMm = leftNeighbor.xMm + PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newXMm > maxAllowedXMm) {
        maxXMm = Math.min(maxXMm, maxAllowedXMm);
      }
    }
    
    // 오른쪽 이웃 기둥 체크
    if (rightNeighbor) {
      const maxFromRight = rightNeighbor.xMm - PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      maxXMm = Math.min(maxXMm, maxFromRight);
      // 최대 간격 체크: 오른쪽 이웃과의 거리가 최대 간격을 초과하면 제한
      const minAllowedXMm = rightNeighbor.xMm - PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newXMm < minAllowedXMm) {
        minXMm = Math.max(minXMm, minAllowedXMm);
      }
    }
    
    return Math.max(minXMm, Math.min(maxXMm, newXMm));
  }, [room.roomWidthMm]);

  // 선반 위치 제약 체크 함수 (넘어가는 경우 허용, 넘어간 후에도 간격 체크, 그리드 단위로 계산)
  const validateShelfPosition = useCallback((
    targetShelfId: string,
    newHeightMm: number,
    shelves: Shelf[],
    originalHeightMm: number
  ): number => {
    const targetShelf = shelves.find(s => s.id === targetShelfId);
    if (!targetShelf) return newHeightMm;
    
    // 같은 기둥 쌍을 가진 선반들 찾기 (현재 선반 제외)
    const samePairShelves = shelves.filter(s =>
      s.id !== targetShelfId &&
      s.startPillarId === targetShelf.startPillarId &&
      s.endPillarId === targetShelf.endPillarId
    );
    
    const minSpacing = PILLAR_SHELF_CONSTRAINTS.MIN_SHELF_SPACING_MM;
    const gridSize = 100; // 그리드 크기
    
    // 위쪽 제약과 아래쪽 제약을 분리해서 계산
    let minAllowedHeight = -Infinity; // 아래로 갈 수 있는 최소 높이
    let maxAllowedHeight = Infinity;  // 위로 갈 수 있는 최대 높이
    
    for (const shelf of samePairShelves) {
      // 넘어가는 경우와 같은 방향에 있는 경우 모두 간격 체크
      if (newHeightMm > shelf.heightMm) {
        // 새 위치가 아래 선반보다 위에 있음
        const distance = newHeightMm - shelf.heightMm;
        if (distance < minSpacing) {
          // 최소 간격으로 제한 (그리드 단위로 조정)
          const allowedHeight = shelf.heightMm + minSpacing;
          const gridAdjustedHeight = Math.ceil(allowedHeight / gridSize) * gridSize;
          minAllowedHeight = Math.max(minAllowedHeight, gridAdjustedHeight);
        }
      } else if (newHeightMm < shelf.heightMm) {
        // 새 위치가 위 선반보다 아래에 있음
        const distance = shelf.heightMm - newHeightMm;
        if (distance < minSpacing) {
          // 최소 간격으로 제한 (그리드 단위로 조정)
          const allowedHeight = shelf.heightMm - minSpacing;
          const gridAdjustedHeight = Math.floor(allowedHeight / gridSize) * gridSize;
          maxAllowedHeight = Math.min(maxAllowedHeight, gridAdjustedHeight);
        }
      } else {
        // 같은 높이에 있는 경우 (거리 = 0)
        // 위로 이동하거나 아래로 이동할 수 있도록 양쪽 제약 설정
        const allowedHeightAbove = shelf.heightMm + minSpacing;
        const gridAdjustedHeightAbove = Math.ceil(allowedHeightAbove / gridSize) * gridSize;
        minAllowedHeight = Math.max(minAllowedHeight, gridAdjustedHeightAbove);
        
        const allowedHeightBelow = shelf.heightMm - minSpacing;
        const gridAdjustedHeightBelow = Math.floor(allowedHeightBelow / gridSize) * gridSize;
        maxAllowedHeight = Math.min(maxAllowedHeight, gridAdjustedHeightBelow);
      }
    }
    
    // 모든 제약을 적용
    let constrainedHeight = newHeightMm;
    if (minAllowedHeight !== -Infinity) {
      constrainedHeight = Math.max(constrainedHeight, minAllowedHeight);
    }
    if (maxAllowedHeight !== Infinity) {
      constrainedHeight = Math.min(constrainedHeight, maxAllowedHeight);
    }
    
    return constrainedHeight;
  }, []);

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
      
      // 범위 제한 (0 ~ roomWidthMm)
      const clampedXMm = Math.max(0, Math.min(room.roomWidthMm, newXMm));
      
      // 100mm 그리드로 스냅 (빨간 네모 왼쪽 기준)
      const snappedXMm = snapToGrid(clampedXMm, 100);
      
      // 기둥 간격 제약 체크 (최소 400mm, 최대 1000mm)
      const constrainedXMm = validatePillarPosition(dragState.targetId, snappedXMm, pillars);

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
      const originalHeightMm = dragState.originalHeightMm ?? shelves.find(s => s.id === dragState.targetId)?.heightMm ?? snappedHeightMm;
      const constrainedHeightMm = validateShelfPosition(dragState.targetId, snappedHeightMm, shelves, originalHeightMm);
      
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
    if (dragState.type === 'pillar' && dragState.targetId) {
      // 기둥 정렬 (xMm 기준 오름차순)
      onPillarsChange([...pillars].sort((a, b) => a.xMm - b.xMm));
    }
    
    setDragState({ type: null, targetId: null });
  }, [dragState, pillars, onPillarsChange]);

  const handleMouseLeave = useCallback(() => {
    setDragState({ type: null, targetId: null });
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

/**
 * 스켈레톤 형식 방 그리기 (PRD 기준)
 * - 파란 사각형: 외곽 프레임 (고정)
 * - 빨간 사각형: 정면 벽 (변동)
 * - 검은 연결선: 각 꼭짓점 연결
 */
function drawSkeletonRoom(
  ctx: CanvasRenderingContext2D,
  scaleInfo: ScaleInfo,
  room: RoomState
) {
  const { blueRect, redRect } = scaleInfo;

  // 파란 사각형 그리기 (외곽 프레임)
  ctx.strokeStyle = '#0000FF'; // 파란색
  ctx.lineWidth = 2;
  ctx.strokeRect(blueRect.x, blueRect.y, blueRect.width, blueRect.height);

  // 빨간 사각형 그리기 (정면 벽) - 픽셀 정렬을 위해 좌표를 0.5 픽셀 오프셋
  ctx.strokeStyle = '#FF0000'; // 빨간색
  ctx.lineWidth = 2;
  
  // 픽셀 정렬: lineWidth가 2일 때 선의 중심이 픽셀 경계에 오도록 0.5 오프셋
  const offset = 0.5;
  const x = Math.round(redRect.x) + offset;
  const y = Math.round(redRect.y) + offset;
  const width = Math.round(redRect.width);
  const height = Math.round(redRect.height);
  
  ctx.beginPath();
  // 상단 변
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  // 우측 변
  ctx.lineTo(x + width, y + height);
  // 하단 변
  ctx.lineTo(x, y + height);
  // 좌측 변
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.stroke();

  // 검은 연결선 그리기 (각 꼭짓점 연결)
  ctx.strokeStyle = '#000000'; // 검은색
  ctx.lineWidth = 1;
  
  // B1 ↔ R1 (좌상단)
  ctx.beginPath();
  ctx.moveTo(blueRect.x, blueRect.y);
  ctx.lineTo(redRect.x, redRect.y);
  ctx.stroke();

  // B2 ↔ R2 (우상단)
  ctx.beginPath();
  ctx.moveTo(blueRect.x + blueRect.width, blueRect.y);
  ctx.lineTo(redRect.x + redRect.width, redRect.y);
  ctx.stroke();

  // B3 ↔ R3 (우하단)
  ctx.beginPath();
  ctx.moveTo(blueRect.x + blueRect.width, blueRect.y + blueRect.height);
  ctx.lineTo(redRect.x + redRect.width, redRect.y + redRect.height);
  ctx.stroke();

  // B4 ↔ R4 (좌하단)
  ctx.beginPath();
  ctx.moveTo(blueRect.x, blueRect.y + blueRect.height);
  ctx.lineTo(redRect.x, redRect.y + redRect.height);
  ctx.stroke();

  // 상단 라벨 표시 (미터 단위)
  const roomWidthM = (room.roomWidthMm / 1000).toFixed(1);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    `${roomWidthM} M`,
    blueRect.x + blueRect.width / 2,
    blueRect.y - 10
  );
}

/**
 * 기둥 그리기 (PRD 기준)
 */
function drawPillar(
  ctx: CanvasRenderingContext2D,
  pillar: Pillar,
  scaleInfo: ScaleInfo
) {
  const { redRect } = scaleInfo;
  const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
  const pillarX = mmToPxX(pillar.xMm, scaleInfo) - pillarWidthPx / 2;
  const pillarY = redRect.y;
  const pillarHeight = redRect.height;

  // 기둥 색상: 주황색 (#FF8C00)
  const pillarColor = '#FF8C00';
  
  // 기둥 본체
  ctx.fillStyle = pillarColor;
  ctx.fillRect(pillarX, pillarY, pillarWidthPx, pillarHeight);
  
  // 기둥 테두리
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(pillarX, pillarY, pillarWidthPx, pillarHeight);
}

/**
 * Ghost 기둥 그리기 (반투명)
 */
function drawGhostPillar(
  ctx: CanvasRenderingContext2D,
  pillar: Pillar,
  scaleInfo: ScaleInfo
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawPillar(ctx, pillar, scaleInfo);
  ctx.restore();
}

/**
 * 선반 그리기 (PRD 기준)
 */
function drawShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  const startPillar = pillars.find(p => p.id === shelf.startPillarId);
  const endPillar = pillars.find(p => p.id === shelf.endPillarId);
  
  if (!startPillar || !endPillar) return;

  const startX = mmToPxX(startPillar.xMm, scaleInfo);
  const endX = mmToPxX(endPillar.xMm, scaleInfo);
  const shelfY = mmToPxY(shelf.heightMm, scaleInfo);
  const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

  // 선반 본체
  ctx.fillStyle = '#CD853F'; // 갈색
  ctx.fillRect(startX, shelfY - shelfThickness / 2, endX - startX, shelfThickness);
  
  // 선반 테두리
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, shelfY - shelfThickness / 2, endX - startX, shelfThickness);
}

/**
 * Ghost 선반 그리기 (반투명)
 */
function drawGhostShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawShelf(ctx, shelf, pillars, scaleInfo);
  ctx.restore();
}

/**
 * 기둥 사이의 선반 추가 버튼 위치 계산
 */
interface ShelfButtonPosition {
  x: number;
  y: number;
  startPillarId: string;
  endPillarId: string;
}

function calculateShelfButtonPositions(
  pillars: Pillar[],
  shelves: Shelf[],
  scaleInfo: ScaleInfo
): ShelfButtonPosition[] {
  // 벽 기둥 제외하고 정렬
  const sortedPillars = pillars
    .filter(p => p.type !== 'wall')
    .sort((a, b) => a.xMm - b.xMm);
  
  // 기둥이 2개 미만이면 버튼 없음
  if (sortedPillars.length < 2) return [];
  
  const buttons: ShelfButtonPosition[] = [];
  
  // 인접한 기둥 쌍 찾기
  for (let i = 0; i < sortedPillars.length - 1; i++) {
    const startPillar = sortedPillars[i];
    const endPillar = sortedPillars[i + 1];
    
    // 두 기둥 사이의 중앙 위치 (mm) - x좌표는 기존 방식 유지
    const centerXMm = (startPillar.xMm + endPillar.xMm) / 2;
    const centerXPx = mmToPxX(centerXMm, scaleInfo);
    
    // 해당 기둥 쌍의 선반들 중 가장 아래 선반 찾기 (heightMm이 가장 큰 것)
    const samePairShelves = shelves.filter(shelf =>
      shelf.startPillarId === startPillar.id &&
      shelf.endPillarId === endPillar.id
    );
    
    let centerYPx: number;
    if (samePairShelves.length === 0) {
      // 해당 기둥 쌍에 선반이 없으면 기본 위치 (빨간 네모 아래쪽에서 400mm 위)
      const defaultHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY - 400;
      centerYPx = mmToPxY(defaultHeightMm, scaleInfo);
    } else {
      // 가장 위 선반(heightMm이 가장 작은 것)에서 400mm 아래
      const topmostShelf = samePairShelves.reduce((topmost, current) =>
        current.heightMm < topmost.heightMm ? current : topmost
      );
      const buttonHeightMm = topmostShelf.heightMm - 400;
      centerYPx = mmToPxY(buttonHeightMm, scaleInfo);
    }
    
    buttons.push({
      x: centerXPx,
      y: centerYPx,
      startPillarId: startPillar.id,
      endPillarId: endPillar.id,
    });
  }
  
  return buttons;
}

/**
 * 선반 추가 버튼들 그리기
 */
function drawAddShelfButtons(
  ctx: CanvasRenderingContext2D,
  buttons: ShelfButtonPosition[]
) {
  const radius = 17.5; // 반지름 (35/2)
  
  buttons.forEach(button => {
    // 버튼 배경 (회색, 원형)
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(button.x, button.y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 버튼 테두리
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 버튼 텍스트 (+ 기호)
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', button.x, button.y);
  });
}

/**
 * 기둥 추가 버튼 그리기
 */
function drawAddPillarButton(
  ctx: CanvasRenderingContext2D,
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  const { redRect } = scaleInfo;
  
  // 가장 오른쪽 기둥 찾기 (벽 기둥 제외)
  const normalPillars = pillars.filter(p => p.type !== 'wall');
  let buttonX: number;
  if (normalPillars.length === 0) {
    // 기둥이 없으면 기본 위치 (빨간 네모 왼쪽에서 600mm 오른쪽)
    buttonX = mmToPxX(600, scaleInfo);
  } else {
    // 가장 오른쪽 기둥에서 600mm 오른쪽
    const rightmostPillar = normalPillars.reduce((rightmost, current) =>
      current.xMm > rightmost.xMm ? current : rightmost
    );
    const buttonXMm = rightmostPillar.xMm + 600;
    buttonX = mmToPxX(buttonXMm, scaleInfo);
  }
  
  // 버튼 위치: y는 세로 중앙 유지
  const buttonY = redRect.y + redRect.height * 0.5;
  const buttonWidth = 70;
  const buttonHeight = 30;
  const borderRadius = 6;

  // 버튼 배경 (회색, 둥근 모서리)
  const btnX = buttonX - buttonWidth / 2;
  const btnY = buttonY - buttonHeight / 2;
  
  ctx.fillStyle = '#E0E0E0';
  ctx.beginPath();
  ctx.moveTo(btnX + borderRadius, btnY);
  ctx.lineTo(btnX + buttonWidth - borderRadius, btnY);
  ctx.quadraticCurveTo(btnX + buttonWidth, btnY, btnX + buttonWidth, btnY + borderRadius);
  ctx.lineTo(btnX + buttonWidth, btnY + buttonHeight - borderRadius);
  ctx.quadraticCurveTo(btnX + buttonWidth, btnY + buttonHeight, btnX + buttonWidth - borderRadius, btnY + buttonHeight);
  ctx.lineTo(btnX + borderRadius, btnY + buttonHeight);
  ctx.quadraticCurveTo(btnX, btnY + buttonHeight, btnX, btnY + buttonHeight - borderRadius);
  ctx.lineTo(btnX, btnY + borderRadius);
  ctx.quadraticCurveTo(btnX, btnY, btnX + borderRadius, btnY);
  ctx.closePath();
  ctx.fill();

  // 버튼 테두리
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 버튼 텍스트
  ctx.fillStyle = '#000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('기둥 추가', buttonX, buttonY);
}

/**
 * 기둥 간격 표시 (하단에)
 */
function drawPillarSpacings(
  ctx: CanvasRenderingContext2D,
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  // 기둥을 xMm 기준으로 정렬
  const sortedPillars = [...pillars].sort((a, b) => a.xMm - b.xMm);
  
  // 기둥이 2개 미만이면 표시하지 않음
  if (sortedPillars.length < 2) return;
  
  const { redRect } = scaleInfo;
  const bottomY = redRect.y + redRect.height + 25; // 빨간 네모 하단에서 25px 아래
  
  // 이웃한 기둥 쌍의 간격 계산 및 표시
  for (let i = 0; i < sortedPillars.length - 1; i++) {
    const leftPillar = sortedPillars[i];
    const rightPillar = sortedPillars[i + 1];
    
    // 간격 계산 (mm)
    const spacingMm = rightPillar.xMm - leftPillar.xMm;
    const spacingMmInt = Math.round(spacingMm);
    
    // 두 기둥 사이의 중앙 위치 (px)
    const leftXPx = mmToPxX(leftPillar.xMm, scaleInfo);
    const rightXPx = mmToPxX(rightPillar.xMm, scaleInfo);
    const centerXPx = (leftXPx + rightXPx) / 2;
    
    // 간격 표시 텍스트
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${spacingMmInt}mm`,
      centerXPx,
      bottomY
    );
  }
}

/**
 * 같은 기둥 쌍을 공유하는 선반 간격 표시
 */
function drawShelfSpacings(
  ctx: CanvasRenderingContext2D,
  shelves: Shelf[],
  pillars: Pillar[],
  scaleInfo: ScaleInfo
) {
  // 같은 기둥 쌍을 가진 선반들을 그룹화
  const shelfGroups = new Map<string, Shelf[]>();
  
  shelves.forEach(shelf => {
    const key = `${shelf.startPillarId}-${shelf.endPillarId}`;
    if (!shelfGroups.has(key)) {
      shelfGroups.set(key, []);
    }
    shelfGroups.get(key)!.push(shelf);
  });
  
  // 각 그룹에서 선반 간격 표시
  shelfGroups.forEach((groupShelves) => {
    // 선반이 2개 미만이면 간격 표시 불필요
    if (groupShelves.length < 2) return;
    
    // 선반들을 높이 기준으로 정렬 (위에서 아래로, heightMm이 큰 것이 위)
    const sortedShelves = [...groupShelves].sort((a, b) => b.heightMm - a.heightMm);
    
    // 기둥 위치 찾기
    const firstShelf = sortedShelves[0];
    const startPillar = pillars.find(p => p.id === firstShelf.startPillarId);
    const endPillar = pillars.find(p => p.id === firstShelf.endPillarId);
    
    if (!startPillar || !endPillar) return;
    
    // 오른쪽 기둥의 x 좌표 (px)
    const rightPillarXPx = mmToPxX(endPillar.xMm, scaleInfo);
    const offsetX = 15; // 오른쪽 기둥에서 왼쪽으로 10px 떨어진 위치
    
    // 이웃한 선반 쌍의 간격 계산 및 표시
    for (let i = 0; i < sortedShelves.length - 1; i++) {
      const upperShelf = sortedShelves[i]; // 위 선반 (heightMm이 큰 것)
      const lowerShelf = sortedShelves[i + 1]; // 아래 선반 (heightMm이 작은 것)
      
      // 간격 계산 (mm) - 높이 차이
      const spacingMm = upperShelf.heightMm - lowerShelf.heightMm;
      const spacingMmInt = Math.round(spacingMm);
      
      // 두 선반 사이의 중앙 높이 (px)
      const upperShelfYPx = mmToPxY(upperShelf.heightMm, scaleInfo);
      const lowerShelfYPx = mmToPxY(lowerShelf.heightMm, scaleInfo);
      const centerYPx = (upperShelfYPx + lowerShelfYPx) / 2;
      
      // 간격 표시 텍스트
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right'; // 오른쪽 정렬 (오른쪽 기둥 기준)
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${spacingMmInt}mm`,
        rightPillarXPx - offsetX,
        centerYPx
      );
    }
  });
}




