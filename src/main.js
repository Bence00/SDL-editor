// src/main.js
import { render } from './render.js';
import { initInteractions } from './interactions.js';
import { snapCheckbox, editorEl, btnSave, btnLoad } from './dom.js';
import { setSnapToGrid } from './state.js';
import { exportDiagram, importDiagram } from './storage.js';

// ---- INIT ----
render();
initInteractions();

// ---- GRID HANDLING ----

function applyGridVisual() {
  if (!editorEl) return;
  if (snapCheckbox && snapCheckbox.checked) {
    editorEl.classList.add('grid-on');
  } else {
    editorEl.classList.remove('grid-on');
  }
}

if (snapCheckbox) {
  setSnapToGrid(snapCheckbox.checked);
  applyGridVisual();

  snapCheckbox.addEventListener('change', () => {
    setSnapToGrid(snapCheckbox.checked);
    applyGridVisual();
    render(); // marad, ez eddig is így volt
  });
}

// ---- EXTRA DOM ELEMENTS (NINCS IMPORT, BIZTONSÁGOS) ----

const diagramNameInput = document.getElementById('diagramNameInput');
const loadPanel = document.getElementById('loadPanel');
const loadList = document.getElementById('loadList');
const loadPanelClose = document.getElementById('loadPanelClose');

function getCurrentDiagramName() {
  if (!diagramNameInput) return 'default';
  const value = diagramNameInput.value.trim();
  return value || 'default';
}

// ---- SAVE / LOAD API ----

async function saveDiagram(name = 'default') {
  const diagram = exportDiagram();

  const res = await fetch(
    `api/save_diagram.php?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(diagram)
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    console.error('Save failed', res.status, data);
    alert('Save failed.');
    return;
  }
  console.log('Saved diagram as', data.file || name);
}

async function loadDiagram(name = 'default') {
  const res = await fetch(
    `api/load_diagram.php?name=${encodeURIComponent(name)}`,
    {
      method: 'GET'
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    console.error('Load failed', res.status, data);
    alert('Load failed: ' + (data && data.error ? data.error : 'unknown error'));
    return;
  }

  importDiagram(data.diagram);
}

// ---- LOAD LIST (PANELHEZ) ----
// api/list_diagrams.php -> { ok: true, names: ["default", ...] }

async function fetchDiagramList() {
  try {
    const res = await fetch('api/list_diagrams.php', { method: 'GET' });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.ok || !Array.isArray(data.names)) {
      console.error('List diagrams failed', res.status, data);
      return [];
    }
    return data.names;
  } catch (err) {
    console.error('List diagrams error', err);
    return [];
  }
}

// ---- LOAD PANEL UI ----

function showLoadPanel() {
  if (!loadPanel) return;
  loadPanel.classList.remove('hidden');
}

function hideLoadPanel() {
  if (!loadPanel) return;
  loadPanel.classList.add('hidden');
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
    item.textContent = name;
    item.addEventListener('click', () => {
      loadDiagram(name);
      hideLoadPanel();
      if (diagramNameInput) {
        diagramNameInput.value = name;
      }
    });
    loadList.appendChild(item);
  });
}

// ---- BUTTON HANDLERS ----

// SAVE 
if (btnSave) {
  btnSave.addEventListener('click', () => {
    const name = getCurrentDiagramName();
    saveDiagram(name);
  });
}

// LOAD 
if (btnLoad) {
  btnLoad.addEventListener('click', async () => {
    if (!loadPanel || !loadList) {
      const fallbackName =
        window.prompt('Diagram name to load:', getCurrentDiagramName()) ||
        getCurrentDiagramName();
      loadDiagram(fallbackName);
      return;
    }

    await populateLoadPanel();
    showLoadPanel();
  });
}

// PANEL CLOSE
if (loadPanelClose) {
  loadPanelClose.addEventListener('click', () => {
    hideLoadPanel();
  });
}

if (loadPanel) {
  loadPanel.addEventListener('click', e => {
    if (e.target === loadPanel) {
      hideLoadPanel();
    }
  });
}
