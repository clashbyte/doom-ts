import { Mat4 } from 'gl-matrix';
import { Camera } from '@/core/rendering/base/Camera.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';

export class GLCamera extends Camera<GLRenderer> {
  protected makeProjectionMatrix(target: Mat4, aspect: number, near: number, far: number): void {
    Mat4.perspectiveNO(target, 0.7, aspect, near, far);
  }
}
