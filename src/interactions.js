import { svg, palette } from './dom.js';
import { state, selectNode, isSnapToGrid } from './state.js';
import {
  createNode,
  createEdge,
  getNodeById,
  deleteNode
} from './model.js';
import { render } from './render.js';
import { clientToSvgPoint, snapPointToGrid } from './utils.js';
import { SVG_NS } from './constants.js';

let selectionStart = null;
let selectionRectEl = null;
const SELECTION_DRAG_THRESHOLD = 3;

export function initInteractions() {
  initPaletteDrag();
  initCanvasDnD();
  initMouse();
  initKeyboard();
}

/* ---------- PALETTE DRAG & DROP (CREATE NODES) ---------- */

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
      ? snapPointToGrid(pt.x, pt.y)   // gridhez igazítjuk
      : pt;

    createNode(type, pos.x, pos.y);
    render();
  });
}


/* ---------- MOUSE (DRAG / RESIZE / CONNECT / SELECT BOX) ---------- */

function initMouse() {
  svg.addEventListener('mousedown', onSvgMouseDown);
  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

function onSvgMouseDown(e) {
  // Empty canvas → start selection box
  if (e.target === svg) {
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    selectionStart = pt;

    state.selectedNodeId = null;
    state.selectedNodeIds = [];

    if (!selectionRectEl) {
      selectionRectEl = document.createElementNS(SVG_NS, 'rect');
      selectionRectEl.classList.add('selection-rect');
    }
    selectionRectEl.setAttribute('x', pt.x);
    selectionRectEl.setAttribute('y', pt.y);
    selectionRectEl.setAttribute('width', 0);
    selectionRectEl.setAttribute('height', 0);
    if (!selectionRectEl.parentNode) {
      svg.appendChild(selectionRectEl);
    }
    return;
  }

  const target = e.target;

  if (target.classList.contains('resize-handle')) {
    startResizing(e, target);
    return;
  }

  if (target.classList.contains('port')) {
    startConnecting(e, target);
    return;
  }

  const nodeGroup = target.closest('.node');
  if (nodeGroup) {
    startDragging(e, nodeGroup);
  }
}

function onDocumentMouseMove(e) {
  const pt = clientToSvgPoint(e.clientX, e.clientY);

  // selection box drag
  if (selectionStart) {
    const dx = pt.x - selectionStart.x;
    const dy = pt.y - selectionStart.y;
    const x = dx < 0 ? pt.x : selectionStart.x;
    const y = dy < 0 ? pt.y : selectionStart.y;
    const w = Math.abs(dx);
    const h = Math.abs(dy);

    selectionRectEl.setAttribute('x', x);
    selectionRectEl.setAttribute('y', y);
    selectionRectEl.setAttribute('width', w);
    selectionRectEl.setAttribute('height', h);
  }

  // dragging nodes (multi)
    if (state.dragging && state.dragging.nodes) {
    state.dragging.nodes.forEach(entry => {
        const node = getNodeById(entry.id);
        if (!node) return;

        let newX = pt.x - entry.offsetX;
        let newY = pt.y - entry.offsetY;

        if (isSnapToGrid()) {
        const snapped = snapPointToGrid(newX, newY);
        newX = snapped.x;
        newY = snapped.y;
        }

        node.x = newX;
        node.y = newY;
    });
    render();
}


  // resizing
  if (state.resizing) {
    const { nodeId, startWidth, startHeight, startMouseX, startMouseY } =
      state.resizing;
    const node = getNodeById(nodeId);
    if (node) {
      let dx2 = pt.x - startMouseX;
      let dy2 = pt.y - startMouseY;
      let w = Math.max(40, startWidth + dx2);
      let h = Math.max(30, startHeight + dy2);

      // (optional) snap resize
      if (isSnapToGrid()) {
        const snapped = snapPointToGrid(w, h);
        w = snapped.x;
        h = snapped.y;
      }

      node.width = w;
      node.height = h;
      render();
    }
  }

  // moving connection preview
  if (state.connecting && state.connecting.tempLine) {
    state.connecting.tempLine.setAttribute('x2', pt.x);
    state.connecting.tempLine.setAttribute('y2', pt.y);
  }
}

function onDocumentMouseUp(e) {
  const pt = clientToSvgPoint(e.clientX, e.clientY);

  // finish marquee selection
  if (selectionStart) {
    const dx = pt.x - selectionStart.x;
    const dy = pt.y - selectionStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= SELECTION_DRAG_THRESHOLD) {
      const x1 = Math.min(selectionStart.x, pt.x);
      const y1 = Math.min(selectionStart.y, pt.y);
      const x2 = Math.max(selectionStart.x, pt.x);
      const y2 = Math.max(selectionStart.y, pt.y);

      const selectedIds = [];
      state.nodes.forEach(node => {
        const nx1 = node.x;
        const ny1 = node.y;
        const nx2 = node.x + node.width;
        const ny2 = node.y + node.height;

        const intersects =
          nx1 < x2 && nx2 > x1 &&
          ny1 < y2 && ny2 > y1;

        if (intersects) selectedIds.push(node.id);
      });

      state.selectedNodeIds = selectedIds;
      state.selectedNodeId =
        selectedIds.length === 1 ? selectedIds[0] : null;
    } else {
      state.selectedNodeId = null;
      state.selectedNodeIds = [];
    }

    if (selectionRectEl && selectionRectEl.parentNode) {
      selectionRectEl.parentNode.removeChild(selectionRectEl);
    }
    selectionStart = null;
    render();
  }

  // finish connection
  if (state.connecting) {
    const { fromNodeId, fromPort } = state.connecting;

    let portEl =
      (e.target && e.target.closest && e.target.closest('.port')) || null;
    if (!portEl) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      portEl = el && el.closest('.port');
    }

    if (portEl) {
      const toNodeId = portEl.dataset.nodeId;
      const toPort = portEl.dataset.port;
      createEdge(fromNodeId, fromPort, toNodeId, toPort);
      render();
    }

    if (state.connecting.tempLine && state.connecting.tempLine.parentNode) {
      state.connecting.tempLine.parentNode.removeChild(
        state.connecting.tempLine
      );
    }
    state.connecting = null;
  }

  state.dragging = null;
  state.resizing = null;
}

/* ---------- HELPERS ---------- */

function startDragging(e, nodeGroup) {
  e.stopPropagation();
  const clickedId = nodeGroup.dataset.id;
  const clickedNode = getNodeById(clickedId);
  if (!clickedNode) return;

  const pt = clientToSvgPoint(e.clientX, e.clientY);

  if (!state.selectedNodeIds.includes(clickedId)) {
    selectNode(clickedId);
  }

  const nodesToDrag = state.selectedNodeIds.length
    ? state.selectedNodeIds
    : [clickedId];

  state.dragging = {
    nodes: nodesToDrag.map(id => {
      const n = getNodeById(id);
      return {
        id,
        offsetX: pt.x - n.x,
        offsetY: pt.y - n.y
      };
    })
  };

  render();
}

function startResizing(e, handle) {
  e.stopPropagation();
  const nodeId = handle.dataset.nodeId;
  const node = getNodeById(nodeId);
  if (!node) return;

  const pt = clientToSvgPoint(e.clientX, e.clientY);
  state.resizing = {
    nodeId,
    startWidth: node.width,
    startHeight: node.height,
    startMouseX: pt.x,
    startMouseY: pt.y
  };
}

function startConnecting(e, port) {
  e.stopPropagation();
  const nodeId = port.dataset.nodeId;
  const portName = port.dataset.port;

  const x = parseFloat(port.getAttribute('cx'));
  const y = parseFloat(port.getAttribute('cy'));

  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add('temp-edge-line');
  line.setAttribute('x1', x);
  line.setAttribute('y1', y);
  line.setAttribute('x2', x);
  line.setAttribute('y2', y);
  svg.appendChild(line);

  state.connecting = {
    fromNodeId: nodeId,
    fromPort: portName,
    tempLine: line
  };
}

/* ---------- KEYBOARD (DELETE / BACKSPACE) ---------- */

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids =
        state.selectedNodeIds && state.selectedNodeIds.length
          ? Array.from(new Set(state.selectedNodeIds))
          : state.selectedNodeId
          ? [state.selectedNodeId]
          : [];

      if (ids.length) {
        ids.forEach(id => deleteNode(id));
        state.selectedNodeId = null;
        state.selectedNodeIds = [];
        render();
      }

      e.preventDefault();
    }
  });
}
