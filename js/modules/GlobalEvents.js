import { toggleSortMethod } from './data.js';
import { handleNavigation, renderPoemList } from './router.js';
import { GlobalSearch } from './GlobalSearch.js';
import { BookmarkManager } from './BookmarkManager.js';

export const GlobalEvents = {
    init() {
        this.initSortButton();
        this.initNavigationArrows();
        this.initKeyboardHotkeys();
        this.initHomeButton();
        this.initReadingProgress();
        this.initBookmarkAction();
    },

    initSortButton() {
        const sortIconGroup = document.getElementById('sort-icon-group');
        const sortIconAlpha = document.getElementById('sort-icon-alpha');
        const sortButtons = document.getElementById('sort-buttons');

        if (sortButtons && sortIconGroup && sortIconAlpha) {
            sortButtons.addEventListener('click', () => {
                const method = toggleSortMethod();
                if (method === 'group') {
                    sortIconGroup.classList.remove('hidden');
                    sortIconAlpha.classList.add('hidden');
                } else {
                    sortIconGroup.classList.add('hidden');
                    sortIconAlpha.classList.remove('hidden');
                }

                const hash = window.location.hash.slice(1);
                const parts = hash.split('/');
                if (parts.length === 1 && parts[0]) {
                    renderPoemList();
                }
            });
        }
    },


    initNavigationArrows() {
        const leftArrow = document.querySelector('#left-arrow');
        const rightArrow = document.querySelector('#right-arrow');
        if (leftArrow) leftArrow.addEventListener('click', (e) => {
            handleNavigation('prev');
        });
        if (rightArrow) rightArrow.addEventListener('click', (e) => {
            handleNavigation('next');
        });
    },

    initKeyboardHotkeys() {
        window.addEventListener('keydown', event => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            if (event.key === 'ArrowLeft') {
                handleNavigation('prev');
            } else if (event.key === 'ArrowRight') {
                handleNavigation('next');
            } else if (event.key === 'i' || event.key === '/') {
                event.preventDefault();
                GlobalSearch.open();
            } else if (event.key === 'n') {
                event.preventDefault();
                const settingsToggle = document.getElementById('settings-toggle');
                if (settingsToggle) settingsToggle.click();
            }
        });
    },

    initHomeButton() {
        const homeBtn = document.querySelector('#home');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const mode = homeBtn.dataset.mode || 'collection';
                const hash = window.location.hash.slice(1);

                if (mode === 'portal' || hash === 'favorites') {
                    window.location.hash = ''; // Force portal
                } else {
                    const parts = hash.split('/');
                    const authorId = parts[0];
                    if (authorId) {
                        window.location.hash = `#${authorId}`;
                    } else {
                        window.location.hash = '';
                    }
                }
            });
        }
    },

    initReadingProgress() {
        const progressBar = document.getElementById('scroll-progress-bar');
        const updateProgress = () => {
            if (!document.body.classList.contains('poem-view')) {
                if (progressBar) progressBar.style.width = '0%';
                return;
            }

            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = height > 0 ? (winScroll / height) * 100 : 0;

            if (progressBar) {
                progressBar.style.width = scrolled + '%';
            }
        };

        window.addEventListener('scroll', () => {
            requestAnimationFrame(updateProgress);
        });
    },

    initBookmarkAction() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#bookmark-poem');
            if (!btn) return;

            const hash = window.location.hash.slice(1);
            const [authorId, poemId] = hash.split('/');
            if (!authorId || !poemId) return;

            const poemTitle = document.querySelector('.poem-content-area h3')?.textContent || 'Neznano';
            const scrollPos = window.scrollY;

            const isBookmarked = BookmarkManager.toggle(authorId, poemId, poemTitle, scrollPos);

            // Update UI
            btn.classList.toggle('active', isBookmarked);
            const label = btn.querySelector('.bookmark-label');
            if (label) label.textContent = isBookmarked ? 'Zaznamovano' : 'Zaznamek';

            const icon = btn.querySelector('.bookmark-icon');
            if (icon) icon.classList.toggle('active', isBookmarked);

            // Toast obvestilo z jasno razlago "živega zaznamka"
            const toast = document.querySelector('.custom-toast') || (() => {
                const t = document.createElement('div');
                t.className = 'custom-toast';
                document.body.appendChild(t);
                return t;
            })();
            toast.textContent = isBookmarked
                ? 'Zaznamek postavljen. Lokacija branja se od tu naprej samodejno shranjuje.'
                : 'Zaznamek odstranjen.';
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 4000);
        });
    }
};
