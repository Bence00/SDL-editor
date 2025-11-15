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

    let fromSide;
    let toSide;

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) {
        fromSide = 'bottom';
        toSide = 'top';
      } else {
        fromSide = 'top';
        toSide = 'bottom';
      }
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

    // Láthatatlan, vastag hitbox (ha használod)
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
      // simpleManhattanRoute(...) már megvan, abból jön a points tömb
      const p0 = points[0]; // port
      const p1 = points[1] || points[points.length - 1]; // első töréspont vagy cél

      // pont a két pont között
      let labelX = (p0.x + p1.x) / 2;
      let labelY = (p0.y + p1.y) / 2;

      let anchor = 'middle';

      // egy kicsit eltoljuk a vonaltól, hogy ne üljön pont rajta
      if (p0.y === p1.y) {
        // vízszintes szakasz
        labelY -= 6;           // a vonal fölé
      } else if (p0.x === p1.x) {
        // függőleges szakasz
        labelX += 6;           // kicsit jobbra
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



/**
 * Very simple Manhattan routing: from -> horizontal/vertical bend -> to.
 */
function simpleManhattanRoute(from, to) {
  const points = [];

  points.push({ x: from.x, y: from.y });

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // If almost aligned, just draw a straight line
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    points.push({ x: to.x, y: to.y });
    return points;
  }

  // One bend in the "dominant" axis
  if (Math.abs(dx) >= Math.abs(dy)) {
    points.push({ x: to.x, y: from.y });
  } else {
    points.push({ x: from.x, y: to.y });
  }

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

