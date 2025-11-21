// validation.ts: 방 크기 입력을 제약 범위 안으로 검증하는 헬퍼
import { ROOM_CONSTRAINTS } from '../types';

/**
 * 방 폭 유효성 검증
 */
export function validateRoomWidth(width: number): {
  isValid: boolean;
  message?: string;
} {
  if (isNaN(width) || width <= 0) {
    return {
      isValid: false,
      message: '양의 숫자를 입력해주세요.',
    };
  }
  
  if (width < ROOM_CONSTRAINTS.MIN_WIDTH_MM) {
    return {
      isValid: false,
      message: `최소 폭은 ${ROOM_CONSTRAINTS.MIN_WIDTH_MM}mm입니다.`,
    };
  }
  
  if (width > ROOM_CONSTRAINTS.MAX_WIDTH_MM) {
    return {
      isValid: false,
      message: `최대 폭은 ${ROOM_CONSTRAINTS.MAX_WIDTH_MM}mm입니다.`,
    };
  }
  
  return { isValid: true };
}

/**
 * 방 높이 유효성 검증
 */
export function validateRoomHeight(height: number): {
  isValid: boolean;
  message?: string;
} {
  if (isNaN(height) || height <= 0) {
    return {
      isValid: false,
      message: '양의 숫자를 입력해주세요.',
    };
  }
  
  if (height < ROOM_CONSTRAINTS.MIN_HEIGHT_MM) {
    return {
      isValid: false,
      message: `최소 높이는 ${ROOM_CONSTRAINTS.MIN_HEIGHT_MM}mm입니다.`,
    };
  }
  
  if (height > ROOM_CONSTRAINTS.MAX_HEIGHT_MM) {
    return {
      isValid: false,
      message: `최대 높이는 ${ROOM_CONSTRAINTS.MAX_HEIGHT_MM}mm입니다.`,
    };
  }
  
  return { isValid: true };
}

