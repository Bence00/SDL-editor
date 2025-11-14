export const state = {
  nodes: [],      // { id, type, x, y, width, height }
  edges: [],      // { id, fromNodeId, fromPort, toNodeId, toPort }
  selectedNodeId: null,   // legacy single selection
  selectedNodeIds: [],    // NEW: multi-selection
  dragging: null,         // { nodes: [{ id, offsetX, offsetY }, ...] }
  resizing: null,
  connecting: null,
  nextId: 1
};

export function selectNode(id) {
  state.selectedNodeId = id;
  state.selectedNodeIds = id ? [id] : [];
}
