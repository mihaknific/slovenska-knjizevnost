/**
 * StorageManager.js
 * Unified interface for local data storage.
 * Uses LocalStorage for small settings and IndexedDB for larger datasets (poems).
 */

const DB_NAME = 'SlovenskaKnjizevnostDB';
const DB_VERSION = 3; // Povečano za prisilno ustvaritev manjkajočih object storov
const STORE_POEMS = 'poems_cache';
const STORE_HIGHLIGHTS = 'highlights';

let db = null;

export const StorageManager = {
    /**
     * Initializes the IndexedDB database.
     */
    async initDB() {
        if (db) return db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_POEMS)) {
                    db.createObjectStore(STORE_POEMS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_HIGHLIGHTS)) {
                    db.createObjectStore(STORE_HIGHLIGHTS, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // --- LocalStorage helpers (Settings, Favorites, LastRead) ---

    saveSetting(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getSetting(key, defaultValue = null) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    },

    removeSetting(key) {
        localStorage.removeItem(key);
    },

    // --- IndexedDB helpers (Large Data) ---

    async cachePoemData(authorId, poems) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_POEMS], 'readwrite');
            const store = transaction.objectStore(STORE_POEMS);
            
            store.put({ id: authorId, data: poems, timestamp: Date.now() });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    },

    async getCachedPoemData(authorId) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(STORE_POEMS)) {
                return resolve(null); // Return empty cache if store doesn't exist yet
            }
            try {
                const transaction = db.transaction([STORE_POEMS], 'readonly');
                const store = transaction.objectStore(STORE_POEMS);
                const request = store.get(authorId);

                request.onsuccess = () => resolve(request.result ? request.result.data : null);
                request.onerror = (event) => reject(event.target.error);
            } catch (e) {
                console.warn('Could not read from poems cache:', e);
                resolve(null);
            }
        });
    },

    async clearExpiredCache(maxAgeMs = 1000 * 60 * 60 * 24 * 7) { // Default 7 days
        const db = await this.initDB();
        const transaction = db.transaction([STORE_POEMS], 'readwrite');
        const store = transaction.objectStore(STORE_POEMS);
        const request = store.openCursor();
        const now = Date.now();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (now - cursor.value.timestamp > maxAgeMs) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    },

    async saveHighlights(poemId, highlights) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_HIGHLIGHTS], 'readwrite');
            const store = transaction.objectStore(STORE_HIGHLIGHTS);
            store.put({ id: poemId, highlights, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    },

    async getHighlights(poemId) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_HIGHLIGHTS], 'readonly');
            const store = transaction.objectStore(STORE_HIGHLIGHTS);
            const request = store.get(poemId);
            request.onsuccess = () => resolve(request.result ? request.result.highlights : []);
            request.onerror = (event) => reject(event.target.error);
        });
    }
};
