// app.js
const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = document.getElementById('canvas');
const palette = document.getElementById('palette');

// ------- Data model (keep it simple, extend later) -------

const state = {
  nodes: [],      // { id, type, x, y, width, height }
  edges: [],      // { id, fromNodeId, toNodeId }
  selectedNodeId: null,
  dragging: null, // { nodeId, offsetX, offsetY }
  resizing: null, // { nodeId, startWidth, startHeight, startMouseX, startMouseY }
  connecting: null, // { fromNodeId, tempLine }
  nextId: 1
};

function createNode(type, x, y) {
  const baseSize = { width: 120, height: 60 };
  const node = {
    id: String(state.nextId++),
    type,
    x: x - baseSize.width / 2,
    y: y - baseSize.height / 2,
    width: baseSize.width,
    height: baseSize.height
  };
  state.nodes.push(node);
  selectNode(node.id);
  render();
}

function createEdge(fromNodeId, toNodeId) {
  if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
  // avoid duplicate edges
  if (state.edges.some(e => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId)) return;

  const edge = {
    id: 'e' + state.nextId++,
    fromNodeId,
    toNodeId
  };
  state.edges.push(edge);
  render();
}

function getNodeById(id) {
  return state.nodes.find(n => n.id === id);
}

function selectNode(id) {
  state.selectedNodeId = id;
}

// ------- Rendering -------

function clearSvg() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

function ensureDefs() {
  // arrowhead marker for edges
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);

    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', '#444');
    marker.appendChild(path);

    defs.appendChild(marker);
  }
}

function render() {
  clearSvg();
  ensureDefs();
  renderEdges();
  state.nodes.forEach(renderNode);
}

// Edges: simple straight line between node centers
function renderEdges() {
  state.edges.forEach(edge => {
    const fromNode = getNodeById(edge.fromNodeId);
    const toNode = getNodeById(edge.toNodeId);
    if (!fromNode || !toNode) return;

    const line = document.createElementNS(SVG_NS, 'line');
    line.classList.add('edge-line');

    const from = getNodeCenter(fromNode);
    const to = getNodeCenter(toNode);

    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);

    svg.appendChild(line);
  });
}

function getNodeCenter(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2
  };
}

function renderNode(node) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('node');
  g.dataset.id = node.id;
  if (state.selectedNodeId === node.id) {
    g.classList.add('selected');
  }

  // body shape based on type
  let body;
  switch (node.type) {
    case 'decision': {
      // diamond (polygon)
      body = document.createElementNS(SVG_NS, 'polygon');
      const x = node.x;
      const y = node.y;
      const w = node.width;
      const h = node.height;
      const points = [
        [x + w / 2, y],
        [x + w, y + h / 2],
        [x + w / 2, y + h],
        [x, y + h / 2]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#fff7e6');
      body.setAttribute('stroke', '#c0c0c0ff');
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
      body.setAttribute('stroke', '#adadadff');
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
      body.setAttribute('stroke', '#a7a7a7ff');
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

  // body drag start
  body.addEventListener('mousedown', onNodeMouseDown);
  g.appendChild(body);

  // label
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', node.x + node.width / 2);
  label.setAttribute('y', node.y + node.height / 2 + 4);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '13');
  label.setAttribute('fill', '#333');
  label.textContent = capitalize(node.type);
  g.appendChild(label);

  // ports (top/right/bottom/left)
  const ports = computePortPositions(node);
  Object.entries(ports).forEach(([name, pos]) => {
    const port = document.createElementNS(SVG_NS, 'circle');
    port.classList.add('port');
    port.dataset.nodeId = node.id;
    port.dataset.port = name;
    port.setAttribute('cx', pos.x);
    port.setAttribute('cy', pos.y);
    port.setAttribute('r', 4);
    port.addEventListener('mousedown', onPortMouseDown);
    g.appendChild(port);
  });

  // resize handle (bottom-right)
  if (state.selectedNodeId === node.id) {
    const handleSize = 8;
    const handle = document.createElementNS(SVG_NS, 'rect');
    handle.classList.add('resize-handle');
    handle.setAttribute('x', node.x + node.width - handleSize);
    handle.setAttribute('y', node.y + node.height - handleSize);
    handle.setAttribute('width', handleSize);
    handle.setAttribute('height', handleSize);
    handle.dataset.nodeId = node.id;
    handle.addEventListener('mousedown', onResizeHandleMouseDown);
    g.appendChild(handle);
  }

  svg.appendChild(g);
}

function computePortPositions(node) {
  return {
    top: {
      x: node.x + node.width / 2,
      y: node.y
    },
    right: {
      x: node.x + node.width,
      y: node.y + node.height / 2
    },
    bottom: {
      x: node.x + node.width / 2,
      y: node.y + node.height
    },
    left: {
      x: node.x,
      y: node.y + node.height / 2
    }
  };
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ------- Palette drag & drop (create new nodes) -------

palette.addEventListener('dragstart', e => {
  const target = e.target;
  if (!target.classList.contains('palette-item')) return;

  const type = target.dataset.nodeType;
  e.dataTransfer.setData('application/x-sdl-node-type', type);
});

svg.addEventListener('dragover', e => {
  e.preventDefault(); // required for drop
});
svg.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('application/x-sdl-node-type');
  if (!type) return;

  const pt = clientToSvgPoint(e.clientX, e.clientY);
  createNode(type, pt.x, pt.y);
});

// ------- Node dragging -------

function onNodeMouseDown(e) {
  e.stopPropagation();
  const g = e.target.closest('.node');
  if (!g) return;
  const nodeId = g.dataset.id;
  const node = getNodeById(nodeId);
  if (!node) return;

  selectNode(nodeId);

  const pt = clientToSvgPoint(e.clientX, e.clientY);
  state.dragging = {
    nodeId,
    offsetX: pt.x - node.x,
    offsetY: pt.y - node.y
  };

  render(); // to show selection
}

svg.addEventListener('mousemove', e => {
  const pt = clientToSvgPoint(e.clientX, e.clientY);

  // dragging node
  if (state.dragging) {
    const node = getNodeById(state.dragging.nodeId);
    if (node) {
      node.x = pt.x - state.dragging.offsetX;
      node.y = pt.y - state.dragging.offsetY;
      render();
    }
  }

  // resizing node
  if (state.resizing) {
    const { nodeId, startWidth, startHeight, startMouseX, startMouseY } = state.resizing;
    const node = getNodeById(nodeId);
    if (node) {
      const dx = pt.x - startMouseX;
      const dy = pt.y - startMouseY;
      node.width = Math.max(40, startWidth + dx);
      node.height = Math.max(30, startHeight + dy);
      render();
    }
  }

  // connecting (temp edge)
  if (state.connecting && state.connecting.tempLine) {
    state.connecting.tempLine.setAttribute('x2', pt.x);
    state.connecting.tempLine.setAttribute('y2', pt.y);
  }
});

svg.addEventListener('mouseup', () => {
  state.dragging = null;
  state.resizing = null;
  // note: connecting is ended on mouseup in onPortMouseUp
});

svg.addEventListener('mousedown', e => {
  // click on empty space -> deselect
  if (e.target === svg) {
    state.selectedNodeId = null;
    render();
  }
});

// ------- Resizing -------

function onResizeHandleMouseDown(e) {
  e.stopPropagation();
  const nodeId = e.target.dataset.nodeId;
  const node = getNodeById(nodeId);
  if (!node) return;

  const pt = clientToSvgPoint(e.clientX, e.clientY);
  state.resizing = {
    nodeId,
    startWidth: node.width,
    startHeight: node.height,
    startMouseX: pt.x,
    startMouseY: pt.y
  };
}

// ------- Connecting (ports → ports) -------

function onPortMouseDown(e) {
  e.stopPropagation();
  const nodeId = e.target.dataset.nodeId;

  const pt = clientToSvgPoint(e.clientX, e.clientY);
  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add('temp-edge-line');
  line.setAttribute('x1', pt.x);
  line.setAttribute('y1', pt.y);
  line.setAttribute('x2', pt.x);
  line.setAttribute('y2', pt.y);
  svg.appendChild(line);

  state.connecting = {
    fromNodeId: nodeId,
    tempLine: line
  };

  // listen on svg for mouseup to finish connection
  svg.addEventListener('mouseup', onSvgMouseUpForConnection, { once: true });
}

function onSvgMouseUpForConnection(e) {
  const target = e.target;
  const fromNodeId = state.connecting?.fromNodeId;
  if (!fromNodeId) {
    cancelTempConnection();
    return;
  }

  if (target.classList.contains('port')) {
    const toNodeId = target.dataset.nodeId;
    createEdge(fromNodeId, toNodeId);
  }

  cancelTempConnection();
}

function cancelTempConnection() {
  if (state.connecting && state.connecting.tempLine) {
    svg.removeChild(state.connecting.tempLine);
  }
  state.connecting = null;
}

// ------- Utility: convert client -> SVG coords -------

function clientToSvgPoint(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: svgPt.x, y: svgPt.y };
}

// ------- Initial render -------

render();
