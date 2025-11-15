import { SVG_NS } from './constants.js';
import { svg } from './dom.js';
import { state } from './state.js';
import { getNodeById } from './model.js';
import {
  createBodyShape,
  computePortPositions,
  getNodeLabel
} from './nodeShapes.js';

/**
 * Entry point: clears SVG and renders edges + all nodes.
 */
export function render() {
  clearSvg();
  ensureDefs();
  renderEdges();
  state.nodes.forEach(renderNode);
}

/**
 * Remove all children from the root SVG.
 */
function clearSvg() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

/**
 * Ensure definitions (like arrow markers) exist in the SVG.
 */
function ensureDefs() {
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

/**
 * Render all edges between nodes.
 */
function renderEdges() {
  state.edges.forEach(edge => {
    const fromNode = getNodeById(edge.fromNodeId);
    const toNode = getNodeById(edge.toNodeId);
    if (!fromNode || !toNode) return;

    const fromPorts = computePortPositions(fromNode);
    const toPorts = computePortPositions(toNode);

    // A TÉNYLEGESEN használt portok a state-ből jönnek
    const fromSide = edge.fromPort || 'right';
    const toSide = edge.toPort || 'left';

    const from = fromPorts[fromSide];
    const to = toPorts[toSide];
    if (!from || !to) return;

    const points = orthogonalRoute(fromNode, fromSide, toNode, toSide, from, to);

    const d = points
      .map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y)
      .join(' ');

    // Vizuális edge
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'edge-line');
    path.dataset.edgeId = edge.id;
    path.setAttribute('marker-end', 'url(#arrowhead)');

    if (state.selectedEdgeId === edge.id) {
      path.classList.add('selected');
    }
    svg.appendChild(path);

    // Láthatatlan, vastag hitbox
    const hitPath = document.createElementNS(SVG_NS, 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('class', 'edge-hit');
    hitPath.dataset.edgeId = edge.id;
    svg.appendChild(hitPath);

    // --------- EDGE LABEL A DECISION-BŐL KIJÖVŐ ÁGRA ---------
    if (
      fromNode.type === 'decision' &&
      edge.label &&
      edge.label.trim() !== ''
    ) {
      // edge eleje -> első szegmens közepe
      const p0 = points[0]; // port
      const p1 = points[1] || points[points.length - 1]; // első töréspont vagy cél

      let labelX = (p0.x + p1.x) / 2;
      let labelY = (p0.y + p1.y) / 2;
      let anchor = 'middle';

      if (p0.y === p1.y) {
        // vízszintes szakasz
        labelY -= 6;
      } else if (p0.x === p1.x) {
        // függőleges szakasz
        labelX += 6;
        anchor = 'start';
      }

      const labelEl = document.createElementNS(SVG_NS, 'text');
      labelEl.classList.add('edge-label');
      labelEl.dataset.edgeId = edge.id;
      labelEl.setAttribute('x', labelX);
      labelEl.setAttribute('y', labelY);
      labelEl.setAttribute('text-anchor', anchor);
      labelEl.setAttribute('font-size', '11');
      labelEl.setAttribute('fill', '#333');
      labelEl.textContent = edge.label;

      svg.appendChild(labelEl);
    }
  });
}



// Kis kilépés a node-ból, hogy ne a kereten csússzon a vonal
function outwardPoint(p, side, offset) {
  switch (side) {
    case 'top':
      return { x: p.x, y: p.y - offset };
    case 'bottom':
      return { x: p.x, y: p.y + offset };
    case 'left':
      return { x: p.x - offset, y: p.y };
    case 'right':
      return { x: p.x + offset, y: p.y };
    default:
      return { x: p.x, y: p.y };
  }
}

function orthogonalRoute(fromNode, fromSide, toNode, toSide, from, to) {
  const OFFSET = 15; // mennyire lógjon ki a nodeból az első/utolsó szegmens

  const points = [];

  // 1) indulás a portból
  points.push({ x: from.x, y: from.y });

  // 2) kifelé a source node-ból
  const start = outwardPoint(from, fromSide, OFFSET);

  // 3) befelé a target node felé (de még előtte megállunk)
  const end = outwardPoint(to, toSide, OFFSET);

  // ha nagyon közel vannak, engedjük meg az egyszerű L-t
  if (Math.abs(start.x - end.x) < 1 || Math.abs(start.y - end.y) < 1) {
    points.push(start);
    points.push(end);
  } else {
    points.push(start);

    // köztes törés – egy sima "L" alak a szabad térben
    if (fromSide === 'left' || fromSide === 'right') {
      // vízszintesen indulunk → előbb végig abban az y-ban, aztán le/fel
      points.push({ x: end.x, y: start.y });
    } else {
      // fentről/lentről indulunk → előbb végig abban az x-ben, aztán jobbra/balra
      points.push({ x: start.x, y: end.y });
    }

    points.push(end);
  }

  // 4) utolsó szegmens: from "end" pont → target port
  points.push({ x: to.x, y: to.y });

  return points;
}

/**
 * Render a single node group (<g>): body, label, ports, and resize handle.
 */
function renderNode(node) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('node');
  g.dataset.id = node.id;

  const isSelected =
    state.selectedNodeId === node.id ||
    (state.selectedNodeIds && state.selectedNodeIds.includes(node.id));

  if (isSelected) {
    g.classList.add('selected');
  }

  // --- Double click on node → rename ---
  

  // 1) Shape (type-specific SVG body)
  const body = createBodyShape(node);
  g.appendChild(body);

  // 2) Label (optional – some types hide labels)
  const text = getNodeLabel(node);
  if (text) {
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', node.x + node.width / 2);
    label.setAttribute('y', node.y + node.height / 2 + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '13');
    label.setAttribute('fill', '#333');
    label.textContent = text;

    // Keep class/dataset if you ever want label-specific logic
    label.classList.add('node-label');
    label.dataset.nodeId = node.id;

    g.appendChild(label);
  }

  // 3) Ports (type-specific positions)
  const ports = computePortPositions(node);
  Object.entries(ports).forEach(([name, pos]) => {
    const port = document.createElementNS(SVG_NS, 'circle');
    port.classList.add('port');
    port.dataset.nodeId = node.id;
    port.dataset.port = name;
    port.setAttribute('cx', pos.x);
    port.setAttribute('cy', pos.y);
    port.setAttribute('r', 4.5); //port radius
    g.appendChild(port);
  });

  g.addEventListener('mouseenter', () => {
    g.classList.add('hovered');
  });
  g.addEventListener('mouseleave', () => {
      g.classList.remove('hovered');
  });

  svg.appendChild(g);

  // 4) Resize handle for selected nodes
  if (isSelected) {
    const bbox = g.getBBox();
    const handleSize = 8;

    const handle = document.createElementNS(SVG_NS, 'rect');
    handle.classList.add('resize-handle');
    handle.setAttribute('x', bbox.x + bbox.width - handleSize);
    handle.setAttribute('y', bbox.y + bbox.height - handleSize);
    handle.setAttribute('width', handleSize);
    handle.setAttribute('height', handleSize);
    handle.dataset.nodeId = node.id;

    g.appendChild(handle);
  }
}

