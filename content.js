// Updated content.js with fixes to prevent repeated suggestions and better advanced mode handling
class FocusInputExtension {
    constructor() {
        this.isEnabled = true;
        this.currentMode = 'habit';
        this.inputPosition = 'top';
        this.activeInput = null;
        this.floatingInput = null;
        this.originalInput = null;
        this.apiKey = '';
        this.inputObserver = null;

        this.init();
    }

    async init() {
        const settings = await browser.storage.local.get([
            'extensionEnabled',
            'currentMode',
            'inputPosition',
            'apiKey'
        ]);

        this.isEnabled = settings.extensionEnabled ?? true;
        this.currentMode = settings.currentMode || 'habit';
        this.inputPosition = settings.inputPosition || 'top';
        this.apiKey = settings.apiKey || '';

        this.attachEventListeners();
    }

    attachEventListeners() {
        document.addEventListener('focusin', (e) => {
            if (this.isEnabled && this.isInputElement(e.target)) {
                this.handleInputFocus(e.target);
            }
        });

        document.addEventListener('focusout', (e) => {
            if (this.isEnabled && this.isInputElement(e.target)) {
                this.handleInputBlur(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.floatingInput) {
                this.hideFloatingInput();
            }
        });
    }

    isInputElement(element) {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.contentEditable === 'true';
    }

    handleInputFocus(input) {
        if (this.originalInput === input && this.floatingInput) return;

        this.originalInput = input;

        if (this.currentMode === 'habit') {
            this.createFloatingInput(input);
        } else if (this.currentMode === 'advanced') {
            this.createFloatingInput(input);
            this.addAISuggestions();
        }
    }

    handleInputBlur(input) {
        setTimeout(() => {
            if (!this.floatingInput || !this.floatingInput.contains(document.activeElement)) {
                this.hideFloatingInput();
            }
        }, 100);
    }

    createFloatingInput(originalInput) {
        this.hideFloatingInput();

        this.floatingInput = document.createElement('div');
        this.floatingInput.className = 'focus-input-floating';
        this.floatingInput.id = 'focusInputExtension';

        const inputElement = document.createElement('textarea');
        inputElement.className = 'focus-input-field';
        inputElement.style.overflow = 'hidden';
        inputElement.style.resize = 'none';
        inputElement.rows = 1;
        inputElement.placeholder = originalInput.placeholder || 'Type here...';
        inputElement.value = originalInput.value;

        const autoResize = () => {
            inputElement.style.height = 'auto';
            inputElement.style.height = inputElement.scrollHeight + 'px';
        };
        inputElement.addEventListener('input', autoResize);
        autoResize();

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'focus-input-close';
        closeBtn.onclick = () => this.hideFloatingInput();

        this.floatingInput.appendChild(closeBtn);
        this.floatingInput.appendChild(inputElement);

        this.positionFloatingInput();
        document.body.appendChild(this.floatingInput);
        this.syncInputs(inputElement, originalInput);
        inputElement.focus();
    }

    positionFloatingInput() {
        const styles = `
            position: fixed;
            z-index: 10000;
            width: 80%;
            max-width: 600px;
        `;

        if (this.inputPosition === 'top') {
            this.floatingInput.style.cssText = styles + `
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            `;
        } else if (this.inputPosition === 'center') {
            this.floatingInput.style.cssText = styles + `
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            `;
        }
    }

    syncInputs(floatingInput, originalInput) {
        floatingInput.addEventListener('input', () => {
            originalInput.value = floatingInput.value;
            originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        });

        const observer = new MutationObserver(() => {
            if (floatingInput.value !== originalInput.value) {
                floatingInput.value = originalInput.value;
            }
        });

        observer.observe(originalInput, {
            attributes: true,
            attributeFilter: ['value']
        });

        this.inputObserver = observer;
    }

    hideFloatingInput() {
        if (this.floatingInput) {
            const suggestions = this.floatingInput.querySelector('.focus-input-suggestions');
            if (suggestions) suggestions.remove();

            if (this.originalInput) {
                this.originalInput.focus();
            }

            if (this.inputObserver) {
                this.inputObserver.disconnect();
            }

            this.floatingInput.remove();
            this.floatingInput = null;
            this.originalInput = null;
        }
    }

    async addAISuggestions() {
    if (!this.floatingInput || !this.originalInput) return;

    const oldSuggestions = this.floatingInput.querySelector('.focus-input-suggestions');
    if (oldSuggestions) oldSuggestions.remove();

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'focus-input-suggestions';
    suggestionsDiv.innerHTML = `<div style="padding:10px;">Loading suggestions...</div>`;
    this.floatingInput.appendChild(suggestionsDiv);

    const { apiKey } = await browser.storage.local.get('apiKey');
    if (!apiKey) {
        suggestionsDiv.innerHTML = `<div style="color:red;">No API key found</div>`;
        return;
    }

    const userInput = this.originalInput.value;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: "POST",
           headers: {
  'Authorization': `Bearer ${this.apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://your-extension-domain.com',  // replace with your real site or localhost
},
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: "user",
                        content: `Give 3 helpful suggestions to improve this sentence:\n"${userInput}"`
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const suggestionsText = data?.choices?.[0]?.message?.content || 'No suggestions returned.';
        const lines = suggestionsText.split('\n').filter(line => line.trim() !== '');
        const formatted = lines.map(line => `<div>• ${line.trim()}</div>`).join('');

        suggestionsDiv.innerHTML = `
            <div style="padding: 10px; background: #eef2ff; border-radius: 4px; margin-top: 10px;">
                <small><strong>AI Suggestions</strong></small>
                ${formatted}
            </div>
        `;
    } catch (err) {
        suggestionsDiv.innerHTML = `<div style="color:red;">Error: ${err.message}</div>`;
        console.error("AI Suggestions Error:", err);
    }
}


    toggle(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.hideFloatingInput();
        } else {
            this.attachEventListeners();
        }
    }

    changeMode(mode) {
        this.currentMode = mode;
        if (this.floatingInput && this.originalInput) {
            const originalInput = this.originalInput;
            this.hideFloatingInput();
            this.handleInputFocus(originalInput);
        }
    }

    changePosition(position) {
        this.inputPosition = position;
        if (this.floatingInput) {
            this.positionFloatingInput();
        }
    }
}

const focusInputExtension = new FocusInputExtension();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
