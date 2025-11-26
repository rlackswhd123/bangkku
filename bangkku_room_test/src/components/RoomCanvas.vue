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
      <div style="position: relative; display: flex; align-items: center; gap: 12px">
        <!-- 방 폭 표시 -->
        <div :style="roomSizeDisplayStyle">
          {{ roomWidthDisplay }}
        </div>
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
                v-for="style in (['RS', 'CS', 'DU'] as const)"
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

    <!-- 화살표 버튼 (면 전환용) -->
    <div v-if="scaleInfo" :style="arrowButtonsContainerStyle">
      <button
        @click="handleFaceRotate('left')"
        :style="arrowButtonStyle()"
        title="이전 면으로 이동"
      >
        ←
      </button>
      <button
        @click="handleFaceRotate('right')"
        :style="arrowButtonStyle()"
        title="다음 면으로 이동"
      >
        →
      </button>
    </div>

    <!-- 상품 구매 모달 -->
    <Teleport to="body">
      <div v-if="productPurchaseModal && productPurchaseModal.show">
        <!-- 모달 외부 배경 -->
        <div
          :style="modalOverlayStyle"
          @click="productPurchaseModal = null"
        />
        <!-- 모달 컨텍스트 -->
        <div
          :style="shelfTypeModalStyle"
          @click.stop
        >
          <!-- 모달 헤더 -->
          <div :style="modalHeaderStyle">
            <div :style="modalTitleStyle">상품 구매</div>
            <div :style="modalSubtitleStyle">추가할 상품을 선택해주세요</div>
          </div>
          <!-- 좌우 분할 영역 -->
          <div :style="modalContentWrapperStyle">
            <!-- 왼쪽 카테고리 사이드바 -->
            <div :style="categorySidebarStyle">
              <div :style="categoryTitleStyle">카테고리</div>
              <div :style="categoryListStyle">
                <div
                  @click="productPurchaseModal && (productPurchaseModal.category = 'all')"
                  :style="getCategoryItemStyle('all')"
                >
                  <span :style="categoryIconStyle">▶</span>
                  전체
                </div>
                <div
                  @click="productPurchaseModal && (productPurchaseModal.category = 'shelf')"
                  :style="getCategoryItemStyle('shelf')"
                >
                  <span :style="categoryIconStyle">▶</span>
                  선반
                </div>
                <div
                  @click="productPurchaseModal && (productPurchaseModal.category = 'item')"
                  :style="getCategoryItemStyle('item')"
                >
                  <span :style="categoryIconStyle">▶</span>
                  소품
                </div>
                <div
                  @click="productPurchaseModal && (productPurchaseModal.category = 'furniture')"
                  :style="getCategoryItemStyle('furniture')"
                >
                  <span :style="categoryIconStyle">▶</span>
                  가구
                </div>
              </div>
            </div>
            <!-- 오른쪽 메인 콘텐츠 영역 -->
            <div :style="mainContentStyle">
              <!-- 모달 본문 (스크롤 영역) -->
              <div :style="modalBodyStyle">
            <!-- 전체 카테고리 (선반 상품 표시) -->
            <div v-if="productPurchaseModal.category === 'all' || productPurchaseModal.category === 'shelf'" :style="shelfGridStyle">
              <!-- 일반 선반 카드 -->
              <div
                @click="handleShelfTypeSelectFromProductModal('normal')"
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
                <div :style="shelfCardPriceStyle">54,900 원</div>
              </div>
              <!-- 옷걸이 선반 카드 -->
              <div
                @click="handleShelfTypeSelectFromProductModal('hanger')"
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
                <div :style="shelfCardPriceStyle">54,900 원</div>
              </div>
              <!-- 서랍 선반 카드 -->
              <div
                @click="handleShelfTypeSelectFromProductModal('drawer')"
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
                <div :style="shelfCardPriceStyle">54,900 원</div>
              </div>
            </div>
            <!-- 가구 카테고리 -->
            <div v-if="productPurchaseModal.category === 'furniture'" :style="shelfGridStyle">
              <div :style="emptyCategoryMessageStyle">
                준비 중입니다.
              </div>
            </div>
            <!-- 소품 카테고리 -->
            <div v-if="productPurchaseModal.category === 'item'" :style="shelfGridStyle">
              <div :style="emptyCategoryMessageStyle">
                준비 중입니다.
              </div>
            </div>
              </div>
            </div>
          </div>
          <!-- 모달 푸터 -->
          <div :style="modalFooterStyle">
            <button
              @click="productPurchaseModal = null"
              :style="modalCancelButtonStyle"
              @mouseenter="handleModalButtonHover"
              @mouseleave="handleModalButtonLeave"
            >
              취소
            </button>
            <button
              @click="handleProductApply"
              :style="modalApplyButtonStyle"
              @mouseenter="handleModalApplyButtonHover"
              @mouseleave="handleModalApplyButtonLeave"
            >
              적용
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
import { ref, computed, type CSSProperties, type Ref } from 'vue';
import { Pillar, Shelf, Section, DragState, PILLAR_SHELF_CONSTRAINTS, ScaleInfo } from '../types';
import { mmToPxX, mmToPxY, pxToMmX, pxToMmY, snapToGrid } from '../utils/coordinates';
import { useImageAssets } from '../modules/roomCanvas/hooks/useImageAssets';
import { useRoomCanvasRenderer, useCursorUpdater } from '../modules/roomCanvas/hooks/useRoomCanvasRenderer';
import { calculateShelfButtonPositions, calculateSectionDeleteButtonPositions, calculateItemAddButtonPositions } from '../modules/roomCanvas/canvas/drawers/buttons';
import { createPillarPositionValidator, createShelfPositionValidator } from '../modules/roomCanvas/interactions/constraints';
import { useRoomStore } from '../modules/roomCanvas/store';
import { FaceId } from '../modules/roomCanvas/models/roomShape';

const emit = defineEmits<{
  scaleChange: [scaleInfo: ScaleInfo];
  objectSelect: [type: 'pillar' | 'shelf' | null, key: number | null];
  showToast: [message: string];
  sectionDeleteRequest: [sectionKey: number, shelvesCount: number];
}>();

const store = useRoomStore();

let tempKeyCounter = 1;
const createTempKey = () => Date.now() + tempKeyCounter++;
const createPillar = (x: number, cornerYn = false): Pillar => ({
  pillarKey: createTempKey(),
  x,
  cornerYn,
  pillarStyle: selectedPillarStyle.value,
});
const createSection = (start: Pillar, end: Pillar): Section => ({
  sectionKey: createTempKey(),
  startPillarKey: start.pillarKey,
  endPillarKey: end.pillarKey,
  x: end.x - start.x,
  shelves: [],
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const { cornerImages, shelfImages, wallImages } = useImageAssets();

// 기둥/선반 드래그 상태
const dragState = ref<DragState>({
  type: null,
  targetKey: null,
});

// 스토어에서 현재 활성 면 데이터 가져오기
const activeFaceMetrics = computed(() => store.activeFaceMetrics.value);
const activeFacePillars = computed<Pillar[]>(() => store.activeFacePillars.value as Pillar[]) as Ref<Pillar[]>;
const activeFaceShelves = computed<Shelf[]>(() => store.activeFaceShelves.value as Shelf[]) as Ref<Shelf[]>;
const activeFaceSections = computed<Section[]>(() => store.activeFaceSections.value as Section[]) as Ref<Section[]>;

// RoomState 형식으로 변환 (기존 렌더러와 호환)
const roomState = computed(() => ({
  roomWidthMm: activeFaceMetrics.value.face_x,
  roomHeightMm: activeFaceMetrics.value.face_y,
  roomDepthMm: activeFaceMetrics.value.space_y,
}));

// 방 폭 표시 (미터 단위)
const roomWidthDisplay = computed(() => {
  const widthM = (roomState.value.roomWidthMm / 1000).toFixed(1);
  return `${widthM} M`;
});

const { scaleInfo, render: renderCanvas } = useRoomCanvasRenderer({
  canvasRef,
  containerRef,
  room: roomState,
  pillars: activeFacePillars,
  shelves: activeFaceShelves,
  sections: activeFaceSections,
  dragState,
  cornerImages,
  shelfImages,
  wallImages,
  onScaleChange: (info) => emit('scaleChange', info),
});

useCursorUpdater(canvasRef, scaleInfo, activeFacePillars, activeFaceShelves, activeFaceSections);

const validatePillarPosition = computed(() => createPillarPositionValidator(roomState.value));
const validateShelfPosition = computed(() => createShelfPositionValidator(activeFacePillars.value));

// 상품 구매 모달 상태
const productPurchaseModal = ref<{
  show: boolean;
  category: 'all' | 'shelf' | 'furniture' | 'item'; // 카테고리
  sectionKey?: number; // 선반 추가용
  startPillarKey?: number;
  endPillarKey?: number;
  shelfKey?: number; // 소품 추가용
  x: number;
  y: number;
} | null>(null);

// 코너장 확인 모달 상태
const cornerPillarModal = ref<{
  show: boolean;
  pillarKey: number;
} | null>(null);

// 기둥 스타일 선택 상태
const selectedPillarStyle = ref<'RS' | 'CS' | 'DU'>('RS');
const isPillarStyleMenuOpen = ref(false);

// 기둥 스타일 이름 매핑
const pillarStyleNames: Record<'RS' | 'CS' | 'DU', string> = {
  RS: '후면 싱글',
  CS: '센터 싱글',
  DU: '듀얼 기둥',
};

// 마우스 이벤트 핸들러
/**
 * 마우스 다운 시 클릭 대상에 따라 기둥/선반 추가·선택·드래그를 시작합니다.
 */
const handleMouseDown = (e: MouseEvent) => {
  if (!scaleInfo.value) return;

  if (productPurchaseModal.value) {
    productPurchaseModal.value = null;
    return;
  }
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
  const pillars = activeFacePillars.value;
  const sections = activeFaceSections.value;

  const rightmostPillar = pillars.reduce<Pillar | null>(
    (rightmost, current) => (!rightmost || current.x > rightmost.x ? current : rightmost),
    null
  );
  const settings = store.settings.value;
  const addButtonXMm = rightmostPillar ? rightmostPillar.x + settings.pillarButtonOffsetMm : settings.pillarButtonOffsetMm;
  const buttonX = mmToPxX(addButtonXMm, scaleInfo.value);
  const buttonY = redRect.y + redRect.height * 0.5;
  const pillarButtonWidth = settings.buttonSizes.pillarAdd.width;
  const pillarButtonHeight = settings.buttonSizes.pillarAdd.height;

  if (
    x >= buttonX - pillarButtonWidth / 2 &&
    x <= buttonX + pillarButtonWidth / 2 &&
    y >= buttonY - pillarButtonHeight / 2 &&
    y <= buttonY + pillarButtonHeight / 2
  ) {
    const newPillars: Pillar[] = [...pillars];
    let newSections: Section[] = [];

    if (!rightmostPillar) {
      const first = createPillar(0);
      const second = createPillar(settings.defaultSectionWidthMm);

      if (
        first.x < 0 ||
        first.x > roomState.value.roomWidthMm ||
        second.x < 0 ||
        second.x > roomState.value.roomWidthMm
      ) {
        emit('showToast', '기둥은 정면 벽 내에만 생성할 수 있습니다.');
        return;
      }

      newPillars.push(first, second);
      newSections = [createSection(first, second)];
    } else {
      const nextX = rightmostPillar.x + settings.defaultSectionWidthMm;
      if (nextX < 0 || nextX > roomState.value.roomWidthMm) {
        emit('showToast', '기둥은 정면 벽 내에만 생성할 수 있습니다.');
        return;
      }

      const newPillar = createPillar(nextX);
      newPillars.push(newPillar);
      newSections = [createSection(rightmostPillar, newPillar)];
    }

    store.setActiveFacePillars(newPillars);
    newSections.forEach((section) => store.addSection(section));
    return;
  }

  if (sections.length > 0) {
    const sectionDeleteButtons = calculateSectionDeleteButtonPositions(sections, pillars, scaleInfo.value);
    for (const button of sectionDeleteButtons) {
      const buttonWidth = settings.buttonSizes.sectionDelete.width;
      const buttonHeight = settings.buttonSizes.sectionDelete.height;
      if (
        x >= button.x - buttonWidth / 2 &&
        x <= button.x + buttonWidth / 2 &&
        y >= button.y - buttonHeight / 2 &&
        y <= button.y + buttonHeight / 2
      ) {
        const targetSection = sections.find((s) => s.sectionKey === button.sectionKey);
        if (!targetSection) return;
        
        // 섹션 중심 구조: 섹션에서 직접 선반 개수 확인
        const shelvesCount = targetSection.shelves.length;
        
        if (shelvesCount > 0) {
          emit('sectionDeleteRequest', button.sectionKey, shelvesCount);
        } else {
          store.removeSection(button.sectionKey);
        }
        return;
      }
    }
  }

  if (pillars.length >= 2 || sections.length > 0) {
    const shelfButtons = calculateShelfButtonPositions(pillars, activeFaceShelves.value, scaleInfo.value, sections);
    const settings = store.settings.value;
    const shelfButtonRadius = settings.buttonSizes.shelfAdd.radius;
    for (const button of shelfButtons) {
      const distanceToShelfButton = Math.sqrt((x - button.x) ** 2 + (y - button.y) ** 2);
      if (distanceToShelfButton <= shelfButtonRadius) {
        // 상품 구매 모달 열기 (전체 카테고리, 선반 상품 표시)
        productPurchaseModal.value = {
          show: true,
          category: 'all',
          sectionKey: button.sectionKey,
          startPillarKey: button.startPillarKey,
          endPillarKey: button.endPillarKey,
          x: button.x,
          y: button.y,
        };
        return;
      }
    }
  }

  // 소품 추가 버튼 클릭 처리
  if (activeFaceShelves.value.length > 0 && sections.length > 0) {
    const itemAddButtons = calculateItemAddButtonPositions(activeFaceShelves.value, sections, pillars, scaleInfo.value);
    const buttonWidth = 50;
    const buttonHeight = 20;
    for (const button of itemAddButtons) {
      if (
        x >= button.x - buttonWidth / 2 &&
        x <= button.x + buttonWidth / 2 &&
        y >= button.y - buttonHeight / 2 &&
        y <= button.y + buttonHeight / 2
      ) {
        // 상품 구매 모달 열기 (소품 카테고리)
        productPurchaseModal.value = {
          show: true,
          category: 'item',
          shelfKey: button.shelfKey,
          sectionKey: button.sectionKey,
          x: button.x,
          y: button.y,
        };
        return;
      }
    }
  }

  for (const shelf of activeFaceShelves.value) {
    if (shelf.sectionKey == null) continue;
    const section = sections.find((s) => s.sectionKey === shelf.sectionKey);
    if (!section) continue;
    const startPillar = pillars.find((p) => p.pillarKey === section.startPillarKey);
    const endPillar = pillars.find((p) => p.pillarKey === section.endPillarKey);
    if (!startPillar || !endPillar) continue;

    const startX = mmToPxX(startPillar.x, scaleInfo.value);
    const endX = mmToPxX(endPillar.x, scaleInfo.value);
    const shelfY = mmToPxY(shelf.y, scaleInfo.value);
    const shelfThickness = PILLAR_SHELF_CONSTRAINTS.SHELF_THICKNESS_PX;

    if (x >= startX && x <= endX && y >= shelfY - shelfThickness / 2 - 5 && y <= shelfY + shelfThickness / 2 + 5) {
      emit('objectSelect', 'shelf', shelf.shelfKey);
      dragState.value = {
        type: 'shelf',
        targetKey: shelf.shelfKey,
        startY: y,
        originalHeightMm: shelf.y,
      };
      return;
    }
  }

  const pillarWidthPx = PILLAR_SHELF_CONSTRAINTS.PILLAR_WIDTH_PX;
  for (const pillar of pillars) {
    const pillarX = mmToPxX(pillar.x, scaleInfo.value);
    if (
      x >= pillarX - pillarWidthPx / 2 - 5 &&
      x <= pillarX + pillarWidthPx / 2 + 5 &&
      y >= redRect.y &&
      y <= redRect.y + redRect.height
    ) {
      dragState.value = {
        type: 'pillar',
        targetKey: pillar.pillarKey,
        startX: x,
        originalX: pillar.x,
      };
      return;
    }
  }

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
  if (dragState.value.type === 'pillar' && dragState.value.targetKey != null) {
    const newXMm = pxToMmX(x, scaleInfo.value);
    const settings = store.settings.value;
    const snappedXMm = snapToGrid(newXMm, settings.gridSizeMm);

    const MAX_OUTSIDE_MM = settings.maxPillarOutsideMm;
    const minXMm = -MAX_OUTSIDE_MM;
    const maxXMm = roomState.value.roomWidthMm + MAX_OUTSIDE_MM;

    const clampedXMm = Math.max(minXMm, Math.min(maxXMm, snappedXMm));

    let constrainedXMm = clampedXMm;
    if (clampedXMm >= 0 && clampedXMm <= roomState.value.roomWidthMm) {
      constrainedXMm = validatePillarPosition.value(dragState.value.targetKey, clampedXMm, activeFacePillars.value);
    }

    store.setActiveFacePillars(
      activeFacePillars.value.map((p) =>
        p.pillarKey === dragState.value.targetKey ? { ...p, x: constrainedXMm } : p
      )
    );
    return;
  }

  // 선반 높이 드래그
  if (dragState.value.type === 'shelf' && dragState.value.targetKey != null) {
    const draggedShelf = activeFaceShelves.value.find((s) => s.shelfKey === dragState.value.targetKey);
    if (draggedShelf) {
      const newHeightMm = pxToMmY(y, scaleInfo.value);
      const maxHeightMm = scaleInfo.value.redRect.height / scaleInfo.value.scaleY;
      const clampedHeightMm = Math.max(0, Math.min(maxHeightMm, newHeightMm));
      
      // validateShelfPosition에 originalHeightMm과 maxHeightMm을 전달하여 드래그 방향 감지 및 충돌 방지
      const finalHeightMm = validateShelfPosition.value(
        dragState.value.targetKey, 
        clampedHeightMm, 
        activeFaceShelves.value,
        dragState.value.originalHeightMm,
        maxHeightMm
      );

      // 섹션 중심 구조: 해당 섹션의 선반만 업데이트 (정렬 유지)
      if (draggedShelf.sectionKey != null) {
        const updatedSections = activeFaceSections.value.map(section => {
          if (section.sectionKey === draggedShelf.sectionKey) {
            const updatedShelves = section.shelves.map(s => 
              s.shelfKey === dragState.value.targetKey 
                ? { ...s, y: finalHeightMm }
                : s
            ).sort((a, b) => a.y - b.y);
            return {
              ...section,
              shelves: updatedShelves,
            };
          }
          return section;
        });
        store.setActiveFaceSections(updatedSections);
      }
    }
    return;
  }
};

/**
 * 드래그 종료 시 위치를 스냅하고 코너장 모달을 제어합니다.
 */
const handleMouseUp = () => {
  if (dragState.value.type === 'pillar' && dragState.value.targetKey != null && scaleInfo.value) {
    const draggedPillar = activeFacePillars.value.find((p) => p.pillarKey === dragState.value.targetKey);
    if (draggedPillar) {
      const isOutsideRedRect = draggedPillar.x < 0 || draggedPillar.x > roomState.value.roomWidthMm;

      if (isOutsideRedRect && !draggedPillar.cornerYn) {
        cornerPillarModal.value = {
          show: true,
          pillarKey: draggedPillar.pillarKey,
        };
      } else {
        const clampedXMm = Math.max(0, Math.min(roomState.value.roomWidthMm, draggedPillar.x));
        const settings = store.settings.value;
        const snappedXMm = snapToGrid(clampedXMm, settings.gridSizeMm);
        const constrainedXMm = validatePillarPosition.value(dragState.value.targetKey, snappedXMm, activeFacePillars.value);

        store.setActiveFacePillars(
          activeFacePillars.value
            .map((p) => (p.pillarKey === dragState.value.targetKey ? { ...p, x: constrainedXMm } : p))
            .sort((a, b) => a.x - b.x)
        );
      }
    }
  }

  if (dragState.value.type === 'shelf' && dragState.value.targetKey != null && scaleInfo.value) {
    const draggedShelf = activeFaceShelves.value.find((s) => s.shelfKey === dragState.value.targetKey);
    if (draggedShelf) {
      const maxHeightMm = scaleInfo.value.redRect.height / scaleInfo.value.scaleY;
      const clampedHeightMm = Math.max(0, Math.min(maxHeightMm, draggedShelf.y));
      
      const finalHeightMm = validateShelfPosition.value(
        dragState.value.targetKey, 
        clampedHeightMm, 
        activeFaceShelves.value,
        dragState.value.originalHeightMm,
        maxHeightMm
      );

      // 섹션 중심 구조: 해당 섹션의 선반만 업데이트 (정렬 유지)
      if (draggedShelf.sectionKey != null) {
        const updatedSections = activeFaceSections.value.map(section => {
          if (section.sectionKey === draggedShelf.sectionKey) {
            const updatedShelves = section.shelves.map(s => 
              s.shelfKey === dragState.value.targetKey 
                ? { ...s, y: finalHeightMm }
                : s
            ).sort((a, b) => a.y - b.y);
            return {
              ...section,
              shelves: updatedShelves,
            };
          }
          return section;
        });
        store.setActiveFaceSections(updatedSections);
      }
    }
  }

  dragState.value = { type: null, targetKey: null };
};

/**
 * 캔버스를 이탈하면 모든 드래그 상태를 초기화합니다.
 */
const handleMouseLeave = () => {
  dragState.value = { type: null, targetKey: null };
};

// 상품 구매 모달에서 선반 타입 선택 핸들러
/**
 * 상품 구매 모달에서 선택한 선반 유형을 실제 Shelf 객체로 생성합니다.
 */
const handleShelfTypeSelectFromProductModal = (shelfType: 'normal' | 'hanger' | 'drawer') => {
  if (!productPurchaseModal.value || !scaleInfo.value) return;

  const sectionKey = productPurchaseModal.value.sectionKey;
  if (sectionKey == null) {
    emit('showToast', '섹션 정보를 찾을 수 없습니다.');
    productPurchaseModal.value = null;
    return;
  }

  const section = activeFaceSections.value.find((s) => s.sectionKey === sectionKey);
  if (!section) {
    emit('showToast', '섹션 정보를 찾을 수 없습니다.');
    productPurchaseModal.value = null;
    return;
  }

  let samePairShelves: Shelf[] = section.shelves;
  const maxHeightMm = scaleInfo.value.redRect.height / scaleInfo.value.scaleY;

  const settings = store.settings.value;
  let newHeightMm: number;
  if (samePairShelves.length === 0) {
    newHeightMm = maxHeightMm - settings.shelfCreateDefaultOffsetMm;
  } else {
    const topmostShelf = samePairShelves.reduce((topmost, current) =>
      current.y < topmost.y ? current : topmost
    );
    newHeightMm = topmostShelf.y - settings.shelfButtonDefaultOffsetMm;
  }

  if (newHeightMm < 0 || newHeightMm > maxHeightMm) {
    emit('showToast', '선반은 정면 벽 범위 내에만 생성할 수 있습니다.');
    productPurchaseModal.value = null;
    return;
  }

  const startPillar = activeFacePillars.value.find((p) => p.pillarKey === section.startPillarKey);
  const endPillar = activeFacePillars.value.find((p) => p.pillarKey === section.endPillarKey);
  if (!startPillar || !endPillar) {
    emit('showToast', '기둥 정보를 찾을 수 없습니다.');
    productPurchaseModal.value = null;
    return;
  }
  const shelfLength = Math.abs(endPillar.x - startPillar.x);

  const newShelf: Shelf = {
    shelfKey: createTempKey(),
    prodKey: 0,
    sectionKey,
    type: shelfType,
    x: shelfLength,
    y: newHeightMm,
    z: 0,
    t_limit: 0,
    b_limit: 0,
  };

  // 섹션 중심 구조: 해당 섹션에만 선반 추가 (정렬 유지)
  const updatedSections = activeFaceSections.value.map((s) => {
    if (s.sectionKey === sectionKey) {
      const updatedShelves = [...s.shelves, newShelf].sort((a, b) => a.y - b.y);
      return {
        ...s,
        shelves: updatedShelves,
      };
    }
    return s;
  });
  store.setActiveFaceSections(updatedSections);
  
  productPurchaseModal.value = null;
};


// 코너장 확인 핸들러
/**
 * 정면 벽 밖으로 나간 기둥을 코너장으로 고정할지 여부를 처리합니다.
 */
const handleCornerPillarConfirm = (confirmed: boolean) => {
  if (!cornerPillarModal.value || !scaleInfo.value) return;

  const draggedPillar = activeFacePillars.value.find((p) => p.pillarKey === cornerPillarModal.value!.pillarKey);
  if (!draggedPillar) {
    cornerPillarModal.value = null;
    return;
  }

  const clampedXMm = Math.max(0, Math.min(roomState.value.roomWidthMm, draggedPillar.x));
  const settings = store.settings.value;
  const snappedXMm = snapToGrid(clampedXMm, settings.gridSizeMm);
  const constrainedXMm = validatePillarPosition.value(
    cornerPillarModal.value.pillarKey,
    snappedXMm,
    activeFacePillars.value
  );

  if (confirmed) {
    store.setActiveFacePillars(
      activeFacePillars.value
        .map((p) =>
          p.pillarKey === cornerPillarModal.value!.pillarKey ? { ...p, cornerYn: true, x: constrainedXMm } : p
        )
        .sort((a, b) => a.x - b.x)
    );
  } else {
    store.setActiveFacePillars(
      activeFacePillars.value
        .map((p) => (p.pillarKey === cornerPillarModal.value!.pillarKey ? { ...p, x: constrainedXMm } : p))
        .sort((a, b) => a.x - b.x)
    );
  }

  cornerPillarModal.value = null;
};

// 기둥 스타일 변경 핸들러
/**
 * 드롭다운에서 고른 스타일을 현재 모든 일반 기둥에 일괄 적용합니다.
 */
const handlePillarStyleChange = (style: 'RS' | 'CS' | 'DU') => {
  selectedPillarStyle.value = style;
  isPillarStyleMenuOpen.value = false;
  store.setPillarStyleAllFaces(style);
};

/**
 * 화살표 버튼 클릭 핸들러 - 면 전환
 */
const handleFaceRotate = async (direction: 'left' | 'right') => {
  try {
    const currentFaceId = store.activeFaceId.value;
    const availableFaces = store.availableFaces.value;
    const currentIndex = availableFaces.indexOf(currentFaceId);

    let nextFaceId: FaceId;
    if (direction === 'left') {
      // 왼쪽 화살표: 다음 면으로 (왼쪽 벽이 정면으로)
      const nextIndex = currentIndex < availableFaces.length - 1 ? currentIndex + 1 : 0;
      nextFaceId = availableFaces[nextIndex] as FaceId;
    } else {
      // 오른쪽 화살표: 이전 면으로 (오른쪽 벽이 정면으로)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableFaces.length - 1;
      nextFaceId = availableFaces[prevIndex] as FaceId;
    }

    // 면 전환 시 현재 면을 스냅샷 캡처 (변경된 경우에만)
    let snapshotData = undefined;
    if (canvasRef.value && scaleInfo.value) {
      try {
        const currentFace = store.getFaceState(currentFaceId);
        
        // 빈 면인지 확인 (기둥, 섹션, 선반이 모두 없으면 빈 면)
        const hasFurniture = currentFace.pillars.length > 0 || 
                            currentFace.sections.length > 0;
        
        // 빈 면은 스냅샷 캡처하지 않음
        if (!hasFurniture) {
          console.log(`면 ${currentFaceId} 스냅샷 생략 (빈 면)`);
        } else {
          const { calculateFaceContentHash } = await import('../modules/roomCanvas/models/roomFace');
          
          // 현재 면의 콘텐츠 해시 계산
          const currentHash = calculateFaceContentHash(currentFace);
          const previousHash = currentFace.projectedSnapshot?.contentHash;
          
          // 변경된 경우에만 캡처 (이전 해시와 다르거나, 처음 캡처하는 경우)
          if (!previousHash || currentHash !== previousHash) {
            const { captureFaceSnapshot } = await import('../utils/snapshot');
            
            const snapshot = await captureFaceSnapshot(
              canvasRef.value,
              renderCanvas,
              scaleInfo.value.redRect,
              currentFace.face_x,
              currentFace.face_y
            );
            
            snapshotData = {
              imageDataUrl: snapshot.imageDataUrl,
              imageElement: snapshot.imageElement,
              sourceFaceX: snapshot.sourceFaceX,
              sourceFaceY: snapshot.sourceFaceY,
              contentHash: currentHash, // 해시 포함
            };
            
            console.log(`면 ${currentFaceId} 스냅샷 캡처 완료 (변경 감지)`);
          } else {
            console.log(`면 ${currentFaceId} 스냅샷 재사용 (변경 없음)`);
          }
        }
      } catch (error) {
        console.error('스냅샷 캡처 실패:', error);
      }
    }

    // 면 전환 (스냅샷 데이터와 함께)
    await store.setActiveFaceId(nextFaceId, {
      captureSnapshot: snapshotData !== undefined, // 변경된 경우에만 true
      snapshotData,
    });
    
  } catch (error) {
    console.error('면 전환 중 오류:', error);
  }
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

const roomSizeDisplayStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#333',
  padding: '6px 12px',
  backgroundColor: '#f5f5f5',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

// 화살표 버튼 컨테이너 스타일
const arrowButtonsContainerStyle = computed<CSSProperties>(() => {
  if (!scaleInfo.value) return {};
  const { blueRect } = scaleInfo.value;
  return {
    position: 'absolute' as const,
    // 상단 쪽으로 올리기 (파란 박스 위에서 조금 아래)
    top: `${blueRect.y + 40}px`,
    left: `${blueRect.x}px`,
    width: `${blueRect.width}px`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    zIndex: 100,
    pointerEvents: 'none', // 컨테이너는 이벤트 통과
  };
});

// 화살표 버튼 스타일
const arrowButtonStyle = (): CSSProperties => {
  return {
    pointerEvents: 'auto', // 실제 버튼에서만 클릭 가능
    width: '40px',
    height: '40px',
    border: '2px solid #007AFF',
    borderRadius: '50%',
    backgroundColor: '#fff',
    color: '#007AFF',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };
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

const getPillarStyleMenuItemStyle = (style: 'RS' | 'CS' | 'DU') => ({
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
  width: '1100px', // 사이드바 추가로 너비 증가
  height: '700px', // 고정 높이 설정
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
  padding: '24px',
  flex: 1,
  overflowY: 'auto' as const,
  minHeight: '400px', // 고정 높이로 모든 카테고리에서 동일한 모달 크기 유지
};

const categoryTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '12px',
};

const shelfGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
  minHeight: '450px', // 그리드 최소 높이로 선반 카테고리와 동일한 높이 유지
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
  marginBottom: '8px',
};

const shelfCardPriceStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  marginTop: '4px',
};

const emptyCategoryMessageStyle = {
  gridColumn: '1 / -1', // 그리드 전체 너비 사용
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '450px', // 선반 카테고리 그리드와 동일한 높이
  textAlign: 'center' as const,
  color: '#999',
  fontSize: '16px',
};

// 좌우 분할 레이아웃 스타일
const modalContentWrapperStyle = {
  display: 'flex',
  flexDirection: 'row' as const,
  flex: 1,
  overflow: 'hidden',
};

const categorySidebarStyle = {
  width: '220px',
  padding: '24px',
  borderRight: '1px solid #e0e0e0',
  backgroundColor: '#fafafa',
  overflowY: 'auto' as const,
};

const categoryListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const categoryIconStyle = {
  fontSize: '8px',
  marginRight: '8px',
  display: 'inline-block',
};

const mainContentStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};


const modalApplyButtonStyle = {
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

const handlePillarStyleMenuItemEnter = (style: 'RS' | 'CS' | 'DU', e: MouseEvent) => {
  if (selectedPillarStyle.value !== style) {
    (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
  }
};

const handlePillarStyleMenuItemLeave = (style: 'RS' | 'CS' | 'DU', e: MouseEvent) => {
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

// 카테고리 항목 스타일 동적 생성
const getCategoryItemStyle = (category: 'all' | 'shelf' | 'furniture' | 'item') => {
  const isActive = productPurchaseModal.value?.category === category;
  return {
    padding: '10px 12px',
    backgroundColor: isActive ? '#007AFF' : 'transparent',
    color: isActive ? '#fff' : '#333',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  };
};

// 상품 적용 핸들러
const handleProductApply = () => {
  // 현재는 선반 선택 시 바로 적용되므로 모달만 닫기
  // 추후 선택된 상품을 저장하고 적용하는 로직 추가 가능
  productPurchaseModal.value = null;
};

// 적용 버튼 호버 핸들러
const handleModalApplyButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0056b3';
};

const handleModalApplyButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007AFF';
};
</script>

