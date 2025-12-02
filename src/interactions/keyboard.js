import { state, undo, redo, saveStateForUndo } from '../state.js';
import { render } from '../render.js';
import { deleteNode } from '../model.js';

export function initKeyboardInteractions() {
  initKeyboard();
}

function initKeyboard() {
  document.addEventListener('keydown', onDocumentKeydown);

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') {
      undo();
      render();
      e.preventDefault();
    }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Z')) {
      redo();
      render();
      e.preventDefault();
    }
  });
}

function onDocumentKeydown(e) {
  // Only interested in Delete / Backspace / 'x'
  if (e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'x') {
    return;
  }

  // Do not delete if an input element is active
  const active = document.activeElement;
  if (
    active &&
    (active.tagName === 'INPUT' ||
     active.tagName === 'TEXTAREA' ||
     active.isContentEditable)
  ) {
    return;
  }

  // Node(s) deletion
  const nodeIdsToDelete = getSelectedNodeIds();
  if (nodeIdsToDelete.length) {
    saveStateForUndo();
    nodeIdsToDelete.forEach(id => deleteNode(id));
    state.selectedNodeId = null;
    state.selectedNodeIds = [];
    render();
    e.preventDefault();
    return;
  }

  // Edge deletion
  if (state.selectedEdgeId != null) {
    state.edges = state.edges.filter(
      edge => edge.id !== state.selectedEdgeId
    );
    state.selectedEdgeId = null;
    render();
    e.preventDefault();
    return;
  }

  e.preventDefault();
}

function getSelectedNodeIds() {
  return state.selectedNodeIds && state.selectedNodeIds.length
    ? Array.from(new Set(state.selectedNodeIds))
    : state.selectedNodeId
    ? [state.selectedNodeId]
    : [];
}


