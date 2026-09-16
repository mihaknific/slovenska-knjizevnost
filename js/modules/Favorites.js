import { StorageManager } from './StorageManager.js';

export const Favorites = {
    KEY: 'favorites',

    getFavorites() {
        let favs = StorageManager.getSetting(this.KEY, []);
        // Migration: poetId -> authorId
        let migrated = false;
        favs = favs.map(f => {
            if (f.poetId && !f.authorId) {
                f.authorId = f.poetId;
                delete f.poetId;
                migrated = true;
            }
            return f;
        });
        if (migrated) {
            StorageManager.saveSetting(this.KEY, favs);
        }
        return favs;
    },

    toggle(authorId, poemId, poemTitle) {
        let favs = this.getFavorites();
        const index = favs.findIndex(f => f.authorId === authorId && String(f.poemId) === String(poemId));

        if (index > -1) {
            favs.splice(index, 1);
        } else {
            favs.push({ authorId, poemId, poemTitle, addedAt: Date.now() });
        }

        StorageManager.saveSetting(this.KEY, favs);
        return index === -1;
    },

    isFavorite(authorId, poemId) {
        const favs = this.getFavorites();
        return favs.some(f => f.authorId === authorId && String(f.poemId) === String(poemId));
    },

    clearAll() {
        StorageManager.saveSetting(this.KEY, []);
    }
};
