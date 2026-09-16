/**
 * Utility Module
 * Shared helpers used across the application.
 */

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Returns a debounced version of the given function.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/**
 * Sets up keyboard ↑↓ Enter navigation on an input field for a list of items.
 * @param {HTMLInputElement} input - The input element to listen on
 * @param {Function} getItems - Returns array of currently visible DOM elements
 * @param {Object} [options]
 * @param {string} [options.selectedClass='kb-selected'] - CSS class for selected item
 * @param {Function} [options.onSelect] - Called when Enter is pressed on selected item
 * @returns {{ reset: Function }} Controller to reset the selection index
 */
export function setupKeyboardNav(input, getItems, options = {}) {
    const selectedClass = options.selectedClass || 'kb-selected';
    let selectedIdx = -1;

    const updateSelection = (items) => {
        items.forEach((item, i) => {
            item.classList.toggle(selectedClass, i === selectedIdx);
        });
        if (selectedIdx >= 0 && items[selectedIdx]) {
            items[selectedIdx].scrollIntoView({ block: 'nearest' });
        }
    };

    input.addEventListener('keydown', (e) => {
        const items = getItems();
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIdx = Math.max(selectedIdx - 1, e.key === 'ArrowUp' ? -1 : 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIdx >= 0) {
            e.preventDefault();
            if (items[selectedIdx]) {
                if (typeof options.onSelect === 'function') {
                    options.onSelect(items[selectedIdx]);
                } else {
                    items[selectedIdx].click();
                }
            }
        }
    });

    return {
        reset() {
            selectedIdx = -1;
            const items = getItems();
            items.forEach(item => item.classList.remove(selectedClass));
        }
    };
}

/**
 * Creates a focus trap for modal elements to keep screen readers and keyboard navigation within the modal.
 * @param {HTMLElement} element - The modal element
 * @returns {{ activate: Function, deactivate: Function }}
 */
export function createFocusTrap(element) {
    const focusableSelectors = 'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), input[type="range"]:not([disabled])';
    let previousFocusedElement = null;
    let boundKeydown = null;

    const handleKeydown = (e) => {
        if (e.key !== 'Tab') return;

        const focusableElements = Array.from(element.querySelectorAll(focusableSelectors));
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement || document.activeElement === element) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    return {
        activate() {
            previousFocusedElement = document.activeElement;
            const focusableElements = Array.from(element.querySelectorAll(focusableSelectors));
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            } else {
                element.focus();
            }
            boundKeydown = handleKeydown;
            element.addEventListener('keydown', boundKeydown);
        },
        deactivate() {
            if (boundKeydown) {
                element.removeEventListener('keydown', boundKeydown);
                boundKeydown = null;
            }
            if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
                previousFocusedElement.focus();
            }
        }
    };
}
