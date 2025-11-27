// useRoomCanvasRenderer.ts: Canvas 렌더 파이프라인과 커서 업데이트 훅을 제공
import { ref, watch, Ref, onMounted, onUnmounted, unref } from 'vue';
import { DragState, Pillar, RoomState, ScaleInfo, Shelf, Section } from '../../../types';
import { calculateScale, mmToPxX, mmToPxY } from '../../../utils/coordinates';
import { useRoomStore } from '../store';
import { FaceId } from '../models/roomShape';
import { CornerImages, ShelfImages, WallImages } from './useImageAssets';
// import { drawSkeletonRoom } from '../canvas/drawers/skeleton'; // 현재 사용하지 않음
import {
  drawAddPillarButton,
  drawAddShelfButtons,
  calculateShelfButtonPositions,
  drawSectionDeleteButtons,
  calculateSectionDeleteButtonPositions,
  drawItemAddButtons,
  calculateItemAddButtonPositions,
} from '../canvas/drawers/buttons';
import { drawPillar, drawGhostPillar } from '../canvas/drawers/pillars';
import { drawShelf, drawGhostShelf, drawCornerShelfImages } from '../canvas/drawers/shelves';
import { drawPillarSpacings, drawShelfSpacings } from '../canvas/drawers/spacings';
import { drawFrontWall, drawLeftWall, drawRightWall } from '../canvas/drawers/walls';
import { drawProjectedSnapshot } from '../canvas/drawers/projectedSnapshot';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';

interface UseRoomCanvasRendererParams {
  canvasRef: Ref<HTMLCanvasElement | null>;
  containerRef: Ref<HTMLDivElement | null>;
  room: RoomState | Ref<RoomState>;
  pillars: Pillar[] | Ref<Pillar[]>;
  shelves: Shelf[] | Ref<Shelf[]>;
  sections: Section[] | Ref<Section[]>;
  dragState: DragState | Ref<DragState>;
  cornerImages: Ref<CornerImages>;
  shelfImages: Ref<ShelfImages>;
  wallImages: Ref<WallImages>;
  onScaleChange: (scaleInfo: ScaleInfo) => void;
}

/**
 * 렌더링 옵션
 */
export interface RenderOptions {
  excludeButtons?: boolean;  // UI 버튼 제외 여부
  excludeSpacings?: boolean; // 간격 표시 제외 여부
  excludeWalls?: boolean;    // 벽 배경 이미지 제외 여부
  transparentBackground?: boolean; // 투명 배경 사용 여부
}

export function useRoomCanvasRenderer({
  canvasRef,
  containerRef,
  room,
  pillars,
  shelves,
  sections,
  dragState,
  cornerImages,
  shelfImages,
  wallImages,
  onScaleChange,
}: UseRoomCanvasRendererParams) {
  const scaleInfo = ref<ScaleInfo | null>(null);

  /**
   * 캔버스 크기에 맞춰 최신 스케일 정보를 계산하고 상위 컴포넌트에 전달합니다.
   */
  const updateScaleInfo = (canvas: HTMLCanvasElement) => {
    const currentRoom = unref(room);
    const store = useRoomStore();
    const visualWidthConstraints = store.settings.value.visualWidthConstraints;
    const wallVerticalPaddingPx = store.settings.value.wallVerticalPaddingPx;
    const newScaleInfo = calculateScale(
      canvas.width,
      canvas.height,
      currentRoom.roomWidthMm,
      currentRoom.roomHeightMm,
      visualWidthConstraints,
      wallVerticalPaddingPx,
    );
    scaleInfo.value = newScaleInfo;
    onScaleChange(newScaleInfo);
    return newScaleInfo;
  };

  /**
   * 방/기둥/선반/보조요소를 순서대로 그려주는 메인 렌더 루프입니다.
   * @param options - 렌더링 옵션
   * @param targetCanvas - 렌더링할 대상 캔버스 (기본값: 메인 캔버스)
   */
  const render = (options: RenderOptions = {}, targetCanvas?: HTMLCanvasElement) => {
    const { 
      excludeButtons = false, 
      excludeSpacings = false,
      excludeWalls = false,
      transparentBackground = false
    } = options;
    
    // 타겟 캔버스가 지정되지 않으면 메인 캔버스 사용
    const canvas = targetCanvas || canvasRef.value;
    const container = containerRef.value;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const store = useRoomStore();
    const currentRoom = unref(room);
    const currentPillars = unref(pillars);
    const currentShelves = unref(shelves);
    const currentSections = unref(sections);
    const currentDragState = unref(dragState);

    // 오프스크린 캔버스인 경우 메인 캔버스 크기 사용, 아니면 컨테이너 크기 사용
    if (targetCanvas) {
      // 오프스크린 캔버스: 메인 캔버스와 동일한 크기 사용 (이미 설정됨)
    } else {
      // 메인 캔버스: 컨테이너 크기에 맞춤
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    }

    const currentScaleInfo = updateScaleInfo(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 투명 배경이 아닌 경우에만 흰색 배경 그리기
    if (!transparentBackground) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 1. 스켈레톤 그리기 (파란/빨간 박스)
    // drawSkeletonRoom(ctx, currentScaleInfo, currentRoom);
    
    // 2. 벽 배경 이미지 (스냅샷 캡처 시 제외 가능)
    if (!excludeWalls) {
      // 정면 벽 배경 이미지 (가장 뒤)
    drawFrontWall(ctx, currentScaleInfo, wallImages.value);
    
      // 좌우 벽 배경 이미지 (정면 벽보다 앞)
    drawLeftWall(ctx, currentScaleInfo, wallImages.value);
    drawRightWall(ctx, currentScaleInfo, wallImages.value);
    }

    // 4. 투영된 스냅샷 이미지 및 라벨 (스냅샷 캡처 시 제외 가능)
    if (!excludeWalls) {
    const currentActiveFaceId = store.activeFaceId.value;
    const availableFaces = store.availableFaces.value;
    const currentIndex = availableFaces.indexOf(currentActiveFaceId);
    
    if (currentIndex !== -1 && availableFaces.length > 0) {
      // 왼쪽 파란 벽: 오른쪽 인접 면 (다음 면)의 스냅샷
      const rightAdjacentFaceId = availableFaces[(currentIndex + 1) % availableFaces.length] as FaceId;
      const rightAdjacentFace = store.getFaceState(rightAdjacentFaceId);
      if (rightAdjacentFace.projectedSnapshot) {
        drawProjectedSnapshot(
          ctx,
          rightAdjacentFace.projectedSnapshot,
          currentScaleInfo.leftWallQuad
        );
      }
      
      // 오른쪽 파란 벽: 왼쪽 인접 면 (이전 면)의 스냅샷
      const leftAdjacentFaceId = availableFaces[(currentIndex - 1 + availableFaces.length) % availableFaces.length] as FaceId;
      const leftAdjacentFace = store.getFaceState(leftAdjacentFaceId);
      if (leftAdjacentFace.projectedSnapshot) {
        drawProjectedSnapshot(
          ctx,
          leftAdjacentFace.projectedSnapshot,
          currentScaleInfo.rightWallQuad
        );
      }

      // 4-1. 각 벽 상단에 faceId 라벨 표시
      const { blueRect, redRect } = currentScaleInfo;
      const verticalPadding = store.settings.value.wallVerticalPaddingPx;

      // 라벨 공통 스타일 설정
      const prevFillStyle = ctx.fillStyle;
      const prevFont = ctx.font;
      const prevTextAlign = ctx.textAlign;
      const prevTextBaseline = ctx.textBaseline;

      ctx.fillStyle = '#222222';
      ctx.font = 'bold 29px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const labelY = redRect.y - verticalPadding + 40;

      // 왼쪽 파란 벽 상단 (오른쪽 인접 면)
      const leftWallCenterX = (blueRect.x + redRect.x) / 2;
      ctx.fillText(`${rightAdjacentFaceId}면`, leftWallCenterX, labelY);

      // 정면 빨간 벽 상단 (현재 활성 면)
      const frontWallCenterX = redRect.x + redRect.width / 2;
      ctx.fillText(`${currentActiveFaceId}면`, frontWallCenterX, labelY);

      // 오른쪽 파란 벽 상단 (왼쪽 인접 면)
      const rightWallCenterX = (redRect.x + redRect.width + blueRect.x + blueRect.width) / 2;
      ctx.fillText(`${leftAdjacentFaceId}면`, rightWallCenterX, labelY);

      // 컨텍스트 복원
      ctx.fillStyle = prevFillStyle;
      ctx.font = prevFont;
      ctx.textAlign = prevTextAlign;
      ctx.textBaseline = prevTextBaseline;
      }
    }

    // 5. UI 버튼들 (스냅샷 캡처 시 제외)
    if (!excludeButtons) {
      drawAddPillarButton(ctx, currentPillars, currentScaleInfo);

      if (currentPillars.length >= 2 || currentSections.length > 0) {
        const shelfButtons = calculateShelfButtonPositions(currentPillars, currentShelves, currentScaleInfo, currentSections);
        drawAddShelfButtons(ctx, shelfButtons);
      }

      // 섹션 삭제 버튼 그리기
      if (currentSections.length > 0) {
        const sectionDeleteButtons = calculateSectionDeleteButtonPositions(currentSections, currentPillars, currentScaleInfo);
        drawSectionDeleteButtons(ctx, sectionDeleteButtons);
      }

      // 소품 추가 버튼 그리기 (각 선반 위에)
      if (currentShelves.length > 0 && currentSections.length > 0) {
        const itemAddButtons = calculateItemAddButtonPositions(currentShelves, currentSections, currentPillars, currentScaleInfo);
        drawItemAddButtons(ctx, itemAddButtons);
      }
    }

    currentPillars
      .filter((pillar) => (pillar.pillarStyle || 'RS') !== 'DU')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetKey === pillar.pillarKey;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    currentShelves.forEach((shelf) => {
      const isGhost = currentDragState.type === 'shelf' && currentDragState.targetKey === shelf.shelfKey;
      if (!isGhost) {
        drawShelf(ctx, shelf, currentPillars, currentSections, currentScaleInfo, shelfImages.value);
      }
    });

    drawCornerShelfImages(ctx, currentPillars, currentScaleInfo, currentRoom.roomWidthMm, cornerImages.value);

    currentPillars
      .filter((pillar) => (pillar.pillarStyle || 'RS') === 'DU')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetKey === pillar.pillarKey;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    if (currentDragState.type === 'pillar' && currentDragState.targetKey && currentDragState.originalX !== undefined) {
      const ghostPillar = currentPillars.find((p) => p.pillarKey === currentDragState.targetKey);
      if (ghostPillar) {
        const pillarStyle = ghostPillar.pillarStyle || 'RS';
        if (pillarStyle !== 'DU') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    if (currentDragState.type === 'shelf' && currentDragState.targetKey && currentDragState.originalHeightMm !== undefined) {
      const ghostShelf = currentShelves.find((s) => s.shelfKey === currentDragState.targetKey);
      if (ghostShelf) {
        drawGhostShelf(ctx, ghostShelf, currentPillars, currentSections, currentScaleInfo, shelfImages.value);
      }
    }

    if (currentDragState.type === 'pillar' && currentDragState.targetKey && currentDragState.originalX !== undefined) {
      const ghostPillar = currentPillars.find((p) => p.pillarKey === currentDragState.targetKey);
      if (ghostPillar) {
        const pillarStyle = ghostPillar.pillarStyle || 'RS';
        if (pillarStyle === 'DU') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    // 간격 표시 (스냅샷 캡처 시 제외 가능)
    if (!excludeSpacings) {
      if (currentPillars.length >= 2) {
        drawPillarSpacings(ctx, currentPillars, currentScaleInfo);
      }

      if (currentShelves.length > 0) {
        drawShelfSpacings(ctx, currentShelves, currentPillars, currentSections, currentScaleInfo);
      }
    }
  };

  // 렌더링 트리거: 상태나 자산이 바뀌면 즉시 다시 그립니다.
  watch(
    [
      () => unref(room),
      () => unref(pillars),
      () => unref(shelves),
      () => unref(sections),
      () => unref(dragState),
      () => cornerImages.value,
      () => shelfImages.value,
      () => wallImages.value,
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

  return {
    scaleInfo,
    render, // render 함수를 외부에서 호출할 수 있도록 export
  };
}

/**
 * 캔버스 위에서 사용자 인터랙션 가능 영역에 따라 커서를 동적으로 업데이트합니다.
 */
export function useCursorUpdater(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scaleInfo: Ref<ScaleInfo | null>,
  pillars: Pillar[] | Ref<Pillar[]>,
  shelves: Shelf[] | Ref<Shelf[]>,
  sections: Section[] | Ref<Section[]>
) {
  const updateCursor = (e: MouseEvent) => {
    const canvas = canvasRef.value;
    if (!canvas || !scaleInfo.value) return;

    const currentPillars = unref(pillars);
    const currentShelves = unref(shelves);
    const currentSections = unref(sections);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { redRect } = scaleInfo.value;

    const store = useRoomStore();
    const buttonSizes = store.settings.value.buttonSizes.pillarAdd;
    const buttonX = redRect.x + redRect.width * 0.3;
    const buttonY = redRect.y + redRect.height * 0.5;
    const pillarButtonWidth = buttonSizes.width;
    const pillarButtonHeight = buttonSizes.height;

    if (
      x >= buttonX - pillarButtonWidth / 2 &&
      x <= buttonX + pillarButtonWidth / 2 &&
      y >= buttonY - pillarButtonHeight / 2 &&
      y <= buttonY + pillarButtonHeight / 2
    ) {
      canvas.style.cursor = 'pointer';
      return;
    }

    if (currentPillars.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(currentPillars, currentShelves, scaleInfo.value, currentSections);
      const store = useRoomStore();
      const shelfButtonRadius = store.settings.value.buttonSizes.shelfAdd.radius;
      for (const button of shelfButtons) {
        const distanceToShelfButton = Math.sqrt((x - button.x) ** 2 + (y - button.y) ** 2);
        if (distanceToShelfButton <= shelfButtonRadius) {
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    // 소품 추가 버튼 커서 업데이트
    if (currentShelves.length > 0 && currentSections.length > 0) {
      const itemAddButtons = calculateItemAddButtonPositions(currentShelves, currentSections, currentPillars, scaleInfo.value);
      const buttonWidth = 50;
      const buttonHeight = 20;
      for (const button of itemAddButtons) {
        if (
          x >= button.x - buttonWidth / 2 &&
          x <= button.x + buttonWidth / 2 &&
          y >= button.y - buttonHeight / 2 &&
          y <= button.y + buttonHeight / 2
        ) {
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }


    for (const shelf of currentShelves) {
      const section = shelf.sectionKey != null ? currentSections.find((s) => s.sectionKey === shelf.sectionKey) : null;
      if (!section) continue;

      const startPillar = currentPillars.find((p) => p.pillarKey === section.startPillarKey);
      const endPillar = currentPillars.find((p) => p.pillarKey === section.endPillarKey);
      if (!startPillar || !endPillar) continue;

      const startX = mmToPxX(startPillar.x, scaleInfo.value);
      const endX = mmToPxX(endPillar.x, scaleInfo.value);
      const shelfY = mmToPxY(shelf.y, scaleInfo.value);
      const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

      if (x >= startX && x <= endX && y >= shelfY - shelfThickness / 2 - 5 && y <= shelfY + shelfThickness / 2 + 5) {
        canvas.style.cursor = 'ns-resize';
        return;
      }
    }

    const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
    for (const pillar of currentPillars) {
      const pillarX = mmToPxX(pillar.x, scaleInfo.value);
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
