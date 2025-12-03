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
 * Also re-computes `state.nextId` so that newly created nodes/edges
 * never reuse an ID from the loaded diagram.
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

  // Recalculate the nextId counter to avoid ID collisions after load.
  // We look at numeric parts of both node IDs and edge IDs (e.g. "e12").
  let maxNumericId = 0;

  diagram.nodes.forEach(n => {
    const numeric = parseInt(String(n.id).replace(/\D+/g, ''), 10);
    if (!Number.isNaN(numeric) && numeric > maxNumericId) {
      maxNumericId = numeric;
    }
  });

  diagram.edges.forEach(e => {
    const numeric = parseInt(String(e.id).replace(/\D+/g, ''), 10);
    if (!Number.isNaN(numeric) && numeric > maxNumericId) {
      maxNumericId = numeric;
    }
  });

  // Next created ID should be strictly larger than anything loaded.
  state.nextId = maxNumericId + 1;

  // Reset selections
  state.selectedNodeId = null;
  state.selectedNodeIds = [];
  state.selectedEdgeId = null;

  render();
}
