// Handle keyboard shortcuts
browser.commands.onCommand.addListener(function(command) {
    if (command === 'toggle-extension') {
        browser.storage.sync.get(['extensionEnabled']).then(function(result) {
            const newState = !result.extensionEnabled;
            browser.storage.sync.set({extensionEnabled: newState});
            
            // Send message to all tabs
            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'toggleExtension',
                        enabled: newState
                    }).catch(function() {
                        // Ignore errors for tabs that don't have content script
                    });
                });
            });
        });
    }
    
    if (command === 'toggle-mode') {
        browser.storage.sync.get(['currentMode']).then(function(result) {
            const currentMode = result.currentMode || 'habit';
            const newMode = currentMode === 'habit' ? 'advanced' : 'habit';
            browser.storage.sync.set({currentMode: newMode});
            
            // Send message to all tabs
            browser.tabs.query({}).then(function(tabs) {
                tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, {
                        action: 'changeMode',
                        mode: newMode
                    }).catch(function() {
                        // Ignore errors for tabs that don't have content script
                    });
                });
            });
        });
    }
});

// Initialize extension state on install
browser.runtime.onInstalled.addListener(function() {
    browser.storage.sync.set({
        extensionEnabled: false,
        currentMode: 'habit',
        inputPosition: 'top',
        apiKey: ''
    });
});