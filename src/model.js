// src/model.js
import { state } from './state.js';

/**
 * Alap node-méretek típusonként.
 * Ha mást akarsz, itt állítsd.
 */
const DEFAULT_NODE_SIZES = {
  start:      { width: 130, height: 70 },
  state:      { width: 130, height: 70 },
  input:      { width: 130, height: 70 },
  output:     { width: 130, height: 70 },
  decision:   { width: 130, height: 70 },
  createTask: { width: 130, height: 70 },
  stop:       { width: 130, height: 70 },
  default:    { width: 130, height: 70 }
};

/**
 * Új node létrehozása.
 * type: "start" | "state" | "input" | "output" | "decision" | "createTask" | "stop"
 */
export function createNode(type, x, y) {
  const size = DEFAULT_NODE_SIZES[type] || DEFAULT_NODE_SIZES.default;

  const id = String(state.nextId++);

  const node = {
    id,
    type,
    x,
    y,
    width: size.width,
    height: size.height,
    // opcionális name, eleinte nincs
    // name: undefined
  };

  state.nodes.push(node);
  return node;
}

/**
 * Node kikeresése id alapján.
 */
export function getNodeById(id) {
  const sid = String(id);
  return state.nodes.find(n => String(n.id) === sid) || null;
}

/**
 * Node törlése + hozzá tartozó élek törlése.
 */
export function deleteNode(nodeId) {
  const sid = String(nodeId);

  // node kilövése
  state.nodes = state.nodes.filter(n => String(n.id) !== sid);

  // hozzá kapcsolódó élek kilövése
  const before = state.edges.length;
  state.edges = state.edges.filter(
    e => String(e.fromNodeId) !== sid && String(e.toNodeId) !== sid
  );

  // ha kijelölt edge is repült, selection reset
  if (
    state.selectedEdgeId &&
    !state.edges.some(e => e.id === state.selectedEdgeId)
  ) {
    state.selectedEdgeId = null;
  }

  // ha kijelölt node ez volt, selection reset
  if (state.selectedNodeId && String(state.selectedNodeId) === sid) {
    state.selectedNodeId = null;
  }
  if (Array.isArray(state.selectedNodeIds)) {
    state.selectedNodeIds = state.selectedNodeIds.filter(
      nid => String(nid) !== sid
    );
  }
}

/**
 * Új edge létrehozása.
 * FONTOS: itt enforce-oljuk, hogy
 *   - egy portból csak EGY edge menjen ki
 *   - egy portba csak EGY edge jöjjön be
 */
export function createEdge(fromNodeId, fromPort, toNodeId, toPort) {
  const fromIdStr = String(fromNodeId);
  const toIdStr   = String(toNodeId);

  // fromNode típusa (döntjük el, hogy decision-e)
  const fromNode = state.nodes.find(n => String(n.id) === fromIdStr);

  state.edges = state.edges.filter(e => {
    const sameToPort =
      String(e.toNodeId) === toIdStr && e.toPort === toPort;

    if (fromNode && fromNode.type !== 'decision') {
      // 🔹 NEM decision node:
      //    - ebből a node-ból SEMMILYEN portból nem maradhat másik outgoing edge
      const sameFromNode = String(e.fromNodeId) === fromIdStr;
      return !sameFromNode && !sameToPort;
    } else {
      // 🔹 Decision node:
      //    - ugyanabból a portból (fromPort) csak 1 edge
      const sameFromPort =
        String(e.fromNodeId) === fromIdStr && e.fromPort === fromPort;
      return !sameFromPort && !sameToPort;
    }
  });

  // ha a kijelölt edge pont most törlődött, nullázzuk a kijelölést
  if (
    state.selectedEdgeId &&
    !state.edges.some(e => e.id === state.selectedEdgeId)
  ) {
    state.selectedEdgeId = null;
  }

  // 1) Új edge id – ugyanaz a logika, mint a node-oknál: state.nextId++
  const id = 'e' + state.nextId++;

  const edge = {
    id,
    fromNodeId: fromIdStr,
    fromPort,
    toNodeId: toIdStr,
    toPort,
    label: ''   // decision ág label (yes/no/cond) ide kerül majd dblclicknél
  };

  state.edges.push(edge);
  return edge;
}
