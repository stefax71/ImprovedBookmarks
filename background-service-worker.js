// Disable auto-open so action.onClicked fires and we can capture before opening
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

async function captureTab(tab) {
    const dataUrl = await new Promise(resolve => {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
            resolve(chrome.runtime.lastError ? null : dataUrl);
        });
    });
    if (dataUrl) return dataUrl;

    console.log('[capture] captureVisibleTab failed, trying html2canvas');
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['vendor/html2canvas.min.js']
        });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => html2canvas(document.documentElement, {
                useCORS: true,
                scale: 0.5,
                logging: false,
                width: window.innerWidth,
                height: window.innerHeight,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                x: window.scrollX,
                y: window.scrollY
            }).then(canvas => canvas.toDataURL('image/jpeg', 0.7))
        });
        return results[0]?.result ?? null;
    } catch (e) {
        console.log('[capture] html2canvas failed:', e.message);
        return null;
    }
}

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-sidebar') {
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
            if (!tab) return;
            chrome.sidePanel.open({ windowId: tab.windowId });
            const dataUrl = await captureTab(tab);
            if (dataUrl) chrome.storage.session.set({ latest_screenshot: dataUrl });
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
    captureTab(tab).then(dataUrl => {
        if (dataUrl) chrome.storage.session.set({ latest_screenshot: dataUrl });
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureScreenshot') {
        chrome.storage.session.get('latest_screenshot', (result) => {
            const dataUrl = result.latest_screenshot ?? null;
            sendResponse(dataUrl ? { dataUrl } : { error: 'Screenshot not available' });
        });
        return true;
    }
});
