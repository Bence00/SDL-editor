/**
 * @typedef {Object} SDLNode
 * @property {string|number} id
 * @property {string} type      // e.g. "start", "state", "input", "output", "decision", "stop", ...
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string=} name     // optional human-readable label
 */

/**
 * @typedef {Object} SDLEdge
 * @property {string} id
 * @property {string|number} fromNodeId
 * @property {string} fromPort          // "top" | "right" | "bottom" | "left"
 * @property {string|number} toNodeId
 * @property {string} toPort
 * @property {string=} label
 */

/**
 * Global editor state for the SDL canvas.
 * All mutations should go through helper functions in model.js / interactions.js
 * rather than rewriting this structure directly from elsewhere.
 */
export const state = {
  /** @type {SDLNode[]} */
  nodes: [],
  /** @type {SDLEdge[]} */
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  dragging: null,         // { nodes: [{ id, offsetX, offsetY }, ...] }
  resizing: null,
  connecting: null,
  nextId: 1,
  snapToGrid: true        // snap enabled by default
};

export function selectNode(id) {
  state.selectedNodeId = id;
  state.selectedNodeIds = id ? [id] : [];
  state.selectedEdgeId = null;   
}

export function selectEdge(id) {
  state.selectedEdgeId = id;
  state.selectedNodeId = null;
  state.selectedNodeIds = [];
}

export function setSnapToGrid(enabled) {
  state.snapToGrid = !!enabled;
}

export function isSnapToGrid() {
  return !!state.snapToGrid;
}

export const history = {
  undoStack: [],
  redoStack: []
};

export function saveStateForUndo() {
  history.undoStack.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    nextId: state.nextId
  });
  history.redoStack = [];
}

export function undo() {
  if (history.undoStack.length === 0) return;

  history.redoStack.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    nextId: state.nextId
  });

  const prev = history.undoStack.pop();
  state.nodes = prev.nodes;
  state.edges = prev.edges;
  if (typeof prev.nextId === 'number' && !Number.isNaN(prev.nextId)) {
    state.nextId = prev.nextId;
  }
}

export function redo() {
  if (history.redoStack.length === 0) return;

  history.undoStack.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    nextId: state.nextId
  });

  const next = history.redoStack.pop();
  state.nodes = next.nodes;
  state.edges = next.edges;
  if (typeof next.nextId === 'number' && !Number.isNaN(next.nextId)) {
    state.nextId = next.nextId;
  }
}
