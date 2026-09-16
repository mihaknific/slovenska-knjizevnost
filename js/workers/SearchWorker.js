/**
 * SearchWorker.js
 * Offloads indexing and search logic from the main thread.
 * Communicates via messages.
 */

const DB_NAME = 'SlovenskaKnjizevnostDB';
const DB_VERSION = 2;
const STORE_POEMS = 'poems_cache';

let allData = [];
let isIndexing = false;

/**
 * Opens IndexedDB connection (mini-impl for worker).
 */
async function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Gets cached data from IndexedDB.
 */
async function getCachedData(authorId) {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_POEMS], 'readonly');
            const store = transaction.objectStore(STORE_POEMS);
            const request = store.get(authorId);
            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

/**
 * Normalizes text for searching (removes accents, lowercase).
 */
function normalize(text) {
    if (!text) return '';
    return text.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/č/g, 'c')
        .replace(/š/g, 's')
        .replace(/ž/g, 'z');
}

/**
 * Escapes HTML for snippets.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Generates highlighted HTML snippet.
 */
function highlightText(text, qWords) {
    if (!qWords || qWords.length === 0) return escapeHtml(text);

    const tNorm = normalize(text);
    const matches = [];

    qWords.forEach(word => {
        const wNorm = normalize(word);
        if (wNorm.length < 2) return;
        let startPos = 0;
        while ((startPos = tNorm.indexOf(wNorm, startPos)) !== -1) {
            matches.push({ start: startPos, end: startPos + wNorm.length });
            startPos += wNorm.length;
        }
    });

    if (matches.length === 0) return escapeHtml(text);

    matches.sort((a, b) => a.start - b.start);
    const mergedMatches = [];
    if (matches.length > 0) {
        let current = matches[0];
        for (let i = 1; i < matches.length; i++) {
            if (matches[i].start < current.end) {
                current.end = Math.max(current.end, matches[i].end);
            } else {
                mergedMatches.push(current);
                current = matches[i];
            }
        }
        mergedMatches.push(current);
    }

    let lastIdx = 0;
    let result = '';
    mergedMatches.forEach(m => {
        result += escapeHtml(text.substring(lastIdx, m.start));
        result += `<mark>${escapeHtml(text.substring(m.start, m.end))}</mark>`;
        lastIdx = m.end;
    });
    result += escapeHtml(text.substring(lastIdx));
    return result;
}

/**
 * Performs the actual search with optional filtering.
 * Uses a scoring system to prioritize exact phrase matches.
 */
function performSearch(payload) {
    const { query, filter } = typeof payload === 'string' ? { query: payload, filter: 'all' } : payload;
    if (!query || query.length < 2) return { authors: [], groups: [], poems: [] };

    const qNorm = normalize(query);
    const qWords = qNorm.split(/\s+/).filter(w => w.length > 0);
    const isMultiWord = qWords.length > 1;

    const results = {
        authors: [],
        groups: [],
        poems: []
    };

    allData.forEach(entry => {
        // 1. Search Authors
        const authorNameNorm = normalize(entry.author.name);
        const authorExactMatch = isMultiWord && authorNameNorm.includes(qNorm);
        const authorMatch = authorExactMatch || qWords.every(word => authorNameNorm.includes(word));
        if (authorMatch && (filter === 'all' || filter === 'author')) {
            // Highlight with the full phrase for exact matches, individual words otherwise
            const highlightWords = authorExactMatch ? [query] : qWords;
            results.authors.push({
                ...entry.author,
                nameHtml: highlightText(entry.author.name, highlightWords),
                score: authorExactMatch ? 100 : 30
            });
        }

        if (filter === 'author') return;

        // 2. Search Groups & Poems
        const seenGroups = new Set();
        entry.poems.forEach(poem => {
            // Determine genre based on group name first, then fall back to author genre
            let genre = entry.author.genre || 'poetry';
            
            const groupName = (poem.group || '').toLowerCase();
            if (groupName.includes('poezija')) {
                genre = 'poetry';
            } else if (groupName.includes('proza') || groupName.includes('mladinska dela')) {
                genre = 'prose';
            } else if (groupName.includes('dramatika') || groupName.includes('drama')) {
                genre = 'play';
            }
            
            // Apply Genre Filter
            if (filter !== 'all' && filter !== 'author') {
                if (genre !== filter) return;
            }

            const group = poem.group;
            if (group && filter !== 'author') {
                const groupNorm = normalize(group);
                const groupExact = isMultiWord && groupNorm.includes(qNorm);
                const groupAllWords = qWords.every(word => groupNorm.includes(word));
                if ((groupExact || groupAllWords) && !seenGroups.has(group)) {
                    const highlightWords = groupExact ? [query] : qWords;
                    results.groups.push({
                        author: entry.author, group,
                        groupHtml: highlightText(group, highlightWords),
                        score: groupExact ? 100 : 30
                    });
                    seenGroups.add(group);
                }
            }

            const titleNorm = normalize(poem.title);
            const contentNorm = normalize(poem.content || '');

            // Check for exact phrase match (continuous string)
            const titleExactMatch = isMultiWord && titleNorm.includes(qNorm);
            const textExactMatch  = isMultiWord && contentNorm.includes(qNorm);

            // Check for all-words match (each word present, but not necessarily together)
            const titleAllWords = qWords.every(word => titleNorm.includes(word));
            const textAllWords  = qWords.every(word => contentNorm.includes(word));

            const isMatch = titleExactMatch || textExactMatch || titleAllWords || textAllWords;

            if (isMatch && filter !== 'author') {
                // Calculate relevance score
                let score = 0;
                if (titleExactMatch) score += 100;  // Exact phrase in title — highest
                if (textExactMatch)  score += 50;   // Exact phrase in content
                if (titleAllWords && !titleExactMatch) score += 30;  // All words in title
                if (textAllWords && !textExactMatch)   score += 10;  // All words in content

                // Generate highlighted title
                let titleHtml = escapeHtml(poem.title);
                if (titleExactMatch || titleAllWords) {
                    const highlightWords = titleExactMatch ? [query] : qWords;
                    titleHtml = highlightText(poem.title, highlightWords);
                }

                // Generate snippet from content
                let snippet = '';
                if (textExactMatch || textAllWords) {
                    // Prefer showing the exact phrase location in snippet
                    let idx;
                    if (textExactMatch) {
                        idx = contentNorm.indexOf(qNorm);
                    } else {
                        const firstWordMatch = qWords.find(word => contentNorm.includes(word));
                        idx = contentNorm.indexOf(firstWordMatch);
                    }
                    const start = Math.max(0, idx - 40);
                    const end = Math.min((poem.content || '').length, idx + 80);
                    let rawSnippet = poem.content.substring(start, end).replace(/\n/g, ' ');
                    if (start > 0) rawSnippet = '...' + rawSnippet;
                    if (end < poem.content.length) rawSnippet += '...';
                    const highlightWords = textExactMatch ? [query] : qWords;
                    snippet = highlightText(rawSnippet, highlightWords);
                }

                results.poems.push({ author: entry.author, poem, snippet, titleHtml, score });
            }
        });
    });

    // Sort all result categories by score (highest first)
    results.authors.sort((a, b) => (b.score || 0) - (a.score || 0));
    results.groups.sort((a, b) => (b.score || 0) - (a.score || 0));
    results.poems.sort((a, b) => (b.score || 0) - (a.score || 0));

    return results;
}

/**
 * Message Handler
 */
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INDEX':
            if (isIndexing) return;
            isIndexing = true;
            const authors = payload;
            try {
                const results = await Promise.all(authors.map(async (author) => {
                    // Try IDB first
                    let poems = await getCachedData(author.id);
                    if (!poems) {
                        try {
                            const response = await fetch('../../' + author.dataFile);
                            poems = await response.json();
                        } catch (err) {
                            return null;
                        }
                    }
                    const genre = author.type === 'writer' ? 'prose' : (author.type === 'playwright' ? 'play' : 'poetry');
                    author.genre = genre;
                    return { author, poems };
                }));
                allData = results.filter(r => r !== null);
                self.postMessage({ type: 'READY' });
            } catch (err) {
                self.postMessage({ type: 'ERROR', payload: err.message });
            } finally {
                isIndexing = false;
            }
            break;

        case 'SEARCH':
            const results = performSearch(payload);
            self.postMessage({ type: 'RESULTS', payload: results });
            break;
    }
};
