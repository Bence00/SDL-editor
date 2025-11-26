import { SVG_NS } from "./constants.js";
import { state } from "./state.js";
import { getNodeById } from "./model.js";
import { computePortPositions } from "./nodeShapes.js";

// ============================================================
// DRAW ALL EDGES
// ============================================================
export function drawAllEdges(svg) {
  const group = document.createElementNS(SVG_NS, "g");
  group.id = "edges";

  for (const edge of state.edges) {
    const el = drawSingleEdge(edge);
    if (el) group.appendChild(el);
  }

  svg.appendChild(group);
}

// ============================================================
// DRAW ONE EDGE
// ============================================================
export function drawSingleEdge(edge) {
  const fromNode = getNodeById(edge.fromNodeId);
  const toNode = getNodeById(edge.toNodeId);
  if (!fromNode || !toNode) return null;

  const fromPorts = computePortPositions(fromNode);
  const toPorts = computePortPositions(toNode);

  const from = fromPorts[edge.fromPort];
  const to = toPorts[edge.toPort];
  if (!from || !to) return null;

  const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  // <g>
  const g = document.createElementNS(SVG_NS, "g");
  g.dataset.edgeId = edge.id;

  // ------------------------------------------------------------
  // VISIBLE LINE
  // ------------------------------------------------------------
  const line = document.createElementNS(SVG_NS, "path");
  line.setAttribute("d", d);
  line.setAttribute("class", "edge-line");
  line.setAttribute("marker-end", "url(#arrowhead)");
  line.dataset.edgeId = edge.id;

  if (state.selectedEdgeId === edge.id) {
    line.classList.add("selected");
  }

  g.appendChild(line);

  // ------------------------------------------------------------
  // HITBOX (FOR EASY CLICK)
  // ------------------------------------------------------------
  const hit = document.createElementNS(SVG_NS, "path");
  hit.setAttribute("d", d);
  hit.setAttribute("class", "edge-hit");
  hit.dataset.edgeId = edge.id;     // IMPORTANT

  g.appendChild(hit);

  // ------------------------------------------------------------
  // LABEL (FOR DECISION)
  // ------------------------------------------------------------
  if (edge.label?.trim()) {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - 6;

    const txt = document.createElementNS(SVG_NS, "text");
    txt.textContent = edge.label;
    txt.classList.add("edge-label");
    txt.setAttribute("x", mx);
    txt.setAttribute("y", my);
    txt.dataset.edgeId = edge.id;  // allow click on label too

    g.appendChild(txt);
  }

  return g;
}
