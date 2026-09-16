import { debounce, setupKeyboardNav } from './utils.js';
import { Renderer } from './Renderer.js';
import { StorageManager } from './StorageManager.js';

export const AuthorManager = {
    authors: [],
    activePeriod: 'all',

    async ensureLoaded() {
        if (this.authors.length === 0) {
            // Try cache first
            const cachedArr = await StorageManager.getSetting('authors_cache');
            if (cachedArr) {
                this.authors = cachedArr;
            } else {
                try {
                    const response = await fetch('json/authors.json');
                    this.authors = await response.json();
                    StorageManager.saveSetting('authors_cache', this.authors);
                } catch (err) {
                    console.error('Failed to load authors:', err);
                    const grid = document.getElementById('authors-grid');
                    if (grid) {
                        grid.innerHTML = `
                            <div style="text-align: center; grid-column: 1/-1; padding: 2rem;">
                                <h3>Napaka pri nalaganju podatkov</h3>
                                <p>Preverite internetno povezavo in poskusite znova.</p>
                                <button id="retry-load-btn" style="padding: 0.5rem 1rem; cursor: pointer; margin-top: 1rem;">Osveži stran</button>
                            </div>
                        `;
                        const retryBtn = document.getElementById('retry-load-btn');
                        if (retryBtn) retryBtn.addEventListener('click', () => window.location.reload());
                    }
                }
            }
        }
        return this.authors;
    },

    getAuthorList() {
        return this.authors;
    },

    getAuthor(id) {
        return this.authors.find(a => a.id === id);
    },

    async init() {
        if (this.isInitialized) return;
        
        await this.ensureLoaded();
        this.renderPeriodFilters();
        this.renderGrid(this.authors);
        this.setupActions();
        
        this.isInitialized = true;
    },

    renderPeriodFilters() {
        const periods = Array.from(new Set(this.authors.map(a => a.period).filter(Boolean)));
        Renderer.renderPeriodFilters(periods, this.activePeriod, (period) => {
            this.activePeriod = period;
            this.applyFilters();
        });
    },

    applyFilters() {
        const filtered = this.authors.filter(a => {
            return this.activePeriod === 'all' || a.period === this.activePeriod;
        });
        
        this.renderGrid(filtered);
        this.renderPeriodFilters(); // Re-render to update active state
    },

    renderGrid(authorList) {
        const template = document.getElementById('tpl-author-card');
        Renderer.renderAuthorGrid(authorList, template, (author) => {
            import('./data.js').then(m => m.fetchPoems(author.dataFile, author.id));
        });
    },

    setupActions() {
        const btnHistory = document.getElementById('portal-history-toggle');
        const btnPeriods = document.getElementById('portal-periods-toggle');
        const secHistory = document.getElementById('history-section');
        const secPeriods = document.getElementById('period-filters');

        if (btnHistory && secHistory) {
            btnHistory.addEventListener('click', () => {
                const isHidden = secHistory.classList.toggle('hidden');
                btnHistory.classList.toggle('active', !isHidden);
                // Accordion behavior: hide the other
                if (!isHidden && secPeriods) {
                    secPeriods.classList.add('hidden');
                    if (btnPeriods) btnPeriods.classList.remove('active');
                }
            });
        }

        if (btnPeriods && secPeriods) {
            btnPeriods.addEventListener('click', () => {
                const isHidden = secPeriods.classList.toggle('hidden');
                btnPeriods.classList.toggle('active', !isHidden);
                // Accordion behavior: hide the other
                if (!isHidden && secHistory) {
                    secHistory.classList.add('hidden');
                    if (btnHistory) btnHistory.classList.remove('active');
                }
            });
        }
    }
};
