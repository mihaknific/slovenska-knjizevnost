import { fetchPoems, getPoems, clearPoems, getSortMethod } from './data.js';
import { AuthorManager } from './AuthorManager.js';
import { Favorites } from './Favorites.js';
import { escapeHtml, debounce, setupKeyboardNav } from './utils.js';
import { ShareManager } from './ShareManager.js';
import { TTS } from './TTSManager.js';
import { SEOManager } from './SEOManager.js';
import { StorageManager } from './StorageManager.js';
import { HistoryManager } from './HistoryManager.js';
import { BookmarkManager } from './BookmarkManager.js';
import { Highlighter } from './Highlighter.js';
import { Renderer } from './Renderer.js';
import { closeSettingsOverlay } from './settings.js';
import { LastRead } from './LastRead.js';

// ─── Toast Notification ──────────────────────────────────
function showToast(msg, actionLabel = null, actionCallback = null) {
    let toast = document.querySelector('.custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'custom-toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.textContent = msg;
    toast.appendChild(textSpan);

    if (actionLabel && actionCallback) {
        const btn = document.createElement('button');
        btn.className = 'toast-action-btn';
        btn.textContent = actionLabel;
        btn.onclick = () => {
            actionCallback();
            toast.classList.remove('show');
        };
        toast.appendChild(btn);
    }

    toast.offsetHeight;
    toast.classList.add('show');

    if (toast._timeout) clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

const main = document.querySelector('main');
const sortButtons = document.querySelector('#sort-buttons');

// State
let currentAuthorId = null;
let currentPoemId = null;

function getWorksLabel(type) {
    if (type === 'writer') return 'Dela';
    if (type === 'playwright') return 'Dramska dela';
    return 'Pesmi';
}

export function initRouter() {
    const backBtn = document.getElementById('back-to-portal');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.hash = '';
        });
    }

    const favsBtn = document.getElementById('show-favorites');
    if (favsBtn) {
        favsBtn.addEventListener('click', () => {
            closeSettingsOverlay();
            window.location.hash = 'favorites';
        });
    }

    const bookmarksBtn = document.getElementById('show-bookmarks');
    if (bookmarksBtn) {
        bookmarksBtn.addEventListener('click', () => {
            closeSettingsOverlay();
            window.location.hash = 'bookmarks';
        });
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    ShareManager.init();
    setupPhase2Features();
}

function setupPhase2Features() {
    const toggleBtn = document.getElementById('toggle-author-bio');
    const wrapper = document.getElementById('author-long-bio-wrapper');
    if (toggleBtn && wrapper) {
        toggleBtn.onclick = () => {
            const isHidden = wrapper.classList.toggle('hidden');
            toggleBtn.innerHTML = isHidden ? 'O avtorju &darr;' : 'Zapri &uarr;';
        };
    }
}

export async function handleRoute() {
    closeSettingsOverlay();
    // Ob menjavi poti vedno ustavi TTS in počisti celotno stanje
    TTS.stop();

    const hash = window.location.hash.slice(1);

    if (!hash) {
        Renderer.switchView('PORTAL');
        clearPoems();
        currentAuthorId = null;
        await AuthorManager.init();
        Renderer.renderHistory(HistoryManager.getAll());
        Renderer.renderResumeHero(LastRead.get());
        return;
    }

    if (hash === 'favorites') {
        Renderer.switchView('COLLECTION', true);
        Renderer.showListOverlay('favorites');
        currentAuthorId = null;
        currentPoemId = null;
        await AuthorManager.ensureLoaded();
        renderFavorites();
        return;
    }

    if (hash === 'bookmarks') {
        Renderer.switchView('COLLECTION', false);
        Renderer.showListOverlay('bookmarks');
        currentAuthorId = null;
        currentPoemId = null;
        await AuthorManager.ensureLoaded();
        renderBookmarks();
        return;
    }

    const parts = hash.split('/');
    const authorId = parts[0];
    const poemId = parts[1];

    // If the route is the same, do nothing
    if (currentAuthorId === authorId && currentPoemId === poemId) {
        return;
    }

    // If a poem is being displayed, show skeleton
    if (poemId) {
        Renderer.renderPoemSkeleton();
    } else {
        // If a list is being displayed, show skeleton
        Renderer.renderListSkeleton();
    }

    if (currentAuthorId !== authorId) {
        await AuthorManager.ensureLoaded();
        const author = AuthorManager.getAuthor(authorId);

        if (!author) {
            console.error('Author not found:', authorId);
            window.location.hash = '';
            return;
        }

        Renderer.updateHeader(author, 'collection');
        await fetchPoems(author.dataFile, authorId);
        currentAuthorId = authorId;
        SEOManager.updateOpenGraph(author.title || author.name, author.image, authorId);
    }

    Renderer.switchView('COLLECTION');

    if (poemId) {
        displayPoem(poemId);
    } else {
        const author = AuthorManager.getAuthor(authorId);
        if (author) {
            document.title = author.title || author.name;
            SEOManager.updateDescription(author.bio || `Poezije - ${author.name}`);
        }
        renderPoemList();
    }
    currentPoemId = poemId || null; // Update currentPoemId after handling the route
}

export function renderPoemList() {
    // Renderer.renderListSkeleton(); // Moved to handleRoute for immediate feedback
    const author = AuthorManager.getAuthor(currentAuthorId);
    Renderer.updateHeader(author, 'portal');

    const bioContainer = document.getElementById('author-bio-container');
    if (bioContainer) bioContainer.classList.remove('hidden');

    const topLeftControls = document.getElementById('top-left-controls');
    if (topLeftControls) topLeftControls.style.display = 'block';

    const poems = getPoems();
    const worksLabel = getWorksLabel(author.type);

    Renderer.renderPoemList(currentAuthorId, poems, worksLabel, getSortMethod() === 'group');

    const authorDesc = author.bio ? author.bio.substring(0, 160) : `Zbirka del avtorja ${author.name}.`;
    SEOManager.updateDescription(authorDesc);
    SEOManager.updateOpenGraph(author.name, author.image, author.id);
    SEOManager.updateJsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": author.title || `${worksLabel} — ${author.name}`,
        "description": author.bio,
        "author": { "@type": "Person", "name": author.name }
    });

    const searchInput = document.getElementById('inline-search');
    if (searchInput) {
        const getVisibleLinks = () =>
            Array.from(document.querySelectorAll('.poem-link'))
                .filter(link => !link.parentElement.classList.contains('hidden-by-search'));

        const kbNav = setupKeyboardNav(searchInput, getVisibleLinks);

        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.toLowerCase();
            const links = document.querySelectorAll('.poem-link');

            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                const parent = link.parentElement;
                if (text.includes(query)) {
                    parent.classList.remove('hidden-by-search');
                } else {
                    parent.classList.add('hidden-by-search');
                }
            });

            document.querySelectorAll('.poem-group-header, .poem-subgroup-header').forEach(h => {
                let next = h.nextElementSibling;
                let hasVisiblePoem = false;
                while (next && !next.classList.contains('poem-group-header') &&
                    !next.classList.contains('poem-subgroup-header')) {
                    if (next.querySelector && next.querySelector('.poem-link') &&
                        !next.classList.contains('hidden-by-search')) {
                        hasVisiblePoem = true;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                h.classList.toggle('hidden-by-search', !hasVisiblePoem && query.length > 0);
            });

            kbNav.reset();
        }, 300));
    }

    const nav = document.querySelector('nav');
    if (poems.length === 0) {
        if (sortButtons) sortButtons.style.display = 'none';
        if (nav) nav.style.display = 'none';
    } else {
        if (sortButtons) sortButtons.style.display = 'block';
        if (nav) nav.style.display = 'flex';
    }
    window.scrollTo(0, 0);
}

export async function displayPoem(poemId) {
    const poems = getPoems();
    const poem = poems.find(p => String(p.id) === String(poemId));

    if (!poem) {
        renderPoemList();
    } else {
        const author = AuthorManager.getAuthor(currentAuthorId);
        Renderer.updateHeader(author, 'collection');

        const bioContainer = document.getElementById('author-bio-container');
        if (bioContainer) bioContainer.classList.add('hidden');

        const topLeftControls = document.getElementById('top-left-controls');
        if (topLeftControls) topLeftControls.style.display = 'none';

        HistoryManager.save(currentAuthorId, author.name, author.image, poemId, poem.title);
        LastRead.save(currentAuthorId, poemId, poem.title);

        const isFav = Favorites.isFavorite(currentAuthorId, poemId);
        const isBookmarked = BookmarkManager.isBookmarked(currentAuthorId, poemId);
        const ttsRate = StorageManager.getSetting('ttsRate', 1.0);

        Renderer.renderPoem(poem, isFav, ttsRate, isBookmarked);

        Highlighter.setPoemId(`${currentAuthorId}/${poemId}`);
        await Highlighter.loadHighlights(`${currentAuthorId}/${poemId}`);

        document.getElementById('toggle-favorite').onclick = () => {
            const added = Favorites.toggle(currentAuthorId, poemId, poem.title);
            const heart = document.querySelector('.heart-icon');
            const label = document.querySelector('.fav-label');
            if (heart) heart.classList.toggle('active', added);
            if (label) label.textContent = added ? 'Shranjeno' : 'Shrani';
            showToast(added ? 'Pesem je shranjena.' : 'Pesem je odstranjena.');
        };

        document.getElementById('share-poem').onclick = () => {
            ShareManager.open({
                title: poem.title,
                text: `Preberite pesem "${poem.title}" avtorja ${author ? author.name : ''} `,
                rawText: poem.content,
                url: window.location.href
            });
        };

        let isTTSWrapped = false;
        document.getElementById('speak-poem').onclick = () => {
            if (TTS.speaking) {
                TTS.stop();
            } else {
                if (!isTTSWrapped) {
                    const contentP = document.getElementById('poem-content-text');
                    if (contentP) {
                        contentP.innerHTML = escapeHtml(poem.content)
                            .split(/(\n)/)
                            .map(segment => {
                                if (segment === '\n') return '<br>';
                                return segment.split(/(\s+)/).map(token => {
                                    if (/^\s*$/.test(token)) return token;
                                    return `<span class="tts-word">${token}</span>`;
                                }).join('');
                            }).join('');

                        contentP.querySelectorAll('.tts-word').forEach((span, idx) => {
                            span.onclick = () => TTS.seekToWord(idx);
                        });
                        isTTSWrapped = true;
                    }
                }
                TTS.play(poem.title, poem.content);
            }
        };

        const ttsHandlers = {
            'tts-play-pause': () => TTS.pauseResume(),
            'tts-stop': () => TTS.stop(),
            'tts-faster': () => TTS.changeRate(0.1),
            'tts-slower': () => TTS.changeRate(-0.1)
        };
        Object.entries(ttsHandlers).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) el.onclick = handler;
        });

        const authorName = author ? author.name : '';
        const pageTitle = `${poem.title} - ${authorName} `;
        document.title = pageTitle;
        SEOManager.updateDescription(`Preberite pesem ${poem.title}.`);
        SEOManager.updateOpenGraph(pageTitle, author ? author.image : '', `${currentAuthorId}/${poemId}`);
        SEOManager.updateJsonLd({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": poem.title,
            "author": { "@type": "Person", "name": authorName },
            "text": poem.content.substring(0, 150) + "..."
        });

        if (sortButtons) sortButtons.style.display = 'none';

        const nav = document.querySelector('nav');
        if (nav) nav.style.display = 'flex';
    }

    // Obnovitev scroll pozicije iz zaznamkov
    const jumpToBookmarkStr = sessionStorage.getItem('jumpToBookmark');
    if (jumpToBookmarkStr) {
        try {
            const jumpData = JSON.parse(jumpToBookmarkStr);
            if (jumpData.authorId === currentAuthorId && String(jumpData.poemId) === String(poemId)) {
                setTimeout(() => {
                    window.scrollTo({ top: jumpData.scrollPos, behavior: 'instant' });
                }, 50);
            } else {
                window.scrollTo(0, 0);
            }
        } catch (e) { window.scrollTo(0, 0); }
        sessionStorage.removeItem('jumpToBookmark');
    } else {
        window.scrollTo(0, 0);
    }
}

export function renderFavorites() {
    document.title = 'Priljubljene pesmi';
    SEOManager.updateDescription('Seznam vaših priljubljenih pesmi.');
    Renderer.updateHeader(null, 'portal');

    const favs = Favorites.getFavorites();
    const authors = AuthorManager.authors || [];

    Renderer.renderFavorites(favs, authors, (authorId, poemId) => {
        const item = favs.find(f => f.authorId === authorId && String(f.poemId) === String(poemId));
        if (item) {
            Favorites.toggle(authorId, poemId);
            renderFavorites();
            showToast(`Odstranjeno: ${item.poemTitle}`, 'Prekliči', () => {
                Favorites.toggle(authorId, poemId, item.poemTitle);
                renderFavorites();
            });
        }
    });

    const topLeftControls = document.getElementById('top-left-controls');
    if (topLeftControls) topLeftControls.style.display = 'none';
    if (sortButtons) sortButtons.style.display = 'none';
    window.scrollTo(0, 0);
}

export function renderBookmarks() {
    document.title = 'Moji zaznamki';
    SEOManager.updateDescription('Seznam vaših zaznamkov.');
    Renderer.updateHeader(null, 'portal');

    const bookmarks = BookmarkManager.getBookmarks();
    const authors = AuthorManager.authors || [];

    Renderer.renderBookmarks(bookmarks, authors, (authorId, poemId) => {
        const item = bookmarks.find(b => b.authorId === authorId && String(b.poemId) === String(poemId));
        if (item) {
            BookmarkManager.remove(authorId, poemId);
            renderBookmarks();
            showToast(`Zaznamek odstranjen: ${item.poemTitle}`, 'Prekliči', () => {
                BookmarkManager.toggle(authorId, poemId, item.poemTitle, item.scrollPos);
                renderBookmarks();
            });
        }
    });

    const topLeftControls = document.getElementById('top-left-controls');
    if (topLeftControls) topLeftControls.style.display = 'none';
    if (sortButtons) sortButtons.style.display = 'none';
    window.scrollTo(0, 0);
}

export function handleNavigation(direction) {
    const collectionView = document.getElementById('view-collection');
    if (collectionView.classList.contains('hidden')) return;

    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');

    const poems = getPoems();
    if (!poems || poems.length === 0) return;

    if (parts.length < 2 || !parts[1]) {
        const index = direction === 'next' ? 0 : poems.length - 1;
        const poem = poems[index];
        const aid = parts[0] || currentAuthorId;
        if (aid) window.location.hash = `#${aid}/${poem.id}`;
        return;
    }

    const currentId = String(parts[1]);
    let currentIndex = poems.findIndex(p => String(p.id) === currentId);

    if (currentIndex === -1) {
        const poem = poems[0];
        const aid = parts[0] || currentAuthorId;
        if (aid) window.location.hash = `#${aid}/${poem.id}`;
        return;
    }

    const aid = parts[0] || currentAuthorId;
    if (!aid) return;

    if (direction === 'next') {
        if (currentIndex < poems.length - 1) {
            const next = poems[currentIndex + 1];
            window.location.hash = `#${aid}/${next.id}`;
        } else {
            window.location.hash = `#${aid}`;
        }
    } else {
        if (currentIndex > 0) {
            const prev = poems[currentIndex - 1];
            window.location.hash = `#${aid}/${prev.id}`;
        } else {
            window.location.hash = `#${aid}`;
        }
    }
}
