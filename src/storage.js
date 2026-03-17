const DB_NAME = 'classroom-board';
const DB_VERSION = 1;
const STORE = 'store';
const DATA_KEY = 'data';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadData() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result ?? { dashboards: [] });
      req.onerror = () => resolve({ dashboards: [] });
    });
  } catch {
    return { dashboards: [] };
  }
}

export async function saveData(data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, DATA_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('저장 실패:', e);
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
