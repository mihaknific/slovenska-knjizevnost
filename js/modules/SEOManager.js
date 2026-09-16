/**
 * SEOManager.js
 * Handles metadata and structured data updates for SEO.
 */

export const SEOManager = {
    /**
     * Updates the meta description and Open Graph description.
     * @param {string} desc - The new description text.
     */
    updateDescription(desc) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', desc);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', desc);
    },

    /**
     * Updates Open Graph tags (title, image, url).
     * @param {string} title - The title for OG.
     * @param {string} image - The image URL for OG.
     * @param {string} urlSuffix - The hash fragment for the URL.
     */
    updateOpenGraph(title, image, urlSuffix = '') {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');

        if (ogTitle) ogTitle.setAttribute('content', title);
        if (ogImage) ogImage.setAttribute('content', image);

        // Use current base URL correctly
        const baseUrl = window.location.origin + window.location.pathname;
        if (ogUrl) ogUrl.setAttribute('content', `${baseUrl}#${urlSuffix}`);
    },

    /**
     * Updates or creates a JSON-LD structured data script.
     * @param {Object} data - The JSON-LD schema data.
     */
    updateJsonLd(data) {
        let script = document.getElementById('json-ld');
        if (!script) {
            script = document.createElement('script');
            script.id = 'json-ld';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }
};
