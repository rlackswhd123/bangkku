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
  
  // 코너장 선반 이미지 로드
  const [cornerImages, setCornerImages] = useState<{
    111: HTMLImageElement | null;
    222: HTMLImageElement | null;
    333: HTMLImageElement | null;
    444: HTMLImageElement | null;
  }>({
    111: null,
    222: null,
    333: null,
    444: null,
  });
  
  // 선반 이미지 로드
  const [shelfImages, setShelfImages] = useState<{
    normal: HTMLImageElement | null;
    drawer: HTMLImageElement | null;
    hanger: HTMLImageElement | null;
  }>({
    normal: null,
    drawer: null,
    hanger: null,
  });
  
  useEffect(() => {
    // 이미지 로드
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    // 코너 이미지 로드
    Promise.all([
      loadImage(new URL('../images/corner/111.png', import.meta.url).href),
      loadImage(new URL('../images/corner/222.png', import.meta.url).href),
      loadImage(new URL('../images/corner/333.png', import.meta.url).href),
      loadImage(new URL('../images/corner/444.png', import.meta.url).href),
    ]).then(([img111, img222, img333, img444]) => {
      setCornerImages({
        111: img111,
        222: img222,
        333: img333,
        444: img444,
      });
    }).catch(console.error);
    
    // 선반 이미지 로드
    Promise.all([
      loadImage(new URL('../images/pillar/일반_선반.png', import.meta.url).href),
      loadImage(new URL('../images/pillar/서랍_선반.png', import.meta.url).href),
      loadImage(new URL('../images/pillar/옷걸이_선반.png', import.meta.url).href),
    ]).then(([normalImg, drawerImg, hangerImg]) => {
      setShelfImages({
        normal: normalImg,
        drawer: drawerImg,
        hanger: hangerImg,
      });
    }).catch(console.error);
  }, []);
  
  // 기둥/선반 드래그 상태
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    targetId: null,
  });

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
    // 후면 싱글/센터 싱글 기둥 먼저 그리기 (선반 뒤에 보이도록)
    pillars
      .filter(pillar => pillar.type !== 'wall')  // 벽 기둥은 렌더링하지 않음
      .filter(pillar => {
        const pillarStyle = pillar.pillarStyle || 'rear-single';
        return pillarStyle !== 'dual';  // 듀얼 기둥 제외
      })
      .forEach(pillar => {
        const isGhost = dragState.type === 'pillar' && dragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    // 선반 그리기 (코너장 선반도 포함하여 모두 그리기)
    shelves.forEach(shelf => {
      const isGhost = dragState.type === 'shelf' && dragState.targetId === shelf.id;
      if (!isGhost) {
        drawShelf(ctx, shelf, pillars, currentScaleInfo, shelfImages);
      }
    });
    
    // 코너장 기둥에 자동으로 위/아래 이미지 그리기 (듀얼 기둥보다 먼저 그려서 듀얼 기둥이 앞에 오도록)
    drawCornerShelfImages(ctx, pillars, shelves, currentScaleInfo, room.roomWidthMm, cornerImages);
    
    // 듀얼 기둥 그리기 (선반 위에 보이도록 나중에 그리기)
    pillars
      .filter(pillar => pillar.type !== 'wall')  // 벽 기둥은 렌더링하지 않음
      .filter(pillar => {
        const pillarStyle = pillar.pillarStyle || 'rear-single';
        return pillarStyle === 'dual';  // 듀얼 기둥만
      })
      .forEach(pillar => {
        const isGhost = dragState.type === 'pillar' && dragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    // Ghost 기둥/선반 그리기
    // 후면 싱글/센터 싱글 Ghost 기둥 먼저 그리기
    if (dragState.type === 'pillar' && dragState.targetId && dragState.originalXMm !== undefined) {
      const ghostPillar = pillars.find(p => p.id === dragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle !== 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }
    if (dragState.type === 'shelf' && dragState.targetId && dragState.originalHeightMm !== undefined) {
      const ghostShelf = shelves.find(s => s.id === dragState.targetId);
      if (ghostShelf) {
        drawGhostShelf(ctx, ghostShelf, pillars, currentScaleInfo, shelfImages);
      }
    }
    // 듀얼 기둥 Ghost 그리기 (선반 Ghost 위에 보이도록 나중에 그리기)
    if (dragState.type === 'pillar' && dragState.targetId && dragState.originalXMm !== undefined) {
      const ghostPillar = pillars.find(p => p.id === dragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle === 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
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

  }, [room, pillars, shelves, dragState, updateScaleInfo, cornerImages, shelfImages]);

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
  }, [scaleInfo, pillars, shelves, room.roomWidthMm]);

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
    
    const gridSize = 100; // 그리드 크기
    
    // 선반 타입별 위/아래 최소 간격 정의
    const SHELF_SPACING: Record<string, { above: number; below: number }> = {
      normal: { above: 300, below: 300 },  // 일반 선반: 위 300, 아래 300
      hanger: { above: 300, below: 1000 }, // 옷걸이 선반: 위 300, 아래 1000
      drawer: { above: 500, below: 300 }, // 서랍 선반: 위 500, 아래 300
    };
    
    // 두 선반 간 필요한 최소 간격 계산
    // 위쪽 선반의 below 요구사항과 아래쪽 선반의 above 요구사항 중 큰 값 사용
    const getRequiredSpacing = (
      upperShelfType: string,
      lowerShelfType: string
    ): number => {
      const upperSpacing = SHELF_SPACING[upperShelfType] || SHELF_SPACING.normal;
      const lowerSpacing = SHELF_SPACING[lowerShelfType] || SHELF_SPACING.normal;
      // 위쪽 선반의 아래쪽 요구사항과 아래쪽 선반의 위쪽 요구사항 중 큰 값
      return Math.max(upperSpacing.below, lowerSpacing.above);
    };
    
    const targetShelfType = targetShelf.type || 'normal';
    
    // 위쪽 제약과 아래쪽 제약을 분리해서 계산
    let minAllowedHeight = -Infinity; // 아래로 갈 수 있는 최소 높이
    let maxAllowedHeight = Infinity;  // 위로 갈 수 있는 최대 높이
    
    for (const shelf of samePairShelves) {
      const otherShelfType = shelf.type || 'normal';
      
      // 넘어가는 경우와 같은 방향에 있는 경우 모두 간격 체크
      if (newHeightMm > shelf.heightMm) {
        // 타겟이 위, 비교 대상이 아래
        // 위쪽 선반(타겟)의 below와 아래쪽 선반(비교 대상)의 above 중 큰 값 사용
        const spacing = getRequiredSpacing(targetShelfType, otherShelfType);
        const distance = newHeightMm - shelf.heightMm;
        if (distance < spacing) {
          // 최소 간격으로 제한 (그리드 단위로 조정)
          const allowedHeight = shelf.heightMm + spacing;
          const gridAdjustedHeight = Math.ceil(allowedHeight / gridSize) * gridSize;
          minAllowedHeight = Math.max(minAllowedHeight, gridAdjustedHeight);
        }
      } else if (newHeightMm < shelf.heightMm) {
        // 타겟이 아래, 비교 대상이 위
        // 위쪽 선반(비교 대상)의 below와 아래쪽 선반(타겟)의 above 중 큰 값 사용
        const spacing = getRequiredSpacing(otherShelfType, targetShelfType);
        const distance = shelf.heightMm - newHeightMm;
        if (distance < spacing) {
          // 최소 간격으로 제한 (그리드 단위로 조정)
          const allowedHeight = shelf.heightMm - spacing;
          const gridAdjustedHeight = Math.floor(allowedHeight / gridSize) * gridSize;
          maxAllowedHeight = Math.min(maxAllowedHeight, gridAdjustedHeight);
        }
      } else {
        // 같은 높이에 있는 경우 (거리 = 0)
        // 위로 이동하거나 아래로 이동할 수 있도록 양쪽 제약 설정
        const spacingAbove = getRequiredSpacing(targetShelfType, otherShelfType);
        const spacingBelow = getRequiredSpacing(otherShelfType, targetShelfType);
        
        const allowedHeightAbove = shelf.heightMm + spacingAbove;
        const gridAdjustedHeightAbove = Math.ceil(allowedHeightAbove / gridSize) * gridSize;
        minAllowedHeight = Math.max(minAllowedHeight, gridAdjustedHeightAbove);
        
        const allowedHeightBelow = shelf.heightMm - spacingBelow;
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

  // 기둥 스타일에 따른 색상 결정
  const pillarStyle = pillar.pillarStyle || 'rear-single';
  let pillarColor: string;
  switch (pillarStyle) {
    case 'rear-single':
      pillarColor = '#000000'; // 검정색
      break;
    case 'center-single':
      pillarColor = '#808080'; // 회색
      break;
    case 'dual':
      pillarColor = '#D3D3D3'; // 연회색
      break;
    default:
      pillarColor = '#FF8C00'; // 기본값 (주황색)
  }
  
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
 * 선반 그리기 (이미지 기반)
 */
function drawShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  shelfImages: {
    normal: HTMLImageElement | null;
    drawer: HTMLImageElement | null;
    hanger: HTMLImageElement | null;
  }
) {
  const startPillar = pillars.find(p => p.id === shelf.startPillarId);
  const endPillar = pillars.find(p => p.id === shelf.endPillarId);
  
  if (!startPillar || !endPillar) return;

  const startX = mmToPxX(startPillar.xMm, scaleInfo);
  const endX = mmToPxX(endPillar.xMm, scaleInfo);
  const shelfY = mmToPxY(shelf.heightMm, scaleInfo);
  const shelfWidth = endX - startX;

  // 선반 타입 결정
  const shelfType = shelf.type || 'normal';
  const shelfImage = shelfImages[shelfType];
  
  // 고정 높이 설정 (타입별로 다르게)
  let fixedShelfHeight: number;
  if (shelfType === 'normal') {
    fixedShelfHeight = Math.max(scaleInfo.redRect.height * 0.04, 20); // 일반 선반은 더 얇게
  } else {
    fixedShelfHeight = Math.max(scaleInfo.redRect.height * 0.08, 30); // 서랍/옷걸이는 기존 유지
  }
  
  // 이미지가 있으면 이미지로 렌더링, 없으면 폴백(기존 도형)
  if (shelfImage && shelfImage.complete && shelfImage.naturalWidth > 0 && shelfImage.naturalHeight > 0) {
    // 높이 고정, 가로는 shelfWidth에 맞춤
    const drawWidth = shelfWidth;
    const drawHeight = fixedShelfHeight;
    const drawX = startX;
    const drawY = shelfY - drawHeight / 2; // 선반 중심에 배치
    
    ctx.drawImage(
      shelfImage,
      0, 0, shelfImage.naturalWidth, shelfImage.naturalHeight,
      drawX, drawY, drawWidth, drawHeight
    );
  } else {
    // 폴백: 기존 캔버스 도형으로 그리기
    const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;
    const shelfCenterX = (startX + endX) / 2;
    
    // 일반 선반 본체
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(startX, shelfY - shelfThickness / 2, shelfWidth, shelfThickness);
    
    // 선반 테두리
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, shelfY - shelfThickness / 2, shelfWidth, shelfThickness);

    // 선반 타입에 따른 추가 그래픽
    if (shelfType === 'hanger') {
      const triangleSize = 30;
      const triangleY = shelfY + shelfThickness / 2;
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(shelfCenterX, triangleY);
      ctx.lineTo(shelfCenterX - triangleSize / 2, triangleY + triangleSize);
      ctx.lineTo(shelfCenterX + triangleSize / 2, triangleY + triangleSize);
      ctx.closePath();
      ctx.fill();
    } else if (shelfType === 'drawer') {
      const drawerSize = Math.min(shelfWidth * 0.6, 40);
      const drawerX = shelfCenterX - drawerSize / 2;
      const drawerY = shelfY - shelfThickness / 2 - drawerSize;
      
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(drawerX, drawerY, drawerSize, drawerSize);
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawerX, drawerY, drawerSize, drawerSize);
      
      const circleRadius = drawerSize * 0.15;
      const circleCenterX = drawerX + drawerSize / 2;
      const circleCenterY = drawerY + drawerSize / 2;
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * 코너장 기둥에 자동으로 위/아래 이미지 그리기
 */
function drawCornerShelfImages(
  ctx: CanvasRenderingContext2D,
  pillars: Pillar[],
  shelves: Shelf[],
  scaleInfo: ScaleInfo,
  roomWidthMm: number,
  cornerImages: {
    111: HTMLImageElement | null;
    222: HTMLImageElement | null;
    333: HTMLImageElement | null;
    444: HTMLImageElement | null;
  }
) {
  const { redRect } = scaleInfo;
  
  // 코너장 기둥 찾기
  const cornerPillars = pillars.filter(p => p.cornerPillar && p.type !== 'wall');
  
  for (const cornerPillar of cornerPillars) {
    // 왼쪽/오른쪽 판단
    const isLeft = cornerPillar.xMm < roomWidthMm / 2;
    
    // 기둥 위치 (px) - 일반 선반과 동일한 방식으로 계산 (기둥 중심 좌표 사용)
    const startPillarX = mmToPxX(cornerPillar.xMm, scaleInfo);
    
    // 연결된 기둥 찾기 (코너장 기둥과 쌍을 이루는 기둥)
    const sortedPillars = pillars
      .filter(p => p.type !== 'wall')
      .sort((a, b) => a.xMm - b.xMm);
    
    const pillarIndex = sortedPillars.findIndex(p => p.id === cornerPillar.id);
    let pairPillar: Pillar | null = null;
    
    if (pillarIndex > 0) {
      pairPillar = sortedPillars[pillarIndex - 1];
    } else if (pillarIndex < sortedPillars.length - 1) {
      pairPillar = sortedPillars[pillarIndex + 1];
    }
    
    if (!pairPillar) continue;
    
    const endPillarX = mmToPxX(pairPillar.xMm, scaleInfo);
    
    // 일반 선반과 동일한 방식: 기둥 중심에서 기둥 중심까지
    const shelfStartX = Math.min(startPillarX, endPillarX);
    const shelfEndX = Math.max(startPillarX, endPillarX);
    const shelfWidth = shelfEndX - shelfStartX;
    
    // 위/아래 이미지 위치 결정 (빨간 네모 안에 배치)
    const topImageY = redRect.y; // 빨간 네모 맨 위
    const bottomImageY = redRect.y + redRect.height; // 빨간 네모 맨 아래
    
    // 이미지 선택 및 그리기
    const topImage = isLeft ? cornerImages[111] : cornerImages[333];
    const bottomImage = isLeft ? cornerImages[222] : cornerImages[444];
    
    // 고정 높이 설정 (빨간 네모 높이 대비 더 얇게)
    const fixedImageHeight = Math.max(redRect.height * 0.08, 20); // 최소 20px 확보
    
    const drawCornerImage = (image: HTMLImageElement | null, isTop: boolean) => {
      if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return;
      }
      
      // 높이는 고정, 가로는 shelfWidth에 맞춰 늘어남
      const drawWidth = shelfWidth;
      const drawHeight = fixedImageHeight;
      const drawX = shelfStartX;
      const drawY = isTop ? topImageY : bottomImageY - drawHeight;
      
      ctx.drawImage(
        image,
        0, 0, image.naturalWidth, image.naturalHeight,
        drawX, drawY, drawWidth, drawHeight
      );
    };
    
    drawCornerImage(topImage, true);
    drawCornerImage(bottomImage, false);
  }
}

/**
 * Ghost 선반 그리기 (반투명)
 */
function drawGhostShelf(
  ctx: CanvasRenderingContext2D,
  shelf: Shelf,
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  shelfImages: {
    normal: HTMLImageElement | null;
    drawer: HTMLImageElement | null;
    hanger: HTMLImageElement | null;
  }
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawShelf(ctx, shelf, pillars, scaleInfo, shelfImages);
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
  ctx.fillText('칸 추가', buttonX, buttonY);
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





