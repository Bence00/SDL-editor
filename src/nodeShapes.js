// =============================================================================
// nodeShapes.js — Professional modular shape-engine
// =============================================================================

import { SVG_NS } from './constants.js';
import { capitalize } from './utils.js';

// -----------------------------------------------------------------------------
// 1) DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_NODE_SIZE = { width: 140, height: 80 };

// centrally styled SVG defaults
const DEFAULT_FILL = "#ffffff";
const DEFAULT_STROKE = "#000";
const DEFAULT_STROKE_WIDTH = 1;

// -----------------------------------------------------------------------------
// 2) SHAPE PRIMITIVES
// -----------------------------------------------------------------------------

function svgEl(type, attrs = {}) {
  const el = document.createElementNS(SVG_NS, type);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

const SHAPES = {
  sideEllipseCapsule(node) {
    const { x, y, width: w, height: h } = node;

    const rx = w * 0.08; //arc
    const ry = h / 2;

    const cxLeft = x + rx;
    const cxRight = x + w - rx;
    const cy = y + ry;

    const d = `
      M ${cxLeft} ${y}
      H ${cxRight}

      A ${rx} ${ry} 0 0 1 ${cxRight} ${y + h}
      H ${cxLeft}

      A ${rx} ${ry} 0 0 1 ${cxLeft} ${y}

      Z
    `;

    return svgEl("path", {
      d,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },


  startOval(node) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    return svgEl("ellipse", {
      cx,
      cy,
      rx: node.width / 2,
      ry: node.height / 2,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- basic rectangle ------------------------------------------
  rect(node, cfg = {}) {
    return svgEl("rect", {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rx: 0,
      ry: 0,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": cfg.strokeWidth || DEFAULT_STROKE_WIDTH
    });
  },

  // --- rounded rectangle (SDL State) -----------------------------
  roundedRect(node, cfg = {}) {
    const r = cfg.radius ?? (node.height / 4);
    return svgEl("rect", {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rx: r,
      ry: r,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- full capsule (SDL START) ---------------------------------
  roundedFull(node) {
    const r = node.height / 2;
    return svgEl("rect", {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rx: r,
      ry: r,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- decision diamond ------------------------------------------
  diamond(node) {
    const { x, y, width: w, height: h } = node;
    const pts = [
      [x + w / 2, y],
      [x + w,     y + h / 2],
      [x + w / 2, y + h],
      [x,         y + h / 2]
    ];
    return svgEl("polygon", {
      points: pts.map(p => p.join(",")).join(" "),
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- input flag (SDL INPUT) -----------------------------------
  inputFlag(node) {
    const { x, y, width: w, height: h } = node;
    const fw = w * 0.2;
    const pts = [
      [x, y],
      [x + w, y],
      [x + w - fw, y + h / 2],
      [x + w, y + h],
      [x, y + h]
    ];
    return svgEl("polygon", {
      points: pts.map(p => p.join(",")).join(" "),
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- output arrow (SDL OUTPUT) --------------------------------
  outputArrow(node) {
    const { x, y, width: w, height: h } = node;
    const aw = w * 0.2;
    const pts = [
      [x,           y],
      [x + w - aw,  y],
      [x + w,       y + h / 2],
      [x + w - aw,  y + h],
      [x,           y + h]
    ];
    return svgEl("polygon", {
      points: pts.map(p => p.join(",")).join(" "),
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- stop X symbol (SDL STOP) ---------------------------------
  stopX(node) {
    const g = svgEl("g");
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const size = Math.min(node.width, node.height);
    const half = size / 2;

    const hitbox = svgEl("rect", {
      x: cx - half,
      y: cy - half,
      width: size,
      height: size,
      fill: DEFAULT_FILL,
      "fill-opacity": 0,
      stroke: "none"
    });
    g.appendChild(hitbox);

    const l1 = svgEl("line", {
      x1: cx - half, y1: cy - half,
      x2: cx + half, y2: cy + half,
      stroke: DEFAULT_STROKE,
      "stroke-width": 2
    });
    g.appendChild(l1);

    const l2 = svgEl("line", {
      x1: cx + half, y1: cy - half,
      x2: cx - half, y2: cy + half,
      stroke: DEFAULT_STROKE,
      "stroke-width": 2
    });
    g.appendChild(l2);

    return g;
  },

  // --- folded corner (SDL DECLARATION) ---------------------------
  foldCorner(node) {
    const { x, y, width: w, height: h } = node;
    const fold = Math.min(10, w * 0.2);

    const pts = [
      [x,          y],
      [x + w - fold, y],
      [x + w,        y + fold],
      [x + w,        y + h],
      [x,            y + h]
    ];
    return svgEl("polygon", {
      points: pts.map(p => p.join(",")).join(" "),
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": DEFAULT_STROKE_WIDTH
    });
  },

  // --- task with double horizontal lines -------------------------
  taskDouble(node) {
    const g = svgEl("g");
    g.appendChild(SHAPES.rect(node));

    const y1 = node.y + 4;
    const y2 = node.y + node.height - 4;

    g.appendChild(svgEl("line", {
      x1: node.x, y1,
      x2: node.x + node.width, y2: y1,
      stroke: DEFAULT_STROKE,
      "stroke-width": 1
    }));

    g.appendChild(svgEl("line", {
      x1: node.x, y1: y2,
      x2: node.x + node.width, y2,
      stroke: DEFAULT_STROKE,
      "stroke-width": 1
    }));

    return g;
  },

  // --- START TIMER ----------------------------------------------
  timerStart(node) {
    const g = svgEl("g");
    g.appendChild(SHAPES.rect(node));

    const cx = node.x + 10;
    const cy = node.y + node.height / 2;
    const r = 4;

    g.appendChild(svgEl("line", {
      x1: cx, y1: cy - r, x2: cx, y2: cy + r,
      stroke: DEFAULT_STROKE
    }));

    g.appendChild(svgEl("line", {
      x1: cx - r, y1: cy, x2: cx + r, y2: cy,
      stroke: DEFAULT_STROKE
    }));

    return g;
  },

  // --- STOP TIMER -----------------------------------------------
  timerStop(node) {
    const g = svgEl("g");
    g.appendChild(SHAPES.rect(node));

    const cx = node.x + 10;
    const cy = node.y + node.height / 2;
    const r = 4;

    g.appendChild(svgEl("line", {
      x1: cx - r, y1: cy - r,
      x2: cx + r, y2: cy + r,
      stroke: DEFAULT_STROKE
    }));

    g.appendChild(svgEl("line", {
      x1: cx + r, y1: cy - r,
      x2: cx - r, y2: cy + r,
      stroke: DEFAULT_STROKE
    }));

    return g;
  },

  // bold rectangle for PROCESS
  rectBold(node) {
    return svgEl("rect", {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rx: 0,
      ry: 0,
      fill: DEFAULT_FILL,
      stroke: DEFAULT_STROKE,
      "stroke-width": 2
    });
  }
};

// -----------------------------------------------------------------------------
// 3) PORT STRATEGIES
// -----------------------------------------------------------------------------

function defaultPorts(node) {
  return {
    top:    { x: node.x + node.width / 2, y: node.y },
    right:  { x: node.x + node.width,     y: node.y + node.height / 2 },
    bottom: { x: node.x + node.width / 2, y: node.y + node.height },
    left:   { x: node.x,                  y: node.y + node.height / 2 }
  };
}

function centerPorts(node) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  return {
    top: { x: cx, y: cy },
    bottom: { x: cx, y: cy },
    left: { x: cx, y: cy },
    right: { x: cx, y: cy }
  };
}

function inputFlagPorts(node) {
  const p = defaultPorts(node);
  // right port must go to the inner notch
  p.right.x = node.x + node.width * 0.8;
  return p;
}

function manualPorts(spec) {
  return (node) => {
    const out = {};
    for (const [name, conf] of Object.entries(spec)) {
      if (typeof conf === "function") {
        out[name] = conf(node);
      } else {
        out[name] = {
          x: node.x + node.width * (conf.relX ?? 0.5),
          y: node.y + node.height * (conf.relY ?? 0.5)
        };
      }
    }
    return out;
  };
}

const PORTS = {
  default: defaultPorts,
  center: centerPorts,
  inputPorts: inputFlagPorts,
  manual: manualPorts
};

// -----------------------------------------------------------------------------
// 4) NODE TYPE CONFIG (the good stuff)
// -----------------------------------------------------------------------------

export const NODE_TYPES = {

  start: {
    shape: "startOval",
    ports: "default",
    showLabel: true
  },

  state: {
    shape: "sideEllipseCapsule",
    ports: "default"
  },

  task: {
    shape: "rect",
    ports: "default"
  },

  code: {
    shape: "rect",
    ports: "default"
  },

  input: {
    shape: "inputFlag",
    ports: "inputPorts"
  },

  output: {
    shape: "outputArrow",
    ports: "default"
  },

  decision: {
    shape: "diamond",
    ports: "default"
  },

  stop: {
    shape: "stopX",
    ports: "center",
    showLabel: false
  },

  declaration: {
    shape: "foldCorner",
    ports: "default"
  },

  createTask: {
    shape: "taskDouble",
    ports: "default"
  },

  startTimer: {
    shape: "timerStart",
    ports: "default"
  },

  stopTimer: {
    shape: "timerStop",
    ports: "default"
  },

  process: {
    shape: "rectBold",
    ports: "default"
  },

  default: {
    shape: "rect",
    ports: "default"
  }
};

// -----------------------------------------------------------------------------
// 5) PUBLIC API
// -----------------------------------------------------------------------------

function getDescriptor(type) {
  return NODE_TYPES[type] || NODE_TYPES.default;
}

export function getDefaultSize(type) {
  const d = getDescriptor(type);
  return { ...(d.defaultSize || DEFAULT_NODE_SIZE) };
}

export function createBodyShape(node) {
  const d = getDescriptor(node.type);
  const shapeName = d.shape || "rect";
  return SHAPES[shapeName](node, d);
}

export function computePortPositions(node) {
  const d = getDescriptor(node.type);
  const strat = d.ports || "default";

  if (strat === "manual") {
    return PORTS.manual(d.manualSpec || {})(node);
  }

  return PORTS[strat](node);
}

export function getNodeLabel(node) {
  const d = getDescriptor(node.type);

  if (d.showLabel === false) return null;
  if (node.name) return node.name;
  if (typeof d.getLabel === "function") return d.getLabel(node);

  return capitalize(node.type);
}
