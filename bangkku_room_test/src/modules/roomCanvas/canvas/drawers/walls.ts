// walls.ts: 방의 정면/좌우 벽 이미지를 배경으로 렌더링합니다.
import { ScaleInfo } from '../../../../types';
import { WallImages } from '../../hooks/useImageAssets';
import { useRoomStore } from '../../store';

/**
 * 정면 벽 이미지를 빨간색 박스(redRect) 영역에 그립니다.
 * 이미지 비율과 무관하게 박스 크기에 맞춰 채웁니다.
 */
export function drawFrontWall(
  ctx: CanvasRenderingContext2D,
  scaleInfo: ScaleInfo,
  wallImages: WallImages
) {
  const { redRect } = scaleInfo;
  const frontImage = wallImages.front;

  if (!frontImage) return;

  const store = useRoomStore();
  const verticalPadding = store.settings.value.wallVerticalPaddingPx;
  const frontY = redRect.y - verticalPadding;
  const frontHeight = redRect.height + verticalPadding * 2;

  // 빨간색 박스 영역에 정확히 맞춰 그리기
  ctx.drawImage(
    frontImage,
    redRect.x,
    frontY,
    redRect.width,
    frontHeight
  );
}

/**
 * 왼쪽 벽 이미지를 파란색 박스(blueRect)의 왼쪽 영역에 그립니다.
 * 높이는 redRect와 동일하게 유지하고, 가로폭만 깊이에 따라 조절됩니다.
 */
export function drawLeftWall(
  ctx: CanvasRenderingContext2D,
  scaleInfo: ScaleInfo,
  wallImages: WallImages
) {
  const { blueRect, redRect } = scaleInfo;
  const leftImage = wallImages.left;

  if (!leftImage) return;

  // 왼쪽 벽의 너비는 파란색 박스 왼쪽 가장자리부터 빨간색 박스 왼쪽 가장자리까지
  const leftWallWidth = redRect.x - blueRect.x;

  const store = useRoomStore();
  const verticalPadding = store.settings.value.wallVerticalPaddingPx;
  const leftWallHeight = redRect.height + verticalPadding * 2;
  
  // 위치는 빨간색 박스의 y 좌표와 동일 (정렬)
  const leftWallX = blueRect.x;
  const leftWallY = redRect.y - verticalPadding;

  if (leftWallWidth <= 0) return;

  // 이미지를 왼쪽 영역에 맞춰 그리기 (비율 무시, 양옆으로 늘어남)
  ctx.drawImage(
    leftImage,
    leftWallX,
    leftWallY,
    leftWallWidth,
    leftWallHeight
  );
}

/**
 * 오른쪽 벽 이미지를 파란색 박스(blueRect)의 오른쪽 영역에 그립니다.
 * 높이는 redRect와 동일하게 유지하고, 가로폭만 깊이에 따라 조절됩니다.
 */
export function drawRightWall(
  ctx: CanvasRenderingContext2D,
  scaleInfo: ScaleInfo,
  wallImages: WallImages
) {
  const { blueRect, redRect } = scaleInfo;
  const rightImage = wallImages.right;

  if (!rightImage) return;

  // 오른쪽 벽의 너비는 빨간색 박스 오른쪽 가장자리부터 파란색 박스 오른쪽 가장자리까지
  const rightWallWidth = (blueRect.x + blueRect.width) - (redRect.x + redRect.width);

  const store = useRoomStore();
  const verticalPadding = store.settings.value.wallVerticalPaddingPx;
  const rightWallHeight = redRect.height + verticalPadding * 2;
  
  // 위치는 빨간색 박스의 오른쪽 가장자리부터 시작
  const rightWallX = redRect.x + redRect.width;
  const rightWallY = redRect.y - verticalPadding;

  if (rightWallWidth <= 0) return;

  // 이미지를 오른쪽 영역에 맞춰 그리기 (비율 무시, 양옆으로 늘어남)
  ctx.drawImage(
    rightImage,
    rightWallX,
    rightWallY,
    rightWallWidth,
    rightWallHeight
  );
}

