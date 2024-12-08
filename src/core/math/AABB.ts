import { Vec2 } from 'gl-matrix';

export class AABB {
  public constructor(
    public center: Vec2,
    public size: Vec2,
  ) {}

  public containsPoint(point: Vec2) {
    return !(
      point[0] < this.center[0] - this.size[0] ||
      point[1] < this.center[1] - this.size[1] ||
      point[0] > this.center[0] + this.size[0] ||
      point[1] > this.center[1] + this.size[1]
    );
  }
}
