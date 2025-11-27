<!-- ProductPurchaseModal.vue: 상품 구매 모달 컴포넌트 -->
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
                @click="currentCategory = 'furniture'"
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
              <!-- 가구 카테고리 -->
              <div>
                <!-- Rect 미리보기 토글 -->
                <div :style="{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }">
                  <button
                    @click="$emit('toggleRectPreview')"
                    :style="{
                      padding: '8px 16px',
                      backgroundColor: showRectPreview ? '#4CAF50' : '#E0E0E0',
                      color: showRectPreview ? '#FFF' : '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }"
                  >
                    {{ showRectPreview ? 'Rect 미리보기 끄기' : 'Rect 미리보기 켜기' }}
                  </button>
                  <span :style="{ fontSize: '12px', color: '#666' }">
                    배치 가능 위치: {{ availableRectsCount }}개
                  </span>
                </div>
                
                <!-- 추천 섹션 (배치 가능한 가구) -->
                <div v-if="filteredFurnitureProducts.recommended.length > 0">
                  <div :style="shelfGridStyle">
                    <div
                      v-for="product in filteredFurnitureProducts.recommended"
                      :key="product.prodKey"
                      @click="$emit('selectFurniture', product)"
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
                      <div :style="shelfCardPriceStyle" v-if="product.price">{{ product.price?.toLocaleString() }} 원</div>
                    </div>
                  </div>
                </div>

                <!-- 기타 상품 섹션 (배치 불가능한 크기) -->
                <div v-if="filteredFurnitureProducts.others.length > 0" :style="{ marginTop: filteredFurnitureProducts.recommended.length > 0 ? '32px' : '0' }">
                  <div v-if="filteredFurnitureProducts.recommended.length > 0" :style="othersSectionTitleStyle">
                    기타 크기
                  </div>
                  <div :style="shelfGridStyle">
                    <div
                      v-for="product in filteredFurnitureProducts.others"
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
                      <div :style="shelfCardPriceStyle" v-if="product.price">{{ product.price?.toLocaleString() }} 원</div>
                    </div>
                  </div>
                </div>

                <!-- 가구가 없을 때 -->
                <div v-if="filteredFurnitureProducts.recommended.length === 0 && filteredFurnitureProducts.others.length === 0" :style="emptyCategoryMessageStyle">
                  가구 상품이 없습니다.
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
          <button
            @click="$emit('apply')"
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

type FurnitureProduct = {
  prodKey: number;
  name: string;
  widthMm: number;
  heightMm: number;
  price?: number;
  image?: string;
};

const props = defineProps<{
  isOpen: boolean;
  showRectPreview: boolean;
  availableRectsCount: number;
  furnitureProducts: FurnitureProduct[];
  availableRects: Array<{ width: number; height: number; isValid: boolean }>;
}>();

const emit = defineEmits<{
  close: [];
  apply: [];
  toggleRectPreview: [];
  selectFurniture: [product: FurnitureProduct];
}>();

const currentCategory = ref<'furniture'>('furniture');

// 가구 필터링: 추천(배치 가능) / 비추천 분리
const filteredFurnitureProducts = computed(() => {
  const validRects = props.availableRects.filter(r => r.isValid);
  
  if (validRects.length === 0 || props.furnitureProducts.length === 0) {
    return {
      recommended: [],
      others: props.furnitureProducts,
    };
  }
  
  const recommended: FurnitureProduct[] = [];
  const others: FurnitureProduct[] = [];
  
  props.furnitureProducts.forEach((product) => {
    // 현재 rect 공간에 "들어갈 수 있는지" 체크:
    // - rect.width  >= product.widthMm
    // - rect.height >= product.heightMm
    const canFitInSomeRect = validRects.some(
      rect => rect.width >= product.widthMm && rect.height >= product.heightMm
    );

    if (canFitInSomeRect) {
      recommended.push(product);
    } else {
      others.push(product);
    }
  });
  
  return { recommended, others };
});

// 카테고리 항목 스타일 동적 생성
const getCategoryItemStyle = (category: 'furniture') => {
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

const handleModalApplyButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0056b3';
};

const handleModalApplyButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007AFF';
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

const shelfPreviewPlaceholderStyle = {
  width: '70%',
  height: '18px',
  borderRadius: '999px',
  backgroundColor: '#d0d0d0',
};

const shelfPreviewImageStyle = {
  width: '90%',
  height: '100%',
  objectFit: 'contain' as const,
};

const shelfCardTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
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
  gridColumn: '1 / -1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '450px',
  textAlign: 'center' as const,
  color: '#999',
  fontSize: '16px',
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
</script>

