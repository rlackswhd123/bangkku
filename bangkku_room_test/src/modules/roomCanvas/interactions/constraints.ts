import { Pillar, RoomState, Shelf } from '../../../types';
import { PILLAR_SHELF_CONSTRAINTS } from '../../../types';

export function createPillarPositionValidator(room: RoomState) {
  return (targetPillarId: string, newXMm: number, pillars: Pillar[]) => {
    const normalPillars = pillars
      .filter((p) => p.type !== 'wall')
      .sort((a, b) => a.xMm - b.xMm);

    const targetPillar = normalPillars.find((p) => p.id === targetPillarId);
    if (!targetPillar) return newXMm;

    const targetIndex = normalPillars.findIndex((p) => p.id === targetPillarId);
    const leftNeighbor = targetIndex > 0 ? normalPillars[targetIndex - 1] : null;
    const rightNeighbor = targetIndex < normalPillars.length - 1 ? normalPillars[targetIndex + 1] : null;

    let minXMm = 0;
    let maxXMm = room.roomWidthMm;

    if (leftNeighbor) {
      minXMm = leftNeighbor.xMm + PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      const maxAllowedXMm = leftNeighbor.xMm + PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newXMm > maxAllowedXMm) {
        maxXMm = Math.min(maxXMm, maxAllowedXMm);
      }
    }

    if (rightNeighbor) {
      const maxFromRight = rightNeighbor.xMm - PILLAR_SHELF_CONSTRAINTS.MIN_PILLAR_SPACING_MM;
      maxXMm = Math.min(maxXMm, maxFromRight);
      const minAllowedXMm = rightNeighbor.xMm - PILLAR_SHELF_CONSTRAINTS.MAX_PILLAR_SPACING_MM;
      if (newXMm < minAllowedXMm) {
        minXMm = Math.max(minXMm, minAllowedXMm);
      }
    }

    return Math.max(minXMm, Math.min(maxXMm, newXMm));
  };
}

export function createShelfPositionValidator() {
  return (targetShelfId: string, newHeightMm: number, shelves: Shelf[]) => {
    const targetShelf = shelves.find((s) => s.id === targetShelfId);
    if (!targetShelf) return newHeightMm;

    const samePairShelves = shelves.filter(
      (s) =>
        s.id !== targetShelfId &&
        s.startPillarId === targetShelf.startPillarId &&
        s.endPillarId === targetShelf.endPillarId
    );

    const gridSize = 100;

    const SHELF_SPACING: Record<string, { above: number; below: number }> = {
      normal: { above: 300, below: 300 },
      hanger: { above: 300, below: 1000 },
      drawer: { above: 500, below: 300 },
    };

    const getRequiredSpacing = (upperShelfType: string, lowerShelfType: string): number => {
      const upperSpacing = SHELF_SPACING[upperShelfType] || SHELF_SPACING.normal;
      const lowerSpacing = SHELF_SPACING[lowerShelfType] || SHELF_SPACING.normal;
      return Math.max(upperSpacing.below, lowerSpacing.above);
    };

    const targetShelfType = targetShelf.type || 'normal';

    let minAllowedHeight = -Infinity;
    let maxAllowedHeight = Infinity;

    for (const shelf of samePairShelves) {
      const otherShelfType = shelf.type || 'normal';

      if (newHeightMm > shelf.heightMm) {
        const spacing = getRequiredSpacing(targetShelfType, otherShelfType);
        const distance = newHeightMm - shelf.heightMm;
        if (distance < spacing) {
          const allowedHeight = shelf.heightMm + spacing;
          const gridAdjustedHeight = Math.ceil(allowedHeight / gridSize) * gridSize;
          minAllowedHeight = Math.max(minAllowedHeight, gridAdjustedHeight);
        }
      } else if (newHeightMm < shelf.heightMm) {
        const spacing = getRequiredSpacing(otherShelfType, targetShelfType);
        const distance = shelf.heightMm - newHeightMm;
        if (distance < spacing) {
          const allowedHeight = shelf.heightMm - spacing;
          const gridAdjustedHeight = Math.floor(allowedHeight / gridSize) * gridSize;
          maxAllowedHeight = Math.min(maxAllowedHeight, gridAdjustedHeight);
        }
      } else {
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

    let constrainedHeight = newHeightMm;
    if (minAllowedHeight !== -Infinity) {
      constrainedHeight = Math.max(constrainedHeight, minAllowedHeight);
    }
    if (maxAllowedHeight !== Infinity) {
      constrainedHeight = Math.min(constrainedHeight, maxAllowedHeight);
    }

    return constrainedHeight;
  };
}

