import { MutableRefObject, useCallback, useEffect, useState } from 'react';
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
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  room: RoomState;
  pillars: Pillar[];
  shelves: Shelf[];
  dragState: DragState;
  cornerImages: CornerImages;
  shelfImages: ShelfImages;
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
  const [scaleInfo, setScaleInfoState] = useState<ScaleInfo | null>(null);

  const updateScaleInfo = useCallback(
    (canvas: HTMLCanvasElement) => {
      const newScaleInfo = calculateScale(canvas.width, canvas.height, room.roomWidthMm, room.roomHeightMm);
      setScaleInfoState(newScaleInfo);
      onScaleChange(newScaleInfo);
      return newScaleInfo;
    },
    [room.roomWidthMm, room.roomHeightMm, onScaleChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const currentScaleInfo = updateScaleInfo(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSkeletonRoom(ctx, currentScaleInfo, room);
    drawAddPillarButton(ctx, pillars, currentScaleInfo);

    const normalPillars = pillars.filter((p) => p.type !== 'wall');
    if (normalPillars.length >= 2) {
      const shelfButtons = calculateShelfButtonPositions(pillars, shelves, currentScaleInfo);
      drawAddShelfButtons(ctx, shelfButtons);
    }

    pillars
      .filter((pillar) => pillar.type !== 'wall')
      .filter((pillar) => (pillar.pillarStyle || 'rear-single') !== 'dual')
      .forEach((pillar) => {
        const isGhost = dragState.type === 'pillar' && dragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    shelves.forEach((shelf) => {
      const isGhost = dragState.type === 'shelf' && dragState.targetId === shelf.id;
      if (!isGhost) {
        drawShelf(ctx, shelf, pillars, currentScaleInfo, shelfImages);
      }
    });

    drawCornerShelfImages(ctx, pillars, currentScaleInfo, room.roomWidthMm, cornerImages);

    pillars
      .filter((pillar) => pillar.type !== 'wall')
      .filter((pillar) => (pillar.pillarStyle || 'rear-single') === 'dual')
      .forEach((pillar) => {
        const isGhost = dragState.type === 'pillar' && dragState.targetId === pillar.id;
        if (!isGhost) {
          drawPillar(ctx, pillar, currentScaleInfo);
        }
      });

    if (dragState.type === 'pillar' && dragState.targetId && dragState.originalXMm !== undefined) {
      const ghostPillar = pillars.find((p) => p.id === dragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle !== 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    if (dragState.type === 'shelf' && dragState.targetId && dragState.originalHeightMm !== undefined) {
      const ghostShelf = shelves.find((s) => s.id === dragState.targetId);
      if (ghostShelf) {
        drawGhostShelf(ctx, ghostShelf, pillars, currentScaleInfo, shelfImages);
      }
    }

    if (dragState.type === 'pillar' && dragState.targetId && dragState.originalXMm !== undefined) {
      const ghostPillar = pillars.find((p) => p.id === dragState.targetId);
      if (ghostPillar && ghostPillar.type !== 'wall') {
        const pillarStyle = ghostPillar.pillarStyle || 'rear-single';
        if (pillarStyle === 'dual') {
          drawGhostPillar(ctx, ghostPillar, currentScaleInfo);
        }
      }
    }

    const normalPillarsForSpacing = pillars.filter((p) => p.type !== 'wall');
    if (normalPillarsForSpacing.length >= 2) {
      drawPillarSpacings(ctx, normalPillarsForSpacing, currentScaleInfo);
    }

    if (shelves.length > 0) {
      drawShelfSpacings(ctx, shelves, pillars, currentScaleInfo);
    }
  }, [room, pillars, shelves, dragState, updateScaleInfo, cornerImages, shelfImages, canvasRef, containerRef]);

  return scaleInfo;
}

export function useCursorUpdater(
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  scaleInfo: ScaleInfo | null,
  pillars: Pillar[],
  shelves: Shelf[]
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scaleInfo) return;

    const updateCursor = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const { redRect } = scaleInfo;

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

      const normalPillars = pillars.filter((p) => p.type !== 'wall');
      if (normalPillars.length >= 2) {
        const shelfButtons = calculateShelfButtonPositions(pillars, shelves, scaleInfo);
        const shelfButtonRadius = 17.5;
        for (const button of shelfButtons) {
          const distanceToShelfButton = Math.sqrt((x - button.x) ** 2 + (y - button.y) ** 2);
          if (distanceToShelfButton <= shelfButtonRadius) {
            canvas.style.cursor = 'pointer';
            return;
          }
        }
      }

      for (const shelf of shelves) {
        const startPillar = pillars.find((p) => p.id === shelf.startPillarId);
        const endPillar = pillars.find((p) => p.id === shelf.endPillarId);
        if (!startPillar || !endPillar) continue;

        const startX = mmToPxX(startPillar.xMm, scaleInfo);
        const endX = mmToPxX(endPillar.xMm, scaleInfo);
        const shelfY = mmToPxY(shelf.heightMm, scaleInfo);
        const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

        if (x >= startX && x <= endX && y >= shelfY - shelfThickness / 2 - 5 && y <= shelfY + shelfThickness / 2 + 5) {
          canvas.style.cursor = 'ns-resize';
          return;
        }
      }

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
  }, [canvasRef, scaleInfo, pillars, shelves]);
}