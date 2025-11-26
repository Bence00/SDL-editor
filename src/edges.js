// edges.js — simplest possible port-to-port straight-line connector

import { SVG_NS } from './constants.js';
import { state } from './state.js';
import { getNodeById } from './model.js';
import { computePortPositions } from './nodeShapes.js';

// ----------------------------------------------------
// Create SVG element helper
// ----------------------------------------------------
function el(name, attrs = {}) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// ----------------------------------------------------
// Draw one edge
// ----------------------------------------------------
export function drawEdge(svgGroup, edge, isSelected) {
  const fromNode = getNodeById(edge.fromNodeId);
  const toNode = getNodeById(edge.toNodeId);
  if (!fromNode || !toNode) return;

  const fromPorts = computePortPositions(fromNode);
  const toPorts = computePortPositions(toNode);

  const p1 = fromPorts[edge.fromPort];
  const p2 = toPorts[edge.toPort];
  if (!p1 || !p2) return;

  const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

  const g = el("g", { "data-edge-id": edge.id });

  const line = el("path", {
    d,
    class: "edge-line",
    "marker-end": "url(#arrowhead)"
  });

  if (isSelected) line.classList.add("selected");

  const hit = el("path", {
    d,
    class: "edge-hit"
  });

  g.appendChild(line);
  g.appendChild(hit);
  svgGroup.appendChild(g);
}


// ----------------------------------------------------
// Render all edges
// ----------------------------------------------------
export function drawAllEdges(svgRoot) {
  const g = el("g", { id: "edges" });

  for (const edge of state.edges) {
    const selected = state.selectedEdgeId === edge.id;
    drawEdge(g, edge, selected);
  }

  svgRoot.appendChild(g);
}
