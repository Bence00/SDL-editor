// src/storageApi.js
// Thin client around the PHP endpoints in /api for listing, loading,
// saving and deleting diagrams.

/**
 * Fetch list of saved diagram names.
 * @returns {Promise<string[]>}
 */
export async function listDiagrams() {
  const res = await fetch('api/list_diagrams.php');
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok || !Array.isArray(data.names)) {
    console.error('Diagram list fetch failed:', res.status, data);
    return [];
  }

  return data.names;
}

/**
 * Load a diagram by name.
 * @param {string} name
 * @returns {Promise<{ ok: boolean, diagram?: any, error?: string }>}
 */
export async function loadDiagramFromServer(name) {
  const res = await fetch(
    `api/load_diagram.php?name=${encodeURIComponent(name)}`,
    { method: 'GET' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('Load failed:', res.status, data);
    return { ok: false, error: data?.error || 'unknown error' };
  }

  return { ok: true, diagram: data.diagram };
}

/**
 * Save a diagram to the server.
 * @param {string} name
 * @param {any} payload
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function saveDiagramToServer(name, payload) {
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
    return { ok: false, error: data?.error || 'unknown error' };
  }

  console.log('Diagram saved as:', data.file || name);
  return { ok: true };
}

/**
 * Delete a diagram on the server.
 * @param {string} name
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function deleteDiagramOnServer(name) {
  const res = await fetch(
    `api/delete_diagram.php?name=${encodeURIComponent(name)}`,
    { method: 'POST' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('Delete failed:', res.status, data);
    return { ok: false, error: data?.error || 'unknown error' };
  }

  return { ok: true };
}


