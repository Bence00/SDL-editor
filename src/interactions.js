import { svg, palette } from './dom.js';
import { state, selectNode, isSnapToGrid, selectEdge } from './state.js';
import {
  createNode,
  createEdge,
  getNodeById,
  deleteNode
} from './model.js';
import { render } from './render.js';
import { clientToSvgPoint, snapPointToGrid } from './utils.js';
import { SVG_NS } from './constants.js';
import { getNodeLabel } from './nodeShapes.js';

let selectionStart = null;
let selectionRectEl = null;
const SELECTION_DRAG_THRESHOLD = 3;

export function initInteractions() {
  initPaletteDrag();
  initCanvasDnD();
  initMouse();
  initKeyboard();
  initLabelEditing();
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
      ? snapPointToGrid(pt.x, pt.y) // snap to grid if enabled
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
  // If this is the second click of a double click,
  // do not start selection/drag/resizing. Let dblclick handle renaming.
  if (e.detail === 2) return;

  const target = e.target;

  // 🔹 Edge click → select edge (vizuális vonal VAGY hitbox)
  if (
    target.classList &&
    (target.classList.contains('edge-line') ||
     target.classList.contains('edge-hit'))
  ) {
    const edgeId = target.dataset.edgeId;
    if (edgeId != null) {
      selectEdge(edgeId);
      render();
      return;
    }
  }

  // Empty canvas → start selection box
  if (target === svg) {
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    selectionStart = pt;

    state.selectedNodeId = null;
    state.selectedNodeIds = [];
    state.selectedEdgeId = null;

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

  // dragging nodes (multi-select)
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

      // optional: snap resize
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

    state.selectedEdgeId = null; // 🔹 box select → edge deselect

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
          nx1 < x2 &&
          nx2 > x1 &&
          ny1 < y2 &&
          ny2 > y1;

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

    let toNodeId = null;
    let toPort = null;

    // 1) try explicit port (old logic)
    let portEl =
      (e.target && e.target.closest && e.target.closest('.port')) || null;
    if (!portEl) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      portEl = el && el.closest && el.closest('.port');
    }

    if (portEl) {
      // released over a specific port
      toNodeId = portEl.dataset.nodeId;
      toPort = portEl.dataset.port;
    } else {
      // 2) no port → find closest side of node
      let nodeEl =
        (e.target && e.target.closest && e.target.closest('.node')) || null;

      if (!nodeEl) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        nodeEl = el && el.closest && el.closest('.node');
      }

      if (nodeEl) {
        toNodeId = nodeEl.dataset.id;
        const node = getNodeById(toNodeId);
        if (node) {
          const ptSvg = clientToSvgPoint(e.clientX, e.clientY);

          const leftDist = Math.abs(ptSvg.x - node.x);
          const rightDist = Math.abs(ptSvg.x - (node.x + node.width));
          const topDist = Math.abs(ptSvg.y - node.y);
          const bottomDist = Math.abs(ptSvg.y - (node.y + node.height));

          const min = Math.min(leftDist, rightDist, topDist, bottomDist);

          if (min === leftDist) {
            toPort = 'left';
          } else if (min === rightDist) {
            toPort = 'right';
          } else if (min === topDist) {
            toPort = 'top';
          } else {
            toPort = 'bottom';
          }
        }
      }
    }

    if (toNodeId && toPort) {
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
  // don't start drag when this is part of a double click
  if (e.detail === 2) return;

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
  // don't start resize when this is part of a double click
  if (e.detail === 2) return;

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
  // connecting via ports should only start on single click
  if (e.detail === 2) return;

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

/* ---------- KEYBOARD (DELETE / BACKSPACE) ---------- */

function initKeyboard() {
  document.addEventListener('keydown', e => {
    // csak Delete / Backspace érdekel
    if (e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'x') {
      return;
    }

   
    const active = document.activeElement;
    if (
      active &&
      (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      )
    ) {
      return;
    }

    // NODE delete 
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
      e.preventDefault();
      return;
    }

    //  EDGE delete
    if (state.selectedEdgeId != null) {
      state.edges = state.edges.filter(
        edge => edge.id !== state.selectedEdgeId
      );
      state.selectedEdgeId = null;
      render();
      e.preventDefault();
      return;
    }

    e.preventDefault();
  });
}


/* ---------- LABEL EDITING (DOUBLE CLICK) ---------- */
function initLabelEditing() {
  svg.addEventListener('dblclick', onSvgDoubleClick);
}

function onSvgDoubleClick(e) {
  // 1) Node címke szerkesztés (régi logika)
  const nodeGroup = e.target.closest('.node');
  if (nodeGroup) {
    const nodeId = nodeGroup.dataset.id;
    const node = getNodeById(nodeId);
    if (!node) return;

    const currentLabel = getNodeLabel(node);
    if (!currentLabel) return;

    const bbox = nodeGroup.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const pt = svg.createSVGPoint();
    pt.x = centerX;
    pt.y = centerY;
    const ctm = svg.getScreenCTM();
    const screenPt = ctm ? pt.matrixTransform(ctm) : { x: centerX, y: centerY };

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentLabel;
    input.style.position = 'fixed';
    input.style.left = (screenPt.x - 60) + 'px';
    input.style.top = (screenPt.y - 10) + 'px';
    input.style.width = '120px';
    input.style.fontSize = '13px';
    input.style.padding = '2px 4px';
    input.style.zIndex = '9999';
    input.style.border = '1px solid #007bff';
    input.style.borderRadius = '3px';
    input.style.background = '#ffffff';

    document.body.appendChild(input);
    input.focus();
    input.select();

    let finishedNode = false;

    function finishEditNode(applyChange) {
      if (finishedNode) return;
      finishedNode = true;

      if (applyChange) {
        const trimmed = input.value.trim();
        if (trimmed === '') {
          delete node.name;
        } else {
          node.name = trimmed;
        }
        render();
      }

      if (input.isConnected) {
        input.removeEventListener('blur', onBlurNode);
        input.removeEventListener('keydown', onKeyDownNode);
        input.parentNode.removeChild(input);
      }
    }

    function onBlurNode() {
      finishEditNode(true);
    }

    function onKeyDownNode(ev) {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        // ne fusson le még egyszer blur-ből úgy, hogy már lezártuk
        ev.preventDefault();
        finishEditNode(true);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        finishEditNode(false);
      }
    }

    input.addEventListener('blur', onBlurNode);
    input.addEventListener('keydown', onKeyDownNode);
    return;
  }

  // 2) Edge label szerkesztés – csak decision-ből induló élekre (SDL-88)

  const edgeEl =
    e.target.closest('.edge-line') ||
    e.target.closest('.edge-hit') ||
    e.target.closest('.edge-label');

  if (!edgeEl) {
    return; // üres canvas vagy valami más
  }

  const edgeId = edgeEl.dataset.edgeId;
  if (!edgeId) return;

  const edge = state.edges.find(ed => String(ed.id) === String(edgeId));
  if (!edge) return;

  const fromNode = getNodeById(edge.fromNodeId);
  if (!fromNode || fromNode.type !== 'decision') {
    return;
  }

  const currentLabel = edge.label || '';

  const visualEdgeEl = svg.querySelector(
    `.edge-line[data-edge-id="${edgeId}"]`
  );
  if (!visualEdgeEl) return;

  const bbox = visualEdgeEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const pt2 = svg.createSVGPoint();
  pt2.x = centerX;
  pt2.y = centerY;
  const ctm2 = svg.getScreenCTM();
  const screenPt2 = ctm2 ? pt2.matrixTransform(ctm2) : { x: centerX, y: centerY };

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentLabel;
  input.style.position = 'fixed';
  input.style.left = (screenPt2.x - 60) + 'px';
  input.style.top = (screenPt2.y - 10) + 'px';
  input.style.width = '120px';
  input.style.fontSize = '11px';
  input.style.padding = '2px 4px';
  input.style.zIndex = '9999';
  input.style.border = '1px solid #007bff';
  input.style.borderRadius = '3px';
  input.style.background = '#ffffff';

  document.body.appendChild(input);
  input.focus();
  input.select();

  let finishedEdge = false;

  function finishEditEdge(applyChange) {
    if (finishedEdge) return;
    finishedEdge = true;

    if (applyChange) {
      const trimmed = input.value.trim();
      edge.label = trimmed;
      render();
    }

    if (input.isConnected) {
      input.removeEventListener('blur', onBlurEdge);
      input.removeEventListener('keydown', onKeyDownEdge);
      input.parentNode.removeChild(input);
    }
  }

  function onBlurEdge() {
    finishEditEdge(true);
  }

  function onKeyDownEdge(ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEditEdge(true);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEditEdge(false);
    }
  }

  input.addEventListener('blur', onBlurEdge);
  input.addEventListener('keydown', onKeyDownEdge);
}
