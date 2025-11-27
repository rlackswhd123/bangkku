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
        v-if="canNavigateLeft"
        @click="handleFaceRotate('left')"
        :style="arrowButtonStyle('left')"
        title="이전 면으로 이동"
      >
        ←
      </button>
      <button
        v-if="canNavigateRight"
        @click="handleFaceRotate('right')"
        :style="arrowButtonStyle('right')"
        title="다음 면으로 이동"
      >
        →
      </button>
    </div>

    <!-- 선반 추가 모달 -->
    <ShelfAddModal
      :is-open="!!shelfAddModal"
      :section-width="shelfAddModal?.sectionWidth || 0"
      :products="shelfProducts"
      :get-product-image="getProductImage"
      @close="shelfAddModal = null"
      @select="handleShelfSelectFromAddModal"
    />

    <!-- 상품 구매 모달 -->
    <ProductPurchaseModal
      :is-open="!!productPurchaseModal"
      :show-rect-preview="showRectPreview"
      :available-rects-count="availableRects.filter(r => r.isValid).length"
      :furniture-products="furnitureProducts"
      :available-rects="availableRects"
      @close="productPurchaseModal = null"
      @apply="handleProductApply"
      @toggle-rect-preview="showRectPreview = !showRectPreview"
      @select-furniture="handleFurnitureSelectFromModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties, type Ref, onMounted } from 'vue';
import { Pillar, Shelf, Section, DragState, PILLAR_SHELF_CONSTRAINTS, ScaleInfo } from '../types';
import { mmToPxX, mmToPxY, pxToMmX, pxToMmY, snapToGrid } from '../utils/coordinates';
import { useImageAssets } from '../modules/roomCanvas/hooks/useImageAssets';
import { useRoomCanvasRenderer, useCursorUpdater } from '../modules/roomCanvas/hooks/useRoomCanvasRenderer';
import {
  calculateShelfButtonPositions,
  calculateSectionDeleteButtonPositions,
  calculateItemAddButtonPositions,
} from '../modules/roomCanvas/canvas/drawers/buttons';
import { createPillarPositionValidator, createShelfPositionValidator } from '../modules/roomCanvas/interactions/constraints';
import { useRoomStore } from '../modules/roomCanvas/store';
import { FaceId, getNavigableFaces, getPhysicalAdjacentFace } from '../modules/roomCanvas/models/roomShape';
import productsData from '../data/products.json';
import { calculateAvailableRects, type AvailableRect } from '../modules/roomCanvas/utils/rectCalculator';
import ShelfAddModal from './modals/ShelfAddModal.vue';
import ProductPurchaseModal from './modals/ProductPurchaseModal.vue';

const emit = defineEmits<{
  scaleChange: [scaleInfo: ScaleInfo];
  objectSelect: [type: 'pillar' | 'shelf' | null, key: number | null];
  showToast: [message: string];
  sectionDeleteRequest: [sectionKey: number, shelvesCount: number];
  pillarMoveRequest: [pillarKey: number, totalShelvesCount: number];
  sectionDeleted: []; // 섹션 삭제 완료 이벤트
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

// 상품 목록 데이터 (Shelf 타입 사용)
const shelfProducts = ref<Shelf[]>([]);

// 컴포넌트 마운트 시 상품 데이터 로드
onMounted(() => {
  shelfProducts.value = productsData.shelves as Shelf[];
  console.log('로드된 상품 개수:', shelfProducts.value.length);
});

// 상품 구매 모달에서는 선반 제외

// 가구 상품 목록 데이터 (임시로 빈 배열, 나중에 데이터 추가)
const furnitureProducts = ref<Array<{ prodKey: number; name: string; widthMm: number; heightMm: number; price?: number }>>([]);

// Rect 리스트 계산 (미리보기 켜져있거나 가구 카테고리 열릴 때 계산)
const availableRects = computed<AvailableRect[]>(() => {
  // 미리보기가 켜져있거나 상품 구매 모달이 열려있을 때만 계산
  if (!showRectPreview.value && !productPurchaseModal.value) {
    return [];
  }
  
  if (!scaleInfo.value || activeFaceSections.value.length === 0) {
    return [];
  }
  
  // 기본 가구 높이 (임시값, 나중에 실제 가구 높이로 변경)
  const defaultFurnitureHeightMm = 500; // 예시: 500mm
  
  const rects = calculateAvailableRects(
    activeFaceSections.value,
    activeFacePillars.value,
    activeFaceShelves.value,
    roomState.value.roomHeightMm,
    store.settings.value,
    scaleInfo.value,
    defaultFurnitureHeightMm,
    [] // 기존 가구 목록 (나중에 추가)
  );
  
  // 디버깅용 로그
  if (showRectPreview.value) {
    console.log('📐 Available Rects:', rects);
    console.log('📐 Valid Rects:', rects.filter(r => r.isValid).length);
  }
  
  return rects;
});

// 가구 필터링은 ProductPurchaseModal 컴포넌트 내부에서 처리됨

// Rect 미리보기 표시 여부
const showRectPreview = ref(false);

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
  availableRects,
  showRectPreview,
});

// 화살표 표시 여부 계산
const canNavigateLeft = computed(() => {
  const currentFaceId = store.activeFaceId.value;
  const roomShape = store.roomShape.value;
  const navigableFaces = getNavigableFaces(roomShape, currentFaceId);
  const leftAdjacentFaceId = getPhysicalAdjacentFace(currentFaceId, 'left');
  return navigableFaces.includes(leftAdjacentFaceId);
});

const canNavigateRight = computed(() => {
  const currentFaceId = store.activeFaceId.value;
  const roomShape = store.roomShape.value;
  const navigableFaces = getNavigableFaces(roomShape, currentFaceId);
  const rightAdjacentFaceId = getPhysicalAdjacentFace(currentFaceId, 'right');
  return navigableFaces.includes(rightAdjacentFaceId);
});

useCursorUpdater(canvasRef, scaleInfo, activeFacePillars, activeFaceShelves, activeFaceSections);

const validatePillarPosition = computed(() => createPillarPositionValidator(roomState.value));
const validateShelfPosition = computed(() => createShelfPositionValidator(activeFacePillars.value));

/**
 * 특정 기둥을 공유하는 섹션들을 찾습니다.
 */
const getSectionsWithPillar = (pillarKey: number): Section[] => {
  return activeFaceSections.value.filter(
    (s) => s.startPillarKey === pillarKey || s.endPillarKey === pillarKey
  );
};

/**
 * 특정 기둥을 공유하는 섹션들에 선반이 있는지 확인합니다.
 */
const hasShelvesInSectionsWithPillar = (pillarKey: number): boolean => {
  const sectionsWithPillar = getSectionsWithPillar(pillarKey);
  return sectionsWithPillar.some((s) => s.shelves.length > 0);
};

/**
 * 특정 기둥을 공유하는 섹션들의 총 선반 개수를 계산합니다.
 */
const getTotalShelvesCountInSectionsWithPillar = (pillarKey: number): number => {
  const sectionsWithPillar = getSectionsWithPillar(pillarKey);
  return sectionsWithPillar.reduce((sum, s) => sum + s.shelves.length, 0);
};

// 선반 추가 모달 상태
const shelfAddModal = ref<{
  show: boolean;
  sectionKey: number;
  sectionWidth: number; // 섹션 폭 (선반 필터링용)
  startPillarKey: number;
  endPillarKey: number;
  x: number;
  y: number;
} | null>(null);

// 상품 구매 모달 상태
const productPurchaseModal = ref<{
  show: boolean;
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

  if (shelfAddModal.value) {
    shelfAddModal.value = null;
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
          console.log('🗑️ 섹션 삭제 시작:', button.sectionKey);
          store.removeSection(button.sectionKey);
          // 섹션 삭제 후 스냅샷 캡처 (Vue의 nextTick과 추가 대기로 렌더링 완료 보장)
          setTimeout(async () => {
            console.log('📸 섹션 삭제 후 스냅샷 캡처 시작');
            await captureCurrentFaceSnapshot();
            emit('sectionDeleted');
          }, 100); // 50ms에서 100ms로 증가
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
        // 섹션 폭 계산 (선반 필터링용)
        const section = sections.find((s) => s.sectionKey === button.sectionKey);
        const sectionWidth = section?.x || 0;
        
        // 선반 추가 모달 열기
        shelfAddModal.value = {
          show: true,
          sectionKey: button.sectionKey,
          sectionWidth, // 섹션 폭 추가
          startPillarKey: button.startPillarKey,
          endPillarKey: button.endPillarKey,
          x: button.x,
          y: button.y,
        };
        return;
      }
    }
  }

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
        // 섹션 폭 계산 (선반/소품 필터링용)
        const section = sections.find((s) => s.sectionKey === button.sectionKey);
        const sectionWidth = section?.x || 0;

        // 선반/소품 추가 모달 열기 (ShelfAddModal 재사용)
        shelfAddModal.value = {
          show: true,
          sectionKey: button.sectionKey,
          sectionWidth,
          startPillarKey: section?.startPillarKey ?? 0,
          endPillarKey: section?.endPillarKey ?? 0,
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
      // 기둥을 공유하는 두 섹션에 선반이 있는지 확인
      if (hasShelvesInSectionsWithPillar(pillar.pillarKey)) {
        const totalShelvesCount = getTotalShelvesCountInSectionsWithPillar(pillar.pillarKey);
        emit('pillarMoveRequest', pillar.pillarKey, totalShelvesCount);
        return;
      }
      
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

    // 코너장 로직 제거: 기둥은 정면 벽(빨간 박스) 범위 밖으로 나갈 수 없음
    const minXMm = 0;
    const maxXMm = roomState.value.roomWidthMm;
    const clampedXMm = Math.max(minXMm, Math.min(maxXMm, snappedXMm));

    const constrainedXMm = validatePillarPosition.value(
      dragState.value.targetKey,
      clampedXMm,
      activeFacePillars.value
    );

    // 기둥 위치 업데이트
    const updatedPillars = activeFacePillars.value.map((p) =>
      p.pillarKey === dragState.value.targetKey ? { ...p, x: constrainedXMm } : p
    );
    store.setActiveFacePillars(updatedPillars);

    // 섹션 폭 재계산: 이동한 기둥과 연결된 섹션들 업데이트
    const updatedSections = activeFaceSections.value.map((section) => {
      const startPillar = updatedPillars.find((p) => p.pillarKey === section.startPillarKey);
      const endPillar = updatedPillars.find((p) => p.pillarKey === section.endPillarKey);
      
      if (startPillar && endPillar) {
        return {
          ...section,
          x: endPillar.x - startPillar.x, // 섹션 폭 재계산
        };
      }
      return section;
    });
    store.setActiveFaceSections(updatedSections);
    
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
 * 드래그 종료 시 위치를 스냅합니다.
 */
const handleMouseUp = () => {
  if (dragState.value.type === 'pillar' && dragState.value.targetKey != null && scaleInfo.value) {
    const draggedPillar = activeFacePillars.value.find((p) => p.pillarKey === dragState.value.targetKey);
    if (draggedPillar) {
      const clampedXMm = Math.max(0, Math.min(roomState.value.roomWidthMm, draggedPillar.x));
      const settings = store.settings.value;
      const snappedXMm = snapToGrid(clampedXMm, settings.gridSizeMm);
      const constrainedXMm = validatePillarPosition.value(dragState.value.targetKey, snappedXMm, activeFacePillars.value);

      // 기둥 위치 업데이트 (정렬 포함)
      const updatedPillars = activeFacePillars.value
        .map((p) => (p.pillarKey === dragState.value.targetKey ? { ...p, x: constrainedXMm } : p))
        .sort((a, b) => a.x - b.x);
      store.setActiveFacePillars(updatedPillars);

      // 섹션 폭 재계산: 이동한 기둥과 연결된 섹션들 업데이트
      const updatedSections = activeFaceSections.value.map((section) => {
        const startPillar = updatedPillars.find((p) => p.pillarKey === section.startPillarKey);
        const endPillar = updatedPillars.find((p) => p.pillarKey === section.endPillarKey);
        
        if (startPillar && endPillar) {
          return {
            ...section,
            x: endPillar.x - startPillar.x, // 섹션 폭 재계산
          };
        }
        return section;
      });
      store.setActiveFaceSections(updatedSections);
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

// 상품 이미지 가져오기 헬퍼 함수
const getProductImage = (type: 'normal' | 'hanger' | 'drawer') => {
  const images = shelfImages.value;
  if (!images) return null;
  return images[type];
};

// JSON 데이터에서 선택한 상품으로 선반 생성
const handleFurnitureSelectFromModal = (product: { prodKey: number; name: string; widthMm: number; heightMm: number }) => {
  // 가구 선택 시 처리 (나중에 구현)
  console.log('가구 선택:', product);
  // TODO: 가구 배치 로직 구현
};

const handleShelfSelectFromAddModal = (product: Shelf) => {
  if (!shelfAddModal.value || !scaleInfo.value) return;

  const sectionKey = shelfAddModal.value.sectionKey;

  const section = activeFaceSections.value.find((s) => s.sectionKey === sectionKey);
  if (!section) {
    emit('showToast', '섹션 정보를 찾을 수 없습니다.');
    shelfAddModal.value = null;
    return;
  }

  // 해당 섹션의 선반만 사용 (최신 상태 보장)
  const samePairShelves: Shelf[] = section.shelves.filter(s => s.sectionKey === sectionKey);
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
    shelfAddModal.value = null;
    return;
  }

  const startPillar = activeFacePillars.value.find((p) => p.pillarKey === section.startPillarKey);
  const endPillar = activeFacePillars.value.find((p) => p.pillarKey === section.endPillarKey);
  if (!startPillar || !endPillar) {
    emit('showToast', '기둥 정보를 찾을 수 없습니다.');
    shelfAddModal.value = null;
    return;
  }
  const shelfLength = Math.abs(endPillar.x - startPillar.x);

  const newShelf: Shelf = {
    shelfKey: createTempKey(),
    prodKey: product.prodKey,
    sectionKey,
    type: product.type,
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
  
  shelfAddModal.value = null;
  emit('showToast', `${product.name} (${product.materialName}, ${product.x}mm)이(가) 추가되었습니다.`);
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
 * 현재 면의 스냅샷을 강제로 캡처합니다.
 * 섹션 삭제 등으로 면이 변경되었을 때 호출됩니다.
 */
const captureCurrentFaceSnapshot = async () => {
  console.log('📸 captureCurrentFaceSnapshot 호출됨');
  
  if (!canvasRef.value || !scaleInfo.value) {
    console.warn('⚠️ canvasRef 또는 scaleInfo가 없음');
    return;
  }

  try {
    const currentFaceId = store.activeFaceId.value;
    console.log('📍 현재 면 ID:', currentFaceId);
    
    // 최신 상태를 가져오기 위해 스토어에서 직접 조회
    const currentFace = store.getFaceState(currentFaceId);
    
    console.log('📊 현재 면 상태:', {
      pillars: currentFace.pillars.length,
      sections: currentFace.sections.length,
      totalShelves: currentFace.sections.reduce((sum, s) => sum + s.shelves.length, 0)
    });
    
    // 빈 면인지 확인 (기둥, 섹션, 선반이 모두 없으면 빈 면)
    const hasFurniture = currentFace.pillars.length > 0 || 
                        currentFace.sections.length > 0;
    
    // 빈 면은 스냅샷 제거 (투명 이미지로 대체)
    if (!hasFurniture) {
      console.log(`🚫 면 ${currentFaceId} 스냅샷 생략 (빈 면) - 기존 스냅샷 제거`);
      store.updateFaceSnapshot(currentFaceId, null as any);
      return;
    }

    const { calculateFaceContentHash } = await import('../modules/roomCanvas/models/roomFace');
    const { captureFaceSnapshot } = await import('../utils/snapshot');
    
    // 현재 면의 콘텐츠 해시 계산
    const currentHash = calculateFaceContentHash(currentFace);
    console.log('🔑 콘텐츠 해시:', currentHash);
    
    // 스냅샷 캡처
    console.log('📷 스냅샷 캡처 중...');
    const snapshot = await captureFaceSnapshot(
      canvasRef.value,
      renderCanvas,
      scaleInfo.value.redRect,
      currentFace.face_x,
      currentFace.face_y
    );
    
    // 스토어에 스냅샷 저장
    const snapshotData = {
      imageDataUrl: snapshot.imageDataUrl,
      imageElement: snapshot.imageElement,
      sourceFaceX: snapshot.sourceFaceX,
      sourceFaceY: snapshot.sourceFaceY,
      contentHash: currentHash,
    };
    
    // 현재 면의 스냅샷 업데이트
    store.updateFaceSnapshot(currentFaceId, snapshotData);
    
    console.log(`✅ 면 ${currentFaceId} 스냅샷 강제 캡처 완료`);
  } catch (error) {
    console.error('❌ 스냅샷 강제 캡처 실패:', error);
  }
};

/**
 * 화살표 버튼 클릭 핸들러 - 면 전환
 */
const handleFaceRotate = async (direction: 'left' | 'right') => {
  try {
    const currentFaceId = store.activeFaceId.value;
    const roomShape = store.roomShape.value;
    const navigableFaces = getNavigableFaces(roomShape, currentFaceId);

    // 물리적 인접 면 계산
    const adjacentFaceId = direction === 'left' 
      ? getPhysicalAdjacentFace(currentFaceId, 'left')
      : getPhysicalAdjacentFace(currentFaceId, 'right');

    // 이동 가능한 면인지 확인
    if (!navigableFaces.includes(adjacentFaceId)) {
      console.warn(`면 ${adjacentFaceId}로 이동할 수 없습니다.`);
      return;
    }

    const nextFaceId = adjacentFaceId;

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
  const { blueRect, redRect } = scaleInfo.value;

  // 화살표 버튼을 벽 높이(정면 빨간 박스 기준)의 세로 중앙에 위치시키기 위해
  // 컨테이너의 top 값을 redRect 중앙 기준으로 계산합니다.
  // 버튼 높이가 40px 이므로 중앙 정렬을 위해 20px 만큼 위로 보정합니다.
  const centerY = redRect.y + redRect.height / 2 - 20;

  return {
    position: 'absolute' as const,
    top: `${centerY}px`,
    left: `${blueRect.x}px`,
    width: `${blueRect.width}px`,
    height: '40px',
    zIndex: 100,
    pointerEvents: 'none', // 컨테이너는 이벤트 통과
  };
});

// 화살표 버튼 스타일
const arrowButtonStyle = (direction: 'left' | 'right'): CSSProperties => {
  if (!scaleInfo.value) return {};
  
  const buttonSize = 40;
  const padding = 20;
  
  // 왼쪽 화살표는 항상 왼쪽에, 오른쪽 화살표는 항상 오른쪽에 위치
  const leftPosition = direction === 'left' 
    ? `${padding}px` 
    : 'auto';
  const rightPosition = direction === 'right'
    ? `${padding}px`
    : 'auto';
  
  return {
    position: 'absolute' as const,
    left: leftPosition,
    right: rightPosition,
    pointerEvents: 'auto', // 실제 버튼에서만 클릭 가능
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
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

// 상품 적용 핸들러
const handleProductApply = () => {
  productPurchaseModal.value = null;
};

// 상품 구매 모달 열기 (외부에서 호출)
const openProductPurchaseModal = () => {
  productPurchaseModal.value = {
    show: true,
  };
};

// 컴포넌트 메서드를 외부에 노출
defineExpose({
  captureCurrentFaceSnapshot,
  openProductPurchaseModal,
});
</script>

