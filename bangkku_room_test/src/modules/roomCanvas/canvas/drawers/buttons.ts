// buttons.ts: 캔버스에 기둥/선반 추가 버튼과 위치 계산 로직을 담당
import { Pillar, ScaleInfo, Shelf } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';

export interface ShelfButtonPosition {
  x: number;
  y: number;
  startPillarId: string;
  endPillarId: string;
}

export function calculateShelfButtonPositions(
  pillars: Pillar[],
  shelves: Shelf[],
  scaleInfo: ScaleInfo
): ShelfButtonPosition[] {
  const sortedPillars = pillars.filter((p) => p.type !== 'wall').sort((a, b) => a.xMm - b.xMm);
  if (sortedPillars.length < 2) return [];

  const buttons: ShelfButtonPosition[] = [];

  for (let i = 0; i < sortedPillars.length - 1; i += 1) {
    const startPillar = sortedPillars[i];
    const endPillar = sortedPillars[i + 1];

    const centerXMm = (startPillar.xMm + endPillar.xMm) / 2;
    const centerXPx = mmToPxX(centerXMm, scaleInfo);

    const samePairShelves = shelves.filter(
      (shelf) => shelf.startPillarId === startPillar.id && shelf.endPillarId === endPillar.id
    );

    let centerYPx: number;
    if (samePairShelves.length === 0) {
      const defaultHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY - 400;
      centerYPx = mmToPxY(defaultHeightMm, scaleInfo);
    } else {
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

export function drawAddShelfButtons(ctx: CanvasRenderingContext2D, buttons: ShelfButtonPosition[]) {
  const radius = 17.5;

  buttons.forEach((button) => {
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(button.x, button.y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', button.x, button.y);
  });
}

export function drawAddPillarButton(ctx: CanvasRenderingContext2D, pillars: Pillar[], scaleInfo: ScaleInfo) {
  const { redRect } = scaleInfo;
  const normalPillars = pillars.filter((p) => p.type !== 'wall');
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
  const buttonWidth = 70;
  const buttonHeight = 30;
  const borderRadius = 6;

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

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('칸 추가', buttonX, buttonY);
}

