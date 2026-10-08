"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRoomKeyToIDB = saveRoomKeyToIDB;
exports.getRoomKeyFromIDB = getRoomKeyFromIDB;
exports.removeRoomKeyFromIDB = removeRoomKeyFromIDB;
const DB_NAME = 'e2ee_room_keys_db';
const DB_VERSION = 1;
const STORE_NAME = 'keys_store';
function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'roomId' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function saveRoomKeyToIDB(roomId, rawRoomKeyHex) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ roomId, rawRoomKeyHex, updatedAt: Date.now() });
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    }
    catch (err) {
        console.warn('Failed to save key to IndexedDB:', err);
    }
}
async function getRoomKeyFromIDB(roomId) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(roomId);
        return new Promise((res, rej) => {
            req.onsuccess = () => res(req.result ? req.result.rawRoomKeyHex : null);
            req.onerror = () => rej(req.error);
        });
    }
    catch (err) {
        console.warn('Failed to read key from IndexedDB:', err);
        return null;
    }
}
async function removeRoomKeyFromIDB(roomId) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(roomId);
    }
    catch (err) {
        console.warn('Failed to delete key from IndexedDB:', err);
    }
}
