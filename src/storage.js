import { state } from './state.js';
import { render } from './render.js';

export function exportDiagram() {
  return {
    nodes: state.nodes.map(function (n) {
      return {
        id: n.id ?? null,
        type: n.type ?? null,
        x: typeof n.x === 'number' ? n.x : 0,
        y: typeof n.y === 'number' ? n.y : 0,
        width: typeof n.width === 'number' ? n.width : 120,
        height: typeof n.height === 'number' ? n.height : 60,
        name:
          typeof n.name === 'string' && n.name.trim().length > 0
            ? n.name.trim()
            : null
      };
    }),

    edges: state.edges.map(function (e) {
      return {
        id: e.id ?? null,
        fromNodeId: e.fromNodeId ?? null,
        fromPort:
          typeof e.fromPort === 'string' && e.fromPort.length > 0
            ? e.fromPort
            : null,
        toNodeId: e.toNodeId ?? null,
        toPort:
          typeof e.toPort === 'string' && e.toPort.length > 0
            ? e.toPort
            : null
      };
    })
  };
}

export function importDiagram(diagram) {
  if (!diagram || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    console.error('importDiagram: invalid diagram object', diagram);
    return;
  }

  state.nodes = diagram.nodes.map(function (n) {
    return {
      id: n.id,
      type: n.type,
      x: typeof n.x === 'number' ? n.x : 0,
      y: typeof n.y === 'number' ? n.y : 0,
      width: typeof n.width === 'number' ? n.width : 120,
      height: typeof n.height === 'number' ? n.height : 60,
      name:
        typeof n.name === 'string' && n.name.trim().length > 0
          ? n.name.trim()
          : undefined
    };
  });

  state.edges = diagram.edges.map(function (e) {
    return {
      id: e.id,
      fromNodeId: e.fromNodeId ?? null,
      fromPort:
        typeof e.fromPort === 'string' && e.fromPort.length > 0
          ? e.fromPort
          : null,
      toNodeId: e.toNodeId ?? null,
      toPort:
        typeof e.toPort === 'string' && e.toPort.length > 0
          ? e.toPort
          : null
    };
  });

  state.selectedNodeId = null;
  state.selectedNodeIds = [];

  render();
}
