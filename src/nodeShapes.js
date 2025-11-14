import { SVG_NS } from './constants.js';
import { capitalize } from './utils.js';

// -------------------------------------------------------------------
// Shared helpers
// -------------------------------------------------------------------

const DEFAULT_NODE_SIZE = { width: 120, height: 60 };

/**
 * Default port positions: 4 ports on the middle of each side.
 */
function defaultPorts(node) {
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

export function manualPorts(portsSpec = {}) {
  return function (node) {
    const result = {};

    for (const [name, spec] of Object.entries(portsSpec)) {
      if (typeof spec === 'function') {
        // Fully custom coordinate function
        result[name] = spec(node);
      } else {
        // Relative position inside the node bounding box
        const relX = spec.relX ?? 0.5;
        const relY = spec.relY ?? 0.5;

        result[name] = {
          x: node.x + node.width * relX,
          y: node.y + node.height * relY
        };
      }
    }

    return result;
  };
}

/**
 * Basic rectangle helper with optional rounded corners.
 */
function createRect(node, { rounded = false } = {}) {
  const body = document.createElementNS(SVG_NS, 'rect');
  body.setAttribute('x', node.x);
  body.setAttribute('y', node.y);
  body.setAttribute('width', node.width);
  body.setAttribute('height', node.height);
  body.setAttribute('fill', '#ffffff');
  body.setAttribute('stroke', '#000');
  body.setAttribute('stroke-width', '1');

  if (rounded) {
    const r = node.height / 4;
    body.setAttribute('rx', r);
    body.setAttribute('ry', r);
  } else {
    body.setAttribute('rx', 0);
    body.setAttribute('ry', 0);
  }

  return body;
}

//----------SHAPES-----------

// STATE 
const STATE_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    return createRect(node, { rounded: true });
  }
};
// TASK 
const TASK_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    return createRect(node, { rounded: false });
  }
};
// INPUT
const INPUT_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
    computePorts: manualPorts({
    top:    { relX: 0.5, relY: 0    },
    bottom: { relX: 0.5, relY: 1    },
    left:   { relX: 0,   relY: 0.5  },

    // RIGHT: custom absolute function
    right: (node) => {
      const x = node.x;
      const y = node.y;
      const w = node.width;
      const h = node.height;

      const flagWidth = w * 0.2;

      return {
        x: x + w - flagWidth,   // inner right edge
        y: y + h / 2            // vertical middle
      };
    }
  }),

  createBody(node) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;

    const body = document.createElementNS(SVG_NS, 'polygon');
    const flagWidth = w * 0.2;
    const points = [
      [x, y],
      [x + w, y],
      [x + w - flagWidth, y + h / 2],
      [x + w, y + h],
      [x, y + h]
    ];
    body.setAttribute('points', points.map(p => p.join(',')).join(' '));
    body.setAttribute('fill', '#ffffff');
    body.setAttribute('stroke', '#000');
    body.setAttribute('stroke-width', '1');
    return body;
  }
};
// OUTPUT
const OUTPUT_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;

    const body = document.createElementNS(SVG_NS, 'polygon');
    const arrowWidth = w * 0.2;
    const points = [
      [x,                  y],
      [x + w - arrowWidth, y],
      [x + w,              y + h / 2],
      [x + w - arrowWidth, y + h],
      [x,                  y + h]
    ];
    body.setAttribute('points', points.map(p => p.join(',')).join(' '));
    body.setAttribute('fill', '#ffffff');
    body.setAttribute('stroke', '#000');
    body.setAttribute('stroke-width', '1');
    return body;
  }
};
// START 
const START_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: false,
  computePorts: defaultPorts,
  createBody(node) {
    const body = document.createElementNS(SVG_NS, 'rect');
    body.setAttribute('x', node.x);
    body.setAttribute('y', node.y);
    body.setAttribute('width', node.width);
    body.setAttribute('height', node.height);
    body.setAttribute('rx', node.height / 2); 
    body.setAttribute('ry', node.height / 2);
    body.setAttribute('fill', '#ffffff');
    body.setAttribute('stroke', '#000');
    body.setAttribute('stroke-width', '1');
    return body;
  }
};
// STOP
const STOP_TYPE = {
  defaultSize: { width: 40, height: 40 },
  showLabel: false,

  computePorts: manualPorts({
     top:    { relX: 0.5, relY: 0.5 }
  }),

  createBody(node) {
    const g = document.createElementNS(SVG_NS, 'g');

    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    const scale = 0.6;
    const size = Math.min(node.width, node.height) * scale;
    const half = size / 2;
    const strokeWidth = 2;

    // Invisible hitbox: exactly the bounding box of the X
    const hitbox = document.createElementNS(SVG_NS, 'rect');
    hitbox.setAttribute('x', cx - half);
    hitbox.setAttribute('y', cy - half);
    hitbox.setAttribute('width', size);
    hitbox.setAttribute('height', size);
    hitbox.setAttribute('fill', '#ffffff');
    hitbox.setAttribute('fill-opacity', '0');
    hitbox.setAttribute('stroke', 'none');
    g.appendChild(hitbox);

    // Diagonal line 1
    const l1 = document.createElementNS(SVG_NS, 'line');
    l1.setAttribute('x1', cx - half);
    l1.setAttribute('y1', cy - half);
    l1.setAttribute('x2', cx + half);
    l1.setAttribute('y2', cy + half);
    l1.setAttribute('stroke', '#000');
    l1.setAttribute('stroke-width', strokeWidth);
    g.appendChild(l1);

    // Diagonal line 2
    const l2 = document.createElementNS(SVG_NS, 'line');
    l2.setAttribute('x1', cx + half);
    l2.setAttribute('y1', cy - half);
    l2.setAttribute('x2', cx - half);
    l2.setAttribute('y2', cy + half);
    l2.setAttribute('stroke', '#000');
    l2.setAttribute('stroke-width', strokeWidth);
    g.appendChild(l2);

    return g;
  }
};
// DECISION 
const DECISION_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;

    const body = document.createElementNS(SVG_NS, 'polygon');
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
    return body;
  }
};
// DECLARATION
const DECLARATION_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;

    const body = document.createElementNS(SVG_NS, 'polygon');
    const fold = Math.min(10, w * 0.2);
    const points = [
      [x,            y],
      [x + w - fold, y],
      [x + w,        y + fold],
      [x + w,        y + h],
      [x,            y + h]
    ];
    body.setAttribute('points', points.map(p => p.join(',')).join(' '));
    body.setAttribute('fill', '#ffffff');
    body.setAttribute('stroke', '#000');
    body.setAttribute('stroke-width', '1');
    return body;
  }
};
// TASK 
const CREATE_TASK_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,

  createBody(node) {
    const g = document.createElementNS(SVG_NS, 'g');

    const rect = createRect(node, { rounded: false });
    g.appendChild(rect);

    const topLine = document.createElementNS(SVG_NS, 'line');
    topLine.setAttribute('x1', node.x);
    topLine.setAttribute('y1', node.y + 4);  
    topLine.setAttribute('x2', node.x + node.width);
    topLine.setAttribute('y2', node.y + 4);
    topLine.setAttribute('stroke', '#000');
    topLine.setAttribute('stroke-width', '1');
    g.appendChild(topLine);

    const bottomLine = document.createElementNS(SVG_NS, 'line');
    bottomLine.setAttribute('x1', node.x);
    bottomLine.setAttribute('y1', node.y + node.height - 4);
    bottomLine.setAttribute('x2', node.x + node.width);
    bottomLine.setAttribute('y2', node.y + node.height - 4);
    bottomLine.setAttribute('stroke', '#000');
    bottomLine.setAttribute('stroke-width', '1');
    g.appendChild(bottomLine);

    return g;
  }
};
// START TIMER 
const START_TIMER_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const g = document.createElementNS(SVG_NS, 'g');

    const rect = createRect(node, { rounded: false });
    g.appendChild(rect);

    const cx = node.x + 10;
    const cy = node.y + node.height / 2;
    const r = 4;

    const v = document.createElementNS(SVG_NS, 'line');
    v.setAttribute('x1', cx);
    v.setAttribute('y1', cy - r);
    v.setAttribute('x2', cx);
    v.setAttribute('y2', cy + r);
    v.setAttribute('stroke', '#000');
    v.setAttribute('stroke-width', '1');
    g.appendChild(v);

    const h = document.createElementNS(SVG_NS, 'line');
    h.setAttribute('x1', cx - r);
    h.setAttribute('y1', cy);
    h.setAttribute('x2', cx + r);
    h.setAttribute('y2', cy);
    h.setAttribute('stroke', '#000');
    h.setAttribute('stroke-width', '1');
    g.appendChild(h);

    return g;
  }
};
// STOP TIMER
const STOP_TIMER_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const g = document.createElementNS(SVG_NS, 'g');

    const rect = createRect(node, { rounded: false });
    g.appendChild(rect);

    const cx = node.x + 10;
    const cy = node.y + node.height / 2;
    const r = 4;

    const l1 = document.createElementNS(SVG_NS, 'line');
    l1.setAttribute('x1', cx - r);
    l1.setAttribute('y1', cy - r);
    l1.setAttribute('x2', cx + r);
    l1.setAttribute('y2', cy + r);
    l1.setAttribute('stroke', '#000');
    l1.setAttribute('stroke-width', '1');
    g.appendChild(l1);

    const l2 = document.createElementNS(SVG_NS, 'line');
    l2.setAttribute('x1', cx - r);
    l2.setAttribute('y1', cy + r);
    l2.setAttribute('x2', cx + r);
    l2.setAttribute('y2', cy - r);
    l2.setAttribute('stroke', '#000');
    l2.setAttribute('stroke-width', '1');
    g.appendChild(l2);

    return g;
  }
};
// PROCESS
const PROCESS_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    const body = createRect(node, { rounded: false });
    body.setAttribute('stroke-width', '2');
    return body;
  }
};
// Fallback type 
const DEFAULT_TYPE = {
  defaultSize: { ...DEFAULT_NODE_SIZE },
  showLabel: true,
  computePorts: defaultPorts,
  createBody(node) {
    return createRect(node, { rounded: false });
  }
};

// -------------------------------------------------------------------
// Registry
// -------------------------------------------------------------------

const NODE_TYPES = {
  // SDL core types
  start: START_TYPE,
  state: STATE_TYPE,
  input: INPUT_TYPE,
  output: OUTPUT_TYPE,
  decision: DECISION_TYPE,
  task: TASK_TYPE,
  stop: STOP_TYPE,

  // Extra / aliases
  code: TASK_TYPE,
  process: PROCESS_TYPE,
  declaration: DECLARATION_TYPE,
  createTask: CREATE_TASK_TYPE,
  startTimer: START_TIMER_TYPE,
  stopTimer: STOP_TIMER_TYPE,

  default: DEFAULT_TYPE
};

function getTypeDescriptor(type) {
  return NODE_TYPES[type] || NODE_TYPES.default;
}

// -------------------------------------------------------------------
// Public API – this is what the rest of the app should use
// -------------------------------------------------------------------

/**
 * Returns the default size for a given node type.
 */
export function getDefaultSize(type) {
  return { ...getTypeDescriptor(type).defaultSize };
}

/**
 * Creates the body SVG element for a given node.
 */
export function createBodyShape(node) {
  const desc = getTypeDescriptor(node.type);
  return desc.createBody(node);
}

/**
 * Computes the port positions for a given node.
 */
export function computePortPositions(node) {
  const desc = getTypeDescriptor(node.type);
  if (typeof desc.computePorts === 'function') {
    return desc.computePorts(node);
  }
  return defaultPorts(node);
}

/**
 * Returns the label text for a given node, or null if
 * the node should not display any label.
 */
export function getNodeLabel(node) {
  const desc = getTypeDescriptor(node.type);
  if (desc.showLabel === false) {
    return null;
  }
  if (typeof desc.getLabel === 'function') {
    return desc.getLabel(node);
  }
  return capitalize(node.type);
}
