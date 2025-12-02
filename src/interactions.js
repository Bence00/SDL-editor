import { svg, palette } from './dom.js';
import { state, selectNode, isSnapToGrid, selectEdge, undo, redo, saveStateForUndo } from './state.js';
import {
  createNode,
  createEdge,
  getNodeById,
  deleteNode
} from './model.js';
import { render } from './render.js';
import { clientToSvgPoint, snapPointToGrid } from './utils.js';
import { SVG_NS, SELECTION_DRAG_THRESHOLD, MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from './constants.js';
import { getNodeLabel } from './nodeShapes.js';

/* --- STATE FOR INTERACTION --- */

let selectionStart = null;
let selectionRectEl = null;

/* ------------------------------------
                  PUBLIC INIT
    ------------------------------------ */

export function initInteractions() {
  initPaletteDrag();
  initCanvasDnD();
  initMouse();
  initKeyboard();
  initLabelEditing();
}

/* ------------------------------------
            PALETTE DRAG & DROP
    ------------------------------------ */

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

/* ------------------------------------
             MOUSE INTERACTIONS
    ------------------------------------ */

function initMouse() {
  svg.addEventListener('mousedown', onSvgMouseDown);
  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

// --- Mouse Down Handlers ---

function onSvgMouseDown(e) {
  // If this is the second click of a double click, prevent drag/selection
  if (e.detail === 2) return;

  const target = e.target;

  // Edge click → select edge (visual line OR hitbox)
  if (isEdgeClick(target)) {
    handleEdgeClick(target);
    return;
  }

  // Resize handle click
  if (target.classList.contains('resize-handle')) {
    startResizing(e, target);
    return;
  }

  // Connection port click
  if (target.classList.contains('port')) {
    startConnecting(e, target);
    return;
  }

  // Node click
  const nodeGroup = target.closest('.node');
  if (nodeGroup) {
    startDragging(e, nodeGroup);
    return;
  }

  // Empty canvas click → start selection box
  if (target === svg) {
    startSelectionBox(e);
    return;
  }
}

function isEdgeClick(target) {
  return (
    target.classList &&
    (target.classList.contains('edge-line') ||
     target.classList.contains('edge-hit'))
  );
}

function handleEdgeClick(target) {
  const edgeId = target.dataset.edgeId;
  if (edgeId != null) {
    selectEdge(edgeId);
    render();
  }
}

function startSelectionBox(e) {
  const pt = clientToSvgPoint(e.clientX, e.clientY);
  selectionStart = pt;

  // Deselect current selections
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
}

// --- Mouse Move Handler ---

function onDocumentMouseMove(e) {
  const pt = clientToSvgPoint(e.clientX, e.clientY);

  if (selectionStart) {
    updateSelectionBox(pt);
  } else if (state.dragging && state.dragging.nodes) {
    updateDragging(pt);
  } else if (state.resizing) {
    updateResizing(pt);
  } else if (state.connecting && state.connecting.tempLine) {
    updateConnectingLine(pt);
  }
}

function updateSelectionBox(pt) {
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

function updateDragging(pt) {
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

function updateResizing(pt) {
  const { nodeId, startWidth, startHeight, startMouseX, startMouseY } =
    state.resizing;
  const node = getNodeById(nodeId);
  if (!node) {
    state.resizing = null;
    return;
  }

  let dx2 = pt.x - startMouseX;
  let dy2 = pt.y - startMouseY;
  let w = Math.max(MIN_NODE_WIDTH, startWidth + dx2);
  let h = Math.max(MIN_NODE_HEIGHT, startHeight + dy2);

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

function updateConnectingLine(pt) {
  state.connecting.tempLine.setAttribute('x2', pt.x);
  state.connecting.tempLine.setAttribute('y2', pt.y);
}

// --- Mouse Up Handler ---

function onDocumentMouseUp(e) {
  const pt = clientToSvgPoint(e.clientX, e.clientY);

  if (selectionStart) {
    finishSelectionBox(pt);
  }

  if (state.connecting) {
    finishConnection(e, pt);
  }

  state.dragging = null;
  state.resizing = null;
}

function finishSelectionBox(pt) {
  const dx = pt.x - selectionStart.x;
  const dy = pt.y - selectionStart.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  state.selectedEdgeId = null; // box select → edge deselect

  if (dist >= SELECTION_DRAG_THRESHOLD) {
    applySelectionBox(selectionStart, pt);
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

function applySelectionBox(start, end) {
  const x1 = Math.min(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x);
  const y2 = Math.max(start.y, end.y);

  const selectedIds = [];
  state.nodes.forEach(node => {
    const nx1 = node.x;
    const ny1 = node.y;
    const nx2 = node.x + node.width;
    const ny2 = node.y + node.height;

    // Bounding box intersection check
    const intersects =
      nx1 < x2 && nx2 > x1 && ny1 < y2 && ny2 > y1;

    if (intersects) selectedIds.push(node.id);
  });

  state.selectedNodeIds = selectedIds;
  state.selectedNodeId =
    selectedIds.length === 1 ? selectedIds[0] : null;
}
function finishConnection(e, ptSvg) {
  const { fromNodeId, fromPort } = state.connecting;

  let { toNodeId, toPort } = findConnectionTarget(e, ptSvg);

  if (toNodeId && toPort) {

    saveStateForUndo();

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


function findConnectionTarget(e, ptSvg) {
  let toNodeId = null;
  let toPort = null;

  let portEl =
    (e.target && e.target.closest && e.target.closest('.port')) || null;
  if (!portEl) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    portEl = el && el.closest && el.closest('.port');
  }

  if (portEl) {
    toNodeId = portEl.dataset.nodeId;
    toPort = portEl.dataset.port;
  } else {
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
        toPort = findClosestPort(node, ptSvg);
      }
    }
  }
  return { toNodeId, toPort };
}

function findClosestPort(node, ptSvg) {
  const leftDist = Math.abs(ptSvg.x - node.x);
  const rightDist = Math.abs(ptSvg.x - (node.x + node.width));
  const topDist = Math.abs(ptSvg.y - node.y);
  const bottomDist = Math.abs(ptSvg.y - (node.y + node.height));

  const min = Math.min(leftDist, rightDist, topDist, bottomDist);

  if (min === leftDist) return 'left';
  if (min === rightDist) return 'right';
  if (min === topDist) return 'top';
  return 'bottom';
}

/* ------------------------------------
             INTERACTION HELPERS
    ------------------------------------ */

function startDragging(e, nodeGroup) {
  // Don't start drag when this is part of a double click
  if (e.detail === 2) return;
  saveStateForUndo();

  e.stopPropagation();
  const clickedId = nodeGroup.dataset.id;
  const clickedNode = getNodeById(clickedId);
  if (!clickedNode) return;

  const pt = clientToSvgPoint(e.clientX, e.clientY);

  // Select the clicked node if it's not already part of the selection
  if (!state.selectedNodeIds.includes(clickedId)) {
    selectNode(clickedId);
  }

  const nodesToDrag = state.selectedNodeIds.length
    ? state.selectedNodeIds
    : [clickedId];

  // Store initial offsets for all nodes being dragged
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
  // Don't start resize when this is part of a double click
  if (e.detail === 2) return;
  saveStateForUndo();

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
  // Connecting via ports should only start on single click
  if (e.detail === 2) return;

  e.stopPropagation();
  const nodeId = port.dataset.nodeId;
  const portName = port.dataset.port;

  const x = parseFloat(port.getAttribute('cx'));
  const y = parseFloat(port.getAttribute('cy'));

  // Create temporary line for visual feedback
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

/* ------------------------------------
                KEYBOARD
    ------------------------------------ */

function initKeyboard() {
  document.addEventListener('keydown', onDocumentKeydown);
}
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "z") {
    undo();
    render();
    e.preventDefault();
  }
  if (e.ctrlKey && (e.key === "y" || e.key === "Z")) {
    redo();
    render();
    e.preventDefault();
  }
});
function onDocumentKeydown(e) {
  // Only interested in Delete / Backspace / 'x'
  if (e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'x') {
    return;
  }

  // Do not delete if an input element is active
  const active = document.activeElement;
  if (
    active &&
    (active.tagName === 'INPUT' ||
     active.tagName === 'TEXTAREA' ||
     active.isContentEditable)
  ) {
    return;
  }

  // Node(s) deletion
  const nodeIdsToDelete = getSelectedNodeIds();
  if (nodeIdsToDelete.length) {
    saveStateForUndo();
    nodeIdsToDelete.forEach(id => deleteNode(id));
    state.selectedNodeId = null;
    state.selectedNodeIds = [];
    render();
    e.preventDefault();
    return;
  }

  // Edge deletion
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
}

function getSelectedNodeIds() {
  return state.selectedNodeIds && state.selectedNodeIds.length
    ? Array.from(new Set(state.selectedNodeIds))
    : state.selectedNodeId
    ? [state.selectedNodeId]
    : [];
}

/* ------------------------------------
            LABEL EDITING (DBLCLICK)
    ------------------------------------ */

function initLabelEditing() {
  svg.addEventListener('dblclick', onSvgDoubleClick);
}

function onSvgDoubleClick(e) {
  const target = e.target;

  // 1) Node label editing
  const nodeGroup = target.closest('.node');
  if (nodeGroup) {
    editNodeLabel(nodeGroup);
    return;
  }

  // 2) Edge label editing
  const edgeEl =
    target.closest('.edge-line') ||
    target.closest('.edge-hit') ||
    target.closest('.edge-label');

  if (edgeEl) {
    editEdgeLabel(edgeEl);
    return;
  }
}

// --- Node Label Editing ---

function editNodeLabel(nodeGroup) {
  const nodeId = nodeGroup.dataset.id;
  const node = getNodeById(nodeId);
  if (!node) return;

  const currentLabel = getNodeLabel(node);
  if (currentLabel === null) return;

  const bbox = nodeGroup.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const { screenPt, input } = createLabelInput(
    centerX,
    centerY,
    currentLabel,
    '13px'
  );
  positionLabelInput(input, screenPt);

  document.body.appendChild(input);
  input.focus();
  input.select();

  let finished = false;

  function finishEdit(applyChange) {
    if (finished) return;
    finished = true;
    saveStateForUndo();
    if (applyChange) {
      const trimmed = input.value.trim();
      if (trimmed === '') {
        delete node.name;
      } else {
        node.name = trimmed;
      }
      render();
    }

    removeLabelInput(input, onBlur, onKeyDown);
  }

  const onBlur = () => finishEdit(true);
  const onKeyDown = ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEdit(true);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEdit(false);
    }
  };

  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeyDown);
}

// --- Edge Label Editing ---

function editEdgeLabel(edgeEl) {
  const edgeId = edgeEl.dataset.edgeId;
  if (!edgeId) return;

  const edge = state.edges.find(ed => String(ed.id) === String(edgeId));
  if (!edge) return;

  const fromNode = getNodeById(edge.fromNodeId);
  // Only allow editing for edges originating from a 'decision' node (SDL-88)
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

  const { screenPt, input } = createLabelInput(
    centerX,
    centerY,
    currentLabel,
    '11px'
  );
  positionLabelInput(input, screenPt);

  document.body.appendChild(input);
  input.focus();
  input.select();

  let finished = false;

  function finishEdit(applyChange) {
    if (finished) return;
    finished = true;
    saveStateForUndo();
    if (applyChange) {
      edge.label = input.value.trim();
      render();
    }

    removeLabelInput(input, onBlur, onKeyDown);
  }

  const onBlur = () => finishEdit(true);
  const onKeyDown = ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEdit(true);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEdit(false);
    }
  };

  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeyDown);
}

// --- Common Label Editing Utilities ---

function createLabelInput(svgX, svgY, value, fontSize) {
  const pt = svg.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const ctm = svg.getScreenCTM();
  const screenPt = ctm ? pt.matrixTransform(ctm) : { x: svgX, y: svgY };

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.style.position = 'fixed';
  input.style.width = '120px';
  input.style.fontSize = fontSize;
  input.style.padding = '2px 4px';
  input.style.zIndex = '9999';
  input.style.border = '1px solid #007bff';
  input.style.borderRadius = '3px';
  input.style.background = '#ffffff';

  return { screenPt, input };
}

function positionLabelInput(input, screenPt) {
  // Center the input field (assuming 120px width)
  input.style.left = screenPt.x - 60 + 'px';
  input.style.top = screenPt.y - 10 + 'px';
}

function removeLabelInput(input, onBlur, onKeyDown) {
  if (input.isConnected) {
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('keydown', onKeyDown);
    input.parentNode.removeChild(input);
  }
}