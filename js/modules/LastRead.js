import { StorageManager } from './StorageManager.js';
import { BookmarkManager } from './BookmarkManager.js';

export const LastRead = {
    STORAGE_KEY: 'preseren_last_read',

    save(authorId, poemId, poemTitle) {
        const scrollPos = window.scrollY;
        const data = {
            authorId,
            poemId,
            poemTitle,
            scrollPos,
            timestamp: Date.now()
        };
        StorageManager.saveSetting(this.STORAGE_KEY, data);
    },

    get() {
        return StorageManager.getSetting(this.STORAGE_KEY);
    },

    updateScroll() {
        const data = this.get();
        if (data && window.location.hash.includes(data.poemId)) {
            data.scrollPos = window.scrollY;
            StorageManager.saveSetting(this.STORAGE_KEY, data);

            // Tudi posodobi zaznamek, če obstaja (živi zaznamek)
            if (BookmarkManager.isBookmarked(data.authorId, data.poemId)) {
                BookmarkManager.updateScrollPos(data.authorId, data.poemId, data.scrollPos);
            }
        }
    },

    restore() {
        const data = this.get();
        if (!data) return false;
        return data;
    },

    initAutoSave() {
        let timeout;
        window.addEventListener('scroll', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.updateScroll(), 500);
        });
    }
};
