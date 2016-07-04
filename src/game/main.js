import core from 'engine/core';
import Scene from 'engine/scene';
import PIXI from 'engine/pixi';
import loader from 'engine/loader';

import 'game/loading';

loader.addAsset('KenPixel.fnt');

PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

class Main extends Scene {
  constructor() {
    super();

    this
      .createLayer('worldLayer')
        .createLayer('actLayer', 'worldLayer')
        .createLayer('fxLayer', 'worldLayer')
      .createLayer('uiLayer');

    const text = new PIXI.extras.BitmapText('It Works!', {
      font: '16px KenPixel',
    }).addTo(this.uiLayer);
    text.position
      .set(core.width * 0.5, core.height * 0.5)
      .subtract(text.width * 0.5, text.height * 0.5);
  }
};
core.addScene('Main', Main);

core.start();
