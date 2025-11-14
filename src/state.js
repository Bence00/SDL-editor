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
}

export function setSnapToGrid(enabled) {
  state.snapToGrid = !!enabled;
}

export function isSnapToGrid() {
  return !!state.snapToGrid;
}
