/**
 * GlobalSearch.js
 * Handles the Omni-Search overlay UI and communicates with SearchWorker.
 */

import { AuthorManager } from './AuthorManager.js';
import { Renderer } from './Renderer.js';
import { setupKeyboardNav, createFocusTrap } from './utils.js';
import { TTS } from './TTSManager.js';

export const GlobalSearch = {
    worker: null,
    overlay: null,
    input: null,
    resultsCont: null,
    kbNav: null,
    isReady: false,
    activeFilter: 'all',
    focusTrap: null,

    async init() {
        this.overlay = document.getElementById('search-overlay');
        this.input = document.getElementById('global-search-input');
        this.resultsCont = document.getElementById('search-results');
        const portalSearch = document.getElementById('portal-search');
        const closeBtn = document.getElementById('close-search');

        if (!portalSearch || !this.overlay) return;

        this.focusTrap = createFocusTrap(this.overlay);

        // Initialize Worker
        this.worker = new Worker('js/workers/SearchWorker.js');
        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);

        // Open search on portal search interaction (only click since it's a segmented button now)
        portalSearch.addEventListener('click', () => this.open());

        // Close search
        closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Search logic
        this.input.addEventListener('input', () => {
            if (this.kbNav) this.kbNav.reset();
            this.performSearch();
        });

        // Keyboard support
        this.kbNav = setupKeyboardNav(
            this.input,
            () => Array.from(this.resultsCont.querySelectorAll('.search-res-item')),
            {
                selectedClass: 'kb-selected',
                onSelect: (item) => {
                    item.click(); // This triggers the standard href navigation
                    this.close(); // Ensure the modal closes
                }
            }
        );

        // Escape key to close
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });

        // Genre Filters
        const filters = this.overlay.querySelectorAll('.filter-pill');
        filters.forEach(pill => {
            pill.addEventListener('click', () => {
                filters.forEach(f => f.classList.remove('active'));
                pill.classList.add('active');
                this.activeFilter = pill.dataset.filter;
                this.performSearch();
            });
        });
    },

    performSearch() {
        const query = this.input.value;
        if (!query || query.length < 2) {
            this.resultsCont.innerHTML = '';
            return;
        }
        this.worker.postMessage({
            type: 'SEARCH',
            payload: { query, filter: this.activeFilter }
        });
    },

    handleWorkerMessage(data) {
        const { type, payload } = data;
        switch (type) {
            case 'READY':
                this.isReady = true;
                break;
            case 'RESULTS':
                Renderer.renderSearchResults(payload, null, () => this.close());
                break;
            case 'ERROR':
                console.error('Search worker error:', payload);
                break;
        }
    },

    async open() {
        this.overlay.classList.remove('hidden');
        this.overlay.setAttribute('aria-hidden', 'false');
        TTS.setInert(true);
        if (this.focusTrap) this.focusTrap.activate();
        // Small timeout to ensure visibility before focusing
        setTimeout(() => this.input.focus(), 50);

        if (!this.isReady) {
            const authors = await AuthorManager.ensureLoaded();
            this.worker.postMessage({ type: 'INDEX', payload: authors });
        }
    },

    close() {
        // Blur input first to avoid aria-hidden focus warning
        if (this.input) this.input.blur();

        this.overlay.classList.add('hidden');
        this.overlay.setAttribute('aria-hidden', 'true');
        TTS.setInert(false);
        if (this.focusTrap) this.focusTrap.deactivate();
        this.input.value = '';
        this.resultsCont.innerHTML = '';
        if (this.kbNav) this.kbNav.reset();

        const portalSearch = document.getElementById('portal-search');
        if (portalSearch) portalSearch.focus();
    }
};
