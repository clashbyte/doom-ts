import { Mat3, Mat4, Quat, Vec3 } from 'gl-matrix';
import { Renderer } from '@/core/rendering/base/Renderer.ts';

const TEMP_QUAT = Quat.create();

export abstract class Camera<TRenderer extends Renderer = Renderer> {
  protected readonly renderer: TRenderer;

  protected readonly localPosition: Vec3;

  protected readonly localRotation: Vec3;

  private localAspect: number;

  protected readonly spriteMatrix: Mat3;

  protected readonly projMatrix: Mat4;

  protected readonly cameraMatrix: Mat4;

  protected readonly viewMatrix: Mat4;

  protected matrixDirty: boolean;

  protected projectionMatrixDirty: boolean;

  public get matrices() {
    this.rebuildMatrices();
    this.rebuildProjectionMatrix();

    return {
      sprite: this.spriteMatrix,
      projection: this.projMatrix,
      view: this.viewMatrix,
      camera: this.cameraMatrix,
    };
  }

  public get aspect() {
    return this.localAspect;
  }

  public set aspect(value: number) {
    if (this.localAspect !== value) {
      this.localAspect = value;
      this.projectionMatrixDirty = true;
    }
  }

  public get position() {
    return Vec3.clone(this.localPosition);
  }

  public set position(value: Vec3) {
    if (!Vec3.exactEquals(value, this.localPosition)) {
      Vec3.copy(this.localPosition, value);
      this.matrixDirty = true;
    }
  }

  public get rotation() {
    return Vec3.clone(this.localRotation);
  }

  public set rotation(value: Vec3) {
    if (!Vec3.exactEquals(value, this.localRotation)) {
      Vec3.copy(this.localRotation, value);
      this.matrixDirty = true;
    }
  }

  protected constructor(renderer: TRenderer) {
    this.renderer = renderer;
    this.localPosition = Vec3.create();
    this.localRotation = Vec3.create();
    this.localAspect = 1;

    this.spriteMatrix = Mat3.create();
    this.projMatrix = Mat4.create();
    this.cameraMatrix = Mat4.create();
    this.viewMatrix = Mat4.create();
    this.matrixDirty = true;
    this.projectionMatrixDirty = true;
  }

  public updateMatrices() {
    this.rebuildMatrices();
    this.rebuildProjectionMatrix();
  }

  protected rebuildProjectionMatrix() {
    if (this.projectionMatrixDirty) {
      this.makeProjectionMatrix(this.projMatrix, this.localAspect, 0.1, 500);
      this.projectionMatrixDirty = false;

      return true;
    }

    return false;
  }

  protected rebuildMatrices() {
    if (this.matrixDirty) {
      Quat.identity(TEMP_QUAT);
      Quat.rotateY(TEMP_QUAT, TEMP_QUAT, this.localRotation[1]);
      Mat3.fromQuat(this.spriteMatrix, TEMP_QUAT);

      Quat.rotateX(TEMP_QUAT, TEMP_QUAT, this.localRotation[0]);
      Quat.rotateZ(TEMP_QUAT, TEMP_QUAT, this.localRotation[2]);

      Mat4.fromQuat(this.spriteMatrix, TEMP_QUAT);
      Mat4.fromRotationTranslation(this.cameraMatrix, TEMP_QUAT, this.localPosition);
      Mat4.invert(this.viewMatrix, this.cameraMatrix);

      this.matrixDirty = false;

      return true;
    }

    return false;
  }

  protected abstract makeProjectionMatrix(
    target: Mat4,
    aspect: number,
    near: number,
    far: number,
  ): void;
}
