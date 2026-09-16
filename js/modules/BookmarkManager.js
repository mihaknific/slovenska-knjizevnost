import { StorageManager } from './StorageManager.js';

export const BookmarkManager = {
    KEY: 'bookmarks',

    /**
     * Retrieves all bookmarks from storage.
     */
    getBookmarks() {
        return StorageManager.getSetting(this.KEY, []);
    },

    /**
     * Toggles a bookmark for a specific poem.
     * Optionally saves scroll position.
     */
    toggle(authorId, poemId, poemTitle, scrollPos = 0) {
        let bookmarks = this.getBookmarks();
        const index = bookmarks.findIndex(b => b.authorId === authorId && String(b.poemId) === String(poemId));

        if (index > -1) {
            bookmarks.splice(index, 1);
        } else {
            bookmarks.push({
                authorId,
                poemId,
                poemTitle,
                scrollPos,
                addedAt: Date.now()
            });
        }

        StorageManager.saveSetting(this.KEY, bookmarks);
        return index === -1;
    },

    /**
     * Checks if a poem is bookmarked.
     */
    isBookmarked(authorId, poemId) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.authorId === authorId && String(b.poemId) === String(poemId));
    },

    /**
     * Updates the saved scroll position for a specific bookmark.
     */
    updateScrollPos(authorId, poemId, scrollPos) {
        let bookmarks = this.getBookmarks();
        const index = bookmarks.findIndex(b => b.authorId === authorId && String(b.poemId) === String(poemId));
        if (index > -1) {
            bookmarks[index].scrollPos = scrollPos;
            StorageManager.saveSetting(this.KEY, bookmarks);
        }
    },

    /**
     * Removes a bookmark by its index or IDs.
     */
    remove(authorId, poemId) {
        let bookmarks = this.getBookmarks();
        bookmarks = bookmarks.filter(b => !(b.authorId === authorId && String(b.poemId) === String(poemId)));
        StorageManager.saveSetting(this.KEY, bookmarks);
    },

    /**
     * Removes all bookmarks.
     */
    clearAll() {
        StorageManager.saveSetting(this.KEY, []);
    }
};
