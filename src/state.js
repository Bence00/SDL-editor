export const state = {
  nodes: [],      // { id, type, x, y, width, height }
  edges: [],      // { id, fromNodeId, fromPort, toNodeId, toPort }
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
    edges: JSON.parse(JSON.stringify(state.edges))
  });
  history.redoStack = [];
}

export function undo() {
  if (history.undoStack.length === 0) return;

  history.redoStack.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges))
  });

  const prev = history.undoStack.pop();
  state.nodes = prev.nodes;
  state.edges = prev.edges;
}

export function redo() {
  if (history.redoStack.length === 0) return;

  history.undoStack.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges))
  });

  const next = history.redoStack.pop();
  state.nodes = next.nodes;
  state.edges = next.edges;
}
