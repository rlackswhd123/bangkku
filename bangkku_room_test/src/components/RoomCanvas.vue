<!-- RoomCanvas.vue: 캔버스에서 방/기둥/선반을 편집하는 핵심 인터랙션 뷰 -->
<template>
  <div ref="containerRef" :style="{ width: '100%', height: '100%', position: 'relative' }">
    <canvas
      ref="canvasRef"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    />
    <!-- 기둥 스타일 선택 컨텍스트 메뉴 -->
    <div v-if="scaleInfo" :style="pillarStyleMenuPosition">
      <div style="position: relative">
        <button
          @click="isPillarStyleMenuOpen = !isPillarStyleMenuOpen"
          :style="pillarStyleButtonStyle"
          @mouseenter="handlePillarStyleButtonEnter"
          @mouseleave="handlePillarStyleButtonLeave"
        >
          <span>{{ pillarStyleNames[selectedPillarStyle] }}</span>
          <span :style="{ fontSize: '10px' }">▼</span>
        </button>

        <Teleport to="body">
          <div v-if="isPillarStyleMenuOpen">
            <!-- 메뉴 외부 클릭 감지용 오버레이 -->
            <div
              :style="{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998,
              }"
              @click="isPillarStyleMenuOpen = false"
            />
            <!-- 드롭다운 메뉴 -->
            <div
              :style="getPillarStyleDropdownPosition()"
              @click.stop
            >
              <div
                v-for="style in (['rear-single', 'center-single', 'dual'] as const)"
                :key="style"
                @click="handlePillarStyleChange(style)"
                :style="getPillarStyleMenuItemStyle(style)"
                @mouseenter="handlePillarStyleMenuItemEnter(style, $event)"
                @mouseleave="handlePillarStyleMenuItemLeave(style, $event)"
              >
                {{ pillarStyleNames[style] }}
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
    <!-- 선반 종류 선택 모달 -->
    <Teleport to="body">
      <div v-if="shelfTypeModal && shelfTypeModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="shelfTypeModal = null"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="shelfTypeModalStyle"
          @click.stop
        >
          <!-- 모달 헤더 -->
          <div :style="modalHeaderStyle">
            <div :style="modalTitleStyle">가구 선택</div>
            <div :style="modalSubtitleStyle">추가할 가구를 선택해주세요</div>
          </div>
          <!-- 모달 본문 -->
          <div :style="modalBodyStyle">
            <!-- 카테고리 섹션 -->
            <div :style="categorySectionStyle">
              <div :style="categoryTitleStyle">카테고리</div>
              <div :style="categoryButtonsStyle">
                <div :style="categoryButtonActiveStyle">전체</div>
                <div :style="categoryButtonInactiveStyle">선반</div>
                <div :style="categoryButtonInactiveStyle">하부장</div>
              </div>
            </div>
            <!-- 선반 종류 카드 그리드 -->
            <div :style="shelfGridStyle">
              <!-- 일반 선반 카드 -->
              <div
                @click="handleShelfTypeSelect('normal')"
                :style="shelfCardStyle"
                @mouseenter="handleShelfCardHover"
                @mouseleave="handleShelfCardLeave"
              >
                <div :style="shelfImageAreaStyle">
                  <img
                    v-if="shelfImages.normal && shelfImages.normal.complete"
                    :src="shelfImages.normal.src"
                    alt="일반 선반"
                    :style="shelfPreviewImageStyle"
                  />
                  <div v-else :style="shelfPreviewPlaceholderStyle" />
                </div>
                <div :style="shelfCardTitleStyle">일반 선반</div>
                <div :style="shelfCardSubtitleStyle">wood</div>
                <div :style="shelfCardSizeStyle">가변 × 200 × 400 (mm)</div>
              </div>
              <!-- 옷걸이 선반 카드 -->
              <div
                @click="handleShelfTypeSelect('hanger')"
                :style="shelfCardStyle"
                @mouseenter="handleShelfCardHover"
                @mouseleave="handleShelfCardLeave"
              >
                <div :style="shelfImageAreaStyle">
                  <img
                    v-if="shelfImages.hanger && shelfImages.hanger.complete"
                    :src="shelfImages.hanger.src"
                    alt="옷걸이 선반"
                    :style="shelfPreviewImageStyle"
                  />
                  <div v-else :style="shelfPreviewPlaceholderStyle" />
                </div>
                <div :style="shelfCardTitleStyle">옷걸이 선반</div>
                <div :style="shelfCardSubtitleStyle">wood</div>
                <div :style="shelfCardSizeStyle">가변 × 200 × 400 (mm)</div>
              </div>
              <!-- 서랍 선반 카드 -->
              <div
                @click="handleShelfTypeSelect('drawer')"
                :style="shelfCardStyle"
                @mouseenter="handleShelfCardHover"
                @mouseleave="handleShelfCardLeave"
              >
                <div :style="shelfImageAreaStyle">
                  <img
                    v-if="shelfImages.drawer && shelfImages.drawer.complete"
                    :src="shelfImages.drawer.src"
                    alt="서랍 선반"
                    :style="shelfPreviewImageStyle"
                  />
                  <div v-else :style="shelfPreviewPlaceholderStyle" />
                </div>
                <div :style="shelfCardTitleStyle">서랍 선반</div>
                <div :style="shelfCardSubtitleStyle">wood</div>
                <div :style="shelfCardSizeStyle">가변 × 200 × 400 (mm)</div>
              </div>
            </div>
          </div>
          <!-- 모달 푸터 -->
          <div :style="modalFooterStyle">
            <button
              @click="shelfTypeModal = null"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- 코너장 확인 모달 -->
    <Teleport to="body">
      <div v-if="cornerPillarModal && cornerPillarModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="handleCornerPillarConfirm(false)"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="cornerPillarModalStyle"
          @click.stop
        >
          <div :style="modalTitleStyle">코너장으로 구성하시겠습니까?</div>
          <div :style="modalTextStyle">
            해당 기둥을 코너장으로 설정합니다. 이 기둥에 연결된 모든 선반이 코너장으로 표시됩니다.
          </div>
          <div :style="modalButtonGroupStyle">
            <button
              @click="handleCornerPillarConfirm(false)"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handleCornerPillarConfirm(true)"
              :style="modalConfirmButtonStyle"
              @mouseenter="handleModalConfirmButtonHover"
              @mouseleave="handleModalConfirmButtonLeave"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue';
import { Pillar, Shelf, DragState, PILLAR_SHELF_CONSTRAINTS, ScaleInfo } from '../types';
import { mmToPxX, mmToPxY, pxToMmX, pxToMmY, snapToGrid } from '../utils/coordinates';
import { useImageAssets } from '../modules/roomCanvas/hooks/useImageAssets';
import { useRoomCanvasRenderer, useCursorUpdater } from '../modules/roomCanvas/hooks/useRoomCanvasRenderer';
import { calculateShelfButtonPositions } from '../modules/roomCanvas/canvas/drawers/buttons';
import { createPillarPositionValidator, createShelfPositionValidator } from '../modules/roomCanvas/interactions/constraints';
import { useRoomStore } from '../modules/roomCanvas/store';

const emit = defineEmits<{
  scaleChange: [scaleInfo: ScaleInfo];
  objectSelect: [type: 'pillar' | 'shelf' | null, id: string | null];
  showToast: [message: string];
}>();

const store = useRoomStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const { cornerImages, shelfImages } = useImageAssets();

// 기둥/선반 드래그 상태
const dragState = ref<DragState>({
  type: null,
  targetId: null,
});

// 스토어에서 현재 활성 면 데이터 가져오기
const activeFace = computed(() => store.activeFace.value);
const activeFaceDimensions = computed(() => store.activeFaceDimensions.value);
const activeFacePillars = computed(() => store.activeFacePillars.value);
const activeFaceShelves = computed(() => store.activeFaceShelves.value);

// RoomState 형식으로 변환 (기존 렌더러와 호환)
const roomState = computed(() => ({
  roomWidthMm: activeFaceDimensions.value.widthMm,
  roomHeightMm: activeFaceDimensions.value.heightMm,
  roomDepthMm: activeFaceDimensions.value.depthMm,
}));

const scaleInfo = useRoomCanvasRenderer({
  canvasRef,
  containerRef,
  room: roomState,
  pillars: activeFacePillars,
  shelves: activeFaceShelves,
  dragState,
  cornerImages,
  shelfImages,
  onScaleChange: (info) => emit('scaleChange', info),
});

useCursorUpdater(canvasRef, scaleInfo, activeFacePillars, activeFaceShelves);

const validatePillarPosition = computed(() => createPillarPositionValidator(roomState.value));
const validateShelfPosition = computed(() => createShelfPositionValidator());

// 선반 종류 선택 모달 상태
const shelfTypeModal = ref<{
  show: boolean;
  startPillarId: string;
  endPillarId: string;
  x: number;
  y: number;
} | null>(null);

// 코너장 확인 모달 상태
const cornerPillarModal = ref<{
  show: boolean;
  pillarId: string;
} | null>(null);

// 기둥 스타일 선택 상태
const selectedPillarStyle = ref<'rear-single' | 'center-single' | 'dual'>('rear-single');
const isPillarStyleMenuOpen = ref(false);

// 기둥 스타일 이름 매핑
const pillarStyleNames = {
  'rear-single': '후면 싱글',
  'center-single': '센터 싱글',
  'dual': '듀얼 기둥',
};

// 마우스 이벤트 핸들러
/**
 * 마우스 다운 시 클릭 대상에 따라 기둥/선반 추가·선택·드래그를 시작합니다.
 */
const handleMouseDown = (e: MouseEvent) => {
  if (!scaleInfo.value) return;

  // 선반 타입 선택 모달이 열려있으면 닫기
  if (shelfTypeModal.value) {
    shelfTypeModal.value = null;
    return;
  }

  // 코너장 확인 모달이 열려있으면 닫기
  if (cornerPillarModal.value) {
    cornerPillarModal.value = null;
    return;
  }

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const { redRect } = scaleInfo.value;

  // 1순위: 기둥 추가 버튼 클릭 체크
  const normalPillars = activeFacePillars.value.filter((p) => p.type !== 'wall');
  let buttonX: number;
  if (normalPillars.length === 0) {
    buttonX = mmToPxX(600, scaleInfo.value);
  } else {
    const rightmostPillar = normalPillars.reduce((rightmost, current) =>
      current.xMm > rightmost.xMm ? current : rightmost
    );
    const buttonXMm = rightmostPillar.xMm + 600;
    buttonX = mmToPxX(buttonXMm, scaleInfo.value);
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
    if (normalPillars.length === 0) {
      const firstXMm = 0;
      const secondXMm = 700;

      if (firstXMm < 0 || firstXMm > roomState.value.roomWidthMm || secondXMm < 0 || secondXMm > roomState.value.roomWidthMm) {
        emit('showToast', '기둥은 정면 벽 내에만 생성할 수 있습니다.');
        return;
      }

      const firstPillar: Pillar = {
        id: `pillar-${Date.now()}`,
        xMm: firstXMm,
        type: 'normal',
        pillarStyle: selectedPillarStyle.value,
      };
      const secondPillar: Pillar = {
        id: `pillar-${Date.now() + 1}`,
        xMm: secondXMm,
        type: 'normal',
        pillarStyle: selectedPillarStyle.value,
      };
      store.setActiveFacePillars([...activeFacePillars.value, firstPillar, secondPillar]);
    } else {
      const rightmostPillar = normalPillars.reduce((rightmost, current) =>
        current.xMm > rightmost.xMm ? current : rightmost
      );
      const newXMm = rightmostPillar.xMm + 700;

      if (newXMm < 0 || newXMm > roomState.value.roomWidthMm) {
        emit('showToast', '기둥은 정면 벽 내에만 생성할 수 있습니다.');
        return;
      }

      const newPillar: Pillar = {
        id: `pillar-${Date.now()}`,
        xMm: newXMm,
        type: 'normal',
        pillarStyle: selectedPillarStyle.value,
      };
      store.setActiveFacePillars([...activeFacePillars.value, newPillar]);
    }
    return;
  }

  // 1-2순위: 선반 추가 버튼들 클릭 체크
  if (normalPillars.length >= 2) {
    const shelfButtons = calculateShelfButtonPositions(activeFacePillars.value, activeFaceShelves.value, scaleInfo.value);
    const shelfButtonRadius = 17.5;
    for (const button of shelfButtons) {
      const distanceToShelfButton = Math.sqrt(Math.pow(x - button.x, 2) + Math.pow(y - button.y, 2));
      if (distanceToShelfButton <= shelfButtonRadius) {
        shelfTypeModal.value = {
          show: true,
          startPillarId: button.startPillarId,
          endPillarId: button.endPillarId,
          x: button.x,
          y: button.y,
        };
        return;
      }
    }
  }

  // 2순위: 선반 클릭 체크
  for (const shelf of activeFaceShelves.value) {
    const startPillar = activeFacePillars.value.find((p) => p.id === shelf.startPillarId);
    const endPillar = activeFacePillars.value.find((p) => p.id === shelf.endPillarId);
    if (!startPillar || !endPillar) continue;

    const startX = mmToPxX(startPillar.xMm, scaleInfo.value);
    const endX = mmToPxX(endPillar.xMm, scaleInfo.value);
    const shelfY = mmToPxY(shelf.heightMm, scaleInfo.value);
    const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

    if (x >= startX && x <= endX && y >= shelfY - shelfThickness / 2 - 5 && y <= shelfY + shelfThickness / 2 + 5) {
      emit('objectSelect', 'shelf', shelf.id);
      dragState.value = {
        type: 'shelf',
        targetId: shelf.id,
        startY: y,
        originalHeightMm: shelf.heightMm,
      };
      return;
    }
  }

  // 4순위: 기둥 클릭 체크
  const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
  for (const pillar of activeFacePillars.value) {
    if (pillar.type === 'wall') continue;

    const pillarX = mmToPxX(pillar.xMm, scaleInfo.value);
    if (
      x >= pillarX - pillarWidthPx / 2 - 5 &&
      x <= pillarX + pillarWidthPx / 2 + 5 &&
      y >= redRect.y &&
      y <= redRect.y + redRect.height
    ) {
      emit('objectSelect', 'pillar', pillar.id);
      dragState.value = {
        type: 'pillar',
        targetId: pillar.id,
        startX: x,
        originalXMm: pillar.xMm,
      };
      return;
    }
  }

  // 아무것도 클릭하지 않았으면 선택 해제
  emit('objectSelect', null, null);
};

/**
 * 드래그 중에는 기둥 X 좌표 또는 선반 높이를 실시간으로 계산해 반영합니다.
 */
const handleMouseMove = (e: MouseEvent) => {
  if (!scaleInfo.value) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // 기둥 드래그
  if (dragState.value.type === 'pillar' && dragState.value.targetId) {
    const newXMm = pxToMmX(x, scaleInfo.value);
    const snappedXMm = snapToGrid(newXMm, 100);

    const MAX_OUTSIDE_MM = 300;
    const minXMm = -MAX_OUTSIDE_MM;
    const maxXMm = roomState.value.roomWidthMm + MAX_OUTSIDE_MM;

    const clampedXMm = Math.max(minXMm, Math.min(maxXMm, snappedXMm));

    let constrainedXMm = clampedXMm;
    if (clampedXMm >= 0 && clampedXMm <= roomState.value.roomWidthMm) {
      constrainedXMm = validatePillarPosition.value(dragState.value.targetId, clampedXMm, activeFacePillars.value);
    }

    store.setActiveFacePillars(
      activeFacePillars.value.map((p) => (p.id === dragState.value.targetId ? { ...p, xMm: constrainedXMm } : p))
    );
    return;
  }

  // 선반 높이 드래그
  if (dragState.value.type === 'shelf' && dragState.value.targetId) {
    const newHeightMm = pxToMmY(y, scaleInfo.value);
    const maxHeightMm = scaleInfo.value.redRect.height / scaleInfo.value.scaleY;
    const clampedHeightMm = Math.max(0, Math.min(maxHeightMm, newHeightMm));
    const snappedHeightMm = snapToGrid(clampedHeightMm, 100);
    const constrainedHeightMm = validateShelfPosition.value(dragState.value.targetId, snappedHeightMm, activeFaceShelves.value);
    const finalHeightMm = snapToGrid(constrainedHeightMm, 100);

    store.setActiveFaceShelves(
      activeFaceShelves.value.map((s) => (s.id === dragState.value.targetId ? { ...s, heightMm: finalHeightMm } : s))
    );
    return;
  }
};

/**
 * 드래그 종료 시 위치를 스냅하고 코너장 모달을 제어합니다.
 */
const handleMouseUp = () => {
  // 기둥/선반 드래그 종료
  if (dragState.value.type === 'pillar' && dragState.value.targetId && scaleInfo.value) {
    const draggedPillar = activeFacePillars.value.find((p) => p.id === dragState.value.targetId);
    if (draggedPillar) {
      const isOutsideRedRect = draggedPillar.xMm < 0 || draggedPillar.xMm > roomState.value.roomWidthMm;

      if (isOutsideRedRect && !draggedPillar.cornerPillar) {
        cornerPillarModal.value = {
          show: true,
          pillarId: draggedPillar.id,
        };
      } else {
        const clampedXMm = Math.max(0, Math.min(roomState.value.roomWidthMm, draggedPillar.xMm));
        const snappedXMm = snapToGrid(clampedXMm, 100);
        const constrainedXMm = validatePillarPosition.value(dragState.value.targetId, snappedXMm, activeFacePillars.value);

        store.setActiveFacePillars(
          activeFacePillars.value
            .map((p) => (p.id === dragState.value.targetId ? { ...p, xMm: constrainedXMm } : p))
            .sort((a, b) => a.xMm - b.xMm)
        );
      }
    }
  }

  if (dragState.value.type === 'shelf' && dragState.value.targetId && scaleInfo.value) {
    const draggedShelf = activeFaceShelves.value.find((s) => s.id === dragState.value.targetId);
    if (draggedShelf) {
      const clampedHeightMm = Math.max(0, Math.min(scaleInfo.value.redRect.height / scaleInfo.value.scaleY, draggedShelf.heightMm));
      const snappedHeightMm = snapToGrid(clampedHeightMm, 100);
      const constrainedHeightMm = validateShelfPosition.value(dragState.value.targetId, snappedHeightMm, activeFaceShelves.value);
      const finalHeightMm = snapToGrid(constrainedHeightMm, 100);

      store.setActiveFaceShelves(
        activeFaceShelves.value.map((s) => (s.id === dragState.value.targetId ? { ...s, heightMm: finalHeightMm } : s))
      );
    }
  }

  dragState.value = { type: null, targetId: null };
};

/**
 * 캔버스를 이탈하면 모든 드래그 상태를 초기화합니다.
 */
const handleMouseLeave = () => {
  dragState.value = { type: null, targetId: null };
};

// 선반 타입 선택 핸들러
/**
 * 모달에서 선택한 선반 유형을 실제 Shelf 객체로 생성합니다.
 */
const handleShelfTypeSelect = (shelfType: 'normal' | 'hanger' | 'drawer') => {
  if (!shelfTypeModal.value || !scaleInfo.value) return;

  const samePairShelves = activeFaceShelves.value.filter(
    (shelf) =>
      shelf.startPillarId === shelfTypeModal.value!.startPillarId &&
      shelf.endPillarId === shelfTypeModal.value!.endPillarId
  );

  const maxHeightMm = scaleInfo.value.redRect.height / scaleInfo.value.scaleY;

  let newHeightMm: number;
  if (samePairShelves.length === 0) {
    newHeightMm = maxHeightMm - 300;
  } else {
    const topmostShelf = samePairShelves.reduce((topmost, current) =>
      current.heightMm < topmost.heightMm ? current : topmost
    );
    newHeightMm = topmostShelf.heightMm - 400;
  }

  if (newHeightMm < 0 || newHeightMm > maxHeightMm) {
    emit('showToast', '선반은 정면 벽 범위 내에만 생성할 수 있습니다.');
    shelfTypeModal.value = null;
    return;
  }

  const startPillar = activeFacePillars.value.find((p) => p.id === shelfTypeModal.value!.startPillarId);
  const endPillar = activeFacePillars.value.find((p) => p.id === shelfTypeModal.value!.endPillarId);
  const isCornerShelf = startPillar?.cornerPillar || endPillar?.cornerPillar || false;

  const newShelf: Shelf = {
    id: `shelf-${Date.now()}`,
    startPillarId: shelfTypeModal.value.startPillarId,
    endPillarId: shelfTypeModal.value.endPillarId,
    heightMm: newHeightMm,
    type: shelfType,
    cornerShelf: isCornerShelf,
  };
  store.setActiveFaceShelves([...activeFaceShelves.value, newShelf]);
  shelfTypeModal.value = null;
};

// 코너장 확인 핸들러
/**
 * 정면 벽 밖으로 나간 기둥을 코너장으로 고정할지 여부를 처리합니다.
 */
const handleCornerPillarConfirm = (confirmed: boolean) => {
  if (!cornerPillarModal.value || !scaleInfo.value) return;

  const draggedPillar = activeFacePillars.value.find((p) => p.id === cornerPillarModal.value!.pillarId);
  if (!draggedPillar) {
    cornerPillarModal.value = null;
    return;
  }

  const clampedXMm = Math.max(0, Math.min(roomState.value.roomWidthMm, draggedPillar.xMm));
  const snappedXMm = snapToGrid(clampedXMm, 100);
  const constrainedXMm = validatePillarPosition.value(cornerPillarModal.value.pillarId, snappedXMm, activeFacePillars.value);

  if (confirmed) {
    store.setActiveFacePillars(
      activeFacePillars.value
        .map((p) =>
          p.id === cornerPillarModal.value!.pillarId ? { ...p, cornerPillar: true, xMm: constrainedXMm } : p
        )
        .sort((a, b) => a.xMm - b.xMm)
    );
  } else {
    store.setActiveFacePillars(
      activeFacePillars.value
        .map((p) => (p.id === cornerPillarModal.value!.pillarId ? { ...p, xMm: constrainedXMm } : p))
        .sort((a, b) => a.xMm - b.xMm)
    );
  }

  cornerPillarModal.value = null;
};

// 기둥 스타일 변경 핸들러
/**
 * 드롭다운에서 고른 스타일을 현재 모든 일반 기둥에 일괄 적용합니다.
 */
const handlePillarStyleChange = (style: 'rear-single' | 'center-single' | 'dual') => {
  selectedPillarStyle.value = style;
  isPillarStyleMenuOpen.value = false;
  store.setPillarStyleAllFaces(style);
};

// 스타일 정의
/**
 * 기둥 스타일 드롭다운이 캔버스 상단에 정확히 붙도록 절대 좌표를 계산합니다.
 */
const pillarStyleMenuPosition = computed<CSSProperties>(() => {
  if (!scaleInfo.value) return {};
  return {
    position: 'absolute',
    top: `${scaleInfo.value.blueRect.y - 35}px`,
    left: `${scaleInfo.value.blueRect.x + scaleInfo.value.blueRect.width / 2 + 60}px`,
  };
});

const pillarStyleButtonStyle = {
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
};

const getPillarStyleDropdownPosition = () => {
  if (!scaleInfo.value) return {};
  const buttonTop = scaleInfo.value.blueRect.y - 35;
  const buttonLeft = scaleInfo.value.blueRect.x + scaleInfo.value.blueRect.width / 2 + 60;
  return {
    position: 'fixed' as const,
    top: `${buttonTop + 30}px`,
    left: `${buttonLeft}px`,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 999,
    minWidth: '120px',
    overflow: 'hidden',
  };
};

const getPillarStyleMenuItemStyle = (style: 'rear-single' | 'center-single' | 'dual') => ({
  padding: '8px 12px',
  cursor: 'pointer',
  backgroundColor: selectedPillarStyle.value === style ? '#E3F2FD' : '#fff',
  color: selectedPillarStyle.value === style ? '#007AFF' : '#333',
  fontSize: '12px',
  fontWeight: selectedPillarStyle.value === style ? '600' : '400',
  transition: 'all 0.2s',
});

const modalOverlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 999,
};

const shelfTypeModalStyle = {
  position: 'fixed' as const,
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
  flexDirection: 'column' as const,
};

const modalHeaderStyle = {
  padding: '24px 32px',
  borderBottom: '1px solid #e0e0e0',
};

const modalTitleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '8px',
};

const modalSubtitleStyle = {
  fontSize: '14px',
  color: '#666',
};

const modalBodyStyle = {
  padding: '24px 32px',
  flex: 1,
  overflowY: 'auto' as const,
};

const categorySectionStyle = {
  marginBottom: '24px',
};

const categoryTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '12px',
};

const categoryButtonsStyle = {
  display: 'flex',
  gap: '8px',
};

const categoryButtonActiveStyle = {
  padding: '8px 16px',
  backgroundColor: '#007AFF',
  color: '#fff',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'default' as const,
};

const categoryButtonInactiveStyle = {
  padding: '8px 16px',
  backgroundColor: '#f5f5f5',
  color: '#666',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'default' as const,
};

const shelfGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
};

const shelfCardStyle = {
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: '#fff',
};

const shelfImageAreaStyle = {
  width: '100%',
  height: '120px',
  backgroundColor: '#F5F5F5',
  borderRadius: '6px',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const shelfPreviewImageStyle = {
  width: '90%',
  height: '100%',
  objectFit: 'contain' as const,
};

const shelfPreviewPlaceholderStyle = {
  width: '70%',
  height: '18px',
  borderRadius: '999px',
  backgroundColor: '#d0d0d0',
};

const shelfCardTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '8px',
};

const shelfCardSubtitleStyle = {
  fontSize: '12px',
  color: '#999',
  marginBottom: '8px',
};

const shelfCardSizeStyle = {
  fontSize: '12px',
  color: '#666',
  marginBottom: '12px',
};

const modalFooterStyle = {
  padding: '20px 32px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const modalCancelButtonStyle = {
  padding: '10px 24px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'all 0.2s',
};

const modalConfirmButtonStyle = {
  padding: '10px 24px',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#007AFF',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'all 0.2s',
};

const cornerPillarModalStyle = {
  position: 'fixed' as const,
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
  flexDirection: 'column' as const,
};

const modalTextStyle = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '24px',
};

const modalButtonGroupStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

// 이벤트 핸들러
const handlePillarStyleButtonEnter = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
};

const handlePillarStyleButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
};

const handlePillarStyleMenuItemEnter = (
  style: 'rear-single' | 'center-single' | 'dual',
  e: MouseEvent
) => {
  if (selectedPillarStyle.value !== style) {
    (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
  }
};

const handlePillarStyleMenuItemLeave = (
  style: 'rear-single' | 'center-single' | 'dual',
  e: MouseEvent
) => {
  if (selectedPillarStyle.value !== style) {
    (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
  }
};

const handleShelfCardHover = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  target.style.borderColor = '#007AFF';
  target.style.boxShadow = '0 4px 12px rgba(0,122,255,0.2)';
};

const handleShelfCardLeave = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  target.style.borderColor = '#e0e0e0';
  target.style.boxShadow = 'none';
};

const handleModalButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
};

const handleModalButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
};

const handleModalConfirmButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0056b3';
};

const handleModalConfirmButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007AFF';
};
</script>

