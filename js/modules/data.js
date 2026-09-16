/**
 * Data Management Module
 * Handles fetching and sorting of poem data.
 */

import { StorageManager } from './StorageManager.js';

let poems = [];
let sortMethod = 'group';

export async function fetchPoems(jsonPath, authorId) {
    // 1. Try to get from cache first
    const cached = await StorageManager.getCachedPoemData(authorId);
    if (cached) {
        poems = cached;
        sortByGroup();
        return poems;
    }

    // 2. Fallback to network
    try {
        let fetchedData = [];
        if (Array.isArray(jsonPath)) {
            // Handle multiple data files (chunking)
            const requests = jsonPath.map(path => fetch(path).then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            }));
            const results = await Promise.all(requests);
            // Concatenate all arrays
            fetchedData = results.flat();
        } else {
            // Handle single data file
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error('Network response was not ok');
            fetchedData = await response.json();
        }
        
        poems = fetchedData;
        
        // Background cache
        StorageManager.cachePoemData(authorId, poems);

        // Initial sort
        sortByGroup();
        return poems;
    } catch (error) {
        console.error('Error loading poems for ' + authorId, error);
        return [];
    }
}

export function clearPoems() {
    poems = [];
}

export function getPoems() {
    return poems;
}

export function getSortMethod() {
    return sortMethod;
}

export function sortAlphabetically() {
    poems.sort((a, b) => a.title.localeCompare(b.title));
    sortMethod = 'alphabetical';
}

export function sortByGroup() {
    poems.sort((a, b) => {
        return (a.group_num || 0) - (b.group_num || 0) ||
            ((a.subgroup_num || 0) - (b.subgroup_num || 0)) ||
            ((a.inner_id || 0) - (b.inner_id || 0));
    });
    sortMethod = 'group';
}

export function toggleSortMethod() {
    if (sortMethod === 'alphabetical') {
        sortByGroup();
    } else {
        sortAlphabetically();
    }
    return sortMethod;
}

export async function downloadAllData(onProgress, onComplete, onError) {
    try {
        const response = await fetch('json/authors.json');
        if (!response.ok) throw new Error('Could not fetch authors list');
        const authors = await response.json();
        
        let totalFiles = 0;
        let downloadedFiles = 0;
        
        // Count total files
        authors.forEach(author => {
            if (author.dataFiles) totalFiles += author.dataFiles.length;
            else if (author.dataFile) totalFiles += 1;
        });

        for (const author of authors) {
            let fetchedData = [];
            
            if (author.dataFiles) {
                const results = [];
                for (const path of author.dataFiles) {
                    const res = await fetch(path);
                    if (!res.ok) throw new Error('Network response was not ok');
                    const json = await res.json();
                    results.push(json);
                    
                    downloadedFiles++;
                    if (onProgress) onProgress(downloadedFiles, totalFiles);
                }
                fetchedData = results.flat();
            } else if (author.dataFile) {
                const res = await fetch(author.dataFile);
                if (!res.ok) throw new Error('Network response was not ok');
                fetchedData = await res.json();
                
                downloadedFiles++;
                if (onProgress) onProgress(downloadedFiles, totalFiles);
            }
            
            if (fetchedData.length > 0) {
                await StorageManager.cachePoemData(author.id, fetchedData);
            }
        }
        
        if (onComplete) onComplete();
    } catch (err) {
        console.error('Error downloading all data:', err);
        if (onError) onError(err);
    }
}
