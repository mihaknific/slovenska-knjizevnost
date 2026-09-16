import { StorageManager } from './StorageManager.js';

export const Highlighter = {
    currentPoemId: null,
    popover: null,
    currentSelection: null,

    init() {
        this.popover = document.getElementById('highlighter-popover');
        if (!this.popover) return;

        // Listen for selections in the main content area
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Color button clicks
        this.popover.querySelectorAll('.highlighter-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.applyHighlight(btn.dataset.color);
            };
        });

        // Remove button click
        const removeBtn = document.getElementById('remove-highlight');
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeHighlightAtSelection();
            };
        }
    },

    setPoemId(id) {
        this.currentPoemId = id;
    },

    handleMouseUp(e) {
        const selection = window.getSelection();
        if (selection.isCollapsed || !selection.toString().trim()) {
            this.hidePopover();
            return;
        }

        // Ensure selection is inside the poem content area
        const container = document.getElementById('poem-content-text');
        if (!container || !container.contains(selection.anchorNode)) {
            this.hidePopover();
            return;
        }

        this.currentSelection = {
            range: selection.getRangeAt(0).cloneRange(),
            text: selection.toString()
        };

        this.showPopover(e);
    },

    showPopover(e) {
        const rect = this.currentSelection.range.getBoundingClientRect();
        this.popover.style.top = `${rect.top + window.scrollY}px`;
        this.popover.style.left = `${rect.left + rect.width / 2}px`;
        this.popover.classList.remove('hidden');
    },

    hidePopover() {
        if (this.popover) this.popover.classList.add('hidden');
        this.currentSelection = null;
    },

    async applyHighlight(color) {
        if (!this.currentSelection || !this.currentPoemId) return;

        const range = this.currentSelection.range;
        const mark = document.createElement('mark');
        mark.className = `hl-${color}`;
        
        try {
            range.surroundContents(mark);
        } catch (e) {
            // surroundContents fails if selection crosses element boundaries
            // Fallback: simpler wrapping logic or just skip for now
            console.warn('Selection too complex to highlight automatically.');
        }

        await this.saveCurrentHighlights();
        this.hidePopover();
        window.getSelection().removeAllRanges();
    },

    async removeHighlightAtSelection() {
        if (!this.currentSelection) return;
        // Logic to find surrounding mark and unwrap it
        const range = this.currentSelection.range;
        let node = range.commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;

        if (node.tagName === 'MARK' && node.className.startsWith('hl-')) {
            const parent = node.parentNode;
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
        }

        await this.saveCurrentHighlights();
        this.hidePopover();
        window.getSelection().removeAllRanges();
    },

    async saveCurrentHighlights() {
        const container = document.getElementById('poem-content-text');
        if (!container) return;

        // Simplified persistence: Save the innerHTML or structural markers
        // For a more robust approach, we'd save offsets, but innerHTML is easier for now
        // given the content is static.
        const highlightsHtml = container.innerHTML;
        await StorageManager.saveHighlights(this.currentPoemId, highlightsHtml);
    },

    async loadHighlights(poemId) {
        const container = document.getElementById('poem-content-text');
        if (!container) return;

        const savedHtml = await StorageManager.getHighlights(poemId);
        if (savedHtml && typeof savedHtml === 'string' && savedHtml.length > 10) {
            container.innerHTML = savedHtml;
        }
    }
};
