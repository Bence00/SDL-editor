import { SVG_NS } from './constants.js';
import { svg } from './dom.js';
import { state } from './state.js';
import { getNodeById, computePortPositions } from './model.js';
import { capitalize } from './utils.js';
import { createBodyShape } from './nodeShapes.js';


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
      fromSide = 'bottom';
      toSide = 'top';
    } else if (dy < 0) {
      fromSide = 'top';
      toSide = 'bottom';
    } else {
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

    const points = simpleManhattanRoute(from, to);
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

function simpleManhattanRoute(from, to) {
  const points = [];

  points.push({ x: from.x, y: from.y });

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    points.push({ x: to.x, y: to.y });
    return points;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    points.push({ x: to.x, y: from.y });
  } else {
    points.push({ x: from.x, y: to.y });
  }

  points.push({ x: to.x, y: to.y });

  return points;
}

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

function orthogonalBetween(a, b) {
  const pts = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 || dy === 0) {
    return pts;
  }

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

  // 1) shape
  const body = createBodyShape(node);
  g.appendChild(body);

  // 2) label
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', node.x + node.width / 2);
  label.setAttribute('y', node.y + node.height / 2 + 4);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '13');
  label.setAttribute('fill', '#333');
  label.textContent = capitalize(node.type);
  g.appendChild(label);

  // 3) ports
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

  svg.appendChild(g);

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


