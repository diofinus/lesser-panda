export default {
  /**
   * Logic size of the game
   */
  width: 320,
  height: 200,

  /**
   * Logic update FPS
   * @type {Number}
   * @default 30
   */
  desiredFPS: 60,
  /**
   * How many RAFs to skip before each rendering?
   *
   * Note: This setting does not affect update frequency!
   *
   * @type {Number}
   * @default 0
   */
  skipFrame: 0,

  /**
   * How does the game resize?
   * available values:
   *  + letter-box    Scale with CSS and align to the center
   *  + crop          Resize the canvas to size of window
   *  + scale-inner   Resize the canvas and scale `container` of scene to show more
   *  + scale-outer   Resize the canvas and scale `container` of scene to show less
   *  + dom           Resize the canvas to its DOM size
   *  + never         Never resize
   */
  resizeMode: 'letter-box',

  /**
   * Whether pause the game (timer and scene)
   * when page is hidden
   */
  pauseOnHide: false,

  renderer: {
    webGL: true,
    /**
     * The resolution of the renderer, used for hi-resolution
     * textures and better text rendering.
     *
     * You only need higher resolutions while using hi-res
     * textures(i.e. image@2x.png), or better Text renderering.
     * Higher resolution means larger Canvas, which may cause
     * performance issues, especially on mobile devices.
     *
     * The value can be numbers, which will be directly used
     *   by the renderer
     * Or an object with some fields:
     *   - retina {Boolean} Whether take retina into account
     *   - values {Array}   Available resolutions
     * @type {Number|Object}
     */
    resolution: {
      retina: true,
      values: [1, 2],
    },
  },

  storage: {
    id: 'lpanda',
  },

  physics: {
    /**
     * Collision solver, available settings:
     * - AABB   Fast but only Box and Circle shapes are supported
     * - SAT    Powerful SAT based, provide Polygon and rotation support
     * @default AABB
     */
    solver: 'SAT',
  },
};
