import { svg } from '../dom.js';
import { state, selectNode, isSnapToGrid, selectEdge, saveStateForUndo } from '../state.js';
import { createEdge, getNodeById } from '../model.js';
import { render } from '../render.js';
import { clientToSvgPoint, snapPointToGrid } from '../utils.js';
import { SVG_NS, SELECTION_DRAG_THRESHOLD, MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants.js';
import { getNodeLabel } from '../nodeShapes.js';

let selectionStart = null;
let selectionRectEl = null;

export function initMouseInteractions() {
  initMouse();
}

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

  state.selectedEdgeId = null; // 🔹 box select → edge deselect

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

  // Prevent connecting a port directly into itself (same node + same port).
  // Prevent connecting a node to itself (any port)
  if (!toNodeId || !toPort || toNodeId === fromNodeId) {

    cleanupTempConnection();
    return;
  }

  // Enforce rule: a "start" node can only have a single outgoing connection.
  const fromNode = getNodeById(fromNodeId);
  if (fromNode && fromNode.type === 'start') {
    const fromIdStr = String(fromNodeId);
    const alreadyHasOutgoing = state.edges.some(
      e => String(e.fromNodeId) === fromIdStr
    );
    if (alreadyHasOutgoing) {
      cleanupTempConnection();
      return;
    }
  }

  // Enforce: only one edge is allowed from one node to another (per direction).
  const fromIdStr2 = String(fromNodeId);
  const toIdStr2 = String(toNodeId);
  const edgeAlreadyExists = state.edges.some(
    e =>
      String(e.fromNodeId) === fromIdStr2 &&
      String(e.toNodeId) === toIdStr2
  );
  if (edgeAlreadyExists) {
    cleanupTempConnection();
    return;
  }

  saveStateForUndo();
  createEdge(fromNodeId, fromPort, toNodeId, toPort);
  render();

  cleanupTempConnection();
}

function cleanupTempConnection() {
  if (state.connecting?.tempLine && state.connecting.tempLine.parentNode) {
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

// --- Dragging / resizing / connecting helpers ---

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


