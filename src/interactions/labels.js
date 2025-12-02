import { svg } from '../dom.js';
import { state, saveStateForUndo } from '../state.js';
import { render } from '../render.js';
import { getNodeById } from '../model.js';
import { getNodeLabel } from '../nodeShapes.js';

export function initLabelInteractions() {
  svg.addEventListener('dblclick', onSvgDoubleClick);
}

function onSvgDoubleClick(e) {
  const target = e.target;

  // 1) Node label editing
  const nodeGroup = target.closest('.node');
  if (nodeGroup) {
    editNodeLabel(nodeGroup);
    return;
  }

  // 2) Edge label editing
  const edgeEl =
    target.closest('.edge-line') ||
    target.closest('.edge-hit') ||
    target.closest('.edge-label');

  if (edgeEl) {
    editEdgeLabel(edgeEl);
    return;
  }
}

// --- Node Label Editing ---

function editNodeLabel(nodeGroup) {
  const nodeId = nodeGroup.dataset.id;
  const node = getNodeById(nodeId);
  if (!node) return;

  const currentLabel = getNodeLabel(node);
  if (currentLabel === null) return;

  const bbox = nodeGroup.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const { screenPt, input } = createLabelInput(
    centerX,
    centerY,
    currentLabel,
    '13px'
  );
  positionLabelInput(input, screenPt);

  document.body.appendChild(input);
  input.focus();
  input.select();

  let finished = false;

  function finishEdit(applyChange) {
    if (finished) return;
    finished = true;
    saveStateForUndo();
    if (applyChange) {
      const trimmed = input.value.trim();
      if (trimmed === '') {
        delete node.name;
      } else {
        node.name = trimmed;
      }
      render();
    }

    removeLabelInput(input, onBlur, onKeyDown);
  }

  const onBlur = () => finishEdit(true);
  const onKeyDown = ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEdit(true);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEdit(false);
    }
  };

  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeyDown);
}

// --- Edge Label Editing ---

function editEdgeLabel(edgeEl) {
  const edgeId = edgeEl.dataset.edgeId;
  if (!edgeId) return;

  const edge = state.edges.find(ed => String(ed.id) === String(edgeId));
  if (!edge) return;

  const fromNode = getNodeById(edge.fromNodeId);
  // Only allow editing for edges originating from a 'decision' node
  if (!fromNode || fromNode.type !== 'decision') {
    return;
  }

  const currentLabel = edge.label || '';

  const visualEdgeEl = svg.querySelector(
    `.edge-line[data-edge-id="${edgeId}"]`
  );
  if (!visualEdgeEl) return;

  const bbox = visualEdgeEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const { screenPt, input } = createLabelInput(
    centerX,
    centerY,
    currentLabel,
    '11px'
  );
  positionLabelInput(input, screenPt);

  document.body.appendChild(input);
  input.focus();
  input.select();

  let finished = false;

  function finishEdit(applyChange) {
    if (finished) return;
    finished = true;
    saveStateForUndo();
    if (applyChange) {
      edge.label = input.value.trim();
      render();
    }

    removeLabelInput(input, onBlur, onKeyDown);
  }

  const onBlur = () => finishEdit(true);
  const onKeyDown = ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEdit(true);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEdit(false);
    }
  };

  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeyDown);
}

// --- Common Label Editing Utilities ---

function createLabelInput(svgX, svgY, value, fontSize) {
  const pt = svg.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const ctm = svg.getScreenCTM();
  const screenPt = ctm ? pt.matrixTransform(ctm) : { x: svgX, y: svgY };

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.style.position = 'fixed';
  input.style.width = '120px';
  input.style.fontSize = fontSize;
  input.style.padding = '2px 4px';
  input.style.zIndex = '9999';
  input.style.border = '1px solid #007bff';
  input.style.borderRadius = '3px';
  input.style.background = '#ffffff';

  return { screenPt, input };
}

function positionLabelInput(input, screenPt) {
  // Center the input field (assuming 120px width)
  input.style.left = screenPt.x - 60 + 'px';
  input.style.top = screenPt.y - 10 + 'px';
}

function removeLabelInput(input, onBlur, onKeyDown) {
  if (input.isConnected) {
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('keydown', onKeyDown);
    input.parentNode.removeChild(input);
  }
}


