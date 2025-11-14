import { state } from './state.js';
import { render } from './render.js';

export function exportDiagram() {
  return {
    version: 1,
    nodes: state.nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height
    })),
    edges: state.edges.map(e => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      fromPort: e.fromPort ?? null,
      toNodeId: e.toNodeId,
      toPort: e.toPort ?? null
    })),
    nextId: state.nextId ?? 1
  };
}

export function importDiagram(diagram) {
  if (!diagram || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    console.error('Invalid diagram object', diagram);
    return;
  }

  state.nodes = diagram.nodes.map(n => ({
    id: String(n.id),
    type: n.type,
    x: Number(n.x),
    y: Number(n.y),
    width: Number(n.width),
    height: Number(n.height)
  }));

  state.edges = (diagram.edges || []).map(e => ({
    id: String(e.id),
    fromNodeId: String(e.fromNodeId),
    fromPort: e.fromPort ?? null,
    toNodeId: String(e.toNodeId),
    toPort: e.toPort ?? null
  }));

  state.nextId = diagram.nextId ? Number(diagram.nextId) : computeNextId();

  state.selectedNodeId = null;
  state.selectedNodeIds = [];
  state.dragging = null;
  state.resizing = null;
  state.connecting = null;

  render();
}

function computeNextId() {
  let maxNode = 0;
  let maxEdge = 0;
  for (const n of state.nodes) {
    const idNum = parseInt(n.id.replace(/\D/g, ''), 10);
    if (!Number.isNaN(idNum)) maxNode = Math.max(maxNode, idNum);
  }
  for (const e of state.edges) {
    const idNum = parseInt(e.id.replace(/\D/g, ''), 10);
    if (!Number.isNaN(idNum)) maxEdge = Math.max(maxEdge, idNum);
  }
  return Math.max(maxNode, maxEdge) + 1;
}
