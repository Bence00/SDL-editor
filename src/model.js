import { state, selectNode } from './state.js';

export function createNode(type, x, y) {
  const baseSize = { width: 140, height: 80 };

  const node = {
    id: String(state.nextId++),
    type,
    x: x - baseSize.width / 2,
    y: y - baseSize.height / 2,
    width: baseSize.width,
    height: baseSize.height
  };

  state.nodes.push(node);
  selectNode(node.id);
}

export function createEdge(fromNodeId, fromPort, toNodeId, toPort) {
  if (!fromNodeId || !toNodeId || !fromPort || !toPort) return;
  if (fromNodeId === toNodeId && fromPort === toPort) return;

  if (
    state.edges.some(
      e =>
        e.fromNodeId === fromNodeId &&
        e.fromPort === fromPort &&
        e.toNodeId === toNodeId &&
        e.toPort === toPort
    )
  ) {
    return;
  }

  state.edges.push({
    id: 'e' + state.nextId++,
    fromNodeId,
    fromPort,
    toNodeId,
    toPort
  });
}

export function getNodeById(id) {
  return state.nodes.find(n => n.id === id);
}

export function computePortPositions(node) {
  return {
    top: {
      x: node.x + node.width / 2,
      y: node.y
    },
    right: {
      x: node.x + node.width,
      y: node.y + node.height / 2
    },
    bottom: {
      x: node.x + node.width / 2,
      y: node.y + node.height
    },
    left: {
      x: node.x,
      y: node.y + node.height / 2
    }
  };
}

export function deleteNode(nodeId) {
  const idx = state.nodes.findIndex(n => n.id === nodeId);
  if (idx === -1) return false;

  // remove node
  state.nodes.splice(idx, 1);

  // remove edges connected to this node
  state.edges = state.edges.filter(
    e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId
  );

  // clear selection if it pointed to this node
  if (state.selectedNodeId === nodeId) {
    state.selectedNodeId = null;
  }
  return true;
}
