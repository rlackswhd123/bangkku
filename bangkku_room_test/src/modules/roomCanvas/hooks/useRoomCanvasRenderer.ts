// useRoomCanvasRenderer.ts: Canvas 렌더 파이프라인과 커서 업데이트 훅을 제공
import { ref, watch, Ref, onMounted, onUnmounted, unref } from 'vue';
import { DragState, Pillar, RoomState, ScaleInfo, Shelf, Section, PlacedAccessory, FURNITURE_DIMENSIONS } from '../../../types';
import { calculateScale, mmToPxX, mmToPxY } from '../../../utils/coordinates';
import { useRoomStore } from '../store';
import { FaceId, getPhysicalAdjacentFace, isFaceActiveInShape } from '../models/roomShape';
import { CornerImages, ShelfImages, WallImages, PillarImages } from './useImageAssets';

// 소품 이미지 경로별로 1회만 로드하도록 캐시
const accessoryImageCache = new Map<string, HTMLImageElement>();
const getCachedImage = (src: string | undefined | null): HTMLImageElement | null => {
  if (!src) return null;
  const cached = accessoryImageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  accessoryImageCache.set(src, img);
  return img;
};
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
import { drawFurniture, drawGhostFurniture } from '../canvas/drawers/furniture';
import { drawPillar, drawGhostPillar } from '../canvas/drawers/pillars';
import { drawShelf, drawGhostShelf, drawCornerShelfImages } from '../canvas/drawers/shelves';
import { drawPillarSpacings, drawShelfSpacings } from '../canvas/drawers/spacings';
import { drawFrontWall, drawLeftWall, drawRightWall } from '../canvas/drawers/walls';
import { drawProjectedSnapshot } from '../canvas/drawers/projectedSnapshot';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';
import { AvailableRect } from '../utils/rectCalculator';
import { PlacedFurniture } from '../models/furniture';

interface UseRoomCanvasRendererParams {
  canvasRef: Ref<HTMLCanvasElement | null>;
  containerRef: Ref<HTMLDivElement | null>;
  room: RoomState | Ref<RoomState>;
  pillars: Pillar[] | Ref<Pillar[]>;
  shelves: Shelf[] | Ref<Shelf[]>;
  sections: Section[] | Ref<Section[]>;
  furnitures?: PlacedFurniture[] | Ref<PlacedFurniture[]>;
  dragState: DragState | Ref<DragState>;
  cornerImages: Ref<CornerImages>;
  shelfImages: Ref<ShelfImages>;
  wallImages: Ref<WallImages>;
  pillarImages: Ref<PillarImages>;
  onScaleChange: (scaleInfo: ScaleInfo) => void;
  availableRects?: AvailableRect[] | Ref<AvailableRect[]>;
  showRectPreview?: boolean | Ref<boolean>;
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
  furnitures = [],
  dragState,
  cornerImages,
  shelfImages,
  wallImages,
  pillarImages,
  onScaleChange,
  availableRects = [],
  showRectPreview = false,
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
    const currentFurnitures = unref(furnitures);
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
      
      // 물리적 인접 면 계산 (1면의 왼쪽=4면, 오른쪽=2면)
      const leftAdjacentFaceId = getPhysicalAdjacentFace(currentActiveFaceId, 'left');
      const rightAdjacentFaceId = getPhysicalAdjacentFace(currentActiveFaceId, 'right');
      
      // 왼쪽 파란 벽: 물리적 왼쪽 인접 면의 스냅샷
      const leftAdjacentFace = store.getFaceState(leftAdjacentFaceId);
      if (leftAdjacentFace.projectedSnapshot) {
        drawProjectedSnapshot(
          ctx,
          leftAdjacentFace.projectedSnapshot,
          currentScaleInfo.leftWallQuad
        );
      }
      
      // 오른쪽 파란 벽: 물리적 오른쪽 인접 면의 스냅샷
      const rightAdjacentFace = store.getFaceState(rightAdjacentFaceId);
      if (rightAdjacentFace.projectedSnapshot) {
        drawProjectedSnapshot(
          ctx,
          rightAdjacentFace.projectedSnapshot,
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

      const currentShape = store.roomShape.value;
      const labelColor = (faceId: FaceId) =>
        isFaceActiveInShape(currentShape, faceId) ? '#222222' : '#777777';

      const labelY = redRect.y - verticalPadding + 40;

      // 왼쪽 파란 벽 상단 (물리적 왼쪽 인접 면)
      const leftWallCenterX = (blueRect.x + redRect.x) / 2;
      ctx.fillStyle = labelColor(leftAdjacentFaceId);
      ctx.fillText(`${leftAdjacentFaceId}면`, leftWallCenterX, labelY);

      // 정면 빨간 벽 상단 (현재 활성 면)
      const frontWallCenterX = redRect.x + redRect.width / 2;
      ctx.fillStyle = labelColor(currentActiveFaceId);
      ctx.fillText(`${currentActiveFaceId}면`, frontWallCenterX, labelY);

      // 오른쪽 파란 벽 상단 (물리적 오른쪽 인접 면)
      const rightWallCenterX = (redRect.x + redRect.width + blueRect.x + blueRect.width) / 2;
      ctx.fillStyle = labelColor(rightAdjacentFaceId);
      ctx.fillText(`${rightAdjacentFaceId}면`, rightWallCenterX, labelY);

      // 컨텍스트 복원
      ctx.fillStyle = prevFillStyle;
      ctx.font = prevFont;
      ctx.textAlign = prevTextAlign;
      ctx.textBaseline = prevTextBaseline;
    }

    currentPillars
      .filter((pillar) => (pillar.pillarStyle || 'RS') !== 'DU')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetKey === pillar.pillarKey;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo, pillarImages.value);
        }
      });

    currentShelves.forEach((shelf) => {
      const isGhost = currentDragState.type === 'shelf' && currentDragState.targetKey === shelf.shelfKey;
      if (!isGhost) {
        drawShelf(ctx, shelf, currentPillars, currentSections, currentScaleInfo, shelfImages.value);
      }

      if (shelf.accessories && shelf.accessories.length > 0) {
        shelf.accessories.forEach((acc: PlacedAccessory) => {
          const isDraggingThisAcc =
            currentDragState.type === 'accessory' && currentDragState.targetKey === acc.id;
          if (isDraggingThisAcc && currentDragState.ghostXMm == null) {
            return;
          }

          const accCenterX = isDraggingThisAcc
            ? currentDragState.ghostXMm ?? acc.xMm ?? 0
            : acc.xMm ?? 0;
          const accCenterY = acc.yMm ?? shelf.y;
          const accTopMm = accCenterY + acc.heightMm / 2;
          const accBottomMm = accCenterY - acc.heightMm / 2;
          const leftMm = accCenterX;
          const widthPx = acc.widthMm * currentScaleInfo.scaleX;
          const leftPx = mmToPxX(leftMm, currentScaleInfo);
          const topPx = mmToPxY(accTopMm, currentScaleInfo);
          const bottomPx = mmToPxY(accBottomMm, currentScaleInfo);
          const heightPx = bottomPx - topPx;

          // 소품 이미지 렌더링
          const accImage = acc.image ? getCachedImage(acc.image) : null;

          ctx.save();

          if (accImage && accImage.complete && accImage.naturalWidth > 0 && accImage.naturalHeight > 0) {
            // 이미지 렌더링
            if (isDraggingThisAcc) {
              ctx.globalAlpha = 0.5;
            }
            ctx.drawImage(
              accImage,
              0,
              0,
              accImage.naturalWidth,
              accImage.naturalHeight,
              leftPx,
              topPx,
              widthPx,
              heightPx
            );
          } else {
            // Fallback: 기존 노란색 박스
            ctx.fillStyle = isDraggingThisAcc ? 'rgba(255, 200, 0, 0.35)' : 'rgba(255, 200, 0, 0.8)';
            ctx.strokeStyle = isDraggingThisAcc ? 'rgba(180, 140, 0, 0.6)' : 'rgba(180, 140, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.fillRect(leftPx, topPx, widthPx, heightPx);
            ctx.strokeRect(leftPx, topPx, widthPx, heightPx);

            if (acc.name) {
              ctx.fillStyle = '#222';
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(acc.name, leftPx + widthPx / 2, topPx + heightPx / 2);
            }
          }

          ctx.restore();
        });
      }
    });

    drawCornerShelfImages(ctx, currentPillars, currentScaleInfo, currentRoom.roomWidthMm, cornerImages.value);

    // 바닥 가구 그리기
    currentFurnitures.forEach((furniture) => {
      const isGhost = currentDragState.type === 'furniture' && currentDragState.targetKey === furniture.id;
      if (!isGhost) {
        drawFurniture(ctx, furniture, currentScaleInfo);
      }
    });

    if (currentDragState.type === 'furniture' && currentDragState.targetKey && currentDragState.ghostXMm !== undefined) {
      const ghostFurniture = currentFurnitures.find(f => f.id === currentDragState.targetKey);
      if (ghostFurniture) {
        drawGhostFurniture(ctx, ghostFurniture, currentDragState.ghostXMm, currentScaleInfo);
      }
    }

    // Rect 미리보기 그리기
    const currentShowRectPreview = unref(showRectPreview);
    const currentAvailableRects = unref(availableRects) || [];
    
    if (currentShowRectPreview) {
      if (currentAvailableRects.length > 0) {
        ctx.save();
        currentAvailableRects.forEach((rect) => {
          const rectX = mmToPxX(rect.x, currentScaleInfo);
          const rectWidth = (rect.width * currentScaleInfo.scaleX);
          
          // rect의 높이는 최대 높이까지이므로 바닥(0mm)부터 시작하도록 조정
          const rectTopPx = mmToPxY(0, currentScaleInfo); // 바닥 위치 (Y축이 위로 갈수록 작아짐)
          const rectBottomPx = mmToPxY(rect.height, currentScaleInfo); // 최대 높이 위치
          const actualRectHeight = rectTopPx - rectBottomPx; // Y축이 위로 갈수록 작아지므로
          
          // b_limit 범위가 있으면 배치 불가능 영역을 별도로 표시
          if (rect.shelfBottom !== undefined && rect.bLimit !== undefined && rect.bLimit > 0) {
            const bLimitStartMm = rect.shelfBottom - rect.bLimit; // b_limit 범위 시작 (바닥에서)
            const bLimitStartPx = mmToPxY(bLimitStartMm, currentScaleInfo);
            const bLimitEndPx = mmToPxY(rect.shelfBottom, currentScaleInfo);
            const bLimitHeightPx = bLimitStartPx - bLimitEndPx;
            
            // b_limit 범위 밖 (배치 가능 영역) - 초록색
            const availableStartPx = rectTopPx; // 바닥
            const availableEndPx = bLimitStartPx; // b_limit 시작 위치
            const availableHeightPx = availableStartPx - availableEndPx;
            
            if (availableHeightPx > 0) {
              // 배치 가능 영역은 항상 초록색
              ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
              ctx.fillRect(rectX, availableEndPx, rectWidth, availableHeightPx);
              
              ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
              ctx.lineWidth = 3;
              ctx.strokeRect(rectX, availableEndPx, rectWidth, availableHeightPx);
            }
            
            // b_limit 범위 (배치 불가능 영역) - 노란색 또는 회색
            if (bLimitHeightPx > 0) {
              ctx.fillStyle = 'rgba(255, 255, 0, 0.2)'; // 노란색 반투명
              ctx.fillRect(rectX, bLimitEndPx, rectWidth, bLimitHeightPx);
              
              ctx.strokeStyle = 'rgba(200, 200, 0, 0.6)';
              ctx.lineWidth = 2;
              ctx.strokeRect(rectX, bLimitEndPx, rectWidth, bLimitHeightPx);
            }
          } else {
            // 선반이 없거나 b_limit이 0인 경우
            // 선반이 있지만 b_limit이 0인 경우도 선반 바닥까지 초록색으로 표시
            if (rect.shelfBottom !== undefined) {
              // 선반 바닥까지 초록색으로 표시
              const shelfBottomPx = mmToPxY(rect.shelfBottom, currentScaleInfo);
              const shelfBottomHeightPx = rectTopPx - shelfBottomPx;
              
              ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
              ctx.fillRect(rectX, shelfBottomPx, rectWidth, shelfBottomHeightPx);
              
              ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
              ctx.lineWidth = 3;
              ctx.strokeRect(rectX, shelfBottomPx, rectWidth, shelfBottomHeightPx);
            } else {
              // 선반이 없는 경우 전체 영역 표시
              ctx.fillStyle = rect.isValid ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
              ctx.fillRect(rectX, rectBottomPx, rectWidth, actualRectHeight);
              
              ctx.strokeStyle = rect.isValid ? 'rgba(0, 200, 0, 0.8)' : 'rgba(200, 0, 0, 0.8)';
              ctx.lineWidth = 3;
              ctx.strokeRect(rectX, rectBottomPx, rectWidth, actualRectHeight);
            }
          }
        });
        ctx.restore();
      }
    }


    currentPillars
      .filter((pillar) => (pillar.pillarStyle || 'RS') === 'DU')
      .forEach((pillar) => {
        const isGhost = currentDragState.type === 'pillar' && currentDragState.targetKey === pillar.pillarKey;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo, pillarImages.value);
        }
      });

    if (currentDragState.type === 'pillar' && currentDragState.targetKey && currentDragState.originalX !== undefined) {
      const ghostPillar = currentPillars.find((p) => p.pillarKey === currentDragState.targetKey);
      if (ghostPillar) {
        const pillarStyle = ghostPillar.pillarStyle || 'RS';
        if (pillarStyle !== 'DU') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo, pillarImages.value);
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
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo, pillarImages.value);
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

    // UI 버튼을 최상단 레이어로 렌더링 (스냅샷 캡처 시 제외)
    if (!excludeButtons) {
      drawAddPillarButton(ctx, currentPillars, currentScaleInfo);

      const hoveredShelfKey = store.hoveredShelf.value;

      if (currentPillars.length >= 2 || currentSections.length > 0) {
        const shelfButtons = calculateShelfButtonPositions(currentPillars, currentShelves, currentScaleInfo, currentSections, hoveredShelfKey);
        drawAddShelfButtons(ctx, shelfButtons);
      }

      if (currentSections.length > 0) {
        const sectionDeleteButtons = calculateSectionDeleteButtonPositions(currentSections, currentPillars, currentScaleInfo);
        drawSectionDeleteButtons(ctx, sectionDeleteButtons);
      }

      if (currentShelves.length > 0 && currentSections.length > 0) {
        const itemAddButtons = calculateItemAddButtonPositions(currentShelves, currentSections, currentPillars, currentScaleInfo, hoveredShelfKey);
        drawItemAddButtons(ctx, itemAddButtons);
      }
    }
  };

  // 렌더링 트리거: 상태나 자산이 바뀌면 즉시 다시 그립니다.
  const store = useRoomStore();
  watch(
    [
      () => unref(room),
      () => unref(pillars),
      () => unref(shelves),
      () => unref(sections),
      () => unref(furnitures),
      () => unref(dragState),
      () => cornerImages.value,
      () => shelfImages.value,
      () => wallImages.value,
      () => store.hoveredShelf.value,
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

      // 실제 선반 두께 계산 (이미지 크기에 맞춤)
      const shelfType = shelf.type || 'normal';
      const shelfDimensions = FURNITURE_DIMENSIONS[shelfType];
      const shelfThicknessMm = shelf.thickness ?? shelfDimensions.heightMm;
      const shelfThickness = shelfThicknessMm * scaleInfo.value.scaleY;

      const topBoundary = shelfY - shelfThickness / 2 - 5;
      const bottomBoundary = shelfY + shelfThickness / 2 + 5;

      // 디버그 로그 - 선반 근처 50px 범위 내에서만 출력
      const nearShelf = x >= startX && x <= endX && Math.abs(y - shelfY) < 50;
      if (nearShelf) {
        const isInRange = y >= topBoundary && y <= bottomBoundary;
        console.log(`🖱️ 선반#${shelf.shelfKey} [${shelfType}] ${isInRange ? '✅ 호버됨' : '❌ 범위밖'}:`, {
          mouseY: Math.round(y),
          shelfCenterY: Math.round(shelfY),
          thicknessMm: shelfThicknessMm,
          thicknessPx: Math.round(shelfThickness),
          range: `${Math.round(topBoundary)} ~ ${Math.round(bottomBoundary)}`,
          위쪽여유: Math.round(y - topBoundary),
          아래쪽여유: Math.round(bottomBoundary - y)
        });
      }

      if (x >= startX && x <= endX && y >= topBoundary && y <= bottomBoundary) {
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
