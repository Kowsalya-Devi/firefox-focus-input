class FocusInputExtension {
    constructor() {
        this.isEnabled = true;
        this.currentMode = 'habit';
        this.inputPosition = 'top';
        this.originalInput = null;
        this.apiKey = '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'; // <-- your actual key here
        this.placeholderDiv = null;
        this.aiSuggestionBox = null;
        this.suggestionDebounceTimer = null;

        this.init();
    }
    async applyLLMGeneratedCSS(input) {
    try {
        const contextMessage = `I am building a browser extension. Please give clean CSS to move the following input box to the center of the screen without breaking the layout. Use high z-index, white background, rounded border, and ensure it works for both input and textarea.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://your-extension-domain.com'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: contextMessage
                    }
                ],
                max_tokens: 300,
                temperature: 0.6
            })
        });

        const data = await response.json();
        const rawCSS = data.choices?.[0]?.message?.content || '';
        const css = this.extractCSSBlock(rawCSS);

        if (css) {
            const styleTag = document.createElement('style');
            styleTag.innerHTML = css;
            document.head.appendChild(styleTag);
            input.classList.add('focus-moved'); // to apply the generated CSS
        }
    } catch (error) {
        console.error("LLM CSS generation failed:", error);
    }
}

// Extracts CSS between ```css ... ```
extractCSSBlock(text) {
    const match = text.match(/```css([\s\S]*?)```/);
    return match ? match[1].trim() : text.trim();
}

    async summarizeVisibleInputs() {
    const inputs = [...document.querySelectorAll('textarea, input[type="text"]')]
        .filter(el => el.offsetParent !== null && el.value.trim().length > 0);

    if (inputs.length === 0) return;

    const combinedText = inputs.map((el, i) => `Input ${i + 1}: ${el.value}`).join('\n');
    const summaryDiv = document.createElement('div');
summaryDiv.className = 'summary-box';
summaryDiv.innerText = 'Summarizing inputs...';
summaryDiv.style.border = '1px solid black'; // visibility
summaryDiv.style.position = 'fixed';
summaryDiv.style.top = '20px';
summaryDiv.style.right = '20px';
summaryDiv.style.left = 'auto';
summaryDiv.style.opacity = '1';
summaryDiv.style.transition = 'none';
summaryDiv.style.background = '#f0f4ff';
summaryDiv.style.padding = '10px';
summaryDiv.style.borderRadius = '8px';
summaryDiv.style.maxWidth = '300px';
summaryDiv.style.fontSize = '14px';
summaryDiv.style.zIndex = 9999;

document.body.appendChild(summaryDiv);


    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://your-extension-domain.com'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: `Summarize the following inputs:\n\n${combinedText}`
                    }
                ],
                max_tokens: 150,
                temperature: 0.6
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.choices[0]?.message?.content || 'No summary available.';
        summaryDiv.innerHTML = `<strong>Summary:</strong><br>${content.replace(/\n/g, '<br>')}`;
    } catch (err) {
        summaryDiv.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
    }
}
setupDynamicAISuggestions(input) {
    this.addAISuggestions(input); // initial suggestion

    if (this.inputListener) {
        input.removeEventListener('input', this.inputListener);
    }

    this.inputListener = () => {
        clearTimeout(this.suggestionDebounceTimer);
        this.suggestionDebounceTimer = setTimeout(() => {
            this.addAISuggestions(input);
        }, 1000); // 500ms = 0.5s debounce delay
    };

    input.addEventListener('input', this.inputListener);
}

    async init() {
        const settings = await browser.storage.local.get([
            'extensionEnabled',
            'currentMode',
            'inputPosition'
        ]);

        this.isEnabled = settings.extensionEnabled ?? true;
        this.currentMode = settings.currentMode || 'habit';
        this.inputPosition = settings.inputPosition || 'top';
        // this.apiKey = settings.apiKey || '';

        this.attachListeners();
    }

    attachListeners() {
        document.addEventListener('focusin', (e) => {
            if (!this.isEnabled || !this.isInputElement(e.target)) return;

            if (this.currentMode === 'advanced') {
                this.moveRealInputToVisible(e.target);
                this.setupDynamicAISuggestions(e.target);
            } 
            else if (this.currentMode === 'habit') {
                this.createFloatingInput(e.target);
            }
        });
        if (this.aiSuggestionBox) {
    this.aiSuggestionBox.remove();
    this.aiSuggestionBox = null;
}

        document.addEventListener('focusout', () => {
            if (this.currentMode === 'advanced') {
                setTimeout(() => this.restoreInputPosition(), 150);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.restoreInputPosition();
            }
        });
    }

    isInputElement(el) {
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true';
    }
    async moveRealInputToVisible(input) {
    this.restoreInputPosition();

    this.originalInput = input;
    this.placeholderDiv = document.createElement('div');
    input.parentNode.insertBefore(this.placeholderDiv, input);

    input._originalInlineStyle = input.getAttribute('style') || '';

    await this.applyLLMGeneratedCSS(input); // AI-generated CSS

    // ✅ Fallback enforcement (manual top alignment)
    Object.assign(input.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: 'white',
        border: '2px solid #007acc',
        borderRadius: '8px',
        padding: '8px',
        width: '1000px',
    });

    input.focus();

    if (input.tagName === 'TEXTAREA') {
        const autoResize = () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        };
        input._autoResizeHandler = autoResize;
        input.addEventListener('input', autoResize);
        autoResize();
    }

    this.summarizeVisibleInputs();
}


restoreInputPosition() {
    if (this.originalInput && this.placeholderDiv) {
        if (this.originalInput._autoResizeHandler) {
            this.originalInput.removeEventListener('input', this.originalInput._autoResizeHandler);
            delete this.originalInput._autoResizeHandler;
        }
        if (this.originalInput && this.inputListener) {
    this.originalInput.removeEventListener('input', this.inputListener);
    this.inputListener = null;
    clearTimeout(this.suggestionDebounceTimer);
}

        if (this.originalInput._originalInlineStyle !== undefined) {
    this.originalInput.setAttribute('style', this.originalInput._originalInlineStyle);
    delete this.originalInput._originalInlineStyle;
} else {
    this.originalInput.removeAttribute('style');
}

        this.originalInput.classList.remove('focus-moved');
        this.placeholderDiv.parentNode.insertBefore(this.originalInput, this.placeholderDiv);
        this.placeholderDiv.remove();
    }

    if (this.aiSuggestionBox) {
    this.aiSuggestionBox.classList.remove('show');
    this.aiSuggestionBox.classList.add('hide');
    setTimeout(() => {
        if (this.aiSuggestionBox) {
            this.aiSuggestionBox.remove();
            this.aiSuggestionBox = null;
        }
    }, 300); // match CSS transition duration
}


    this.originalInput = null;
    this.placeholderDiv = null;
}

    async addAISuggestions(input) {
        if (!this.apiKey) return;

        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'ai-suggestions-box';
        suggestionDiv.style.position = 'fixed';
        suggestionDiv.style.top = this.inputPosition === 'top' ? '80px' : 'calc(50% + 50px)';
        suggestionDiv.style.left = '50%';
        suggestionDiv.style.transform = 'translateX(-50%)';
        suggestionDiv.style.background = '#f0f4ff';
        suggestionDiv.style.padding = '10px';
        suggestionDiv.style.borderRadius = '8px';
        suggestionDiv.style.maxWidth = '600px';
        suggestionDiv.style.fontSize = '14px';
        suggestionDiv.innerText = 'Generating suggestions...';
        document.body.appendChild(suggestionDiv);
        this.aiSuggestionBox = suggestionDiv;
        setTimeout(() => {
    if (this.aiSuggestionBox) {
        this.aiSuggestionBox.classList.remove('show');
        this.aiSuggestionBox.classList.add('hide');
        setTimeout(() => {
            if (this.aiSuggestionBox) {
                this.aiSuggestionBox.remove();
                this.aiSuggestionBox = null;
            }
        }, 300); // matches CSS transition
    }
}, 8000); // hide after 8 seconds

        // Trigger fade-in using CSS class
requestAnimationFrame(() => {
    suggestionDiv.classList.add('show');
});


        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://your-extension-domain.com'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: `Improve this sentence in terms of clarity, tone, and usefulness. Provide 3 short suggestions:\n"${input.value}"`
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const content = data.choices[0]?.message?.content || 'No suggestions.';
            const lines = content.split('\n').filter(line => line.trim() !== '');
            suggestionDiv.innerHTML = `<strong>AI Suggestions:</strong><br>${lines.map(l => `• ${l}`).join('<br>')}`;
        } catch (err) {
            suggestionDiv.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
        }
    }

    createFloatingInput(originalInput) {
        this.removeFloatingInput();
        // Add background blur overlay
const blurOverlay = document.createElement('div');
blurOverlay.className = 'blur-overlay';
blurOverlay.style.position = 'fixed';
blurOverlay.style.top = '0';
blurOverlay.style.left = '0';
blurOverlay.style.width = '100%';
blurOverlay.style.height = '100%';
blurOverlay.style.backdropFilter = 'blur(5px)';
blurOverlay.style.zIndex = '9998';
blurOverlay.style.pointerEvents = 'none'; // allows clicks to go through
document.body.appendChild(blurOverlay);

this.blurOverlay = blurOverlay;

        const wrapper = document.createElement('div');
        wrapper.className = 'focus-input-floating';
        wrapper.style.position = 'fixed';
        wrapper.style.zIndex = '9999';
        wrapper.style.maxWidth = '600px';
        wrapper.style.width = '80%';
        wrapper.style.left = '50%';
        wrapper.style.transform = this.inputPosition === 'center'
            ? 'translate(-50%, -50%)'
            : 'translateX(-50%)';
        wrapper.style.top = this.inputPosition === 'center' ? '50%' : '20px';

        const textarea = document.createElement('textarea');
        textarea.className = 'focus-input-field';
        textarea.placeholder = originalInput.placeholder || '';
        textarea.value = originalInput.value;
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';
        textarea.rows = 1;

        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        textarea.addEventListener('input', autoResize);
        autoResize();

        textarea.addEventListener('input', () => {
            originalInput.value = textarea.value;
            originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '×';
        closeBtn.className = 'focus-input-close';
        closeBtn.onclick = () => this.removeFloatingInput();

        wrapper.appendChild(closeBtn);
        wrapper.appendChild(textarea);
        document.body.appendChild(wrapper);

        this.floatingInput = wrapper;
        textarea.focus();
    }

    removeFloatingInput() {
        if (this.floatingInput) {
            this.floatingInput.remove();
            this.floatingInput = null;
        }
        if (this.blurOverlay) {
    this.blurOverlay.remove();
    this.blurOverlay = null;
}

    }

    toggle(enabled) {
        this.isEnabled = enabled;
        if (!enabled) this.restoreInputPosition();
    }

    changeMode(mode) {
        this.currentMode = mode;
        this.restoreInputPosition();
    }

    changePosition(pos) {
        this.inputPosition = pos;
    }
}

const focusInputExtension = new FocusInputExtension();

browser.runtime.onMessage.addListener((message) => {
    switch (message.action) {
        case 'toggleExtension':
            focusInputExtension.toggle(message.enabled);
            break;
        case 'changeMode':
            focusInputExtension.changeMode(message.mode);
            break;
        case 'changePosition':
            focusInputExtension.changePosition(message.position);
            break;
    }
});