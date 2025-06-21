// Handle keyboard shortcuts
browser.commands.onCommand.addListener(function(command) {
    if (command === 'toggle-extension') {
        browser.storage.sync.get(['extensionEnabled']).then(function(result) {
            const newState = !result.extensionEnabled;
            browser.storage.sync.set({ extensionEnabled: newState });

            // Notify all tabs
            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'toggleExtension',
                        enabled: newState
                    }).catch(() => { /* Ignore missing content script */ });
                });
            });
        });
    }

    if (command === 'toggle-mode') {
        browser.storage.sync.get(['currentMode']).then(function(result) {
            const currentMode = result.currentMode || 'habit';
            const newMode = currentMode === 'habit' ? 'advanced' : 'habit';
            browser.storage.sync.set({ currentMode: newMode });

            // Notify all tabs
            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'changeMode',
                        mode: newMode
                    }).catch(() => { /* Ignore missing content script */ });
                });
            });
        });
    }
});

// Initialize extension defaults on install
browser.runtime.onInstalled.addListener(function() {
    browser.storage.sync.set({
        extensionEnabled: false,
        currentMode: 'habit',
        inputPosition: 'top'
        // No apiKey stored anymore since it's hardcoded
    });
});
