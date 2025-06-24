// Handle keyboard shortcuts
browser.commands.onCommand.addListener(function(command) {
    if (command === 'toggle-extension') {
        browser.storage.local.get(['extensionEnabled']).then(function(result) {
            const newState = !result.extensionEnabled;
            browser.storage.local.set({ extensionEnabled: newState });

            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'toggleExtension',
                        enabled: newState
                    }).catch(() => {});
                });
            });
        });
    }

    if (command === 'toggle-mode') {
        browser.storage.local.get(['currentMode']).then(function(result) {
            const currentMode = result.currentMode || 'habit';
            const newMode = currentMode === 'habit' ? 'advanced' : 'habit';
            browser.storage.local.set({ currentMode: newMode });

            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'changeMode',
                        mode: newMode
                    }).catch(() => {});
                });
            });
        });
    }
});

// Initialize extension defaults on install
browser.runtime.onInstalled.addListener(function() {
    browser.storage.local.set({
        extensionEnabled: false,
        currentMode: 'habit',
        inputPosition: 'top'
    });
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
