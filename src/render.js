import { SVG_NS } from './constants.js';
import { svg } from './dom.js';
import { state } from './state.js';
import { getNodeById, computePortPositions } from './model.js';
import { capitalize } from './utils.js';

export function render() {
  clearSvg();
  ensureDefs();
  renderEdges();
  state.nodes.forEach(renderNode);
}

function clearSvg() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

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
 * Render edges as port-to-port orthogonal paths.
 * Port is chosen dynamically based on relative node position:
 *  - B right of A  -> A.right -> B.left
 *  - B left of A   -> A.left  -> B.right
 *  - B below A     -> A.bottom-> B.top
 *  - B above A     -> A.top   -> B.bottom
 */
function renderEdges() {
  state.edges.forEach(edge => {
    const fromNode = getNodeById(edge.fromNodeId);
    const toNode = getNodeById(edge.toNodeId);
    if (!fromNode || !toNode) return;

    const fromCenter = {
      x: fromNode.x + fromNode.width / 2,
      y: fromNode.y + fromNode.height / 2
    };
    const toCenter = {
      x: toNode.x + toNode.width / 2,
      y: toNode.y + toNode.height / 2
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let fromSide, toSide;

    if (dy > 0) {
      // toNode is under fromNode
      fromSide = 'bottom';
      toSide = 'top';
    } else if (dy < 0) {
      // toNode is above fromNode
      fromSide = 'top';
      toSide = 'bottom';
    } else {
      // same vertical level (or very close) → horizontal
      if (dx >= 0) {
        fromSide = 'right';
        toSide = 'left';
      } else {
        fromSide = 'left';
        toSide = 'right';
      }
    }


    const fromPorts = computePortPositions(fromNode);
    const toPorts = computePortPositions(toNode);
    const from = fromPorts[fromSide];
    const to = toPorts[toSide];
    if (!from || !to) return;

    const points = manhattanRouteWithOutward(from, fromSide, to, toSide);
    const d = points
      .map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y)
      .join(' ');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'edge-line');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(path);
  });
}

/**
 * Better orthogonal routing:
 *  - from port -> small outward step (normal to node border)
 *  - orthogonal path between "outer" points
 *  - small inward step into target port
 */
function manhattanRouteWithOutward(from, fromSide, to, toSide) {
  const offset = 14; // distance from node border before turning

  const fromOut = outwardPoint(from, fromSide, offset);
  const toOut = outwardPoint(to, toSide, offset);

  const points = [];
  points.push({ x: from.x, y: from.y });      // exact port start
  points.push(fromOut);                       // step outward

  // Route between fromOut and toOut with simple L-shape
  const intermediates = orthogonalBetween(fromOut, toOut);
  points.push(...intermediates);

  points.push(toOut);                         // approach outside target
  points.push({ x: to.x, y: to.y });         // exact target port

  return points;
}

/** Outward from a side by offset (normal direction). */
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

/**
 * Simple orthogonal route between two points:
 * at least one 90° bend, no lying directly on node borders
 * (since we already stepped outward).
 */
function orthogonalBetween(a, b) {
  const pts = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 || dy === 0) {
    // already aligned horizontally or vertically
    // no extra midpoints needed
    return pts;
  }

  // Horizontal preference if |dx| >= |dy|
  if (Math.abs(dx) >= Math.abs(dy)) {
    const midX = a.x + dx / 2;
    pts.push({ x: midX, y: a.y });
    pts.push({ x: midX, y: b.y });
  } else {
    const midY = a.y + dy / 2;
    pts.push({ x: a.x, y: midY });
    pts.push({ x: b.x, y: midY });
  }

  return pts;
}

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

  const body = createBodyShape(node);
  g.appendChild(body);

  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', node.x + node.width / 2);
  label.setAttribute('y', node.y + node.height / 2 + 4);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '13');
  label.setAttribute('fill', '#333');
  label.textContent = capitalize(node.type);
  g.appendChild(label);

  const ports = computePortPositions(node);
  Object.entries(ports).forEach(([name, pos]) => {
    const port = document.createElementNS(SVG_NS, 'circle');
    port.classList.add('port');
    port.dataset.nodeId = node.id;
    port.dataset.port = name;
    port.setAttribute('cx', pos.x);
    port.setAttribute('cy', pos.y);
    port.setAttribute('r', 4);
    g.appendChild(port);
  });

  if (state.selectedNodeId === node.id) {
    const handleSize = 8;
    const handle = document.createElementNS(SVG_NS, 'rect');
    handle.classList.add('resize-handle');
    handle.setAttribute('x', node.x + node.width - handleSize);
    handle.setAttribute('y', node.y + node.height - handleSize);
    handle.setAttribute('width', handleSize);
    handle.setAttribute('height', handleSize);
    handle.dataset.nodeId = node.id;
    g.appendChild(handle);
  }

  svg.appendChild(g);
}

function createBodyShape(node) {
  let body;

  switch (node.type) {
    case 'decision': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const x = node.x;
      const y = node.y;
      const w = node.width;
      const h = node.height;
      const points = [
        [x + w / 2, y],
        [x + w,     y + h / 2],
        [x + w / 2, y + h],
        [x,         y + h / 2]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#fff7e6');
      body.setAttribute('stroke', '#c27c0e');
      body.setAttribute('stroke-width', '1.2');
      break;
    }
    case 'signal': {
      body = document.createElementNS(SVG_NS, 'ellipse');
      body.setAttribute('cx', node.x + node.width / 2);
      body.setAttribute('cy', node.y + node.height / 2);
      body.setAttribute('rx', node.width / 2);
      body.setAttribute('ry', node.height / 2);
      body.setAttribute('fill', '#e3fafc');
      body.setAttribute('stroke', '#0b7285');
      body.setAttribute('stroke-width', '1.2');
      break;
    }
    case 'state': {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', node.x);
      body.setAttribute('y', node.y);
      body.setAttribute('width', node.width);
      body.setAttribute('height', node.height);
      body.setAttribute('rx', 2);
      body.setAttribute('ry', 2);
      body.setAttribute('fill', '#eef3ff');
      body.setAttribute('stroke', '#1f6feb');
      body.setAttribute('stroke-width', '1.2');
      break;
    }
    case 'process':
    default: {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', node.x);
      body.setAttribute('y', node.y);
      body.setAttribute('width', node.width);
      body.setAttribute('height', node.height);
      body.setAttribute('rx', 6);
      body.setAttribute('ry', 6);
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#333');
      body.setAttribute('stroke-width', '1.2');
    }
  }

  return body;
}
