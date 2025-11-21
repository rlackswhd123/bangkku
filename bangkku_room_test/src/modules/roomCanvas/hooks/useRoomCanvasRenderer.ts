// useRoomCanvasRenderer.ts: Canvas 렌더 파이프라인과 커서 업데이트 훅을 제공
import { ref, watch, Ref, onMounted, onUnmounted, unref } from 'vue';
import { DragState, Pillar, RoomState, ScaleInfo, Shelf } from '../../../types';
import { calculateScale, mmToPxX, mmToPxY } from '../../../utils/coordinates';
import { CornerImages, ShelfImages } from './useImageAssets';
import { drawSkeletonRoom } from '../canvas/drawers/skeleton';
import { drawAddPillarButton, drawAddShelfButtons, calculateShelfButtonPositions } from '../canvas/drawers/buttons';
import { drawPillar, drawGhostPillar } from '../canvas/drawers/pillars';
import { drawShelf, drawGhostShelf, drawCornerShelfImages } from '../canvas/drawers/shelves';
import { drawPillarSpacings, drawShelfSpacings } from '../canvas/drawers/spacings';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';

interface UseRoomCanvasRendererParams {
  canvasRef: Ref<HTMLCanvasElement | null>;
  containerRef: Ref<HTMLDivElement | null>;
  room: RoomState | Ref<RoomState>;
  pillars: Pillar[] | Ref<Pillar[]>;
  shelves: Shelf[] | Ref<Shelf[]>;
  dragState: DragState | Ref<DragState>;
  cornerImages: Ref<CornerImages>;
  shelfImages: Ref<ShelfImages>;
  onScaleChange: (scaleInfo: ScaleInfo) => void;
}

export function useRoomCanvasRenderer({
  canvasRef,
  containerRef,
  room,
  pillars,
  shelves,
  dragState,
  cornerImages,
  shelfImages,
  onScaleChange,
}: UseRoomCanvasRendererParams) {
  const scaleInfo = ref<ScaleInfo | null>(null);

  /**
   * 캔버스 크기에 맞춰 최신 스케일 정보를 계산하고 상위 컴포넌트에 전달합니다.
   */
  const updateScaleInfo = (canvas: HTMLCanvasElement) => {
    const currentRoom = unref(room);
    const newScaleInfo = calculateScale(canvas.width, canvas.height, currentRoom.roomWidthMm, currentRoom.roomHeightMm);
    scaleInfo.value = newScaleInfo;
    onScaleChange(newScaleInfo);
    return newScaleInfo;
  };

  /**
   * 방/기둥/선반/보조요소를 순서대로 그려주는 메인 렌더 루프입니다.
   */
  const render = () => {
    const canvas = canvasRef.value;
    const container = containerRef.value;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentRoom = unref(room);
    const currentPillars = unref(pillars);
    const currentShelves = unref(shelves);
    const currentDragState = unref(dragState);

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const currentScaleInfo = updateScaleInfo(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSkeletonRoom(ctx, currentScaleInfo, currentRoom);
    drawAddPillarButton(ctx, currentPillars, currentScaleInfo);

    const normalPillars = currentPillars.filter((p) => p.type !== 'wall');
    if (normalPillars.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(currentPillars, currentShelves, currentScaleInfo);
      drawAddShelfButtons(ctx, shelfButtons);
    }

    currentPillars
      .filter((pillar) => pillar.type !== 'wall')
      .filter((pillar) => (pillar.pillarStyle || 'rear-single') !== 'dual')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    currentShelves.forEach((shelf) => {
      const isGhost = currentDragState.type === 'shelf' && currentDragState.targetId === shelf.id;
      if (!isGhost) {
        drawShelf(ctx, shelf, currentPillars, currentScaleInfo, shelfImages.value);
      }
    });

    drawCornerShelfImages(ctx, currentPillars, currentScaleInfo, currentRoom.roomWidthMm, cornerImages.value);

    currentPillars
      .filter((pillar) => pillar.type !== 'wall')
      .filter((pillar) => (pillar.pillarStyle || 'rear-single') === 'dual')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    if (currentDragState.type === 'pillar' && currentDragState.targetId && currentDragState.originalXMm !== undefined) {
      const ghostPillar = currentPillars.find((p) => p.id === currentDragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle !== 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    if (currentDragState.type === 'shelf' && currentDragState.targetId && currentDragState.originalHeightMm !== undefined) {
      const ghostShelf = currentShelves.find((s) => s.id === currentDragState.targetId);
      if (ghostShelf) {
        drawGhostShelf(ctx, ghostShelf, currentPillars, currentScaleInfo, shelfImages.value);
      }
    }

    if (currentDragState.type === 'pillar' && currentDragState.targetId && currentDragState.originalXMm !== undefined) {
      const ghostPillar = currentPillars.find((p) => p.id === currentDragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle === 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    const normalPillarsForSpacing = currentPillars.filter((p) => p.type !== 'wall');
    if (normalPillarsForSpacing.length >= 2) {
      drawPillarSpacings(ctx, normalPillarsForSpacing, currentScaleInfo);
    }

    if (currentShelves.length > 0) {
      drawShelfSpacings(ctx, currentShelves, currentPillars, currentScaleInfo);
    }
  };

  // 렌더링 트리거: 상태나 자산이 바뀌면 즉시 다시 그립니다.
  watch(
    [
      () => unref(room),
      () => unref(pillars),
      () => unref(shelves),
      () => unref(dragState),
      () => cornerImages.value,
      () => shelfImages.value,
    ],
    () => {
      render();
    },
    { deep: true, immediate: true }
  );

  // 리사이즈 이벤트 처리: 컨테이너 크기 변화에 맞춰 캔버스를 리렌더링합니다.
  let resizeObserver: ResizeObserver | null = null;
  onMounted(() => {
    render();
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        render();
      });
      resizeObserver.observe(containerRef.value);
    }
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  return scaleInfo;
}

/**
 * 캔버스 위에서 사용자 인터랙션 가능 영역에 따라 커서를 동적으로 업데이트합니다.
 */
export function useCursorUpdater(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scaleInfo: Ref<ScaleInfo | null>,
  pillars: Pillar[] | Ref<Pillar[]>,
  shelves: Shelf[] | Ref<Shelf[]>
) {
  const updateCursor = (e: MouseEvent) => {
    const canvas = canvasRef.value;
    if (!canvas || !scaleInfo.value) return;

    const currentPillars = unref(pillars);
    const currentShelves = unref(shelves);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { redRect } = scaleInfo.value;

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

    const normalPillars = currentPillars.filter((p) => p.type !== 'wall');
    if (normalPillars.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(currentPillars, currentShelves, scaleInfo.value);
      const shelfButtonRadius = 17.5;
      for (const button of shelfButtons) {
        const distanceToShelfButton = Math.sqrt((x - button.x) ** 2 + (y - button.y) ** 2);
        if (distanceToShelfButton <= shelfButtonRadius) {
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    for (const shelf of currentShelves) {
      const startPillar = currentPillars.find((p) => p.id === shelf.startPillarId);
      const endPillar = currentPillars.find((p) => p.id === shelf.endPillarId);
      if (!startPillar || !endPillar) continue;

      const startX = mmToPxX(startPillar.xMm, scaleInfo.value);
      const endX = mmToPxX(endPillar.xMm, scaleInfo.value);
      const shelfY = mmToPxY(shelf.heightMm, scaleInfo.value);
      const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

      if (x >= startX && x <= endX && y >= shelfY - shelfThickness / 2 - 5 && y <= shelfY + shelfThickness / 2 + 5) {
        canvas.style.cursor = 'ns-resize';
        return;
      }
    }

    const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
    for (const pillar of currentPillars) {
      if (pillar.type === 'wall') continue;

      const pillarX = mmToPxX(pillar.xMm, scaleInfo.value);
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

  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    canvas.addEventListener('mousemove', updateCursor);
  });

  onUnmounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    canvas.removeEventListener('mousemove', updateCursor);
  });
}
