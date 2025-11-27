<!-- GlobalSettingsModal.vue: 글로벌 설정 모달 (방 크기, 선반 간격 규칙, 입력 step) -->
<template>
  <Teleport to="body">
    <div v-if="isOpen" :style="overlayStyle" @click="handleClose">
      <div :style="modalStyle" @click.stop>
        <!-- 헤더 -->
        <div :style="headerStyle">
          <div :style="titleStyle">전역 설정</div>
          <div :style="subtitleStyle">방 크기 및 선반 간격 규칙을 설정합니다</div>
        </div>

        <!-- 본문 -->
        <div :style="bodyStyle">
          <!-- 방 크기 설정 섹션 -->
          <div :style="sectionStyle">
            <div :style="sectionTitleStyle">방 크기 설정</div>
            <div :style="sectionDescStyle">현재 활성 면의 크기를 변경합니다</div>
            
            <div :style="currentInfoStyle">
              <div :style="infoItemStyle">
                <span :style="infoLabelStyle">현재 폭:</span>
                <span :style="infoValueStyle">{{ currentDimensions.widthMm }}mm</span>
              </div>
              <div :style="infoItemStyle">
                <span :style="infoLabelStyle">현재 높이:</span>
                <span :style="infoValueStyle">{{ currentDimensions.heightMm }}mm</span>
              </div>
            </div>

            <div :style="roomSizeInputsRowStyle">
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">폭 (mm)</label>
                <input
                  type="number"
                  :value="localRoomWidth"
                  @input="(e) => localRoomWidth = Number((e.target as HTMLInputElement).value) || 0"
                  :style="inputStyle"
                  :min="ROOM_CONSTRAINTS.MIN_WIDTH_MM"
                  :max="ROOM_CONSTRAINTS.MAX_WIDTH_MM"
                  :step="store.settings.value.roomInputStepMm"
                />
                <span :style="hintStyle">
                  {{ ROOM_CONSTRAINTS.MIN_WIDTH_MM }} ~ {{ ROOM_CONSTRAINTS.MAX_WIDTH_MM }}mm
                </span>
              </div>

              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">높이 (mm)</label>
                <input
                  type="number"
                  :value="localRoomHeight"
                  @input="(e) => localRoomHeight = Number((e.target as HTMLInputElement).value) || 0"
                  :style="inputStyle"
                  :min="0"
                  :step="store.settings.value.roomInputStepMm"
                />
                <span :style="hintStyle">
                  높이를 입력하세요
                </span>
              </div>
            </div>
          </div>

          <!-- 선반 간격 규칙 설정 -->
          <div :style="sectionStyle">
            <div :style="sectionTitleStyle">선반 간격 규칙</div>
            <div :style="sectionDescStyle">선반 타입별 최소 간격을 설정합니다 (mm)</div>
            
            <div :style="shelfTypesRowStyle">
              <!-- 일반 선반 -->
              <div :style="spacingGroupStyle">
                <div :style="spacingLabelStyle">일반 선반</div>
                <div :style="spacingInputsVerticalStyle">
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">위쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.normal.above"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">아래쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.normal.below"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                </div>
              </div>

              <!-- 옷걸이 선반 -->
              <div :style="spacingGroupStyle">
                <div :style="spacingLabelStyle">옷걸이 선반</div>
                <div :style="spacingInputsVerticalStyle">
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">위쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.hanger.above"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">아래쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.hanger.below"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                </div>
              </div>

              <!-- 서랍 선반 -->
              <div :style="spacingGroupStyle">
                <div :style="spacingLabelStyle">서랍 선반</div>
                <div :style="spacingInputsVerticalStyle">
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">위쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.drawer.above"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                  <div :style="spacingInputGroupStyle">
                    <label :style="smallLabelStyle">아래쪽 간격</label>
                    <input
                      type="number"
                      v-model.number="localShelfSpacing.drawer.below"
                      :style="smallInputStyle"
                      :min="0"
                      :max="2000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 그리드 및 버튼 설정 -->
          <div :style="sectionStyle">
            <div :style="sectionTitleStyle">그리드 및 버튼 설정</div>
            <div :style="sectionDescStyle">그리드 크기와 버튼 위치를 설정합니다</div>
            
            <div :style="compactInputsRowStyle">
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">그리드 크기 (mm)</label>
                <input
                  type="number"
                  v-model.number="localGridSizeMm"
                  :style="inputStyle"
                  :min="10"
                  :max="500"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">기둥 버튼 오프셋 (mm)</label>
                <input
                  type="number"
                  v-model.number="localPillarButtonOffsetMm"
                  :style="inputStyle"
                  :min="100"
                  :max="2000"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">섹션 기본 폭 (mm)</label>
                <input
                  type="number"
                  v-model.number="localDefaultSectionWidthMm"
                  :style="inputStyle"
                  :min="200"
                  :max="2000"
                />
              </div>
            </div>

            <div :style="compactInputsRowStyle">
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">선반 버튼 기본 오프셋 (mm)</label>
                <input
                  type="number"
                  v-model.number="localShelfButtonDefaultOffsetMm"
                  :style="inputStyle"
                  :min="100"
                  :max="1000"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">선반 생성 오프셋 (mm)</label>
                <input
                  type="number"
                  v-model.number="localShelfCreateDefaultOffsetMm"
                  :style="inputStyle"
                  :min="100"
                  :max="1000"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">섹션 삭제 버튼 오프셋 (mm)</label>
                <input
                  type="number"
                  v-model.number="localSectionDeleteButtonOffsetMm"
                  :style="inputStyle"
                  :min="0"
                  :max="500"
                />
              </div>
            </div>

            <div :style="compactInputsRowStyle">
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">기둥 이동 허용 범위 (mm)</label>
                <input
                  type="number"
                  v-model.number="localMaxPillarOutsideMm"
                  :style="inputStyle"
                  :min="0"
                  :max="1000"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">벽 이미지 수직 패딩 (px)</label>
                <input
                  type="number"
                  v-model.number="localWallVerticalPaddingPx"
                  :style="inputStyle"
                  :min="0"
                  :max="500"
                />
              </div>
            </div>
          </div>

          <!-- 시각적 설정 -->
          <div :style="sectionStyle">
            <div :style="sectionTitleStyle">시각적 설정</div>
            <div :style="sectionDescStyle">화면 표시 및 색상 설정</div>
            
            <div :style="compactInputsRowStyle">
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">최소 시각적 폭 (mm)</label>
                <input
                  type="number"
                  v-model.number="localVisualWidthMin"
                  :style="inputStyle"
                  :min="1000"
                  :max="10000"
                />
              </div>
              <div :style="inputGroupStyle">
                <label :style="inputLabelStyle">최대 시각적 폭 (mm)</label>
                <input
                  type="number"
                  v-model.number="localVisualWidthMax"
                  :style="inputStyle"
                  :min="1000"
                  :max="10000"
                />
              </div>
            </div>
          </div>

          <!-- 에러 메시지 -->
          <div v-if="errorMessage" :style="errorStyle">{{ errorMessage }}</div>
        </div>

        <!-- 푸터 -->
        <div :style="footerStyle">
          <button
            @click="handleClose"
            :style="cancelButtonStyle"
            @mouseenter="handleCancelButtonHover"
            @mouseleave="handleCancelButtonLeave"
          >
            취소
          </button>
          <button
            @click="handleConfirm"
            :style="confirmButtonStyle"
            @mouseenter="handleConfirmButtonHover"
            @mouseleave="handleConfirmButtonLeave"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ROOM_CONSTRAINTS } from '../types';
import { validateRoomWidth } from '../utils/validation';
import { useRoomStore } from '../modules/roomCanvas/store';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const store = useRoomStore();

// 로컬 상태 (임시 저장)
const currentDimensions = ref({
  widthMm: store.activeFaceMetrics.value.face_x,
  heightMm: store.activeFaceMetrics.value.face_y,
});

const localRoomWidth = ref<number>(store.activeFaceMetrics.value.face_x);
const localRoomHeight = ref<number>(store.activeFaceMetrics.value.face_y);
const localShelfSpacing = ref({
  normal: { ...store.settings.value.shelfSpacingRules.normal },
  hanger: { ...store.settings.value.shelfSpacingRules.hanger },
  drawer: { ...store.settings.value.shelfSpacingRules.drawer },
});

const localGridSizeMm = ref(store.settings.value.gridSizeMm);
const localPillarButtonOffsetMm = ref(store.settings.value.pillarButtonOffsetMm);
const localDefaultSectionWidthMm = ref(store.settings.value.defaultSectionWidthMm);
const localShelfButtonDefaultOffsetMm = ref(store.settings.value.shelfButtonDefaultOffsetMm);
const localShelfCreateDefaultOffsetMm = ref(store.settings.value.shelfCreateDefaultOffsetMm);
const localSectionDeleteButtonOffsetMm = ref(store.settings.value.sectionDeleteButtonOffsetMm);
const localMaxPillarOutsideMm = ref(store.settings.value.maxPillarOutsideMm);
const localWallVerticalPaddingPx = ref(store.settings.value.wallVerticalPaddingPx);
const localVisualWidthMin = ref(store.settings.value.visualWidthConstraints.min);
const localVisualWidthMax = ref(store.settings.value.visualWidthConstraints.max);

const errorMessage = ref<string | null>(null);

// 모달이 열릴 때마다 현재 값으로 초기화
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentDimensions.value = {
      widthMm: store.activeFaceMetrics.value.face_x,
      heightMm: store.activeFaceMetrics.value.face_y,
    };
    localRoomWidth.value = store.activeFaceMetrics.value.face_x;
    localRoomHeight.value = store.activeFaceMetrics.value.face_y;
    localShelfSpacing.value = {
      normal: { ...store.settings.value.shelfSpacingRules.normal },
      hanger: { ...store.settings.value.shelfSpacingRules.hanger },
      drawer: { ...store.settings.value.shelfSpacingRules.drawer },
    };
    localGridSizeMm.value = store.settings.value.gridSizeMm;
    localPillarButtonOffsetMm.value = store.settings.value.pillarButtonOffsetMm;
    localDefaultSectionWidthMm.value = store.settings.value.defaultSectionWidthMm;
    localShelfButtonDefaultOffsetMm.value = store.settings.value.shelfButtonDefaultOffsetMm;
    localShelfCreateDefaultOffsetMm.value = store.settings.value.shelfCreateDefaultOffsetMm;
    localSectionDeleteButtonOffsetMm.value = store.settings.value.sectionDeleteButtonOffsetMm;
    localMaxPillarOutsideMm.value = store.settings.value.maxPillarOutsideMm;
    localWallVerticalPaddingPx.value = store.settings.value.wallVerticalPaddingPx;
    localVisualWidthMin.value = store.settings.value.visualWidthConstraints.min;
    localVisualWidthMax.value = store.settings.value.visualWidthConstraints.max;
    errorMessage.value = null;
  }
});

const handleClose = () => {
  emit('close');
};

const handleConfirm = () => {
  // 유효성 검증
  // 방 폭 검증
  if (isNaN(localRoomWidth.value) || localRoomWidth.value <= 0) {
    errorMessage.value = '방 폭은 양의 숫자를 입력해주세요.';
    return;
  }
  
  const widthValidation = validateRoomWidth(localRoomWidth.value);
  if (!widthValidation.isValid) {
    errorMessage.value = widthValidation.message || `방 폭은 ${ROOM_CONSTRAINTS.MIN_WIDTH_MM} ~ ${ROOM_CONSTRAINTS.MAX_WIDTH_MM}mm 사이여야 합니다.`;
    return;
  }

  // 방 높이 검증 (양수만 체크)
  if (isNaN(localRoomHeight.value) || localRoomHeight.value <= 0) {
    errorMessage.value = '방 높이는 양의 숫자를 입력해주세요.';
    return;
  }

  // 선반 간격 검증
  const spacingTypes = ['normal', 'hanger', 'drawer'] as const;
  for (const type of spacingTypes) {
    if (localShelfSpacing.value[type].above < 0 || localShelfSpacing.value[type].above > 2000) {
      errorMessage.value = `선반 간격은 0 ~ 2000mm 사이여야 합니다.`;
      return;
    }
    if (localShelfSpacing.value[type].below < 0 || localShelfSpacing.value[type].below > 2000) {
      errorMessage.value = `선반 간격은 0 ~ 2000mm 사이여야 합니다.`;
      return;
    }
  }

  // 스토어에 반영
  // 1. 방 크기 업데이트
  const widthValue = Math.round(localRoomWidth.value);
  const heightValue = Math.round(localRoomHeight.value);
  
  store.updateActiveFaceMetrics({
    face_x: widthValue,
    face_y: heightValue,
  });

  // 2. 글로벌 설정 업데이트
  store.updateGlobalSettings({
    shelfSpacingRules: localShelfSpacing.value,
    gridSizeMm: localGridSizeMm.value,
    pillarButtonOffsetMm: localPillarButtonOffsetMm.value,
    defaultSectionWidthMm: localDefaultSectionWidthMm.value,
    shelfButtonDefaultOffsetMm: localShelfButtonDefaultOffsetMm.value,
    shelfCreateDefaultOffsetMm: localShelfCreateDefaultOffsetMm.value,
    sectionDeleteButtonOffsetMm: localSectionDeleteButtonOffsetMm.value,
    maxPillarOutsideMm: localMaxPillarOutsideMm.value,
    wallVerticalPaddingPx: localWallVerticalPaddingPx.value,
    visualWidthConstraints: {
      min: localVisualWidthMin.value,
      max: localVisualWidthMax.value,
    },
  });

  errorMessage.value = null;
  emit('confirm');
  emit('close');
};

// Hover 핸들러
const handleCancelButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
};

const handleCancelButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
};

const handleConfirmButtonHover = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0056b3';
};

const handleConfirmButtonLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#007AFF';
};

// 스타일 정의
const overlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  width: '600px',
  maxHeight: '90vh',
  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};

const headerStyle = {
  padding: '24px 32px',
  borderBottom: '1px solid #e0e0e0',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '8px',
};

const subtitleStyle = {
  fontSize: '14px',
  color: '#666',
};

const bodyStyle = {
  padding: '24px 32px',
  flex: 1,
  overflowY: 'auto' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '32px',
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
};

const sectionTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#333',
};

const sectionDescStyle = {
  fontSize: '13px',
  color: '#999',
  marginTop: '-8px',
};

const currentInfoStyle = {
  display: 'flex',
  gap: '16px',
  padding: '12px 16px',
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
};

const infoItemStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
};

const infoLabelStyle = {
  fontSize: '13px',
  color: '#666',
};

const infoValueStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
};

const inputGroupStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const inputLabelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
};

const inputStyle = {
  padding: '10px 12px',
  fontSize: '14px',
  border: '2px solid #e0e0e0',
  borderRadius: '6px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const hintStyle = {
  fontSize: '12px',
  color: '#999',
};

const compactInputsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
};

const roomSizeInputsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
};

const shelfTypesRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
};

const spacingGroupStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  padding: '16px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
};

const spacingLabelStyle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#333',
};

const spacingInputsVerticalStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const spacingInputGroupStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const smallLabelStyle = {
  fontSize: '13px',
  color: '#666',
};

const smallInputStyle = {
  padding: '8px 10px',
  fontSize: '13px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  outline: 'none',
};

const errorStyle = {
  padding: '12px',
  fontSize: '14px',
  color: '#d32f2f',
  backgroundColor: '#ffebee',
  borderRadius: '6px',
  border: '1px solid #ef9a9a',
};

const footerStyle = {
  padding: '20px 32px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const cancelButtonStyle = {
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

const confirmButtonStyle = {
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

