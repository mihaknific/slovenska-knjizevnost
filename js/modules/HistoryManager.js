import { StorageManager } from './StorageManager.js';

export const HistoryManager = {
    STORAGE_KEY: 'preseren_history',
    MAX_ITEMS: 12,

    save(authorId, authorName, authorImage, poemId, poemTitle) {
        let history = this.getAll();

        // Remove existing entry for the same poem to move it to top
        history = history.filter(item => !(item.authorId === authorId && item.poemId === poemId));

        const data = {
            authorId,
            authorName,
            authorImage,
            poemId,
            poemTitle,
            timestamp: Date.now()
        };

        history.unshift(data);

        // Limit to MAX_ITEMS
        if (history.length > this.MAX_ITEMS) {
            history = history.slice(0, this.MAX_ITEMS);
        }

        StorageManager.saveSetting(this.STORAGE_KEY, history);
    },

    getAll() {
        const history = StorageManager.getSetting(this.STORAGE_KEY);
        return Array.isArray(history) ? history : [];
    },

    getLatest() {
        const history = this.getAll();
        return history.length > 0 ? history[0] : null;
    },

    clear() {
        StorageManager.saveSetting(this.STORAGE_KEY, []);
    }
};
