// furniture.ts: 바닥 가구 선택/배치용 타입 정의
import { FurnitureProduct } from '../../../types';
import { FaceId } from './roomShape';

// 화면에서 선택된 가구 (카탈로그 동일 구조)
export type ActiveFurniture = FurnitureProduct | null;

// 면에 실제로 배치된 가구 정보
export interface PlacedFurniture extends FurnitureProduct {
  id: number;       // 인스턴스 ID
  faceKey: FaceId;  // 배치된 면
  xMm: number;      // 바닥 기준 x 좌표 (mm)
  yMm: number;      // 바닥 기준 y 좌표 (mm, 기본 0)
}
