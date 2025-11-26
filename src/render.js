import { SVG_NS } from './constants.js';
import { svg } from './dom.js';
import { state } from './state.js';
import { getNodeById } from './model.js';
import {
  createBodyShape,
  computePortPositions,
  getNodeLabel
} from './nodeShapes.js';

// ---------------------------------------------------------------------------
// DEFINITIONS — only once
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------------------
export function render() {
  clearSvg();
  ensureDefs();
  renderEdges();
  state.nodes.forEach(renderNode);
}

// ---------------------------------------------------------------------------
// CLEAR SVG
// ---------------------------------------------------------------------------
function clearSvg() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

// ---------------------------------------------------------------------------
// ORTHOGONAL ROUTING (unchanged logic, cleaned code)
// ---------------------------------------------------------------------------
function outwardPoint(p, side, offset) {
  switch (side) {
    case 'top':    return { x: p.x, y: p.y - offset };
    case 'bottom': return { x: p.x, y: p.y + offset };
    case 'left':   return { x: p.x - offset, y: p.y };
    case 'right':  return { x: p.x + offset, y: p.y };
    default:       return p;
  }
}

function orthogonalRoute(fromNode, fromSide, toNode, toSide, from, to) {
  const OFFSET = 15;
  const pts = [];

  pts.push({ x: from.x, y: from.y });

  const start = outwardPoint(from, fromSide, OFFSET);
  const end = outwardPoint(to, toSide, OFFSET);

  if (Math.abs(start.x - end.x) < 1 || Math.abs(start.y - end.y) < 1) {
    pts.push(start);
    pts.push(end);
  } else {
    pts.push(start);

    if (fromSide === 'left' || fromSide === 'right') {
      pts.push({ x: end.x, y: start.y });
    } else {
      pts.push({ x: start.x, y: end.y });
    }

    pts.push(end);
  }

  pts.push({ x: to.x, y: to.y });

  return pts;
}

// ---------------------------------------------------------------------------
// RENDER EDGES
// ---------------------------------------------------------------------------
function renderEdges() {
  const edgesGroup = document.createElementNS(SVG_NS, 'g');
  edgesGroup.id = "edges";

  for (const edge of state.edges) {
    const fromNode = getNodeById(edge.fromNodeId);
    const toNode = getNodeById(edge.toNodeId);
    if (!fromNode || !toNode) continue;

    const fromPorts = computePortPositions(fromNode);
    const toPorts = computePortPositions(toNode);

    const from = fromPorts[edge.fromPort || "right"];
    const to = toPorts[edge.toPort || "left"];
    if (!from || !to) continue;

    const pts = orthogonalRoute(
      fromNode,
      edge.fromPort,
      toNode,
      edge.toPort,
      from,
      to
    );

    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    const g = document.createElementNS(SVG_NS, 'g');
    g.dataset.edgeId = edge.id;

    // main line
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', d);
    line.setAttribute('class', 'edge-line');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    if (state.selectedEdgeId === edge.id) line.classList.add("selected");
    g.appendChild(line);

    // hitbox
    const hit = document.createElementNS(SVG_NS, 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('class', 'edge-hit');
    g.appendChild(hit);

    // decision label
    if (fromNode.type === "decision" && edge.label?.trim()) {
      const p0 = pts[0];
      const p1 = pts[1] || pts[pts.length - 1];
      const x = (p0.x + p1.x) / 2;
      const y = (p0.y + p1.y) / 2;

      const t = document.createElementNS(SVG_NS, 'text');
      t.textContent = edge.label;
      t.setAttribute('x', x);
      t.setAttribute('y', y - 6);
      t.classList.add('edge-label');
      g.appendChild(t);
    }

    edgesGroup.appendChild(g);
  }

  svg.appendChild(edgesGroup);
}

// ---------------------------------------------------------------------------
// RENDER NODE
// ---------------------------------------------------------------------------
function renderNode(node) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('node');
  g.dataset.id = node.id;

  const selected =
    state.selectedNodeId === node.id ||
    (state.selectedNodeIds && state.selectedNodeIds.includes(node.id));

  if (selected) g.classList.add("selected");

  // body
  g.appendChild(createBodyShape(node));

  // label
  const lbl = getNodeLabel(node);
  if (lbl) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute("x", node.x + node.width / 2);
    t.setAttribute("y", node.y + node.height / 2 + 4);
    t.setAttribute("text-anchor", "middle");
    t.classList.add("node-label");
    t.dataset.nodeId = node.id;
    t.textContent = lbl;
    g.appendChild(t);
  }

  // ports
  const ports = computePortPositions(node);
  for (const [name, pos] of Object.entries(ports)) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.classList.add("port");
    c.dataset.nodeId = node.id;
    c.dataset.port = name;
    c.setAttribute("cx", pos.x);
    c.setAttribute("cy", pos.y);
    c.setAttribute("r", 4.5);
    g.appendChild(c);
  }

  // resize handle (no bbox needed)
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

  g.addEventListener('mouseenter', () => g.classList.add('hovered'));
  g.addEventListener('mouseleave', () => g.classList.remove('hovered'));

  svg.appendChild(g);
}
