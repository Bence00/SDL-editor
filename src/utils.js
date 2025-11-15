import { svg } from './dom.js';

export function clientToSvgPoint(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { x: clientX, y: clientY }; 
  }
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function snapPointToGrid(x, y, gridSize = 20) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}
