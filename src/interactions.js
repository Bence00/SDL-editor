import { initPaletteInteractions } from './interactions/palette.js';
import { initMouseInteractions } from './interactions/mouse.js';
import { initKeyboardInteractions } from './interactions/keyboard.js';
import { initLabelInteractions } from './interactions/labels.js';

// Public entry point used by main.js
export function initInteractions() {
  initPaletteInteractions();
  initMouseInteractions();
  initKeyboardInteractions();
  initLabelInteractions();
}
