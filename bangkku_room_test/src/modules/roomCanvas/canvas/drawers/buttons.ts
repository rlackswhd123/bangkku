// buttons.ts: 캔버스에 기둥/선반 추가 버튼과 위치 계산 로직을 담당
import { Pillar, ScaleInfo, Shelf, Section } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';
import { useRoomStore } from '../../store';

export interface ShelfButtonPosition {
  x: number;
  y: number;
  startPillarKey: number;
  endPillarKey: number;
  sectionKey: number;
}

export function calculateShelfButtonPositions(
  pillars: Pillar[],
  _shelves: Shelf[],
  scaleInfo: ScaleInfo,
  sections?: Section[]
): ShelfButtonPosition[] {
  // 섹션이 있으면 섹션 기반으로 버튼 위치 계산
  if (sections && sections.length > 0) {
    const buttons: ShelfButtonPosition[] = [];

    sections.forEach((section) => {
      const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
      const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
      
      if (!startPillar || !endPillar) return;

      const centerXMm = (startPillar.x + endPillar.x) / 2;
      const centerXPx = mmToPxX(centerXMm, scaleInfo);

      // 섹션 내 선반들 확인
      const sectionShelves = section.shelves;

      let centerYPx: number;
      const store = useRoomStore();
      const shelfButtonDefaultOffsetMm = store.settings.value.shelfButtonDefaultOffsetMm;
      if (sectionShelves.length === 0) {
        const defaultHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY - shelfButtonDefaultOffsetMm;
        centerYPx = mmToPxY(defaultHeightMm, scaleInfo);
      } else {
        const topmostShelf = sectionShelves.reduce((topmost, current) =>
          current.y < topmost.y ? current : topmost
        );
        const buttonHeightMm = topmostShelf.y - shelfButtonDefaultOffsetMm;
        centerYPx = mmToPxY(buttonHeightMm, scaleInfo);
      }

      buttons.push({
        x: centerXPx,
        y: centerYPx,
        startPillarKey: startPillar.pillarKey,
        endPillarKey: endPillar.pillarKey,
        sectionKey: section.sectionKey,
      });
    });

    return buttons;
  }

  // 섹션이 없으면 기존 방식 (기둥 쌍 기반)
  const sortedPillars = [...pillars].sort((a, b) => a.x - b.x);
  if (sortedPillars.length < 2) return [];

  const buttons: ShelfButtonPosition[] = [];

  for (let i = 0; i < sortedPillars.length - 1; i += 1) {
    const startPillar = sortedPillars[i];
    const endPillar = sortedPillars[i + 1];

    const centerXMm = (startPillar.x + endPillar.x) / 2;
    const centerXPx = mmToPxX(centerXMm, scaleInfo);

    const samePairShelves: Shelf[] = [];

    let centerYPx: number;
    const store = useRoomStore();
    const shelfButtonDefaultOffsetMm = store.settings.value.shelfButtonDefaultOffsetMm;
    if (samePairShelves.length === 0) {
      const defaultHeightMm = scaleInfo.redRect.height / scaleInfo.scaleY - shelfButtonDefaultOffsetMm;
      centerYPx = mmToPxY(defaultHeightMm, scaleInfo);
    } else {
      const topmostShelf = samePairShelves.reduce((topmost, current) =>
        current.y < topmost.y ? current : topmost
      );
      const buttonHeightMm = topmostShelf.y - shelfButtonDefaultOffsetMm;
      centerYPx = mmToPxY(buttonHeightMm, scaleInfo);
    }

    buttons.push({
      x: centerXPx,
      y: centerYPx,
      startPillarKey: startPillar.pillarKey,
      endPillarKey: endPillar.pillarKey,
      sectionKey: 0,
    });
  }

  return buttons;
}

export function drawAddShelfButtons(ctx: CanvasRenderingContext2D, buttons: ShelfButtonPosition[]) {
  const store = useRoomStore();
  const radius = store.settings.value.buttonSizes.shelfAdd.radius;

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
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', button.x, button.y);
  });
}

export function drawAddPillarButton(ctx: CanvasRenderingContext2D, pillars: Pillar[], scaleInfo: ScaleInfo) {
  const { redRect } = scaleInfo;
  const store = useRoomStore();
  const pillarButtonOffsetMm = store.settings.value.pillarButtonOffsetMm;
  const buttonSizes = store.settings.value.buttonSizes.pillarAdd;
  let buttonX: number;
  if (pillars.length === 0) {
    buttonX = mmToPxX(pillarButtonOffsetMm, scaleInfo);
  } else {
    const rightmostPillar = pillars.reduce((rightmost, current) =>
      current.x > rightmost.x ? current : rightmost
    );
    const buttonXMm = rightmostPillar.x + pillarButtonOffsetMm;
    buttonX = mmToPxX(buttonXMm, scaleInfo);
  }

  const buttonY = redRect.y + redRect.height * 0.5;
  const buttonWidth = buttonSizes.width;
  const buttonHeight = buttonSizes.height;
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

export interface SectionDeleteButtonPosition {
  x: number;
  y: number;
  sectionKey: number;
}

export function calculateSectionDeleteButtonPositions(
  sections: Section[],
  pillars: Pillar[],
  scaleInfo: ScaleInfo
): SectionDeleteButtonPosition[] {
  const buttons: SectionDeleteButtonPosition[] = [];

  sections.forEach((section) => {
    const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
    
    if (!startPillar || !endPillar) return;

    const centerXMm = (startPillar.x + endPillar.x) / 2;
    const centerXPx = mmToPxX(centerXMm, scaleInfo);
    
    // 섹션 상단에 버튼 배치 (정면 벽 상단에서 약간 아래)
    const store = useRoomStore();
    const buttonYMm = store.settings.value.sectionDeleteButtonOffsetMm;
    const centerYPx = mmToPxY(buttonYMm, scaleInfo);

    buttons.push({
      x: centerXPx,
      y: centerYPx,
      sectionKey: section.sectionKey,
    });
  });

  return buttons;
}

export function drawSectionDeleteButtons(ctx: CanvasRenderingContext2D, buttons: SectionDeleteButtonPosition[]) {
  const store = useRoomStore();
  const buttonSizes = store.settings.value.buttonSizes.sectionDelete;
  const buttonWidth = buttonSizes.width;
  const buttonHeight = buttonSizes.height;
  const borderRadius = 2;

  buttons.forEach((button) => {
    const btnX = button.x - buttonWidth / 2;
    const btnY = button.y - buttonHeight / 2;

    // 배경
    ctx.fillStyle = '#FF4444';
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

    // 테두리
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // X 표시
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const crossSize = 4;
    ctx.moveTo(button.x - crossSize / 2, button.y - crossSize / 2);
    ctx.lineTo(button.x + crossSize / 2, button.y + crossSize / 2);
    ctx.moveTo(button.x + crossSize / 2, button.y - crossSize / 2);
    ctx.lineTo(button.x - crossSize / 2, button.y + crossSize / 2);
    ctx.stroke();
  });
}

