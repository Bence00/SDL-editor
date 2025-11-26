// src/storage.js
import { state } from "./state.js";
import { render } from "./render.js";
import { extractProcesses } from "./processExtractor.js";

/**
 * EXPORT — full SDL multi-process diagram
 */
export function exportDiagram() {
  return {
    processes: extractProcesses(),
    nodes: state.nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      name: n.name || null
    })),
    edges: state.edges.map(e => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      fromPort: e.fromPort || null,
      toNodeId: e.toNodeId,
      toPort: e.toPort || null,
      label: e.label || ""
    }))
  };
}

/**
 * IMPORT — restores nodes + edges + positions + labels
 */
export function importDiagram(diagram) {
  if (!diagram || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    console.error("Invalid diagram format", diagram);
    return;
  }

  state.nodes = diagram.nodes.map(n => ({
    id: n.id,
    type: n.type,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    name: n.name || undefined
  }));

  state.edges = diagram.edges.map(e => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    fromPort: e.fromPort,
    toNodeId: e.toNodeId,
    toPort: e.toPort,
    label: e.label || ""
  }));

  // Reset selections
  state.selectedNodeId = null;
  state.selectedNodeIds = [];
  state.selectedEdgeId = null;

  render();
}
