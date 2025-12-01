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
 * 오프스크린 캔버스에 렌더링하여 스냅샷 캡처 (깜빡임 없음)
 * @param canvas - 원본 Canvas 요소 (크기 참조용)
 * @param render - 렌더링 함수
 * @param redRect - 캡처할 영역 (redRect)
 * @param sourceFaceX - 원본 면의 폭 (mm)
 * @param sourceFaceY - 원본 면의 높이 (mm)
 * @returns Blob URL과 원본 크기 정보
 */
export async function captureFaceSnapshot(
  canvas: HTMLCanvasElement,
  render: (options?: RenderOptions, targetCanvas?: HTMLCanvasElement) => void,
  redRect: WallRect,
  sourceFaceX: number,
  sourceFaceY: number
): Promise<SnapshotResult> {
  // 1. 오프스크린 캔버스 생성 (화면에 보이지 않음)
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;

  // 2. 오프스크린 캔버스에 투명 배경으로 렌더링 (화면 깜빡임 없음)
  render(
    { 
      excludeButtons: true, 
      excludeSpacings: true,
      excludeWalls: true,
      transparentBackground: true
    },
    offscreenCanvas
  );

  // 잠시 대기하여 렌더링 완료 보장
  await new Promise(resolve => setTimeout(resolve, 10));

  // 3. 오프스크린 캔버스에서 redRect 영역만 추출
  const offscreenCtx = offscreenCanvas.getContext('2d');
  if (!offscreenCtx) {
    throw new Error('Offscreen canvas context를 가져올 수 없습니다.');
  }

  const imageData = offscreenCtx.getImageData(
    Math.floor(redRect.x),
    Math.floor(redRect.y),
    Math.floor(redRect.width),
    Math.floor(redRect.height)
  );

  // 4. 최종 스냅샷 캔버스에 복사
  const snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = Math.floor(redRect.width);
  snapshotCanvas.height = Math.floor(redRect.height);
  const snapshotCtx = snapshotCanvas.getContext('2d');
  
  if (!snapshotCtx) {
    throw new Error('Snapshot canvas context를 가져올 수 없습니다.');
  }

  snapshotCtx.putImageData(imageData, 0, 0);

  // 5. 블러 효과 적용
  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = snapshotCanvas.width;
  blurredCanvas.height = snapshotCanvas.height;
  const blurredCtx = blurredCanvas.getContext('2d');

  if (!blurredCtx) {
    throw new Error('Blurred canvas context를 가져올 수 없습니다.');
  }

  // 블러 필터 적용 (2px = 살짝 흐린 효과)
  blurredCtx.filter = 'blur(3px)';
  blurredCtx.drawImage(snapshotCanvas, 0, 0);
  blurredCtx.filter = 'none'; // 필터 초기화

  // 6. Blob으로 변환 (블러 적용된 캔버스)
  const blob = await new Promise<Blob>((resolve, reject) => {
    blurredCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Blob 생성 실패'));
      }
    }, 'image/png');
  });

  // 7. Object URL 생성
  const imageDataUrl = URL.createObjectURL(blob);

  // 8. 이미지 객체 미리 로딩
  const imageElement = new Image();
  await new Promise<void>((resolve, reject) => {
    imageElement.onload = () => resolve();
    imageElement.onerror = () => reject(new Error('이미지 로딩 실패'));
    imageElement.src = imageDataUrl;
  });

  // 9. 화면 캔버스는 그대로 유지 (재렌더링 불필요)

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

