// ============================================================
// main.js – SDL Editor Entry Point
// ============================================================

import { render } from './render.js';
import { initInteractions } from './interactions.js';
import { snapCheckbox, editorEl, btnSave, btnLoad } from './dom.js';
import { setSnapToGrid, state } from './state.js';
import { exportDiagram, importDiagram } from './storage.js';

// Lazy DOM fetch (not imported)
const diagramNameInput = document.getElementById('diagramNameInput');
const loadPanel = document.getElementById('loadPanel');
const loadList = document.getElementById('loadList');
const loadPanelClose = document.getElementById('loadPanelClose');


// ============================================================
// INITIALIZATION
// ============================================================

render();
initInteractions();


// ============================================================
// GRID HANDLING (snap + visual grid)
// ============================================================

function updateGridVisual() {
  if (!editorEl) return;

  if (snapCheckbox?.checked) {
    editorEl.classList.add('grid-on');
  } else {
    editorEl.classList.remove('grid-on');
  }
}

if (snapCheckbox) {
  // initial state
  setSnapToGrid(snapCheckbox.checked);
  updateGridVisual();

  // user toggles snap-to-grid
  snapCheckbox.addEventListener('change', () => {
    setSnapToGrid(snapCheckbox.checked);
    updateGridVisual();
    render();
  });
}


// ============================================================
// UTIL – Get current diagram name
// ============================================================

function getCurrentDiagramName() {
  const name = diagramNameInput?.value.trim();
  return name || "default";
}


// ============================================================
// SAVE / LOAD API CALLS
// ============================================================

async function saveDiagram(name = 'default') {
  const payload = exportDiagram();

  const res = await fetch(
    `api/save_diagram.php?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('Save failed:', res.status, data);
    alert('Save failed.');
    return;
  }

  console.log('Diagram saved as:', data.file || name);
}

async function loadDiagram(name = 'default') {
  const res = await fetch(
    `api/load_diagram.php?name=${encodeURIComponent(name)}`,
    { method: 'GET' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('Load failed:', res.status, data);
    alert('Load failed: ' + (data?.error || 'unknown error'));
    return;
  }

  importDiagram(data.diagram);
}

async function deleteDiagram(name) {
  if (!name) return;
  const confirmed = window.confirm(`Delete diagram "${name}"? This cannot be undone.`);
  if (!confirmed) return;

  const res = await fetch(
    `api/delete_diagram.php?name=${encodeURIComponent(name)}`,
    { method: 'POST' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('Delete failed:', res.status, data);
    alert('Delete failed: ' + (data?.error || 'unknown error'));
    return;
  }

  // Refresh the list after a successful delete
  await populateLoadPanel();
}


// ============================================================
// LOAD PANEL – Fetch saved diagrams
// ============================================================

async function fetchDiagramList() {
  try {
    const res = await fetch('api/list_diagrams.php');
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok || !Array.isArray(data.names)) {
      console.error('Diagram list fetch failed:', res.status, data);
      return [];
    }

    return data.names;
  } catch (err) {
    console.error('Diagram list error:', err);
    return [];
  }
}


// ============================================================
// LOAD PANEL – UI logic
// ============================================================

function showLoadPanel() {
  loadPanel?.classList.remove('hidden');
}

function hideLoadPanel() {
  loadPanel?.classList.add('hidden');
}

async function populateLoadPanel() {
  if (!loadList) return;

  loadList.innerHTML = 'Loading...';
  const names = await fetchDiagramList();

  if (!names.length) {
    loadList.innerHTML =
      '<div class="load-list-item">No saved diagrams.</div>';
    return;
  }

  loadList.innerHTML = '';

  names.forEach(name => {
    const item = document.createElement('div');
    item.className = 'load-list-item';

    // Name label
    const label = document.createElement('span');
    label.textContent = name;
    label.className = 'load-list-name';
    label.addEventListener('click', () => {
      loadDiagram(name);
      hideLoadPanel();
      if (diagramNameInput) diagramNameInput.value = name;
    });

    // Delete button (small "x" on the right)
    const del = document.createElement('button');
    del.className = 'load-list-delete';
    del.type = 'button';
    del.textContent = '✕';
    del.addEventListener('click', (ev) => {
      ev.stopPropagation(); // don't trigger load
      deleteDiagram(name);
    });

    item.appendChild(label);
    item.appendChild(del);
    loadList.appendChild(item);
  });
}


// ============================================================
// BUTTON EVENT HANDLERS
// ============================================================

// ---- Save button
btnSave?.addEventListener('click', () => {
  saveDiagram(getCurrentDiagramName());
});

// ---- Load button
btnLoad?.addEventListener('click', async () => {
  if (!loadPanel || !loadList) {
    // fallback to classic prompt-based load
    const name =
      window.prompt("Diagram name to load:", getCurrentDiagramName()) ||
      getCurrentDiagramName();
    loadDiagram(name);
    return;
  }

  await populateLoadPanel();
  showLoadPanel();
});

// ---- Load panel closing (X button)
loadPanelClose?.addEventListener('click', hideLoadPanel);

// ---- Click outside the panel to close
loadPanel?.addEventListener('click', (e) => {
  if (e.target === loadPanel) hideLoadPanel();
});


// ============================================================
// CLEAR DIAGRAM
// ============================================================

document.getElementById('btnClear')?.addEventListener('click', () => {
  // Reset all state
  state.nodes = [];
  state.edges = [];
  state.selectedNodeId = null;
  state.selectedNodeIds = [];
  state.selectedEdgeId = null;

  state.dragging = null;
  state.resizing = null;
  state.connecting = null;

  render();
});
