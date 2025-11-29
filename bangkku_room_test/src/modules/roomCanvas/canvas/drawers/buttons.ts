// buttons.ts: 캔버스에 기둥/선반 추가 버튼과 위치 계산 로직을 담당
import { Pillar, ScaleInfo, Shelf, Section } from '../../../../types';
import { mmToPxX, mmToPxY } from '../../../../utils/coordinates';
import { useRoomStore } from '../../store';

// 선반/소품 추가 버튼 공통 오프셋 설정
const ITEM_ADD_BUTTON_OFFSET_MM = 220; // 선반 위 220mm
const BUTTON_PAIR_HORIZONTAL_OFFSET_PX = 26; // 선반/소품 추가 버튼을 칸 중앙 기준 좌우로 배치

export interface ShelfButtonPosition {
  x: number;
  y: number;
  startPillarKey: number;
  endPillarKey: number;
  sectionKey: number;
  shelfKey?: number; // 호버 필터링용 선반 키
}

export function calculateShelfButtonPositions(
  pillars: Pillar[],
  shelves: Shelf[],
  scaleInfo: ScaleInfo,
  sections: Section[] = [],
  hoveredShelfKey: number | null = null
): ShelfButtonPosition[] {
  console.log('[BUTTONS] calculateShelfButtonPositions - hoveredShelfKey:', hoveredShelfKey, 'shelves count:', shelves.length);
  const buttons: ShelfButtonPosition[] = [];
  const store = useRoomStore();

  // 1) 섹션은 있지만 아직 선반이 하나도 없는 경우: 섹션당 1개씩 가운데에 버튼 표시 (항상 표시)
  if (shelves.length === 0) {
    const shelfCreateDefaultOffsetMm = store.settings.value.shelfCreateDefaultOffsetMm;
    const defaultHeightMm = shelfCreateDefaultOffsetMm;
    const centerYPx = mmToPxY(defaultHeightMm, scaleInfo);

    sections.forEach((section) => {
      const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
      const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
      if (!startPillar || !endPillar) return;

      const centerXMm = (startPillar.x + endPillar.x) / 2;
      const centerXPx = mmToPxX(centerXMm, scaleInfo);

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

  // 2) 선반과 섹션이 모두 있는 경우
  //    - 선반이 있는 섹션: 소품 버튼과 같은 높이에서, 칸 중앙 기준 왼쪽으로 약간 이동 (페어 버튼)
  //    - 선반이 아직 없는 섹션: 1번 케이스처럼 섹션당 1개씩 가운데에 버튼 표시 (최초 선반 추가용)
  const shelfCreateDefaultOffsetMm = store.settings.value.shelfCreateDefaultOffsetMm;
  const defaultHeightMm = shelfCreateDefaultOffsetMm;
  const defaultCenterYPx = mmToPxY(defaultHeightMm, scaleInfo);

  // 섹션별 선반 그룹핑
  const shelvesBySection = new Map<number, Shelf[]>();
  shelves.forEach((shelf) => {
    if (shelf.sectionKey == null) return;
    const list = shelvesBySection.get(shelf.sectionKey) ?? [];
    list.push(shelf);
    shelvesBySection.set(shelf.sectionKey, list);
  });

  sections.forEach((section) => {
    const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
    if (!startPillar || !endPillar) return;

    const sectionShelves = shelvesBySection.get(section.sectionKey) ?? [];

    const centerXMm = (startPillar.x + endPillar.x) / 2;
    const baseCenterXPx = mmToPxX(centerXMm, scaleInfo);

    if (sectionShelves.length === 0) {
      // 해당 섹션에 아직 선반이 없으면, 섹션 가운데에 최초 선반 추가 버튼 1개
      buttons.push({
        x: baseCenterXPx,
        y: defaultCenterYPx,
        startPillarKey: startPillar.pillarKey,
        endPillarKey: endPillar.pillarKey,
        sectionKey: section.sectionKey,
      });
      return;
    }

    // 선반이 있는 섹션은 각 선반 위에 페어 버튼 형태로 배치
    // hoveredShelfKey가 null이면 버튼을 표시하지 않음 (호버 시에만 표시)
    sectionShelves.forEach((shelf) => {
      // 호버 필터링: hoveredShelfKey가 null이면 버튼 표시 안 함
      if (hoveredShelfKey === null) {
        return; // 호버 안 했으면 버튼 표시 안 함
      }

      // hoveredShelfKey와 일치하는 선반의 버튼만 추가
      if (shelf.shelfKey !== hoveredShelfKey) {
        return; // 다른 선반의 버튼은 건너뛰기
      }

      const buttonX = baseCenterXPx - BUTTON_PAIR_HORIZONTAL_OFFSET_PX;
      const buttonHeightMm = shelf.y + ITEM_ADD_BUTTON_OFFSET_MM;
      const buttonY = mmToPxY(buttonHeightMm, scaleInfo);

      buttons.push({
        x: buttonX,
        y: buttonY,
        startPillarKey: startPillar.pillarKey,
        endPillarKey: endPillar.pillarKey,
        sectionKey: section.sectionKey,
        shelfKey: shelf.shelfKey, // 선반 키 추가
      });
    });
  });

  return buttons;
}

export function drawAddShelfButtons(ctx: CanvasRenderingContext2D, buttons: ShelfButtonPosition[]) {
  const buttonWidth = 35;
  const buttonHeight = 20;
  const borderRadius = 4;

  buttons.forEach((button) => {
    const btnX = button.x - buttonWidth / 2;
    const btnY = button.y - buttonHeight / 2;

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
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ 선반', button.x, button.y);
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
    ctx.fillStyle = '#B33333';
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
    ctx.strokeStyle = '#8B0000';
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

export interface ItemAddButtonPosition {
  x: number;
  y: number;
  shelfKey: number;
  sectionKey: number;
}

export function calculateItemAddButtonPositions(
  shelves: Shelf[],
  sections: Section[],
  pillars: Pillar[],
  scaleInfo: ScaleInfo,
  hoveredShelfKey: number | null = null
): ItemAddButtonPosition[] {
  const buttons: ItemAddButtonPosition[] = [];

  shelves.forEach((shelf) => {
    if (shelf.sectionKey == null) return;

    // 호버 필터링: hoveredShelfKey가 null이면 버튼 표시 안 함
    if (hoveredShelfKey === null) {
      return; // 호버 안 했으면 버튼 표시 안 함
    }

    // hoveredShelfKey와 일치하는 선반의 버튼만 추가
    if (shelf.shelfKey !== hoveredShelfKey) {
      return; // 다른 선반의 버튼은 건너뛰기
    }

    const section = sections.find((s) => s.sectionKey === shelf.sectionKey);
    if (!section) return;

    const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
    if (!startPillar || !endPillar) return;

    // 섹션의 가운데 x 좌표
    const centerXMm = (startPillar.x + endPillar.x) / 2;
    const baseCenterXPx = mmToPxX(centerXMm, scaleInfo);

    // 선반 위 150mm 위치
    const buttonHeightMm = shelf.y + ITEM_ADD_BUTTON_OFFSET_MM;
    const centerYPx = mmToPxY(buttonHeightMm, scaleInfo);

    const buttonX = baseCenterXPx + BUTTON_PAIR_HORIZONTAL_OFFSET_PX;

    buttons.push({
      x: buttonX,
      y: centerYPx,
      shelfKey: shelf.shelfKey,
      sectionKey: shelf.sectionKey,
    });
  });

  return buttons;
}

export function drawItemAddButtons(ctx: CanvasRenderingContext2D, buttons: ItemAddButtonPosition[]) {
  const buttonWidth = 35;
  const buttonHeight = 20;
  const borderRadius = 4;

  buttons.forEach((button) => {
    const btnX = button.x - buttonWidth / 2;
    const btnY = button.y - buttonHeight / 2;

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
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ 소품', button.x, button.y);
  });
}

