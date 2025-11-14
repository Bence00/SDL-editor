import { SVG_NS } from './constants.js';

export function createBodyShape(node) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;

  let body;

  switch (node.type) {

    /* --- START ----------------------------------------------------- */
    case 'start': {
      body = document.createElementNS(SVG_NS, 'rect');
      body.setAttribute('x', x);
      body.setAttribute('y', y);
      body.setAttribute('width', w);
      body.setAttribute('height', h);
      body.setAttribute('rx', h / 2);
      body.setAttribute('ry', h / 2);
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- STATE ----------------------------------------------------- */
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

    /* --- INPUT ----------------------------------------------------- */
    case 'input': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const flagWidth = w * -0.2;
      const points = [
        [x,                 y],
        [x + w - flagWidth, y],
        [x + w,             y + h / 2],
        [x + w - flagWidth, y + h],
        [x,                 y + h]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- OUTPUT ---------------------------------------------------- */
    case 'output': {
      body = document.createElementNS(SVG_NS, 'polygon');
      const arrowWidth = w * 0.3;
      const points = [
        [x,                 y],
        [x + w - arrowWidth, y],
        [x + w,             y + h / 2],
        [x + w - arrowWidth, y + h],
        [x,                 y + h]
      ];
      body.setAttribute('points', points.map(p => p.join(',')).join(' '));
      body.setAttribute('fill', '#ffffff');
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1');
      break;
    }

    /* --- START TIMER ---------------------------------------------- */
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

    /* --- STOP TIMER ----------------------------------------------- */
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

    /* --- DECISION -------------------------------------------------- */
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

    /* --- DECLARATION ----------------------------------------------- */
    case 'declaration': {
      body = document.createElementNS(SVG_NS, 'polygon');
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
      break;
    }

    /* --- CREATE TASK ----------------------------------------------- */
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

    /* --- DEFAULT (PROCESS / CODE) ---------------------------------- */
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
