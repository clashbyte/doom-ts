import { Vec2 } from 'gl-matrix';
import { getCanvas } from '@/core/Context.ts';

/**
 * Input handling
 */
export class Controls {
  /**
   * List of all pressed keys
   * @type {{[p: string]: boolean}}
   * @private
   */
  private static keysDown: { [key: string]: boolean } = {};

  /**
   * List of all just-hit keys
   * @private
   */
  private static keysHit: { [key: string]: boolean } = {};

  /**
   * List of mouse buttons
   * @private
   */
  private static readonly mouseKeysDown: boolean[] = [];

  /**
   * List of just-hit mouse buttons
   * @private
   */
  private static readonly mouseKeysHit: boolean[] = [];

  /**
   * Mouse position
   * @private
   */
  private static mousePosition: Vec2 = Vec2.fromValues(0, 0);

  private static mouseSpeed: Vec2 = Vec2.fromValues(0, 0);

  private static mouseLookActive: boolean = false;

  /**
   * Mouse position in UI
   * @type {vec2}
   * @private
   */
  private static readonly mouseUIPosition: Vec2 = Vec2.fromValues(0, 0);

  /**
   * Get "movement" vector based on pressed keys
   * @returns {vec2}
   */
  public static getMovement(): Vec2 {
    let mx = 0;
    let my = 0;
    if (this.keysDown.KeyW || this.keysDown.ArrowUp) {
      my = -1;
    } else if (this.keysDown.KeyS || this.keysDown.ArrowDown) {
      my = 1;
    }
    if (this.keysDown.KeyD || this.keysDown.ArrowRight) {
      mx = 1;
    } else if (this.keysDown.KeyA || this.keysDown.ArrowLeft) {
      mx = -1;
    }

    return Vec2.fromValues(mx, my);
  }

  /**
   * Bind handlers on window and canvas
   * @param {HTMLCanvasElement} canvas
   */
  public static bind() {
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    // this.handleTouchStart = this.handleTouchStart.bind(this);
    // this.handleTouchMove = this.handleTouchMove.bind(this);
    // this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleLockChange = this.handleLockChange.bind(this);

    window.addEventListener('click', this.handleClick);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // window.addEventListener('touchstart', this.handleTouchStart);
    // window.addEventListener('touchmove', this.handleTouchMove);
    // window.addEventListener('touchend', this.handleTouchEnd);
    // window.addEventListener('touchcancel', this.handleTouchEnd);

    document.addEventListener('pointerlockchange', this.handleLockChange);
  }

  /**
   * Detach handlers
   */
  public static release() {
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    // window.removeEventListener('touchstart', this.handleTouchStart);
    // window.removeEventListener('touchmove', this.handleTouchMove);
    // window.removeEventListener('touchend', this.handleTouchEnd);
    // window.removeEventListener('touchcancel', this.handleTouchEnd);

    document.removeEventListener('pointerlockchange', this.handleLockChange);
  }

  /**
   * Reset key hit state
   */
  public static reset() {
    for (const n in this.keysHit) {
      if (n in this.keysHit) {
        this.keysHit[n] = false;
      }
    }
    for (let i = 0; i < this.mouseKeysHit.length; i++) {
      this.mouseKeysHit[i] = false;
    }
    Vec2.zero(this.mouseSpeed);
  }

  /**
   * Is key down
   * @param name
   */
  public static keyDown(name: string) {
    return this.keysDown[name];
  }

  /**
   * Is key just pressed
   * @param name
   */
  public static keyHit(name: string) {
    return this.keysHit[name];
  }

  /**
   * Is mouse button down
   * @param button
   */
  public static mouseDown(button: number = 0) {
    return this.mouseKeysDown[button];
  }

  /**
   * Is mouse button just pressed
   * @param button
   */
  public static mouseHit(button: number = 0) {
    return this.mouseKeysHit[button];
  }

  /**
   * Mouse coordinates
   */
  public static getMouse() {
    return Vec2.clone(this.mousePosition);
  }

  /**
   * Mouse speed
   */
  public static getMouseMovement() {
    return Vec2.clone(this.mouseSpeed);
  }

  /**
   * Mouse coordinates in UI projection
   */
  public static getUIMouse() {
    return Vec2.clone(this.mouseUIPosition);
  }

  /**
   * Mouse click handler
   * @private
   */
  private static handleClick() {
    if (!this.mouseLookActive) {
      getCanvas()
        .requestPointerLock({
          unadjustedMovement: true,
        })
        .then(() => {});
    }
  }

  /**
   * Keypress handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyDown(e: KeyboardEvent) {
    this.keysHit[e.code] = true;
    this.keysDown[e.code] = true;
  }

  /**
   * Key release handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyUp(e: KeyboardEvent) {
    this.keysDown[e.code] = false;
  }

  private static handleMouseDown(e: MouseEvent) {
    this.mouseKeysDown[e.button] = true;
    this.mouseKeysHit[e.button] = true;
  }

  private static handleMouseUp(e: MouseEvent) {
    this.mouseKeysDown[e.button] = false;
  }

  /**
   * Mouse move event handler
   * @param {MouseEvent} ev
   * @private
   */
  private static handleMouseMove(ev: MouseEvent) {
    this.mousePosition[0] = ev.clientX;
    this.mousePosition[1] = ev.clientY;

    if (this.mouseLookActive) {
      this.mouseSpeed[0] = ev.movementX;
      this.mouseSpeed[1] = ev.movementY;
    }

    // this.mouseUIPosition[0] = (ev.clientX / window.innerHeight) * UI_PROJ_HEIGHT;
    // this.mouseUIPosition[1] = (ev.clientY / window.innerHeight) * UI_PROJ_HEIGHT;
  }

  private static handleLockChange() {
    this.mouseLookActive = document.pointerLockElement === getCanvas();
  }
}
