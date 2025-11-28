<!-- ShelfAddModal.vue: 선반 추가 모달 컴포넌트 -->
<template>
  <Teleport to="body">
    <div v-if="isOpen">
      <!-- 모달 외부 배경 -->
      <div
        :style="modalOverlayStyle"
        @click="$emit('close')"
      />
      <!-- 모달 컨텍스트 -->
      <div
        :style="shelfTypeModalStyle"
        @click.stop
      >
        <!-- 모달 헤더 -->
        <div :style="modalHeaderStyle">
          <div :style="modalTitleStyle">선반 추가</div>
          <div :style="modalSubtitleStyle">추가할 선반이나 소품을 선택해주세요</div>
        </div>
        <!-- 좌우 분할 영역 (가구 구매 모달과 동일한 레이아웃) -->
        <div :style="modalContentWrapperStyle">
          <!-- 왼쪽 카테고리 사이드바 -->
          <div :style="categorySidebarStyle">
            <div :style="categoryTitleStyle">카테고리</div>
            <div :style="categoryListStyle">
              <div
                @click="currentCategory = 'shelf'"
                :style="getCategoryItemStyle('shelf')"
              >
                <span :style="categoryIconStyle">▶</span>
                선반
              </div>
              <div
                @click="currentCategory = 'item'"
                :style="getCategoryItemStyle('item')"
              >
                <span :style="categoryIconStyle">▶</span>
                소품
              </div>
            </div>
          </div>
          <!-- 오른쪽 메인 콘텐츠 영역 -->
          <div :style="mainContentStyle">
            <!-- 모달 본문 (스크롤 영역) -->
            <div :style="modalBodyStyle">
              <!-- 선반 카테고리 -->
              <div v-if="currentCategory === 'shelf'">
                <!-- 추천 섹션 (섹션 폭에 맞는 상품) -->
                <div v-if="filteredProducts.recommended.length > 0">
                  <div :style="shelfGridStyle">
                    <div
                      v-for="product in filteredProducts.recommended"
                      :key="product.prodKey"
                      @click="handleProductSelect(product)"
                      :style="shelfCardStyle"
                      @mouseenter="handleShelfCardHover"
                      @mouseleave="handleShelfCardLeave"
                    >
                      <div :style="shelfImageAreaStyle">
                        <img
                          v-if="product.image || getProductImage(product.type)"
                          :src="product.image || getProductImage(product.type)?.src"
                          :alt="product.name"
                          :style="shelfPreviewImageStyle"
                        />
                        <div v-else :style="shelfPreviewPlaceholderStyle" />
                      </div>
                      <div :style="shelfCardTitleStyle">{{ product.name }}</div>
                      <div :style="shelfCardSubtitleStyle">{{ product.materialName }}</div>
                      <div :style="shelfCardSizeStyle">{{ product.x }} × 20 × {{ product.z }} (mm)</div>
                      <div :style="shelfCardPriceStyle">{{ product.price?.toLocaleString() }} 원</div>
                    </div>
                  </div>
                </div>

                <!-- 기타 상품 섹션 (맞지 않는 크기) -->
                <div v-if="filteredProducts.others.length > 0" :style="{ marginTop: filteredProducts.recommended.length > 0 ? '32px' : '0' }">
                  <div v-if="filteredProducts.recommended.length > 0" :style="othersSectionTitleStyle">
                    기타 크기
                  </div>
                  <div :style="shelfGridStyle">
                    <div
                      v-for="product in filteredProducts.others"
                      :key="product.prodKey"
                      :style="getDisabledShelfCardStyle()"
                    >
                      <div :style="shelfImageAreaStyle">
                        <img
                          v-if="product.image || getProductImage(product.type)"
                          :src="product.image || getProductImage(product.type)?.src"
                          :alt="product.name"
                          :style="shelfPreviewImageStyle"
                        />
                        <div v-else :style="shelfPreviewPlaceholderStyle" />
                      </div>
                      <div :style="shelfCardTitleStyle">{{ product.name }}</div>
                      <div :style="shelfCardSubtitleStyle">{{ product.materialName }}</div>
                      <div :style="shelfCardSizeStyle">{{ product.x }} × 20 × {{ product.z }} (mm)</div>
                      <div :style="shelfCardPriceStyle">{{ product.price?.toLocaleString() }} 원</div>
                    </div>
                  </div>
                </div>

                <!-- 선반 상품이 없을 때 -->
                <div
                  v-if="filteredProducts.recommended.length === 0 && filteredProducts.others.length === 0"
                  :style="emptyCategoryMessageStyle"
                >
                  선반 상품이 없습니다.
                </div>
              </div>

              <!-- 소품 카테고리 -->
              <div v-if="currentCategory === 'item'">
                <div v-if="filteredAccessories.recommended.length > 0" :style="shelfGridStyle">
                  <div
                    v-for="product in filteredAccessories.recommended"
                    :key="product.prodKey"
                    @click="handleAccessorySelect(product)"
                    :style="shelfCardStyle"
                    @mouseenter="handleShelfCardHover"
                    @mouseleave="handleShelfCardLeave"
                  >
                    <div :style="shelfImageAreaStyle">
                      <img
                        v-if="product.image"
                        :src="product.image"
                        :alt="product.name"
                        :style="shelfPreviewImageStyle"
                      />
                      <div v-else :style="shelfPreviewPlaceholderStyle" />
                    </div>
                    <div :style="shelfCardTitleStyle">{{ product.name }}</div>
                    <div :style="shelfCardSizeStyle">{{ product.widthMm }} × {{ product.heightMm }} (mm)</div>
                    <div :style="shelfCardPriceStyle">{{ product.price?.toLocaleString() }} 원</div>
                  </div>
                </div>

                <div v-if="filteredAccessories.others.length > 0" :style="{ marginTop: filteredAccessories.recommended.length > 0 ? '32px' : '0' }">
                  <div v-if="filteredAccessories.recommended.length > 0" :style="othersSectionTitleStyle">
                    기타 크기
                  </div>
                  <div :style="shelfGridStyle">
                    <div
                      v-for="product in filteredAccessories.others"
                      :key="product.prodKey"
                      :style="getDisabledShelfCardStyle()"
                    >
                      <div :style="shelfImageAreaStyle">
                        <img
                          v-if="product.image"
                          :src="product.image"
                          :alt="product.name"
                          :style="shelfPreviewImageStyle"
                        />
                        <div v-else :style="shelfPreviewPlaceholderStyle" />
                      </div>
                      <div :style="shelfCardTitleStyle">{{ product.name }}</div>
                      <div :style="shelfCardSizeStyle">{{ product.widthMm }} × {{ product.heightMm }} (mm)</div>
                      <div :style="shelfCardPriceStyle">{{ product.price?.toLocaleString() }} 원</div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="filteredAccessories.recommended.length === 0 && filteredAccessories.others.length === 0"
                  :style="emptyCategoryMessageStyle"
                >
                  소품 상품이 없습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 모달 푸터 -->
        <div :style="modalFooterStyle">
          <button
            @click="$emit('close')"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Shelf, AccessoryProduct } from '../../types';

const props = defineProps<{
  isOpen: boolean;
  sectionWidth: number;
  products: Shelf[];
  accessories: AccessoryProduct[];
  accessoryRect?: { x: number; y: number; width: number; height: number } | null;
  defaultCategory?: 'shelf' | 'item';
  targetShelfKey?: number;
  getProductImage: (type: 'normal' | 'hanger' | 'drawer') => { src: string } | null;
}>();

const emit = defineEmits<{
  close: [];
  select: [product: Shelf];
  selectAccessory: [product: AccessoryProduct, targetShelfKey?: number];
}>();

// 카테고리 상태: 선반 / 소품
const currentCategory = ref<'shelf' | 'item'>(props.defaultCategory || 'shelf');

watch(
  () => props.defaultCategory,
  (val) => {
    if (val) {
      currentCategory.value = val;
    }
  }
);

// 선반 필터링: 추천(섹션 폭에 맞는) / 비추천 분리
const filteredProducts = computed(() => {
  if (!props.sectionWidth) {
    return {
      recommended: [],
      others: props.products,
    };
  }

  const recommended: Shelf[] = [];
  const others: Shelf[] = [];

  props.products.forEach((product) => {
    if (product.x === props.sectionWidth) {
      recommended.push(product);
    } else {
      others.push(product);
    }
  });

  return { recommended, others };
});

const handleProductSelect = (product: Shelf) => {
  emit('select', product);
};

const handleAccessorySelect = (product: AccessoryProduct) => {
  emit('selectAccessory', product, props.targetShelfKey);
};

// 소품 필터링: rect 안에 들어갈 수 있는지 여부로 분리
const filteredAccessories = computed(() => {
  if (!props.accessoryRect) {
    return {
      recommended: [],
      others: props.accessories,
    };
  }
  const { width, height } = props.accessoryRect;
  const recommended: AccessoryProduct[] = [];
  const others: AccessoryProduct[] = [];

  props.accessories.forEach((product) => {
    const fits = product.widthMm <= width && product.heightMm <= height;
    if (fits) {
      recommended.push(product);
    } else {
      others.push(product);
    }
  });

  return { recommended, others };
});

// 이벤트 핸들러
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

// 스타일 정의
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
  width: '1100px',
  height: '700px',
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

const categoryTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '12px',
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

const modalBodyStyle = {
  padding: '24px',
  flex: 1,
  overflowY: 'auto' as const,
  minHeight: '400px',
};

const shelfGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
  minHeight: '450px',
  alignItems: 'start',
  alignContent: 'start',
};

const shelfCardStyle = {
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: '#fff',
};

const getDisabledShelfCardStyle = () => ({
  ...shelfCardStyle,
  opacity: 0.5,
  filter: 'blur(1px) grayscale(20%)',
  cursor: 'not-allowed',
  pointerEvents: 'none' as const,
  backgroundColor: '#fafafa',
});

const othersSectionTitleStyle = {
  fontSize: '16px',
  fontWeight: '500',
  color: '#666',
  marginBottom: '16px',
};

const emptyCategoryMessageStyle = {
  gridColumn: '1 / -1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '450px',
  textAlign: 'center' as const,
  color: '#999',
  fontSize: '16px',
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

// 카테고리 항목 스타일 동적 생성 (가구 구매 모달과 동일한 UX)
const getCategoryItemStyle = (category: 'shelf' | 'item') => {
  const isActive = currentCategory.value === category;
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
</script>
