// snapshot.ts: 캔버스 스냅샷 캡처 유틸리티
import { WallRect } from '../types';
import { RenderOptions } from '../modules/roomCanvas/hooks/useRoomCanvasRenderer';

/**
 * 스냅샷 캡처 결과
 */
export interface SnapshotResult {
  imageDataUrl: string;      // Blob URL
  imageElement: HTMLImageElement; // 로드된 이미지 객체
  sourceFaceX: number;        // 캡처 시점의 면 폭 (mm)
  sourceFaceY: number;        // 캡처 시점의 면 높이 (mm)
}

/**
 * Canvas의 redRect 영역만 캡처하여 Blob URL로 반환
 * @param canvas - 캡처할 Canvas 요소
 * @param render - 렌더링 함수 (버튼 제외 렌더링용)
 * @param redRect - 캡처할 영역 (redRect)
 * @param sourceFaceX - 원본 면의 폭 (mm)
 * @param sourceFaceY - 원본 면의 높이 (mm)
 * @returns Blob URL과 원본 크기 정보
 */
export async function captureFaceSnapshot(
  canvas: HTMLCanvasElement,
  render: (options?: RenderOptions) => void,
  redRect: WallRect,
  sourceFaceX: number,
  sourceFaceY: number
): Promise<SnapshotResult> {
  // 1. 버튼 제외하고 재렌더링
  render({ excludeButtons: true, excludeSpacings: true });

  // 잠시 대기하여 렌더링 완료 보장
  await new Promise(resolve => setTimeout(resolve, 10));

  // 2. Canvas에서 redRect 영역만 추출
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context를 가져올 수 없습니다.');
  }

  const imageData = ctx.getImageData(
    Math.floor(redRect.x),
    Math.floor(redRect.y),
    Math.floor(redRect.width),
    Math.floor(redRect.height)
  );

  // 3. 새 Canvas에 복사
  const snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = Math.floor(redRect.width);
  snapshotCanvas.height = Math.floor(redRect.height);
  const snapshotCtx = snapshotCanvas.getContext('2d');
  
  if (!snapshotCtx) {
    throw new Error('Snapshot canvas context를 가져올 수 없습니다.');
  }

  snapshotCtx.putImageData(imageData, 0, 0);

  // 4. Blob으로 변환
  const blob = await new Promise<Blob>((resolve, reject) => {
    snapshotCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Blob 생성 실패'));
      }
    }, 'image/png');
  });

  // 5. Object URL 생성
  const imageDataUrl = URL.createObjectURL(blob);

  // 6. 이미지 객체 미리 로딩
  const imageElement = new Image();
  await new Promise<void>((resolve, reject) => {
    imageElement.onload = () => resolve();
    imageElement.onerror = () => reject(new Error('이미지 로딩 실패'));
    imageElement.src = imageDataUrl;
  });

  // 7. 원래대로 재렌더링 (버튼 포함)
  render({ excludeButtons: false });

  return {
    imageDataUrl,
    imageElement,
    sourceFaceX,
    sourceFaceY,
  };
}

/**
 * Blob URL 해제 (메모리 관리)
 */
export function releaseSnapshotUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Blob URL 해제 실패:', error);
  }
}

