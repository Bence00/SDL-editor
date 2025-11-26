import { state } from './state.js';

import { getDefaultSize } from "./nodeShapes.js";

export function createNode(type, x, y) {
  const size = getDefaultSize(type);

  const id = String(state.nextId++);

  const node = {
    id,
    type,
    x,
    y,
    width: size.width,
    height: size.height,
  };

  state.nodes.push(node);
  return node;
}

export function getNodeById(id) {
  const sid = String(id);
  return state.nodes.find(n => String(n.id) === sid) || null;
}

export function deleteNode(nodeId) {
  const sid = String(nodeId);

  state.nodes = state.nodes.filter(n => String(n.id) !== sid);

  const before = state.edges.length;
  state.edges = state.edges.filter(
    e => String(e.fromNodeId) !== sid && String(e.toNodeId) !== sid
  );

  if (
    state.selectedEdgeId &&
    !state.edges.some(e => e.id === state.selectedEdgeId)
  ) {
    state.selectedEdgeId = null;
  }

  if (state.selectedNodeId && String(state.selectedNodeId) === sid) {
    state.selectedNodeId = null;
  }
  if (Array.isArray(state.selectedNodeIds)) {
    state.selectedNodeIds = state.selectedNodeIds.filter(
      nid => String(nid) !== sid
    );
  }
}

export function createEdge(fromNodeId, fromPort, toNodeId, toPort) {
  const fromIdStr = String(fromNodeId);
  const toIdStr   = String(toNodeId);

  const fromNode = state.nodes.find(n => String(n.id) === fromIdStr);

  state.edges = state.edges.filter(e => {
    const sameToPort =
      String(e.toNodeId) === toIdStr && e.toPort === toPort;

    if (fromNode && fromNode.type !== 'decision') {
      const sameFromNode = String(e.fromNodeId) === fromIdStr;
      return !sameFromNode && !sameToPort;
    } else {
      const sameFromPort =
        String(e.fromNodeId) === fromIdStr && e.fromPort === fromPort;
      return !sameFromPort && !sameToPort;
    }
  });

  if (
    state.selectedEdgeId &&
    !state.edges.some(e => e.id === state.selectedEdgeId)
  ) {
    state.selectedEdgeId = null;
  }

  const id = 'e' + state.nextId++;

  const edge = {
    id,
    fromNodeId: fromIdStr,
    fromPort,
    toNodeId: toIdStr,
    toPort,
    label: ''   
  };

  state.edges.push(edge);
  return edge;
}
