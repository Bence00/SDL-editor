import { render } from './render.js';
import { initInteractions } from './interactions.js';
import { snapCheckbox } from './dom.js';
import { setSnapToGrid } from './state.js';
import { exportDiagram, importDiagram } from './storage.js';
import { btnSave, btnLoad } from './dom.js';

render();
initInteractions();

if (snapCheckbox) {
  setSnapToGrid(snapCheckbox.checked);
  snapCheckbox.addEventListener('change', () => {
    setSnapToGrid(snapCheckbox.checked);
  });
}

/* ---------- SAVE / LOAD API ---------- */

async function saveDiagram(name = 'default') {
  const diagram = exportDiagram();

  const res = await fetch(`api/save_diagram.php?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(diagram)
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    console.error('Save failed', res.status, data);
    alert('Save failed.');
    return;
  }
  console.log('Saved diagram as', data.file);
}

async function loadDiagram(name = 'default') {
  const res = await fetch(`api/load_diagram.php?name=${encodeURIComponent(name)}`, {
    method: 'GET'
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    console.error('Load failed', res.status, data);
    alert('Load failed: ' + (data && data.error ? data.error : 'unknown error'));
    return;
  }

  importDiagram(data.diagram);
}

if (btnSave) {
  btnSave.addEventListener('click', () => {
    const name = prompt('Diagram name to save as:', 'default') || 'default';
    saveDiagram(name);
  });
}

if (btnLoad) {
  btnLoad.addEventListener('click', () => {
    const name = prompt('Diagram name to load:', 'default') || 'default';
    loadDiagram(name);
  });
}
// Expose for quick testing in console, or wire to buttons:
