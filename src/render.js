import { SVG_NS, PORT_RADIUS } from './constants.js';
import { svg } from './dom.js';
import { state } from './state.js';
import { getNodeById } from './model.js';

import {
  createBodyShape,
  computePortPositions,
  getNodeLabel
} from './nodeShapes.js';

import { drawAllEdges } from './edges.js';

// ======================================================
// DEFINITIONS
// ======================================================
let defsInitialized = false;

function ensureDefs() {
  if (defsInitialized) return;
  defsInitialized = true;

  const defs = document.createElementNS(SVG_NS, 'defs');

  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  path.setAttribute('fill', '#444');

  marker.appendChild(path);
  defs.appendChild(marker);

  svg.appendChild(defs);
}

// ======================================================
// ENTRY POINT
// ======================================================
export function render() {
  clearSvg();
  ensureDefs();

  state.nodes.forEach(renderNode);
  
  drawAllEdges(svg);  
}

// ======================================================
// CLEAR SVG
// ======================================================
function clearSvg() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  // SVG <defs> (including the arrowhead marker) are removed by the clear.
  // Force re‑creation on the next render so markers keep working.
  defsInitialized = false;
}

// ======================================================
// NODE RENDERING
// ======================================================
function renderNode(node) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('node');
  g.dataset.id = node.id;

  const selected =
    state.selectedNodeId === node.id ||
    (state.selectedNodeIds && state.selectedNodeIds.includes(node.id));
  if (selected) g.classList.add("selected");

  // Slightly larger transparent hitbox to make nodes easier to click/drag
  const HITBOX_PAD = 6;
  const hitbox = document.createElementNS(SVG_NS, 'rect');
  hitbox.setAttribute('x', node.x - HITBOX_PAD);
  hitbox.setAttribute('y', node.y - HITBOX_PAD);
  hitbox.setAttribute('width', node.width + HITBOX_PAD * 2);
  hitbox.setAttribute('height', node.height + HITBOX_PAD * 2);
  hitbox.setAttribute('fill', 'transparent');
  hitbox.setAttribute('stroke', 'none');
  hitbox.classList.add('node-hitbox');
  g.appendChild(hitbox);

  // SHAPE
  g.appendChild(createBodyShape(node));

  // LABEL
  const lbl = getNodeLabel(node);
  if (lbl) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute("x", node.x + node.width / 2);
    t.setAttribute("y", node.y + node.height / 2 + 4);
    t.setAttribute("text-anchor", "middle");
    t.classList.add("node-label");
    t.textContent = lbl;
    g.appendChild(t);
  }

  // PORTS
  const ports = computePortPositions(node);
  for (const [name, pos] of Object.entries(ports)) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.classList.add("port");
    c.dataset.nodeId = node.id;
    c.dataset.port = name;
    c.setAttribute("cx", pos.x);
    c.setAttribute("cy", pos.y);
    c.setAttribute("r", PORT_RADIUS);
    g.appendChild(c);
  }

  // RESIZE HANDLE
  if (selected) {
    const h = document.createElementNS(SVG_NS, 'rect');
    h.classList.add('resize-handle');
    h.setAttribute('x', node.x + node.width - 8);
    h.setAttribute('y', node.y + node.height - 8);
    h.setAttribute('width', 8);
    h.setAttribute('height', 8);
    h.dataset.nodeId = node.id;
    g.appendChild(h);
  }

  svg.appendChild(g);
}
