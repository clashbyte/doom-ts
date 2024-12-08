import { Vec2 } from 'gl-matrix';

const TEMP_VEC2 = Vec2.create();

export function projectPointOnLine(out: Vec2, point: Vec2, start: Vec2, end: Vec2) {
  const A = point[0] - start[0];
  const B = point[1] - start[1];
  const C = end[0] - start[0];
  const D = end[1] - start[1];

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    // in case of 0 length line
    param = dot / lenSq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = start[0];
    yy = start[1];
  } else if (param > 1) {
    xx = end[0];
    yy = end[1];
  } else {
    xx = start[0] + param * C;
    yy = start[1] + param * D;
  }

  Vec2.set(out, xx, yy);
}

export function linePointDistance(point: Vec2, start: Vec2, end: Vec2) {
  projectPointOnLine(TEMP_VEC2, point, start, end);

  return Vec2.distance(point, TEMP_VEC2);
}

export function linePointDistanceSquared(point: Vec2, start: Vec2, end: Vec2) {
  projectPointOnLine(TEMP_VEC2, point, start, end);

  return Vec2.squaredDistance(point, TEMP_VEC2);
}
