/**
 * GestureManager.js
 * Handles touch gestures for navigation (e.g., swipe to change poems).
 */

import { handleNavigation } from './router.js';

export const GestureManager = {
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    minSwipeDistance: 70, // pixels
    maxVerticalDeviation: 50, // pixels

    init() {
        const target = document.getElementById('main-content') || document.body;

        target.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        target.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            this.handleGesture();
        }, { passive: true });
    },

    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;

        // Check if swipe is horizontal enough and long enough
        if (Math.abs(deltaX) > this.minSwipeDistance && Math.abs(deltaY) < this.maxVerticalDeviation) {
            if (deltaX < 0) {
                // Swipe Left -> Next
                this.navigate('next');
            } else {
                // Swipe Right -> Prev
                this.navigate('prev');
            }
        }
    },

    navigate(direction) {
        // Only allow swipe navigation if we are in a reading view (poem view)
        // Actually, handleNavigation handles the check, but we can be explicit.
        const main = document.getElementById('main-content');
        if (main && main.classList.contains('poem-view')) {
            handleNavigation(direction);
            
            // Visual feedback (optional but nice)
            main.style.transition = 'transform 0.2s ease-out';
            main.style.transform = direction === 'next' ? 'translateX(-10px)' : 'translateX(10px)';
            setTimeout(() => {
                main.style.transform = 'translateX(0)';
            }, 200);
        }
    }
};
