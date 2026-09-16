import { APP_VERSION } from '../version.js';
import { createFocusTrap } from './utils.js';
import { StorageManager } from './StorageManager.js';
import { TTS } from './TTSManager.js';

// ── Font Configuration ──────────────────────────────────────────────
const FONT_MAP = {
    'cinzel': { css: "'Cinzel', serif" },
    'georgia': { css: "'Georgia', 'Times New Roman', serif" },
    'roboto-mono': { css: "'Roboto Mono', monospace" },
    'lora': { css: "'Lora', serif" },
    'playfair': { css: "'Playfair Display', serif" },
    'eb-garamond': { css: "'EB Garamond', serif" },
    'open-sans': { css: "'Open Sans', sans-serif" },
    'inter': { css: "'Inter', sans-serif" }
};

// ── Theme Presets ────────────────────────────────────────────────────
const THEME_PRESETS = {
    light: { bg: '#ffffff', heading: '#000000', text: '#000000', icon: '#000000' },
    dark: { bg: '#000000', heading: '#ffffff', text: '#ffffff', icon: '#ffffff' },
    sepia: { bg: '#f4ecd8', heading: '#5b4636', text: '#5b4636', icon: '#7a6652' },
    nord: { bg: '#2e3440', heading: '#eceff4', text: '#d8dee9', icon: '#88c0d0' },
    protanopia: { bg: '#f0f0f0', heading: '#0055aa', text: '#0055aa', icon: '#0055aa' },
    tritanopia: { bg: '#fefefe', heading: '#aa0000', text: '#aa0000', icon: '#aa0000' }
};

// ── Default Settings ─────────────────────────────────────────────────
const DEFAULTS = {
    theme: 'light',
    headingFont: 'cinzel',
    headingFontSize: 32,
    headingLineHeight: 1.3,
    bodyFont: 'open-sans',
    fontSize: 26,
    contentLineHeight: 1.5,
    alignment: 'center',
    customAccentColor: '#4f46e5',
    contentWidth: 100,
    showDock: true,
    showDockFav: true,
    showDockShare: true,
    showDockTTS: true,
    showDockBookmark: true
};

// ── Migration / Versioning ───────────────────────────────────────────
const SETTINGS_VERSION = 4;

const SETTINGS_KEYS = [
    'theme', 'headingFont', 'headingFontSize', 'headingLineHeight',
    'bodyFont', 'fontSize', 'contentLineHeight', 'alignment',
    'customBg', 'customHeadingColor', 'customTextColor', 'customIconColor',
    'contentWidth', 'settingsVersion',
    'showDock', 'showDockFav', 'showDockShare', 'showDockTTS', 'showDockBookmark'
];

function checkSettingsVersion() {
    const storedVersion = parseInt(StorageManager.getSetting('settingsVersion', '0'), 10);

    if (storedVersion < SETTINGS_VERSION) {
        // Inteligentna migracija: ohrani obstoječe nastavitve, doda le nove privzete
        // Namesto brisanja vseh nastavitev, zgolj zagotovimo, da nove ključe
        // zapolnimo s privzetimi vrednostmi.
        const existing = {};
        SETTINGS_KEYS.forEach(key => {
            const val = StorageManager.getSetting(key);
            if (val !== null && val !== undefined) {
                existing[key] = val;
            }
        });

        // Spoji: privzete vrednosti + obstoječe (obstoječe prevladajo)
        const merged = { ...DEFAULTS, ...existing };

        // Validacija: zagotovi, da so številčne vrednosti v razumnih mejah
        merged.fontSize = Math.max(12, Math.min(100, parseInt(merged.fontSize, 10) || DEFAULTS.fontSize));
        merged.headingFontSize = Math.max(12, Math.min(120, parseInt(merged.headingFontSize, 10) || DEFAULTS.headingFontSize));
        merged.contentLineHeight = Math.max(1.0, Math.min(3.0, parseFloat(merged.contentLineHeight) || DEFAULTS.contentLineHeight));
        merged.headingLineHeight = Math.max(1.0, Math.min(3.0, parseFloat(merged.headingLineHeight) || DEFAULTS.headingLineHeight));
        merged.contentWidth = Math.max(30, Math.min(100, parseInt(merged.contentWidth, 10) || DEFAULTS.contentWidth));

        // Validacija: zagotovi, da je tema veljavna
        const validThemes = Object.keys(THEME_PRESETS).concat(['custom']);
        if (!validThemes.includes(merged.theme)) {
            merged.theme = DEFAULTS.theme;
        }

        // Validacija: zagotovi, da so fonti veljavni
        if (!FONT_MAP[merged.headingFont]) merged.headingFont = DEFAULTS.headingFont;
        if (!FONT_MAP[merged.bodyFont]) merged.bodyFont = DEFAULTS.bodyFont;

        // Shrani spojene nastavitve
        for (const [key, val] of Object.entries(merged)) {
            StorageManager.saveSetting(key, String(val));
        }

        StorageManager.saveSetting('settingsVersion', String(SETTINGS_VERSION));
        return true;
    }
    return false;
}

// ── Load Settings from StorageManager ──────────────────────────────────
function loadSettings() {
    return {
        theme: StorageManager.getSetting('theme', DEFAULTS.theme),
        headingFont: StorageManager.getSetting('headingFont', DEFAULTS.headingFont),
        headingFontSize: parseInt(StorageManager.getSetting('headingFontSize', String(DEFAULTS.headingFontSize)), 10),
        headingLineHeight: parseFloat(StorageManager.getSetting('headingLineHeight', String(DEFAULTS.headingLineHeight))),
        bodyFont: StorageManager.getSetting('bodyFont', DEFAULTS.bodyFont),
        fontSize: parseInt(StorageManager.getSetting('fontSize', String(DEFAULTS.fontSize)), 10),
        contentLineHeight: parseFloat(StorageManager.getSetting('contentLineHeight', String(DEFAULTS.contentLineHeight))),
        alignment: StorageManager.getSetting('alignment', DEFAULTS.alignment),
        customBg: StorageManager.getSetting('customBg', DEFAULTS.customBg),
        customHeadingColor: StorageManager.getSetting('customHeadingColor', DEFAULTS.customHeadingColor),
        customTextColor: StorageManager.getSetting('customTextColor', DEFAULTS.customTextColor),
        customIconColor: StorageManager.getSetting('customIconColor', DEFAULTS.customIconColor),
        contentWidth: parseInt(StorageManager.getSetting('contentWidth', String(DEFAULTS.contentWidth)), 10),
        showDock: StorageManager.getSetting('showDock') !== 'false',
        showDockFav: StorageManager.getSetting('showDockFav') !== 'false',
        showDockShare: StorageManager.getSetting('showDockShare') !== 'false',
        showDockTTS: StorageManager.getSetting('showDockTTS') !== 'false',
        showDockBookmark: StorageManager.getSetting('showDockBookmark') !== 'false'
    };
}

function saveSettings(settings) {
    for (const [key, val] of Object.entries(settings)) {
        StorageManager.saveSetting(key, String(val));
    }
}

// Helper: save + apply + update UI in one call (used in all setting handlers)
let _currentSettings = null;
function commitSettings() {
    if (!_currentSettings) return;
    saveSettings(_currentSettings);
    applySettings(_currentSettings);
    updateUI(_currentSettings);
}

let _settingsOverlay = null;
let _settingsFocusTrap = null;

export function closeSettingsOverlay() {
    if (_settingsOverlay) {
        // Prepreči redundantno izvajanje, če je že zaprto
        if (_settingsOverlay.getAttribute('aria-hidden') === 'true' && _settingsOverlay.classList.contains('hidden')) {
            return;
        }

        // Preden skrijemo, odstranimo fokus z gumbov znotraj, da preprečimo aria-hidden napake
        if (_settingsOverlay.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        _settingsOverlay.setAttribute('aria-hidden', 'true');
        _settingsOverlay.classList.add('hidden');
        TTS.setInert(false);
        document.body.style.overflow = ''; // Unlock scroll
        if (_settingsFocusTrap) _settingsFocusTrap.deactivate();
    }
}



// ── Convert hex color to CSS filter for SVG icons ────────────────────
function hexToIconFilter(hex) {
    if (hex === '#000000') return 'none';
    if (hex === '#ffffff') return 'invert(1)';

    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }

    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    const invert = lPct / 50;
    return `brightness(0) saturate(100%) invert(${Math.round(invert * 50)}%) sepia(50%) saturate(${Math.max(200, sPct * 5)}%) hue-rotate(${hDeg}deg) brightness(${Math.round(l * 200)}%)`;
}

// ── Apply Settings to DOM ────────────────────────────────────────────
function applySettings(settings) {
    const root = document.documentElement;

    // Theme
    root.setAttribute('data-theme', settings.theme);

    // Heading Font
    const headingEntry = FONT_MAP[settings.headingFont] || FONT_MAP['cinzel'];
    root.style.setProperty('--reading-heading-font', headingEntry.css);

    // Heading Font Size
    root.style.setProperty('--heading-font-size', `${settings.headingFontSize}px`);

    // Body Font
    const bodyEntry = FONT_MAP[settings.bodyFont] || FONT_MAP['georgia'];
    root.style.setProperty('--reading-font', bodyEntry.css);

    // Body Font Size
    root.style.setProperty('--content-font-size', `${settings.fontSize}px`);

    // Alignment
    root.style.setProperty('--prose-alignment', settings.alignment);

    // Line Heights
    root.style.setProperty('--heading-line-height', String(settings.headingLineHeight));
    root.style.setProperty('--content-line-height', String(settings.contentLineHeight));

    // Content Width
    root.style.setProperty('--content-max-width', `${settings.contentWidth}vw`);

    // Colors — apply custom colors or let CSS preset handle it
    if (settings.theme === 'custom') {
        root.style.setProperty('--bg-color', settings.customBg);
        root.style.setProperty('--text-color', settings.customTextColor);
        root.style.setProperty('--heading-color', settings.customHeadingColor);
        root.style.setProperty('--nav-icon-filter', hexToIconFilter(settings.customIconColor));
        root.style.setProperty('--nav-btn-bg', settings.customBg);

        // Custom accent / hover color
        const accent = settings.customAccentColor || DEFAULTS.customAccentColor;
        root.style.setProperty('--item-selected', accent);
        root.style.setProperty('--switch-on-color', accent); // Sync with switch
        root.style.setProperty('--item-hover', accent + '1a'); // 10% opacity hex suffix
        root.style.setProperty('--item-selected-text', '#ffffff');

        // Determine if custom theme is dark or light for color-scheme
        const bgBrightness = hexBrightness(settings.customBg);
        root.style.setProperty('color-scheme', bgBrightness < 128 ? 'dark' : 'light');
    } else {
        // Remove inline overrides so CSS preset rules apply
        root.style.removeProperty('--bg-color');
        root.style.removeProperty('--text-color');
        root.style.removeProperty('--heading-color');
        root.style.removeProperty('--nav-icon-filter');
        root.style.removeProperty('--nav-btn-bg');
        root.style.removeProperty('--item-selected');
        root.style.removeProperty('--switch-on-color');
        root.style.removeProperty('--item-hover');
        root.style.removeProperty('--item-selected-text');
        root.style.removeProperty('color-scheme');
    }

    // Action Dock Visibility
    root.style.setProperty('--show-dock', settings.showDock ? 'flex' : 'none');
    root.style.setProperty('--show-dock-fav', settings.showDockFav ? 'flex' : 'none');
    root.style.setProperty('--show-dock-share', settings.showDockShare ? 'flex' : 'none');
    root.style.setProperty('--show-dock-tts', settings.showDockTTS ? 'flex' : 'none');
    root.style.setProperty('--show-dock-bookmark', settings.showDockBookmark ? 'flex' : 'none');
}

function hexBrightness(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// ── Update UI Controls ───────────────────────────────────────────────
function updateUI(settings) {
    // Segmented control buttons & Select dropdowns
    document.querySelectorAll('[data-setting]').forEach(el => {
        const key = el.dataset.setting;
        let stateVal;
        if (key === 'headingFont') stateVal = settings.headingFont;
        else if (key === 'bodyFont') stateVal = settings.bodyFont;
        else if (key === 'align') stateVal = settings.alignment;
        else if (key === 'theme') stateVal = settings.theme;

        if (el.tagName === 'SELECT') {
            el.value = stateVal;
        } else {
            const val = el.dataset.value;
            el.classList.toggle('active', val === stateVal);
        }
    });

    // Range sliders
    const headingSlider = document.getElementById('heading-size-slider');
    const bodySlider = document.getElementById('body-size-slider');
    if (headingSlider) headingSlider.value = settings.headingFontSize;
    if (bodySlider) bodySlider.value = settings.fontSize;

    // Size value displays
    const headingSizeDisplay = document.getElementById('heading-size-value');
    const bodySizeDisplay = document.getElementById('font-size-value');
    if (headingSizeDisplay) headingSizeDisplay.textContent = `${settings.headingFontSize}px`;
    if (bodySizeDisplay) bodySizeDisplay.textContent = `${settings.fontSize}px`;

    // Line height sliders & displays
    const headingLhSlider = document.getElementById('heading-lh-slider');
    const contentLhSlider = document.getElementById('content-lh-slider');
    const headingLhDisplay = document.getElementById('heading-lh-value');
    const contentLhDisplay = document.getElementById('content-lh-value');
    if (headingLhSlider) headingLhSlider.value = settings.headingLineHeight;
    if (contentLhSlider) contentLhSlider.value = settings.contentLineHeight;
    if (headingLhDisplay) headingLhDisplay.textContent = settings.headingLineHeight.toFixed(1);
    if (contentLhDisplay) contentLhDisplay.textContent = settings.contentLineHeight.toFixed(1);

    // Content width slider & display
    const widthSlider = document.getElementById('content-width-slider');
    const widthDisplay = document.getElementById('content-width-value');
    if (widthSlider) widthSlider.value = settings.contentWidth;
    if (widthDisplay) widthDisplay.textContent = `${settings.contentWidth}%`;

    // Color inputs
    document.querySelectorAll('[data-color]').forEach(input => {
        const key = input.dataset.color;
        if (settings[key]) {
            input.value = settings[key];
            const hexLabel = input.parentElement.querySelector('.color-hex');
            if (hexLabel) hexLabel.textContent = settings[key];
        }
    });

    // Show/hide custom colors
    const customColorsSection = document.getElementById('custom-colors-section');
    if (customColorsSection) {
        customColorsSection.hidden = settings.theme !== 'custom';
    }

    // Checkboxes & Toggle Cards
    document.querySelectorAll('.setting-checkbox').forEach(cb => {
        const key = cb.dataset.setting;
        if (settings[key] !== undefined) {
            cb.checked = !!settings[key];

            // If part of a toggle-card, update its active state
            const card = cb.closest('.dock-toggle-card');
            if (card) {
                card.classList.toggle('active', cb.checked);
            }
        }
    });

    // Sub-settings availability (grid container etc)
    const dockGrid = document.querySelector('.dock-settings-grid');
    if (dockGrid) {
        const isDockShown = !!settings.showDock;
        dockGrid.style.opacity = isDockShown ? '1' : '0.4';
        dockGrid.style.pointerEvents = isDockShown ? 'auto' : 'none';
        dockGrid.style.filter = isDockShown ? 'none' : 'grayscale(1)';
    }
}

// ── Custom Confirmation Modal ────────────────────────────────────────
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    if (!modal || !okBtn || !cancelBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Postavi fokus na gumb "Prekliči" — varnejša privzeta izbira
    cancelBtn.focus();

    const handleOk = () => {
        onConfirm();
        closeModal();
    };

    const closeModal = () => {
        // Najprej odstrani fokus iz modala, šele nato skrij
        document.activeElement?.blur();
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', closeModal);
        modal.removeEventListener('click', handleOutside);
    };

    const handleOutside = (e) => {
        if (e.target === modal) closeModal();
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', handleOutside);
}

// ── Init ─────────────────────────────────────────────────────────────
export function initSettings() {
    checkSettingsVersion();

    const toggleBtn = document.getElementById('settings-toggle');
    const overlay = document.getElementById('settings-overlay');
    _settingsOverlay = overlay;
    const closeBtn = document.getElementById('close-settings');

    const settings = loadSettings();
    _currentSettings = settings;
    applySettings(settings);
    updateUI(settings);

    // Inject version
    const versionDisplay = document.getElementById('app-version');
    if (versionDisplay) versionDisplay.textContent = `Verzija ${APP_VERSION}`;

    // ── Open / Close ──
    if (overlay) {
        _settingsFocusTrap = createFocusTrap(overlay);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (overlay) {
                overlay.setAttribute('aria-hidden', 'false');
                overlay.classList.remove('hidden');
                TTS.setInert(true);
                document.body.style.overflow = 'hidden'; // Lock scroll
                if (_settingsFocusTrap) _settingsFocusTrap.activate();
            }
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeSettingsOverlay);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettingsOverlay();
        });
    }

    // ── Close on Escape ──
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.getAttribute('aria-hidden') === 'false') {
            closeSettingsOverlay();
        }
    });

    // ── Collapsible Sections ──
    document.querySelectorAll('.section-toggle').forEach(toggle => {
        // Find section content and set hidden attribute based on aria-expanded
        const content = toggle.nextElementSibling;
        if (content && content.classList.contains('section-content')) {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            content.hidden = !expanded;
        }

        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!expanded));
            const content = toggle.nextElementSibling;
            if (content && content.classList.contains('section-content')) {
                content.hidden = expanded;
            }
        });
    });

    // ── Generic Setting Listeners (Buttons & Selects) ──
    document.querySelectorAll('[data-setting]:not(.setting-checkbox)').forEach(el => {
        const eventType = el.tagName === 'SELECT' ? 'change' : 'click';
        el.addEventListener(eventType, (e) => {
            const key = el.dataset.setting;
            const value = el.tagName === 'SELECT' ? el.value : el.dataset.value;

            if (key === 'theme') settings.theme = value;
            else if (key === 'headingFont') settings.headingFont = value;
            else if (key === 'bodyFont') settings.bodyFont = value;
            else if (key === 'align') settings.alignment = value;

            commitSettings();
        });
    });

    // ── Range Sliders ──
    const headingSlider = document.getElementById('heading-size-slider');
    const bodySlider = document.getElementById('body-size-slider');

    if (headingSlider) {
        headingSlider.addEventListener('input', () => {
            settings.headingFontSize = parseInt(headingSlider.value, 10);
            commitSettings();
        });
    }

    const onBodySizeInput = (slider) => {
        settings.fontSize = parseInt(slider.value, 10);
        commitSettings();
    };

    if (bodySlider) bodySlider.addEventListener('input', () => onBodySizeInput(bodySlider));

    // ── Stepper ± Buttons ──
    document.querySelectorAll('[data-size-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.sizeTarget;
            const delta = parseInt(btn.dataset.delta, 10);
            const slider = target === 'headingFontSize'
                ? document.getElementById('heading-size-slider')
                : document.getElementById('body-size-slider');

            if (!slider) return;
            const min = parseInt(slider.min, 10);
            const max = parseInt(slider.max, 10);

            settings[target] = Math.max(min, Math.min(max, settings[target] + delta));
            commitSettings();
        });
    });

    // ── Line Height Sliders ──
    const headingLhSlider = document.getElementById('heading-lh-slider');
    const contentLhSlider = document.getElementById('content-lh-slider');

    if (headingLhSlider) {
        headingLhSlider.addEventListener('input', () => {
            settings.headingLineHeight = parseFloat(headingLhSlider.value);
            commitSettings();
        });
    }

    if (contentLhSlider) {
        contentLhSlider.addEventListener('input', () => {
            settings.contentLineHeight = parseFloat(contentLhSlider.value);
            commitSettings();
        });
    }

    // ── Line Height Stepper ± Buttons ──
    document.querySelectorAll('[data-lh-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.lhTarget;
            const delta = parseFloat(btn.dataset.delta);
            const slider = target === 'headingLineHeight'
                ? document.getElementById('heading-lh-slider')
                : document.getElementById('content-lh-slider');

            if (!slider) return;
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);

            settings[target] = Math.round(Math.max(min, Math.min(max, settings[target] + delta)) * 10) / 10;
            commitSettings();
        });
    });

    // ── Content Width Slider ──
    const widthSlider = document.getElementById('content-width-slider');
    if (widthSlider) {
        widthSlider.addEventListener('input', () => {
            settings.contentWidth = parseInt(widthSlider.value, 10);
            commitSettings();
        });
    }

    // ── Content Width Stepper ± Buttons ──
    document.querySelectorAll('[data-width-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.delta, 10);
            const slider = document.getElementById('content-width-slider');
            if (!slider) return;

            const min = parseInt(slider.min, 10);
            const max = parseInt(slider.max, 10);

            settings.contentWidth = Math.max(min, Math.min(max, settings.contentWidth + delta));
            commitSettings();
        });
    });

    // ── Checkbox & Toggle Cards ──
    document.querySelectorAll('.setting-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const key = cb.dataset.setting;
            settings[key] = cb.checked;
            commitSettings();
        });
    });

    // Special handling for label cards (ensure clicks on label trigger checkboxes correctly)
    document.querySelectorAll('.dock-toggle-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const cb = card.querySelector('.setting-checkbox');
            if (cb && e.target !== cb) {
                e.preventDefault();
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            }
        });
    });

    // ── Color Inputs ──
    document.querySelectorAll('[data-color]').forEach(input => {
        input.addEventListener('input', () => {
            const key = input.dataset.color;
            settings[key] = input.value;
            const hexLabel = input.parentElement.querySelector('.color-hex');
            if (hexLabel) hexLabel.textContent = input.value;
            commitSettings();
        });
    });

    // ── Section Reset Buttons ──
    document.querySelectorAll('[data-reset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.reset;

            if (section === 'display') {
                settings.headingFont = DEFAULTS.headingFont;
                settings.headingFontSize = DEFAULTS.headingFontSize;
                settings.headingLineHeight = DEFAULTS.headingLineHeight;
                settings.bodyFont = DEFAULTS.bodyFont;
                settings.fontSize = DEFAULTS.fontSize;
                settings.contentLineHeight = DEFAULTS.contentLineHeight;
                settings.alignment = DEFAULTS.alignment;
                settings.contentWidth = DEFAULTS.contentWidth;
            } else if (section === 'appearance') {
                settings.customAccentColor = DEFAULTS.customAccentColor;
            } else if (section === 'dock') {
                settings.showDock = DEFAULTS.showDock;
                settings.showDockFav = DEFAULTS.showDockFav;
                settings.showDockShare = DEFAULTS.showDockShare;
                settings.showDockTTS = DEFAULTS.showDockTTS;
                settings.showDockBookmark = DEFAULTS.showDockBookmark;
            }

            commitSettings();
        });
    });

    // ── Global Reset All Button ──
    const resetAllBtn = document.getElementById('reset-all-settings');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            showConfirm(
                'Ponastavitev nastavitev',
                'Ali ste prepričani, da želite ponastaviti VSE nastavitve na privzete vrednosti? To dejanje je dokončno.',
                () => {
                    // Reset all keys to defaults
                    Object.keys(DEFAULTS).forEach(key => {
                        _currentSettings[key] = DEFAULTS[key];
                    });
                    commitSettings();
                }
            );
        });
    }

    // ── Bližnjice v nastavitvah (Priljubljene / Zaznamki) ──
    const goFavs = document.getElementById('settings-go-favorites');
    const goBookmarks = document.getElementById('settings-go-bookmarks');

    if (goFavs) goFavs.addEventListener('click', () => {
        closeSettingsOverlay();
        window.location.hash = 'favorites';
    });
    if (goBookmarks) goBookmarks.addEventListener('click', () => {
        closeSettingsOverlay();
        window.location.hash = 'bookmarks';
    });

    // ── Brisanje Priljubljenih in Zaznamkov ──
    const clearFavBtn = document.getElementById('clear-all-favorites');
    if (clearFavBtn) {
        clearFavBtn.addEventListener('click', async () => {
            const { Favorites } = await import('./Favorites.js');
            showConfirm(
                'Izbris priljubljenih',
                'Ali ste prepričani, da želite izbrisati VSE priljubljene pesmi? To dejanje je dokončno.',
                () => { Favorites.clearAll(); }
            );
        });
    }

    const clearBookBtn = document.getElementById('clear-all-bookmarks');
    if (clearBookBtn) {
        clearBookBtn.addEventListener('click', async () => {
            const { BookmarkManager } = await import('./BookmarkManager.js');
            showConfirm(
                'Izbris zaznamkov',
                'Ali ste prepričani, da želite izbrisati VSE zaznamke? To dejanje je dokončno.',
                () => { BookmarkManager.clearAll(); }
            );
        });
    }
}
