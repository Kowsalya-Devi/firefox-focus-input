document.addEventListener('DOMContentLoaded', function() {
    const extensionToggle = document.getElementById('extensionToggle');
    const statusDiv = document.getElementById('status');
    const habitModeRadio = document.getElementById('habitMode');
    const advancedModeRadio = document.getElementById('advancedMode');
    const inputPosition = document.getElementById('inputPosition');
    const apiSection = document.getElementById('apiSection');
    const apiKey = document.getElementById('apiKey');

    // Load saved settings
    browser.storage.local.get([
        'extensionEnabled',
        'currentMode',
        'inputPosition',
        'apiKey'
    ]).then(function(result) {
        extensionToggle.checked = result.extensionEnabled || false;
        updateStatus(result.extensionEnabled || false);
        
        if (result.currentMode === 'advanced') {
            advancedModeRadio.checked = true;
            apiSection.style.display = 'block';
        } else {
            habitModeRadio.checked = true;
        }
        
        inputPosition.value = result.inputPosition || 'top';
        apiKey.value = result.apiKey || '';
    });

    // Extension toggle
    extensionToggle.addEventListener('change', function() {
        const enabled = extensionToggle.checked;
        browser.storage.local.set({extensionEnabled: enabled});
        updateStatus(enabled);
        
        // Send message to content script
        browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleExtension',
                enabled: enabled
            });
        });
    });

    // Mode selection
    document.querySelectorAll('input[name="mode"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            const mode = radio.value;
            browser.storage.local.set({currentMode: mode});
            
            if (mode === 'advanced') {
                apiSection.style.display = 'block';
            } else {
                apiSection.style.display = 'none';
            }
            
            // Send message to content script
            browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
                browser.tabs.sendMessage(tabs[0].id, {
                    action: 'changeMode',
                    mode: mode
                });
            });
        });
    });

    // Position selection
    inputPosition.addEventListener('change', function() {
        const position = inputPosition.value;
        browser.storage.local.set({inputPosition: position});
        
        browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'changePosition',
                position: position
            });
        });
    });

    // API Key
    apiKey.addEventListener('change', function() {
        browser.storage.local.set({apiKey: apiKey.value});
    });

    function updateStatus(enabled) {
        if (enabled) {
            statusDiv.textContent = 'Extension Enabled';
            statusDiv.className = 'status enabled';
        } else {
            statusDiv.textContent = 'Extension Disabled';
            statusDiv.className = 'status disabled';
        }
    }
});