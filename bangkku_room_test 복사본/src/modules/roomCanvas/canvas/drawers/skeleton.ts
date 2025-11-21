import { RoomState, ScaleInfo } from '../../../../types';

export function drawSkeletonRoom(
  ctx: CanvasRenderingContext2D,
  scaleInfo: ScaleInfo,
  room: RoomState
) {
  const { blueRect, redRect } = scaleInfo;

  ctx.strokeStyle = '#0000FF';
  ctx.lineWidth = 2;
  ctx.strokeRect(blueRect.x, blueRect.y, blueRect.width, blueRect.height);

  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;

  const offset = 0.5;
  const x = Math.round(redRect.x) + offset;
  const y = Math.round(redRect.y) + offset;
  const width = Math.round(redRect.width);
  const height = Math.round(redRect.height);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(blueRect.x, blueRect.y);
  ctx.lineTo(redRect.x, redRect.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(blueRect.x + blueRect.width, blueRect.y);
  ctx.lineTo(redRect.x + redRect.width, redRect.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(blueRect.x + blueRect.width, blueRect.y + blueRect.height);
  ctx.lineTo(redRect.x + redRect.width, redRect.y + redRect.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(blueRect.x, blueRect.y + blueRect.height);
  ctx.lineTo(redRect.x, redRect.y + redRect.height);
  ctx.stroke();

  const roomWidthM = (room.roomWidthMm / 1000).toFixed(1);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${roomWidthM} M`, blueRect.x + blueRect.width / 2, blueRect.y - 10);
}

