import { svg, palette } from '../dom.js';
import { isSnapToGrid, saveStateForUndo } from '../state.js';
import { createNode } from '../model.js';
import { render } from '../render.js';
import { clientToSvgPoint, snapPointToGrid } from '../utils.js';

// Palette drag & drop for creating new nodes on the canvas.

export function initPaletteInteractions() {
  initPaletteDrag();
  initCanvasDnD();
}

function initPaletteDrag() {
  palette.addEventListener('dragstart', e => {
    const target = e.target;
    if (!target.classList.contains('palette-item')) return;

    const type = target.dataset.nodeType;
    e.dataTransfer.setData('application/x-sdl-node-type', type);
  });
}

function initCanvasDnD() {
  svg.addEventListener('dragover', e => e.preventDefault());

  svg.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/x-sdl-node-type');
    if (!type) return;

    const pt = clientToSvgPoint(e.clientX, e.clientY);

    const pos = isSnapToGrid()
      ? snapPointToGrid(pt.x, pt.y) // snap to grid if enabled
      : pt;

    saveStateForUndo();
    createNode(type, pos.x, pos.y);
    render();
  });
}


