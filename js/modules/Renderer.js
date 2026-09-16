import { escapeHtml } from './utils.js';

export const Renderer = {
    mainElement: document.getElementById('main-content'),
    portalView: document.getElementById('view-portal-entry'),
    collectionView: document.getElementById('view-collection'),

    /**
     * Internal: Ensures the base structure of the main element is present.
     * Prevents issues when innerHTML is overwritten.
     */
    _ensureBaseStructure(isPoemView = false) {
        if (isPoemView) {
            // For poems, we might want a different top-level layout,
            // but for simplicity, we'll keep the main container clean.
            return;
        }

        if (!document.getElementById('author-image')) {
            this.mainElement.innerHTML = `
                <img src="img/authors/author-placeholder.svg" alt="Portret avtorja" class="circle" id="author-image">
                <h1 id="main-title">Nalaganje...</h1>
                <div id="author-bio-container">
                    <div id="author-meta-detail" class="author-meta-detail hidden">
                        <span id="author-birth-death"></span>
                    </div>
                    <div id="author-external-links" class="external-links-container hidden"></div>
                </div>
                <div id="poem-list-wrapper"></div>
            `;
        }
    },

    /**
     * Switches between portal and collection views.
     */
    switchView(viewName, isFavorites = false) {
        if (viewName === 'PORTAL') {
            this.portalView.classList.remove('hidden');
            this.collectionView.classList.add('hidden');
            const overlay = document.getElementById('favorites-list-view');
            if (overlay) overlay.classList.add('hidden');
        } else {
            this.portalView.classList.add('hidden');
            this.collectionView.classList.remove('hidden');
        }

        if (isFavorites) {
            this.collectionView.classList.add('show-favs');
        } else {
            this.collectionView.classList.remove('show-favs');
        }
    },

    /**
     * Updates the shared header in the collection view.
     */
    updateHeader(author, mode = 'collection') {
        this._ensureBaseStructure();

        const img = document.getElementById('author-image');
        const title = document.getElementById('main-title');
        const bio = document.getElementById('author-bio');
        const homeBtn = document.getElementById('home');
        const homeHome = document.getElementById('icon-home');
        const homeCollection = document.getElementById('icon-collection');
        const homePreseren = document.getElementById('icon-preseren');

        if (homeBtn && homeHome && homeCollection && homePreseren) {
            homeHome.classList.add('hidden');
            homeCollection.classList.add('hidden');
            homePreseren.classList.add('hidden');

            if (mode === 'portal') {
                homeHome.classList.remove('hidden');
                homeBtn.dataset.mode = 'portal';
                homeBtn.title = 'Nazaj na portal';
            } else {
                const isPreseren = author && author.id === 'preseren';
                if (isPreseren) {
                    homePreseren.classList.remove('hidden');
                } else {
                    homeCollection.classList.remove('hidden');
                }
                homeBtn.dataset.mode = 'collection';
                homeBtn.title = isPreseren ? 'Prešernove poezije' : 'Zbirka del';
            }
        }

        if (img) {
            if (author && author.image) {
                img.classList.add('skeleton');
                img.onload = () => img.classList.remove('skeleton');
                img.src = author.image;
                img.alt = author.name || 'Portret avtorja';
                if (img.complete) img.classList.remove('skeleton');
            } else {
                img.src = 'img/authors/author-placeholder.svg';
                img.alt = 'Portret avtorja';
            }
        }

        if (title) {
            title.textContent = author ? (author.title || `Poezije — ${author.name}`) : 'Priljubljene pesmi';
        }

        const metaDetail = document.getElementById('author-meta-detail');
        const birthDeath = document.getElementById('author-birth-death');
        const linksCont = document.getElementById('author-external-links');

        if (metaDetail && birthDeath) {
            if (author && (author.birth || author.death)) {
                let text = '';
                if (author.birth) text += `Rojen: ${author.birth}`;
                if (author.death) text += text ? ` | Umrl: ${author.death}` : `Umrl: ${author.death}`;
                birthDeath.textContent = text;
                metaDetail.classList.remove('hidden');
            } else {
                metaDetail.classList.add('hidden');
            }
        }

        if (linksCont) {
            if (author && author.links && author.links.wikipedia) {
                linksCont.innerHTML = `
                    <a href="${author.links.wikipedia}" target="_blank" class="wiki-pill" title="Več na Wikipediji">
                        <span class="wiki-icon">W</span>
                        <span class="wiki-text">Wikipedia</span>
                    </a>
                `;
                linksCont.classList.remove('hidden');
            } else {
                linksCont.classList.add('hidden');
            }
        }
    },

    /**
     * Renders the author portal grid.
     */
    renderAuthorGrid(authors, template, onAuthorClick) {
        const grid = document.getElementById('authors-grid');
        if (!grid || !template) return;

        grid.innerHTML = '';
        authors.forEach(author => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.author-card');
            card.href = `#${author.id}`;

            const img = clone.querySelector('.author-image');
            img.classList.add('skeleton');
            img.onload = () => img.classList.remove('skeleton');
            img.src = author.image;
            img.alt = author.name;
            if (img.complete) img.classList.remove('skeleton');

            clone.querySelector('.author-name').textContent = author.name;
            clone.querySelector('.author-dates').textContent = author.dates;

            if (author.period) {
                const tag = document.createElement('span');
                tag.className = 'period-tag';
                tag.textContent = author.period;
                card.appendChild(tag);
            }

            const statsEl = clone.querySelector('.author-stats');
            if (statsEl) {
                const label = author.type === 'writer' ? 'del' : 'pesmi';
                statsEl.textContent = author.workCount != null ? `${author.workCount} ${label}` : (author.type === 'writer' ? 'Proza' : 'Poezija');
            }

            if (onAuthorClick) {
                const trigger = () => onAuthorClick(author);
                card.addEventListener('mouseenter', trigger, { once: true });
                card.addEventListener('click', trigger, { once: true });
            }

            grid.appendChild(clone);
        });
    },

    /**
     * Renders literary period filters on the portal.
     */
    renderPeriodFilters(periods, activePeriod, onFilterClick) {
        const cont = document.getElementById('period-filters');
        if (!cont) return;

        if (!periods || periods.length === 0) {
            cont.classList.add('hidden');
            return;
        }

        cont.innerHTML = '';
        const tpl = document.getElementById('tpl-period-pill');
        if (!tpl) return;

        // 1. All button
        const allBtnClone = tpl.content.cloneNode(true);
        const allBtn = allBtnClone.querySelector('.period-pill');
        allBtn.textContent = 'Vsi';
        allBtn.dataset.period = 'all';
        if (activePeriod === 'all') allBtn.classList.add('active');
        allBtn.onclick = () => onFilterClick('all');
        cont.appendChild(allBtnClone);

        // 2. Specific period buttons
        periods.forEach(p => {
            const clone = tpl.content.cloneNode(true);
            const btn = clone.querySelector('.period-pill');
            btn.textContent = p;
            btn.dataset.period = p;
            if (activePeriod === p) btn.classList.add('active');
            btn.onclick = () => onFilterClick(p);
            cont.appendChild(clone);
        });
    },

    /**
     * Renders a list of poems.
     */
    renderPoemList(authorId, poems, worksLabel, isGroupSort) {
        this._ensureBaseStructure();

        let listWrapper = document.getElementById('poem-list-wrapper');
        if (!listWrapper) {
            listWrapper = document.createElement('div');
            listWrapper.id = 'poem-list-wrapper';
            this.mainElement.appendChild(listWrapper);
        }

        listWrapper.innerHTML = '';

        // 1. Render Search
        const searchTemplate = document.getElementById('tpl-inline-search');
        if (searchTemplate) {
            listWrapper.appendChild(searchTemplate.content.cloneNode(true));
        }

        // 2. Container for the list
        const container = document.createElement('div');
        container.id = 'poem-list-container';
        listWrapper.appendChild(container);

        if (poems.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = `${worksLabel} za tega avtorja še niso na voljo.`;
            container.appendChild(empty);
        } else {
            let lastGroup = null;
            let lastSubgroup = null;

            const headTpl = document.getElementById('tpl-poem-header');
            const subheadTpl = document.getElementById('tpl-poem-subgroup-header');
            const itemTpl = document.getElementById('tpl-poem-item');

            poems.forEach(p => {
                if (isGroupSort) {
                    if (p.group && p.group !== lastGroup) {
                        if (headTpl) {
                            const clone = headTpl.content.cloneNode(true);
                            clone.querySelector('.poem-group-header').textContent = p.group;
                            container.appendChild(clone);
                        }
                        lastGroup = p.group;
                        lastSubgroup = null;
                    }
                    if (p.subgroup && p.subgroup !== lastSubgroup) {
                        if (subheadTpl) {
                            const clone = subheadTpl.content.cloneNode(true);
                            clone.querySelector('.poem-subgroup-header').textContent = p.subgroup;
                            container.appendChild(clone);
                        }
                        lastSubgroup = p.subgroup;
                    }
                }

                if (itemTpl) {
                    const clone = itemTpl.content.cloneNode(true);
                    const link = clone.querySelector('.poem-link');
                    link.href = `#${authorId}/${p.id}`;
                    link.textContent = p.title;
                    container.appendChild(clone);
                }
            });
        }

        const bioCont = document.getElementById('author-bio-container');
        if (bioCont) bioCont.classList.remove('hidden');

        this.mainElement.className = 'reading-view collection-view';
        this.mainElement.classList.remove('poem-view');
        document.body.classList.add('align-top');
    },

    /**
     * Internal: Hides list overlay and shows main content.
     */
    _showMainContent() {
        const overlay = document.getElementById('favorites-list-view');
        if (overlay) overlay.classList.add('hidden');
        if (this.mainElement) this.mainElement.classList.remove('hidden');
    },

    /**
     * Renders a poem.
     */
    renderPoem(poem, isFav = false, ttsRate = 1.0, isBookmarked = false) {
        this._showMainContent();
        const template = document.getElementById('tpl-poem-view');
        if (!template) return;

        this.mainElement.innerHTML = '';
        const clone = template.content.cloneNode(true);

        // 1. Labels & Active states
        const favLabel = isFav ? 'Odstrani iz priljubljenih' : 'Dodaj med priljubljene';
        const bookmarkLabel = isBookmarked ? 'Zaznamovano' : 'Dodaj zaznamek';

        const favBtn = clone.querySelector('#toggle-favorite');
        if (favBtn) {
            favBtn.title = favLabel;
            const heart = favBtn.querySelector('.heart-icon');
            if (heart && isFav) heart.classList.add('active');
            const label = favBtn.querySelector('.fav-label');
            if (label) label.textContent = favLabel;
        }

        const bookBtn = clone.querySelector('#bookmark-poem');
        if (bookBtn) {
            bookBtn.title = bookmarkLabel;
            if (isBookmarked) bookBtn.classList.add('active');
            const icon = bookBtn.querySelector('.bookmark-icon');
            if (icon && isBookmarked) icon.classList.add('active');
            const label = bookBtn.querySelector('.bookmark-label');
            if (label) label.textContent = bookmarkLabel;
        }

        const rateVal = clone.querySelector('#tts-rate-value');
        if (rateVal) rateVal.textContent = `${ttsRate.toFixed(1)}×`;

        // 2. Content
        const titleDisplay = clone.querySelector('#poem-title-display');
        const textDisplay = clone.querySelector('#poem-content-text');

        if (titleDisplay) titleDisplay.textContent = poem.title;
        if (textDisplay) {
            const escaped = escapeHtml(poem.content);
            textDisplay.innerHTML = escaped.replace(/\n/g, '<br>');
        }

        this.mainElement.appendChild(clone);

        this.mainElement.className = 'reading-view';
        this.mainElement.classList.add('poem-view');
        document.body.classList.remove('align-top');
    },

    /**
     * Renders a skeleton state for the poem list.
     */
    renderListSkeleton() {
        this._showMainContent();
        this._ensureBaseStructure();
        let listWrapper = document.getElementById('poem-list-wrapper');
        if (!listWrapper) {
            listWrapper = document.createElement('div');
            listWrapper.id = 'poem-list-wrapper';
            this.mainElement.appendChild(listWrapper);
        }

        listWrapper.innerHTML = '';
        const template = document.getElementById('tpl-skeleton-list');
        if (template) {
            listWrapper.appendChild(template.content.cloneNode(true));
        }
    },

    /**
     * Renders a skeleton state for a single poem.
     */
    renderPoemSkeleton() {
        this._showMainContent();
        this.mainElement.innerHTML = '';
        const template = document.getElementById('tpl-skeleton-poem');
        if (template) {
            this.mainElement.appendChild(template.content.cloneNode(true));
        }
        this.mainElement.className = 'reading-view';
        this.mainElement.classList.add('poem-view');
    },

    /**
     * Renders the favorites list (main screen).
     */
    renderFavorites(favs, authors, onRemove) {
        const container = document.getElementById('favorites-container');
        if (!container) return;

        container.innerHTML = '';

        if (favs.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <p>Nimate še priljubljenih pesmi.</p>
                <small>Za dodajanje kliknite na ikono srca ob branju pesmi.</small>
            `;
            container.appendChild(empty);
            return;
        }

        const template = document.getElementById('tpl-fav-item');
        if (!template) return;

        favs.forEach(f => {
            const authorsList = Array.isArray(authors) ? authors : [];
            const author = authorsList.find(a => a.id === f.authorId) || { name: f.authorId };

            const clone = template.content.cloneNode(true);
            const link = clone.querySelector('.fav-item');
            link.href = `#${f.authorId}/${f.poemId}`;

            clone.querySelector('.fav-title').textContent = f.poemTitle;
            clone.querySelector('.fav-author').textContent = author.name;

            const removeBtn = clone.querySelector('.fav-remove');
            removeBtn.dataset.author = f.authorId;
            removeBtn.dataset.poem = f.poemId;
            removeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(f.authorId, f.poemId);
            };

            container.appendChild(clone);
        });
    },

    /**
     * Renders the reading history.
     */
    renderHistory(history) {
        const section = document.getElementById('history-section');
        if (!section) return;

        if (!history || history.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.innerHTML = `
            <div class="history-container">
                <h3 class="history-title">Nedavno prebrano</h3>
                <div class="history-grid"></div>
            </div>
        `;

        const grid = section.querySelector('.history-grid');
        const template = document.getElementById('tpl-history-item');

        if (grid && template) {
            history.slice(0, 12).forEach(item => {
                const clone = template.content.cloneNode(true);
                const link = clone.querySelector('.history-card');
                link.href = `#${item.authorId}/${item.poemId}`;

                const img = clone.querySelector('.history-thumb');
                img.src = item.authorImage;
                img.alt = "";

                clone.querySelector('.history-poem-title').textContent = item.poemTitle;
                clone.querySelector('.history-author-name').textContent = item.authorName;

                grid.appendChild(clone);
            });
        }

        // Dodana podpora za drag-to-scroll z miško (uporabniško navodilo)
        const slider = section.querySelector('.history-grid');
        let isDown = false;
        let startX;
        let scrollLeft;
        let dragged = false;

        if (slider) {
            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                dragged = false;
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.classList.remove('is-dragging');
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.classList.remove('is-dragging');
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                const x = e.pageX - slider.offsetLeft;
                const distance = Math.abs(x - startX);
                if (distance > 5) {
                    dragged = true;
                    slider.classList.add('is-dragging');
                    e.preventDefault();
                }
                const walk = (x - startX) * 1.5; // hitrost drsenja
                slider.scrollLeft = scrollLeft - walk;
            });
            slider.addEventListener('click', (e) => {
                if (dragged) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
            slider.querySelectorAll('a').forEach(a => {
                a.addEventListener('dragstart', e => e.preventDefault()); // Prepreči navaden ghost-drag narativnih slik
            });
        }
    },

    renderSearchResults(results, onAuthorClick, onClose) {
        this._showMainContent();
        const cont = document.getElementById('search-results');
        if (!cont) return;

        cont.innerHTML = '';

        const hasResults = results.authors.length > 0 || results.groups.length > 0 || results.poems.length > 0;

        if (!hasResults) {
            const noRes = document.createElement('p');
            noRes.className = 'search-no-results';
            noRes.textContent = 'Ni zadetkov za vaš iskalni niz.';
            cont.appendChild(noRes);
            return;
        }

        // 1. Authors
        if (results.authors.length > 0) {
            const section = document.createElement('section');
            const h4 = document.createElement('h4');
            h4.textContent = 'Avtorji';
            section.appendChild(h4);

            const tpl = document.getElementById('tpl-search-author');
            results.authors.forEach(a => {
                if (tpl) {
                    const clone = tpl.content.cloneNode(true);
                    const link = clone.querySelector('.search-res-item');
                    link.href = `#${a.id}`;
                    link.addEventListener('click', onClose);

                    const img = clone.querySelector('.res-thumb');
                    img.src = a.image;
                    img.alt = a.name;

                    const name = clone.querySelector('.res-name');
                    if (a.nameHtml) name.innerHTML = a.nameHtml;
                    else name.textContent = a.name;

                    section.appendChild(clone);
                }
            });
            cont.appendChild(section);
        }

        // 2. Groups (Zbirk)
        if (results.groups.length > 0) {
            const section = document.createElement('section');
            const h4 = document.createElement('h4');
            h4.textContent = 'Zbirke';
            section.appendChild(h4);

            const tpl = document.getElementById('tpl-search-group');
            results.groups.forEach(g => {
                if (tpl) {
                    const clone = tpl.content.cloneNode(true);
                    const link = clone.querySelector('.search-res-item');
                    link.href = `#${g.author.id}`;
                    link.addEventListener('click', onClose);

                    const title = clone.querySelector('.res-group-title');
                    if (g.groupHtml) title.innerHTML = g.groupHtml;
                    else title.textContent = g.group;

                    clone.querySelector('.res-author').textContent = g.author.name;

                    section.appendChild(clone);
                }
            });
            cont.appendChild(section);
        }

        // 3. Poems (Dela)
        if (results.poems.length > 0) {
            const section = document.createElement('section');
            const h4 = document.createElement('h4');
            h4.textContent = 'Dela';
            section.appendChild(h4);

            const tpl = document.getElementById('tpl-search-poem');
            results.poems.slice(0, 20).forEach(p => {
                if (tpl) {
                    const clone = tpl.content.cloneNode(true);
                    const link = clone.querySelector('.search-res-item');
                    link.href = `#${p.author.id}/${p.poem.id}`;
                    link.addEventListener('click', onClose);

                    const title = clone.querySelector('.res-poem-title');
                    if (p.titleHtml) title.innerHTML = p.titleHtml;
                    else title.textContent = p.poem.title;

                    clone.querySelector('.res-author').textContent = p.author.name;

                    const snip = clone.querySelector('.res-snippet');
                    if (p.snippet) snip.innerHTML = p.snippet;
                    else snip.remove();

                    section.appendChild(clone);
                }
            });
            cont.appendChild(section);
        }
    },

    /**
     * Renders the bookmarks list.
     */
    renderBookmarks(bookmarks, authors, onRemove) {
        const container = document.getElementById('bookmarks-container');
        const favContainer = document.getElementById('favorites-container');
        const titleEl = document.querySelector('#favorites-list-view h2');

        if (!container || !favContainer || !titleEl) return;

        titleEl.textContent = 'Moji zaznamki';
        favContainer.classList.add('hidden');
        container.classList.remove('hidden');
        container.innerHTML = '';

        if (bookmarks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `
                <p>Seznam zaznamkov je prazen.</p>
                <small>Zaznamke dodate s klikom na ikono zaznamka v akcijski vrstici med branjem.</small>
            `;
            container.appendChild(empty);
            return;
        }

        const template = document.getElementById('tpl-bookmark-item');
        if (!template) return;

        bookmarks.forEach(b => {
            const authorsList = Array.isArray(authors) ? authors : [];
            const author = authorsList.find(a => a.id === b.authorId) || { name: b.authorId };

            const clone = template.content.cloneNode(true);
            const link = clone.querySelector('.fav-item');
            link.href = `#${b.authorId}/${b.poemId}`;
            link.onclick = (e) => {
                sessionStorage.setItem('jumpToBookmark', JSON.stringify({
                    authorId: b.authorId,
                    poemId: b.poemId,
                    scrollPos: b.scrollPos || 0
                }));
            };

            clone.querySelector('.fav-title').textContent = b.poemTitle;
            clone.querySelector('.fav-author').textContent = author.name;

            const removeBtn = clone.querySelector('.bookmark-remove');
            removeBtn.dataset.author = b.authorId;
            removeBtn.dataset.poem = b.poemId;
            removeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(b.authorId, b.poemId);
            };

            container.appendChild(clone);
        });
    },

    /**
     * Switches view but specifically for bookmarks/favorites.
     */
    showListOverlay(type) {
        const overlay = document.getElementById('favorites-list-view');
        if (!overlay) return;

        // Hide main content
        if (this.mainElement) this.mainElement.classList.add('hidden');

        overlay.classList.remove('hidden');

        const favsCont = document.getElementById('favorites-container');
        const bookmarksCont = document.getElementById('bookmarks-container');
        const titleEl = overlay.querySelector('h2');

        if (type === 'favorites') {
            if (titleEl) titleEl.textContent = 'Priljubljene pesmi';
            favsCont.classList.remove('hidden');
            bookmarksCont.classList.add('hidden');
        } else {
            if (titleEl) titleEl.textContent = 'Moji zaznamki';
            favsCont.classList.add('hidden');
            bookmarksCont.classList.remove('hidden');
        }
    },

    /**
     * Renders a premium Resume Reading hero section.
     */
    renderResumeHero(lastRead) {
        const container = document.getElementById('resume-hero-section');
        if (!container) return;

        if (!lastRead || !lastRead.poemId || !lastRead.authorId) {
            container.classList.add('hidden');
            return;
        }

        // Only show if it matches history or is recent (e.g., within 7 days)
        const isRecent = (Date.now() - lastRead.timestamp) < (7 * 24 * 60 * 60 * 1000);
        if (!isRecent) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = `
            <div class="resume-hero-card">
                <div class="resume-content">
                    <span class="resume-label">Nadaljuj z branjem</span>
                    <h2 class="resume-title">${escapeHtml(lastRead.poemTitle)}</h2>
                </div>
                <button class="resume-btn" onclick="window.location.hash='#${lastRead.authorId}/${lastRead.poemId}'">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Nadaljuj
                </button>
            </div>
        `;
        container.classList.remove('hidden');
    }
};
