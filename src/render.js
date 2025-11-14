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
  const offset = 20; // distance from node border before turning

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

  // 3) ports (maradhatnak a node.x/node.width alapján)
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

  // 4) először fűzzük be a groupot az SVG-be, hogy legyen bbox
  svg.appendChild(g);

  // 5) csak most rakjuk ki a resize handle-t, a VALÓDI bbox alapján
  if (isSelected) {
    const bbox = g.getBBox();      // <- tényleges határoló téglalap
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

function createBodyShape(node) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;

  let body;

  switch (node.type) {
    /* --- START (pill) ----------------------------------------------------- */
    case 'start': {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', x);
      body.setAttribute('y', y);
      body.setAttribute('width', w);
      body.setAttribute('height', h);
      // pill: radius = half height
      body.setAttribute('rx', h / 2);
      body.setAttribute('ry', h / 2);
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- STATE (rounded rectangle) --------------------------------------- */
    case 'state': {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', x);
      body.setAttribute('y', y);
      body.setAttribute('width', w);
      body.setAttribute('height', h);
      body.setAttribute('rx', h / 4);
      body.setAttribute('ry', h / 4);
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- INPUT (flag on right) ------------------------------------------- */
    case 'input': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const flagWidth = w * -0.2;
      
      const points = [
        [x,           y],
        [x + w - flagWidth, y],
        [x + w,       y + h / 2],
        [x + w - flagWidth, y + h],
        [x,           y + h]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- OUTPUT (arrow on right) ----------------------------------------- */
    case 'output': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const arrowWidth = w * 0.3;
      const points = [
        [x,              y],
        [x + w - arrowWidth, y],
        [x + w,          y + h / 2],
        [x + w - arrowWidth, y + h],
        [x,              y + h]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- START TIMER (rect + small star/plus on left) -------------------- */
    case 'startTimer': {
      body = document.createElementNS(SVG_NS, 'g');

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '1');
      body.appendChild(rect);

      const cx = x + 10;
      const cy = y + h / 2;
      const r = 4;

      const v = document.createElementNS(SVG_NS, 'line');
      v.setAttribute('x1', cx);
      v.setAttribute('y1', cy - r);
      v.setAttribute('x2', cx);
      v.setAttribute('y2', cy + r);
      v.setAttribute('stroke', '#000');
      v.setAttribute('stroke-width', '1');
      body.appendChild(v);

      const hLine = document.createElementNS(SVG_NS, 'line');
      hLine.setAttribute('x1', cx - r);
      hLine.setAttribute('y1', cy);
      hLine.setAttribute('x2', cx + r);
      hLine.setAttribute('y2', cy);
      hLine.setAttribute('stroke', '#000');
      hLine.setAttribute('stroke-width', '1');
      body.appendChild(hLine);

      break;
    }

    /* --- STOP TIMER (rect + small X on left) ----------------------------- */
    case 'stopTimer': {
      body = document.createElementNS(SVG_NS, 'g');

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '1');
      body.appendChild(rect);

      const cx = x + 10;
      const cy = y + h / 2;
      const r = 4;

      const l1 = document.createElementNS(SVG_NS, 'line');
      l1.setAttribute('x1', cx - r);
      l1.setAttribute('y1', cy - r);
      l1.setAttribute('x2', cx + r);
      l1.setAttribute('y2', cy + r);
      l1.setAttribute('stroke', '#000');
      l1.setAttribute('stroke-width', '1');
      body.appendChild(l1);

      const l2 = document.createElementNS(SVG_NS, 'line');
      l2.setAttribute('x1', cx - r);
      l2.setAttribute('y1', cy + r);
      l2.setAttribute('x2', cx + r);
      l2.setAttribute('y2', cy - r);
      l2.setAttribute('stroke', '#000');
      l2.setAttribute('stroke-width', '1');
      body.appendChild(l2);

      break;
    }

    /* --- DECISION (diamond) ---------------------------------------------- */
    case 'decision': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const points = [
        [x + w / 2, y],
        [x + w,     y + h / 2],
        [x + w / 2, y + h],
        [x,         y + h / 2]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- DECLARATION (rect with folded top-right corner) ----------------- */
    case 'declaration': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const fold = Math.min(10, w * 0.2);
      const points = [
        [x,          y],
        [x + w - fold, y],
        [x + w,      y + fold],
        [x + w,      y + h],
        [x,          y + h]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- CREATE TASK (rect with bottom bar) ------------------------------ */
    case 'createTask': {
      body = document.createElementNS(SVG_NS, 'g');

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '1');
      body.appendChild(rect);

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', y + h - 4);
      line.setAttribute('x2', x + w);
      line.setAttribute('y2', y + h - 4);
      line.setAttribute('stroke', '#000');
      line.setAttribute('stroke-width', '1');
      body.appendChild(line);

      break;
    }

    /* --- PLAIN C CODE / PROCESS (simple rect) ---------------------------- */
    case 'code':
    case 'process':
    default: {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', x);
      body.setAttribute('y', y);
      body.setAttribute('width', w);
      body.setAttribute('height', h);
      body.setAttribute('rx', 0);
      body.setAttribute('ry', 0);
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }
  }

  return body;
}

