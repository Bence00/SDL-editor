import { svg } from './dom.js';

export function clientToSvgPoint(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: svgPt.x, y: svgPt.y };
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
