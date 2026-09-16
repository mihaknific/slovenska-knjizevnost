/**
 * Main Entry Point
 * Initializes modules and sets up global event listeners.
 */

import { initRouter } from './modules/router.js';
import { initSettings } from './modules/settings.js';
import { GlobalSearch } from './modules/GlobalSearch.js';
import { LastRead } from './modules/LastRead.js';
import { GestureManager } from './modules/GestureManager.js';
import { Highlighter } from './modules/Highlighter.js';
import { GlobalEvents } from './modules/GlobalEvents.js';
import { PWAManager } from './modules/PWAManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Settings (Early to apply theme/font — also displays version)
    initSettings();

    // 2. Initialize Router (Handles initial render & hash changes)
    initRouter();

    // 3. Initialize Global Search
    GlobalSearch.init();

    // 4. Initialize Last Read tracking
    LastRead.initAutoSave();

    // 5. Initialize Gestures (Swipe for mobile)
    GestureManager.init();

    // 6. Initialize Highlighter
    Highlighter.init();

    // 7. Global Event Listeners
    GlobalEvents.init();

    // 8. PWA Install Logic
    PWAManager.init();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });

        navigator.serviceWorker.register('sw.js', { type: 'module' })
            .then(registration => {
                // Check if there is already a waiting worker on load
                if (registration.waiting) {
                    showUpdateNotification(registration.waiting);
                }

                // Listen for new workers being installed
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification(newWorker);
                        }
                    });
                });

                // Periodically check for updates (every 30 mins)
                setInterval(() => {
                    registration.update();
                }, 30 * 60 * 1000);
            }, (err) => {
                // ServiceWorker registration failed
            });
    });
}

function showUpdateNotification(worker) {
    let toast = document.getElementById('pwa-update-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pwa-update-toast';
        toast.className = 'pwa-toast';
        toast.innerHTML = `
            <span>Na voljo je posodobitev.</span>
            <button id="pwa-refresh-btn">Osveži</button>
            <button id="pwa-dismiss-btn" class="icon-btn">&times;</button>
        `;
        document.body.appendChild(toast);

        const refreshBtn = document.getElementById('pwa-refresh-btn');
        refreshBtn.addEventListener('click', () => {
            refreshBtn.textContent = 'Posodabljam...';
            refreshBtn.classList.add('updating');
            worker.postMessage({ type: 'SKIP_WAITING' });
        });
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            toast.classList.remove('show');
        });
    }
    setTimeout(() => toast.classList.add('show'), 100);
}
