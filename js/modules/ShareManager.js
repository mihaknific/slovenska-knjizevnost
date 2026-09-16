/**
 * ShareManager Module
 * Handles the share modal and sharing logic (copy to clipboard, native share, social apps).
 */

import { createFocusTrap } from './utils.js';

export const ShareManager = {
    currentShareData: null,
    focusTrap: null,

    init() {
        const shareModal = document.getElementById('share-modal');
        if (!shareModal) return;
        this.focusTrap = createFocusTrap(shareModal);

        const urlInput = document.getElementById('share-link-input');
        const copyLinkBtn = document.getElementById('copy-link-btn');
        const includeTextCheckbox = document.getElementById('share-include-text');

        // Close button
        const closeBtn = document.getElementById('close-share');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Copy link handler
        if (copyLinkBtn && urlInput) {
            copyLinkBtn.addEventListener('click', () => {
                const includeText = includeTextCheckbox ? includeTextCheckbox.checked : false;
                let textToCopy = urlInput.value;

                if (includeText && this.currentShareData) {
                    const { text, url, rawText } = this.currentShareData;
                    textToCopy = `${text}\n\n${rawText}\n\nURL: ${url}`;
                }

                this.copyTextToClipboard(textToCopy, () => {
                    const originalText = copyLinkBtn.textContent;
                    copyLinkBtn.textContent = 'Kopirano!';
                    copyLinkBtn.style.background = '#10b981'; // Green color for success
                    copyLinkBtn.style.color = '#ffffff';
                    setTimeout(() => {
                        copyLinkBtn.textContent = originalText;
                        copyLinkBtn.style.background = '';
                        copyLinkBtn.style.color = '';
                    }, 2500);
                }, () => alert('Kopiranje ni uspelo. Prosim kopirajte ročno.'));
            });
        }

        // Close on background click
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                this.close();
            }
        });

        // Helper: detect if the device is likely mobile (touch + small screen)
        const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

        // Helper: show inline "Kopirano!" feedback on a button
        const showBtnFeedback = (action, callback) => {
            const btnEl = document.querySelector(`.share-btn[data-action="${action}"]`);
            if (btnEl) {
                const label = btnEl.querySelector('span');
                if (label) {
                    const orig = label.textContent;
                    label.textContent = 'Kopirano!';
                    setTimeout(() => { label.textContent = orig; if (callback) callback(); }, 1500);
                }
            }
        };

        // Helper: try to open a custom protocol URL, fallback to clipboard copy if it fails
        const tryProtocolOrCopy = (protocolUrl, shareBody, action) => {
            if (isMobile()) {
                // On mobile, custom protocols usually work — navigate directly
                window.location.href = protocolUrl;
                this.close();
            } else {
                // On desktop, try opening in a new window — if protocol isn't registered,
                // the window will fail silently; copy to clipboard as fallback
                this.copyTextToClipboard(shareBody, () => {
                    showBtnFeedback(action);
                });
            }
        };

        // Social sharing buttons
        shareModal.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.currentShareData) return;
                const action = btn.dataset.action;
                const includeText = includeTextCheckbox ? includeTextCheckbox.checked : false;

                const { title, text, url, rawText } = this.currentShareData;

                let shareBody = includeText ? `${text}\n\n${rawText}\n\nURL: ${url}` : `${text}\n${url}`;
                const encodedText = encodeURIComponent(shareBody);
                const encodedUrl = encodeURIComponent(url);

                if (action === 'email') {
                    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`;
                    this.close();
                } else if (action === 'sms') {
                    tryProtocolOrCopy(`sms:?&body=${encodedText}`, shareBody, action);
                } else if (action === 'whatsapp') {
                    // WhatsApp uses HTTPS URL — works everywhere
                    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                    this.close();
                } else if (action === 'messenger') {
                    if (isMobile()) {
                        // Mobile: use deep link to open Messenger app
                        window.location.href = `fb-messenger://share/?link=${encodedUrl}`;
                    } else {
                        // Desktop: use web Messenger URL
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
                    }
                    this.close();
                } else if (action === 'telegram') {
                    // Telegram uses HTTPS URL — works everywhere
                    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareBody)}`, '_blank');
                    this.close();
                } else if (action === 'viber') {
                    tryProtocolOrCopy(`viber://forward?text=${encodedText}`, shareBody, action);
                } else if (action === 'signal') {
                    // Signal has no share URL scheme — use native share or clipboard
                    if (navigator.share) {
                        navigator.share({ title, text: shareBody, url }).catch(console.error);
                        this.close();
                    } else {
                        this.copyTextToClipboard(shareBody, () => {
                            showBtnFeedback(action);
                        });
                    }
                } else if (action === 'discord') {
                    // Discord has no share URL scheme — always copy to clipboard
                    this.copyTextToClipboard(shareBody, () => {
                        showBtnFeedback(action);
                    });
                } else if (action === 'system') {
                    if (navigator.share) {
                        navigator.share({ title, text: includeText ? shareBody : text, url }).catch(console.error);
                        this.close();
                    } else {
                        // Fallback: copy URL to clipboard and show feedback
                        this.copyTextToClipboard(includeText ? shareBody : url, () => {
                            showBtnFeedback(action, () => this.close());
                        });
                    }
                }
            });
        });
    },

    open(shareData) {
        this.currentShareData = shareData;
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            const linkInput = document.getElementById('share-link-input');
            if (linkInput) {
                linkInput.value = shareData.url;
            }
            const includeTextCb = document.getElementById('share-include-text');
            if (includeTextCb) {
                includeTextCb.checked = false;
            }

            shareModal.classList.remove('hidden');
            shareModal.setAttribute('aria-hidden', 'false');
            if (this.focusTrap) this.focusTrap.activate();
        }
    },

    close() {
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            shareModal.classList.add('hidden');
            shareModal.setAttribute('aria-hidden', 'true');
            if (this.focusTrap) this.focusTrap.deactivate();
        }
    },

    copyTextToClipboard(text, onSuccess, onError) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy());
        } else {
            fallbackCopy();
        }

        function fallbackCopy() {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful && onSuccess) onSuccess();
                else if (!successful && onError) onError();
            } catch (err) {
                console.error('Fallback copy failed', err);
                if (onError) onError();
            }
        }
    }
};
