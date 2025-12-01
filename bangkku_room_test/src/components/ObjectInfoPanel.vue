<!-- ObjectInfoPanel.vue: 선택된 기둥/선반의 정보를 표시하고 삭제를 지원 -->
<template>
  <div :style="styles.panel">
    <!-- 헤더 -->
    <div :style="styles.header">
      <h2 :style="styles.title">상품 정보</h2>
      <button v-if="hasSelection" :style="styles.closeButton" @click="onClose">×</button>
    </div>

    <!-- 이미지 영역 -->
    <div :style="styles.imageArea">
      <div v-if="isPillar" :style="styles.pillarImage">
        <div :style="styles.pillarBar" />
      </div>
      <div v-if="isShelf && shelf" :style="styles.shelfImage">
        <img
          v-if="shelfImage"
          :src="shelfImage"
          :alt="`${shelf?.type || 'normal'} 선반`"
          :style="styles.shelfImageElement"
        />
        <div v-else :style="styles.shelfBar" />
      </div>
      <div v-if="!hasSelection" :style="styles.placeholderImage">
        <span :style="styles.placeholderIcon">ℹ️</span>
      </div>
    </div>

    <!-- 제품명 -->
    <div :style="styles.nameSection">
      <h3 :style="styles.name">
        {{
          isPillar
            ? '기둥 (Column)'
            : isShelf
              ? '선반 (Shelf)'
              : isFurniture
                ? (props.furniture?.name || '가구')
                : isAccessory
                  ? accessoryInfo?.name || '소품'
                  : '오브젝트를 선택하세요'
        }}
      </h3>
    </div>

    <!-- 설명 -->
    <div :style="styles.descriptionSection">
      <p :style="styles.description">
        {{
          isPillar
            ? '높이 조절이 가능한 시스템 행거 기둥입니다. 알루미늄 소재로 튼튼합니다.'
            : isShelf
              ? '시스템 선반입니다. 다양한 크기로 구성할 수 있습니다.'
              : isAccessory
                ? '선반 위에 놓인 소품입니다.'
                : '기둥 또는 선반을 클릭하면 상세 정보와 삭제 버튼이 표시됩니다.'
        }}
      </p>
    </div>

    <!-- ID -->
    <div v-if="hasSelection" :style="styles.idSection">
      <label :style="styles.idLabel">ID</label>
      <div :style="styles.idValue">{{ selectedKey }}</div>
    </div>

    <!-- 추가 정보 -->
    <div v-if="isPillar && pillar" :style="styles.infoSection">
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">위치:</span>
        <span :style="styles.infoValue">{{ Math.round(pillar.x) }}mm</span>
      </div>
    </div>

    <div v-if="isShelf && shelfInfo" :style="styles.infoSection">
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">길이:</span>
        <span :style="styles.infoValue">{{ shelfInfo.lengthMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">두께:</span>
        <span :style="styles.infoValue">{{ shelfInfo.thicknessMm }}mm</span>
      </div>
    </div>

    <div v-if="isFurniture && furnitureInfo" :style="styles.infoSection">
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">이름:</span>
        <span :style="styles.infoValue">{{ furnitureInfo.name }}</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">너비:</span>
        <span :style="styles.infoValue">{{ furnitureInfo.widthMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">높이:</span>
        <span :style="styles.infoValue">{{ furnitureInfo.heightMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">X 위치:</span>
        <span :style="styles.infoValue">{{ furnitureInfo.xMm }}mm</span>
      </div>
    </div>

    <div v-if="isAccessory && accessoryInfo" :style="styles.infoSection">
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">이름:</span>
        <span :style="styles.infoValue">{{ accessoryInfo.name }}</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">너비:</span>
        <span :style="styles.infoValue">{{ accessoryInfo.widthMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">높이:</span>
        <span :style="styles.infoValue">{{ accessoryInfo.heightMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">X 위치:</span>
        <span :style="styles.infoValue">{{ accessoryInfo.xMm }}mm</span>
      </div>
      <div :style="styles.infoItem">
        <span :style="styles.infoLabel">선반/섹션:</span>
        <span :style="styles.infoValue">{{ accessoryInfo.shelfKey }} / {{ accessoryInfo.sectionKey }}</span>
      </div>
    </div>

    <!-- 삭제 버튼 -->
    <div :style="styles.footer">
      <button
        :style="{
          ...styles.deleteButton,
          opacity: hasSelection ? 1 : 0.4,
          cursor: hasSelection ? 'pointer' : 'not-allowed',
        }"
        @click="hasSelection ? onDelete() : undefined"
        :disabled="!hasSelection"
      >
        <span :style="styles.deleteIcon">🗑️</span>
        <span>삭제하기</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pillar, Shelf } from '../types';
import { PlacedFurniture } from '../modules/roomCanvas/models/furniture';

interface Props {
  selectedType: 'pillar' | 'shelf' | 'furniture' | 'accessory' | null;
  selectedKey: number | null;
  pillar: Pillar | null;
  shelf: Shelf | null;
  furniture: PlacedFurniture | null;
  accessory?: { accessory: any; shelfKey: number; sectionKey: number } | null;
  pillars: readonly Pillar[];
  furnitures: readonly PlacedFurniture[];
  sections?: ReadonlyArray<{ sectionKey: number; startPillarKey: number; endPillarKey: number } & { shelves: Shelf[] }>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  delete: [];
}>();

const isPillar = computed(() => props.selectedType === 'pillar' && props.pillar);
const isShelf = computed(() => props.selectedType === 'shelf' && props.shelf);
const isFurniture = computed(() => props.selectedType === 'furniture' && props.furniture);
const isAccessory = computed(() => props.selectedType === 'accessory' && props.accessory);
const hasSelection = computed(
  () => !!props.selectedType && props.selectedKey != null && (isPillar.value || isShelf.value || isFurniture.value || isAccessory.value)
);

const shelfImage = computed(() => {
  if (!props.shelf) return null;
  return props.shelf.image ?? null;
});

const furnitureInfo = computed(() => {
  if (!isFurniture.value || !props.furniture) return null;
  return {
    name: props.furniture.name,
    widthMm: Math.round(props.furniture.widthMm),
    heightMm: Math.round(props.furniture.heightMm),
    xMm: Math.round(props.furniture.xMm),
  };
});

const accessoryInfo = computed(() => {
  if (!isAccessory.value || !props.accessory) return null;
  const acc = props.accessory.accessory;
  return {
    name: acc.name ?? '소품',
    widthMm: Math.round(acc.widthMm),
    heightMm: Math.round(acc.heightMm),
    xMm: Math.round(acc.xMm ?? 0),
    shelfKey: props.accessory.shelfKey,
    sectionKey: props.accessory.sectionKey,
  };
});

// 선반 정보 계산
const shelfInfo = computed(() => {
  if (!isShelf.value || !props.shelf) return null;
  if (props.shelf.sectionKey == null || !props.sections) {
    return {
      lengthMm: Math.round(props.shelf.x ?? 0),
      heightMm: Math.round(props.shelf.y),
    };
  }
  const section = props.sections.find((s) => s.sectionKey === props.shelf!.sectionKey);
  if (!section) return null;
  const startPillar = props.pillars.find((p) => p.pillarKey === section.startPillarKey);
  const endPillar = props.pillars.find((p) => p.pillarKey === section.endPillarKey);
  if (!startPillar || !endPillar) return null;

  const lengthMm = Math.round(endPillar.x - startPillar.x);
  return {
    lengthMm,
    heightMm: Math.round(props.shelf.y),
  };
  return null;
});

const onClose = () => {
  emit('close');
};

const onDelete = () => {
  emit('delete');
};

const styles: { [key: string]: Record<string, string> } = {
  panel: {
    width: '320px',
    height: '100%',
    backgroundColor: '#ffffff',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: '0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#999',
    cursor: 'pointer',
    padding: '0',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  },
  imageArea: {
    width: '100%',
    height: '200px',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  pillarImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarBar: {
    width: '60px',
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: '4px',
  },
  shelfImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfBar: {
    width: '80%',
    height: '40px',
    backgroundColor: '#CD853F',
    borderRadius: '4px',
  },
  shelfImageElement: {
    width: '80%',
    height: 'auto',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '48px',
  },
  placeholderIcon: {
    fontSize: '48px',
  },
  nameSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  name: {
    margin: '0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  descriptionSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  description: {
    margin: '0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
  idSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  idLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#999',
    marginBottom: '8px',
  },
  idValue: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    color: '#333',
    fontFamily: 'monospace',
  },
  infoSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    padding: '20px',
    marginTop: 'auto',
  },
  deleteButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#d32f2f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  },
  deleteIcon: {
    fontSize: '18px',
  },
};
</script>
