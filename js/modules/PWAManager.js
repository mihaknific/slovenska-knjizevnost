/**
 * PWAManager.js
 * Handles the PWA installation prompt and logic.
 */

export const PWAManager = {
    deferredPrompt: null,
    installSection: null,
    installBtn: null,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,

    init() {
        this.installSection = document.getElementById('pwa-install-section');
        this.installBtn = document.getElementById('pwa-install-btn');

        if (!this.installSection || !this.installBtn) return;

        // If already installed, hide the section entirely
        if (this.isStandalone) {
            this.installSection.hidden = true;
            return;
        }

        // Listen for the beforeinstallprompt event (Android/Chrome/Edge)
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt = e;
            // Update UI to notify the user they can add to home screen
            this.installSection.hidden = false;
        });

        // Handle the button click
        this.installBtn.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                // Show the install prompt
                this.deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.installSection.hidden = true;
                } else {
                    // User dismissed
                }
                // We no longer need the prompt. Clear it up.
                this.deferredPrompt = null;
            } else if (this.isIOS) {
                // Fallback for iOS since it doesn't support beforeinstallprompt yet
                this.showIOSToast();
            }
        });

        // Listen for successful installation
        window.addEventListener('appinstalled', (evt) => {
            this.installSection.hidden = true;
            this.deferredPrompt = null;
        });

        // Show section for iOS by default if not standalone, since we can't detect installability easily
        if (this.isIOS && !this.isStandalone) {
            this.installSection.hidden = false;
        }
    },

    showIOSToast() {
        let toast = document.getElementById('pwa-ios-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pwa-ios-toast';
            toast.className = 'pwa-toast';
            toast.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <span style="font-weight:600;">Namestitev na iOS</span>
                    <span style="font-size:0.9rem; opacity:0.9;">1. Tapnite gumb Deli (Share) <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; vertical-align:middle;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> v brskalniku.</span>
                    <span style="font-size:0.9rem; opacity:0.9;">2. Izberite "Na začetni zaslon" (Add to Home Screen) in potrdite.</span>
                </div>
                <button id="pwa-ios-dismiss" class="icon-btn" style="align-self:flex-start;">&times;</button>
            `;
            document.body.appendChild(toast);

            document.getElementById('pwa-ios-dismiss').addEventListener('click', () => {
                toast.classList.remove('show');
            });
        }

        toast.classList.add('show');

        // Auto-hide after 10 seconds
        setTimeout(() => toast.classList.remove('show'), 10000);
    }
};
