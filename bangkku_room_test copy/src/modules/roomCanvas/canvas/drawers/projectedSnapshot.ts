// projectedSnapshot.ts: 투영된 스냅샷 이미지를 사다리꼴로 그리는 함수
import { Quadrilateral } from '../../../../types';
import { ProjectedSnapshot } from '../../models/roomFace';

/**
 * 사다리꼴 영역에 이미지를 투영하여 그리기 (세로 스트립 분할 방식)
 * @param ctx - Canvas 2D context
 * @param image - 그릴 이미지 객체
 * @param quad - 목표 사다리꼴 영역 (4개 꼭짓점)
 * @param strips - 분할할 스트립 개수 (기본 50개, 많을수록 정확하지만 느림)
 */
export function drawImageToQuadrilateral(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  quad: Quadrilateral,
  strips: number = 100
): void {
  const { topLeft, topRight, bottomRight, bottomLeft } = quad;

  // 이미지가 로드되지 않았으면 스킵
  if (!image.complete || image.naturalWidth === 0) {
    return;
  }

  ctx.save();

  // 각 세로 스트립을 그리기
  for (let i = 0; i < strips; i++) {
    const t0 = i / strips;       // 현재 스트립의 시작 비율
    const t1 = (i + 1) / strips; // 현재 스트립의 끝 비율

    // 소스 이미지에서 잘라낼 영역 (세로 스트립)
    const srcX = image.width * t0;
    const srcW = image.width * (t1 - t0);

    // 목표 사다리꼴의 왼쪽/오른쪽 엣지를 선형 보간
    // 왼쪽 엣지 (t0 위치): topLeft -> bottomLeft 로 세로 방향 보간
    const leftTop = {
      x: topLeft.x + (topRight.x - topLeft.x) * t0,
      y: topLeft.y + (topRight.y - topLeft.y) * t0,
    };
    const leftBottom = {
      x: bottomLeft.x + (bottomRight.x - bottomLeft.x) * t0,
      y: bottomLeft.y + (bottomRight.y - bottomLeft.y) * t0,
    };

    // 오른쪽 엣지 (t1 위치): topRight -> bottomRight 로 세로 방향 보간
    const rightTop = {
      x: topLeft.x + (topRight.x - topLeft.x) * t1,
      y: topLeft.y + (topRight.y - topLeft.y) * t1,
    };
    const rightBottom = {
      x: bottomLeft.x + (bottomRight.x - bottomLeft.x) * t1,
      y: bottomLeft.y + (bottomRight.y - bottomLeft.y) * t1,
    };

    // 현재 스트립의 4개 꼭짓점
    const stripQuad = {
      topLeft: leftTop,
      topRight: rightTop,
      bottomRight: rightBottom,
      bottomLeft: leftBottom,
    };

    // 사다리꼴 스트립을 평행사변형으로 근사하여 그리기
    drawImageStrip(ctx, image, srcX, 0, srcW, image.height, stripQuad);
  }

  ctx.restore();
}

/**
 * 단일 스트립을 평행사변형으로 그리기 (Canvas transform 사용)
 */
function drawImageStrip(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  quad: Quadrilateral
): void {
  const { topLeft, topRight, bottomLeft } = quad;

  ctx.save();

  // 평행사변형 변환 행렬 계산
  // 소스: (0, 0) -> (1, 0) -> (1, 1) -> (0, 1)
  // 목표: topLeft -> topRight -> bottomRight -> bottomLeft

  const x0 = topLeft.x;
  const y0 = topLeft.y;
  const x1 = topRight.x;
  const y1 = topRight.y;
  const x2 = bottomLeft.x;
  const y2 = bottomLeft.y;

  // transform(a, b, c, d, e, f)
  // a: 수평 스케일링
  // b: 수평 기울임
  // c: 수직 기울임
  // d: 수직 스케일링
  // e: 수평 이동
  // f: 수직 이동

  const a = x1 - x0; // 가로 방향 벡터
  const b = y1 - y0;
  const c = x2 - x0; // 세로 방향 벡터
  const d = y2 - y0;
  const e = x0;      // 시작 위치
  const f = y0;

  ctx.transform(a, b, c, d, e, f);

  // 변환된 좌표계에서 (0, 0) ~ (1, 1) 영역에 이미지 그리기
  ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, 1, 1);

  ctx.restore();
}

/**
 * 투영된 스냅샷을 렌더링 (고수준 함수)
 * @param ctx - Canvas 2D context
 * @param snapshot - 투영할 스냅샷 정보
 * @param targetQuad - 목표 사다리꼴 영역
 */
export function drawProjectedSnapshot(
  ctx: CanvasRenderingContext2D,
  snapshot: ProjectedSnapshot,
  targetQuad: Quadrilateral
): void {
  // 이미지가 로드되어 있으면 바로 그리기
  if (snapshot.imageElement && snapshot.imageElement.complete) {
    drawImageToQuadrilateral(ctx, snapshot.imageElement, targetQuad, 100);
    return;
  }

  // 이미지가 로드되지 않았으면 로딩 시작
  if (!snapshot.imageElement) {
    const img = new Image();
    img.onload = () => {
      // 로딩 완료 후 재렌더링 필요 (외부에서 watch로 처리)
      console.log('스냅샷 이미지 로드 완료');
    };
    img.onerror = () => {
      console.error('스냅샷 이미지 로드 실패:', snapshot.imageDataUrl);
    };
    img.src = snapshot.imageDataUrl;
    
    // 로딩 중이므로 이번 프레임에서는 스킵
    return;
  }
}

