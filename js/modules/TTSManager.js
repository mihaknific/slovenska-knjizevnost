/**
 * TTSManager.js
 * Handles Text-to-Speech functionality: speaking, pausing, and word highlighting.
 */

export const TTS = {
    speaking: false,
    paused: false,
    rate: 0.9,
    _title: '',
    _content: '',
    _chromeFix: null,
    currentWordIndex: 0,
    _currentUtt: null,
    _wordSpans: [],           // Predpomnjene reference na .tts-word elemente
    _chunkWordOffsets: [],    // Kumulativni besedni offseti za vsak chunk

    /**
     * Predpomni vse .tts-word elemente za hiter dostop med govorom.
     */
    _cacheWordSpans() {
        this._wordSpans = Array.from(document.querySelectorAll('.tts-word'));
    },

    /**
     * Izračuna kumulativne besedne offsete za vsak chunk (kitica/odstavek).
     * To omogoča preslikavo med indeksom besede v posameznem chunku
     * in globalnim indeksom v seznamu vseh .tts-word elementov.
     */
    _buildChunkWordOffsets(chunks) {
        this._chunkWordOffsets = [];
        let cumulative = 0;
        for (const chunk of chunks) {
            this._chunkWordOffsets.push(cumulative);
            // Preštej besede v tem chunku (enako kot wrapping logika v router.js)
            const words = chunk.split(/\s+/).filter(w => w.length > 0);
            cumulative += words.length;
        }
    },

    /**
     * Poudarjanje besede pri indeksu globalWordIdx.
     * Uporablja requestAnimationFrame za nemoteno vizualno posodobitev.
     */
    _highlightWord(globalWordIdx) {
        requestAnimationFrame(() => {
            // Odstrani predhodni poudarek
            const prev = document.querySelector('.tts-word.tts-active');
            if (prev) prev.classList.remove('tts-active');

            // Dodaj novi poudarek
            if (globalWordIdx >= 0 && globalWordIdx < this._wordSpans.length) {
                const span = this._wordSpans[globalWordIdx];
                span.classList.add('tts-active');
                this.currentWordIndex = globalWordIdx;

                // Pomakni v vidno polje, če je izven zaslona
                span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    },

    /**
     * Poišče indeks besede glede na charIndex znotraj besedila chunkText.
     * Vrne lokalni indeks besede v tem chunku.
     */
    _charIndexToWordIndex(chunkText, charIndex) {
        let wordIdx = 0;
        let pos = 0;
        while (pos < charIndex && pos < chunkText.length) {
            // Preskoči presledke
            while (pos < chunkText.length && /\s/.test(chunkText[pos])) pos++;
            if (pos >= charIndex) break;
            // Preskoči besedo
            while (pos < chunkText.length && !/\s/.test(chunkText[pos])) pos++;
            if (pos <= charIndex) wordIdx++;
        }
        return wordIdx;
    },

    cleanup() {
        document.querySelectorAll('.tts-word.tts-active')
            .forEach(el => el.classList.remove('tts-active'));
        document.body.classList.remove('tts-playing');
        this._wordSpans = [];
        this._chunkWordOffsets = [];
    },

    /**
     * Toggles 'inert' attribute on main containers to trap focus in modals/search.
     */
    setInert(active) {
        const containers = [
            document.getElementById('view-portal-entry'),
            document.getElementById('view-collection'),
            document.getElementById('top-left-controls'),
            document.getElementById('settings-toggle'),
            document.querySelector('nav')
        ];

        containers.forEach(el => {
            if (el) {
                if (active) el.setAttribute('inert', '');
                else el.removeAttribute('inert');
            }
        });
    },

    updateUI() {
        const panel = document.getElementById('tts-controls');
        const playPauseBtn = document.getElementById('tts-play-pause');
        const rateDisplay = document.getElementById('tts-rate-value');
        const speakBtn = document.getElementById('speak-poem');
        const speakText = speakBtn ? speakBtn.querySelector('span') : null;

        if (this.speaking) {
            if (panel) panel.classList.add('show');
            if (playPauseBtn) playPauseBtn.textContent = this.paused ? '▶' : '⏸';
            if (speakText) speakText.textContent = 'Ustavi';
            document.body.classList.add('tts-bar-active');
        } else {
            if (panel) panel.classList.remove('show');
            if (speakText) speakText.textContent = 'Beri';
            document.body.classList.remove('tts-bar-active');
        }
        if (rateDisplay) rateDisplay.textContent = this.rate.toFixed(1) + '×';
    },

    play(title, content, fromWord = 0) {
        if (!('speechSynthesis' in window)) {
            alert("Vaš brskalnik ne podpira branja na glas.");
            return;
        }
        window.speechSynthesis.cancel();
        clearInterval(this._chromeFix);
        // Ohrani obstoječe poudarke — počisti le status, ne DOM
        document.querySelectorAll('.tts-word.tts-active')
            .forEach(el => el.classList.remove('tts-active'));
        this._title = title;
        this._content = content;

        // Predpomni reference na besede v DOM-u
        this._cacheWordSpans();

        // Razdeli vsebino na chunke (kitice/odstavke) za naravne premore
        const chunks = content.split(/\n\n+/).filter(c => c.trim().length > 0);
        this._buildChunkWordOffsets(chunks);

        const voices = window.speechSynthesis.getVoices();
        const slVoice = voices.find(v => v.lang.startsWith('sl'));

        const speakChunk = (index) => {
            if (index >= chunks.length && index !== -1) {
                this.speaking = false;
                this.cleanup();
                this.updateUI();
                return;
            }

            let text;
            if (index === -1) {
                text = title; // Začni z naslovom
            } else {
                text = chunks[index];
            }

            const utt = new SpeechSynthesisUtterance(text);
            this._currentUtt = utt;
            if (slVoice) utt.voice = slVoice;
            utt.rate = this.rate;
            utt.pitch = 1.0;

            // ── Poudarjanje besed (Word Highlighting) ──
            // Med govorom brskalnik sproži 'boundary' dogodek ob vsaki besedi.
            // charIndex pove pozicijo znaka v besedilu chunkText.
            if (index >= 0) {
                utt.onboundary = (event) => {
                    if (this._currentUtt !== utt) return;
                    if (event.name === 'word') {
                        const localWordIdx = this._charIndexToWordIndex(text, event.charIndex);
                        const globalWordIdx = this._chunkWordOffsets[index] + localWordIdx;
                        this._highlightWord(globalWordIdx);
                    }
                };
            }

            utt.onstart = () => {
                if (this._currentUtt !== utt) return;
                this.speaking = true;
                this.paused = false;
                document.body.classList.add('tts-playing');
                this.updateUI();

                // Chrome popravek za dolge utterance
                clearInterval(this._chromeFix);
                this._chromeFix = setInterval(() => {
                    if (window.speechSynthesis.speaking && !this.paused) {
                        window.speechSynthesis.pause();
                        window.speechSynthesis.resume();
                    }
                }, 14000);
            };

            utt.onend = () => {
                if (this._currentUtt !== utt) return;
                if (index === -1) {
                    speakChunk(0); // Po naslovu nadaljuj s prvim chunkom
                } else {
                    speakChunk(index + 1); // Naslednji chunk
                }
            };

            utt.onerror = (e) => {
                if (e.error === 'interrupted' || e.error === 'canceled') return;
                console.error("TTS Napaka:", e);
                this.stop();
            };

            window.speechSynthesis.speak(utt);
        };

        // Začni zaporedje
        if (fromWord === 0) {
            speakChunk(-1); // Začni z naslovom
        } else {
            // Poišči pravilni chunk za iskano besedo
            let targetChunk = 0;
            for (let i = 0; i < this._chunkWordOffsets.length; i++) {
                if (i + 1 < this._chunkWordOffsets.length && this._chunkWordOffsets[i + 1] <= fromWord) {
                    targetChunk = i + 1;
                } else {
                    break;
                }
            }
            speakChunk(targetChunk);
        }
    },

    pauseResume() {
        if (!this.speaking) return;
        if (this.paused) {
            window.speechSynthesis.resume();
            this.paused = false;
        } else {
            window.speechSynthesis.pause();
            this.paused = true;
            clearInterval(this._chromeFix);
        }
        this.updateUI();
    },

    stop() {
        clearInterval(this._chromeFix);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        this.speaking = false;
        this.paused = false;
        this.cleanup();
        this.updateUI();
    },

    _rateChangeTimer: null,

    _debouncedRestart() {
        clearTimeout(this._rateChangeTimer);
        if (this.speaking) {
            const resumeFrom = this.currentWordIndex;
            this._currentUtt = null; // Prevent onend from hiding UI
            window.speechSynthesis.cancel();
            clearInterval(this._chromeFix);
            this._rateChangeTimer = setTimeout(() => {
                this.play(this._title, this._content, resumeFrom);
            }, 300);
        }
    },

    changeRate(delta) {
        this.rate = Math.max(0.5, Math.min(2.0, +(this.rate + delta).toFixed(1)));
        this.updateUI();
        const slider = document.getElementById('tts-rate-slider');
        if (slider) slider.value = this.rate;
        this._debouncedRestart();
    },

    setRate(value) {
        this.rate = Math.max(0.5, Math.min(2.0, +parseFloat(value).toFixed(1)));
        this.updateUI();
        this._debouncedRestart();
    },

    seekToWord(idx) {
        if (!this.speaking && !this.paused) return;
        this.play(this._title, this._content, idx);
    }
};
