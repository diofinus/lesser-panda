const Vector = require('engine/Vector');
const Sprite = require('./Sprite');
const tempPoint = new Vector();
const CanvasBuffer = require('../renderers/canvas/utils/CanvasBuffer');
const CanvasTinter = require('../renderers/canvas/utils/CanvasTinter');
const TextureUvs = require('../textures/TextureUvs');
const AbstractFilter = require('../renderers/webgl/filters/AbstractFilter');

/**
 * A tiling sprite is a fast way of rendering a tiling image
 *
 * @class
 * @extends Sprite
 * @param texture {Texture} the texture of the tiling sprite
 * @param width {number}  the width of the tiling sprite
 * @param height {number} the height of the tiling sprite
 */
class TilingSprite extends Sprite {
  constructor(texture, width, height) {
    super(texture);

    /**
     * The scaling of the image that is being tiled
     *
     * @member {Vector}
     */
    this.tileScale = new Vector(1,1);


    /**
     * The offset position of the image that is being tiled
     *
     * @member {Vector}
     */
    this.tilePosition = new Vector(0,0);

    // /// private

    /**
     * The with of the tiling sprite
     *
     * @member {number}
     * @private
     */
    this._width = width || 100;

    /**
     * The height of the tiling sprite
     *
     * @member {number}
     * @private
     */
    this._height = height || 100;

    /**
     * An internal WebGL UV cache.
     *
     * @member {TextureUvs}
     * @private
     */
    this._uvs = new TextureUvs();

    this._canvasPattern = null;

    // TODO move..
    this.shader = new AbstractFilter(
      [
        'precision lowp float;',
        'attribute vec2 aVertexPosition;',
        'attribute vec2 aTextureCoord;',
        'attribute vec4 aColor;',

        'uniform mat3 projectionMatrix;',

        'uniform vec4 uFrame;',
        'uniform vec4 uTransform;',

        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',

        'void main(void){',
        '   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',

        '   vec2 coord = aTextureCoord;',
        '   coord -= uTransform.xy;',
        '   coord /= uTransform.zw;',
        '   vTextureCoord = coord;',

        '   vColor = vec4(aColor.rgb * aColor.a, aColor.a);',
        '}',
      ].join('\n'),
      [
        'precision lowp float;',

        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',

        'uniform sampler2D uSampler;',
        'uniform vec4 uFrame;',
        'uniform vec2 uPixelSize;',

        'void main(void){',

        '   vec2 coord = mod(vTextureCoord, uFrame.zw);',
        '   coord = clamp(coord, uPixelSize, uFrame.zw - uPixelSize);',
        '   coord += uFrame.xy;',

        '   gl_FragColor =  texture2D(uSampler, coord) * vColor ;',
        '}',
      ].join('\n'),

      // set the uniforms
      {
        uFrame: { type: '4fv', value: [0,0,1,1] },
        uTransform: { type: '4fv', value: [0,0,1,1] },
        uPixelSize : { type : '2fv', value: [1, 1] },
      }
      );
  }

  _onTextureUpdate() {
    return;
  }

  /**
   * Renders the object using the WebGL renderer
   *
   * @param renderer {WebGLRenderer}
   * @private
   */
  _renderWebGL(renderer) {
      // tweak our texture temporarily..
    var texture = this._texture;

    if (!texture || !texture._uvs) {
      return;
    }

    var tempUvs = texture._uvs,
      tempWidth = texture._frame.width,
      tempHeight = texture._frame.height,
      tw = texture.baseTexture.width,
      th = texture.baseTexture.height;

    texture._uvs = this._uvs;
    texture._frame.width = this.width;
    texture._frame.height = this.height;

    this.shader.uniforms.uPixelSize.value[0] = 1.0 / tw;
    this.shader.uniforms.uPixelSize.value[1] = 1.0 / th;

    this.shader.uniforms.uFrame.value[0] = tempUvs.x0;
    this.shader.uniforms.uFrame.value[1] = tempUvs.y0;
    this.shader.uniforms.uFrame.value[2] = tempUvs.x1 - tempUvs.x0;
    this.shader.uniforms.uFrame.value[3] = tempUvs.y2 - tempUvs.y0;

    this.shader.uniforms.uTransform.value[0] = (this.tilePosition.x % (tempWidth * this.tileScale.x)) / this._width;
    this.shader.uniforms.uTransform.value[1] = (this.tilePosition.y % (tempHeight * this.tileScale.y)) / this._height;
    this.shader.uniforms.uTransform.value[2] = (tw / this._width) * this.tileScale.x;
    this.shader.uniforms.uTransform.value[3] = (th / this._height) * this.tileScale.y;

    renderer.setObjectRenderer(renderer.plugins.sprite);
    renderer.plugins.sprite.render(this);

    texture._uvs = tempUvs;
    texture._frame.width = tempWidth;
    texture._frame.height = tempHeight;
  }

  /**
   * Renders the object using the Canvas renderer
   *
   * @param renderer {CanvasRenderer} a reference to the canvas renderer
   * @private
   */
  _renderCanvas(renderer) {
    var texture = this._texture;

    if (!texture.baseTexture.hasLoaded) {
      return;
    }

    var context = renderer.context,
      transform = this.worldTransform,
      resolution = renderer.resolution,
      baseTexture = texture.baseTexture,
      modX = (this.tilePosition.x / this.tileScale.x) % texture._frame.width,
      modY = (this.tilePosition.y / this.tileScale.y) % texture._frame.height;

      // create a nice shiny pattern!
      // TODO this needs to be refreshed if texture changes..
    if (!this._canvasPattern) {
          // cut an object from a spritesheet..
      var tempCanvas = new CanvasBuffer(texture._frame.width * resolution, texture._frame.height * resolution);

          // Tint the tiling sprite
      if (this.tint !== 0xFFFFFF) {
        if (this.cachedTint !== this.tint) {
          this.cachedTint = this.tint;

          this.tintedTexture = CanvasTinter.getTintedTexture(this, this.tint);
        }
        tempCanvas.context.drawImage(this.tintedTexture, 0, 0);
      }
      else {
        tempCanvas.context.drawImage(baseTexture.source, -texture._frame.x * resolution, -texture._frame.y * resolution);
      }
      this._canvasPattern = tempCanvas.context.createPattern(tempCanvas.canvas, 'repeat');
    }

      // set context state..
    context.globalAlpha = this.worldAlpha;
    context.setTransform(transform.a * resolution,
                         transform.b * resolution,
                         transform.c * resolution,
                         transform.d * resolution,
                         transform.tx * resolution,
                         transform.ty * resolution);

      // TODO - this should be rolled into the setTransform above..
    context.scale(this.tileScale.x / resolution, this.tileScale.y / resolution);

    context.translate(modX + (this.anchor.x * -this._width),
                        modY + (this.anchor.y * -this._height));

      // check blend mode
    var compositeOperation = renderer.blendModes[this.blendMode];
    if (compositeOperation !== renderer.context.globalCompositeOperation) {
      context.globalCompositeOperation = compositeOperation;
    }

      // fill the pattern!
    context.fillStyle = this._canvasPattern;
    context.fillRect(-modX,
                       -modY,
                       this._width * resolution / this.tileScale.x,
                       this._height * resolution / this.tileScale.y);


      // TODO - pretty sure this can be deleted...
      // context.translate(-this.tilePosition.x + (this.anchor.x * this._width), -this.tilePosition.y + (this.anchor.y * this._height));
      // context.scale(1 / this.tileScale.x, 1 / this.tileScale.y);
  }


  /**
   * Returns the framing rectangle of the sprite as a Rectangle object
  *
   * @return {Rectangle} the framing rectangle
   */
  getBounds() {
    var width = this._width;
    var height = this._height;

    var w0 = width * (1 - this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1 - this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.b;
    var c = worldTransform.c;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 = a * w1 + c * h0 + tx;
    var y4 = d * h0 + b * w1 + ty;

    var minX,
      maxX,
      minY,
      maxY;

    minX = x1;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

      // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
  }

  /**
   * Checks if a point is inside this tiling sprite
   * @param point {Vector} the point to check
   */
  containsPoint(point) {
    this.worldTransform.applyInverse(point, tempPoint);

    var width = this._width;
    var height = this._height;
    var x1 = -width * this.anchor.x;
    var y1;

    if (tempPoint.x > x1 && tempPoint.x < x1 + width) {
      y1 = -height * this.anchor.y;

      if (tempPoint.y > y1 && tempPoint.y < y1 + height) {
        return true;
      }
    }

    return false;
  }

  /**
   * Destroys this tiling sprite
   *
   */
  destroy() {
    super.destroy();

    this.tileScale = null;
    this._tileScaleOffset = null;
    this.tilePosition = null;

    this._uvs = null;
  }
}

Object.defineProperties(TilingSprite.prototype, {
    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof extras.TilingSprite#
     */
  width: {
    get: function() {
      return this._width;
    },
    set: function(value) {
      this._width = value;
    },
  },

    /**
     * The height of the TilingSprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof extras.TilingSprite#
     */
  height: {
    get: function() {
      return this._height;
    },
    set: function(value) {
      this._height = value;
    },
  },
});

module.exports = TilingSprite;
