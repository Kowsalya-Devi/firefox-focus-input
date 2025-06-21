document.addEventListener('DOMContentLoaded', function () {
    const extensionToggle = document.getElementById('extensionToggle');
    const statusDiv = document.getElementById('status');
    const habitModeRadio = document.getElementById('habitMode');
    const advancedModeRadio = document.getElementById('advancedMode');
    const inputPosition = document.getElementById('inputPosition');
    // const apiSection = document.getElementById('apiSection');
    // const apiKey = document.getElementById('apiKey');

    browser.storage.local.get([
        'extensionEnabled',
        'currentMode',
        'inputPosition'
    ]).then(result => {
        extensionToggle.checked = result.extensionEnabled || false;
        updateStatus(result.extensionEnabled || false);

        (result.currentMode === 'advanced' ? advancedModeRadio : habitModeRadio).checked = true;
        // if (result.currentMode === 'advanced') apiSection.style.display = 'block';

        inputPosition.value = result.inputPosition || 'top';
        // apiKey.value = result.apiKey || '';
    });

    extensionToggle.addEventListener('change', () => {
        const enabled = extensionToggle.checked;
        browser.storage.local.set({ extensionEnabled: enabled });
        updateStatus(enabled);
        sendMessage('toggleExtension', { enabled });
    });

    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = radio.value;
            browser.storage.local.set({ currentMode: mode });
            apiSection.style.display = (mode === 'advanced') ? 'block' : 'none';
            sendMessage('changeMode', { mode });
        });
    });

    inputPosition.addEventListener('change', () => {
        const position = inputPosition.value;
        browser.storage.local.set({ inputPosition: position });
        sendMessage('changePosition', { position });
    });

    // apiKey.addEventListener('change', () => {
    //     browser.storage.local.set({ apiKey: apiKey.value });
    // });

    function sendMessage(action, payload) {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, { action, ...payload });
        });
    }

    function updateStatus(enabled) {
        statusDiv.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
        statusDiv.className = 'status ' + (enabled ? 'enabled' : 'disabled');
    }
});
