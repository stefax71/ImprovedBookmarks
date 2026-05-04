/** @import { Item } from './types.js' */
import { getCollections, saveCollections } from './storage.js';

/** @param {Item[]} items */
export function renderItems(items) {
    const list = document.getElementById('items-list');
    list.innerHTML = '';

    const sorted = [...items].sort((a, b) => a.order - b.order);
    for (const item of sorted) {
        const el = document.createElement('div');
        el.className = 'item';

        if (item.screenshot) {
            const img = document.createElement('img');
            img.className = 'item-screenshot';
            img.src = item.screenshot;
            img.alt = '';
            el.appendChild(img);
        }

        const body = document.createElement('div');
        body.className = 'item-body';

        const title = document.createElement('span');
        title.className = 'item-title';
        title.textContent = item.title;
        body.appendChild(title);

        if (item.note) {
            const note = document.createElement('span');
            note.className = 'item-note';
            note.textContent = item.note;
            body.appendChild(note);
        }

        el.appendChild(body);
        el.addEventListener('click', () => chrome.tabs.create({ url: item.url }));
        list.appendChild(el);
    }
}

/** @param {string} collectionId */
export function addItemToCollection(collectionId) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        let screenshotDataUrl = null;

        document.getElementById('modal-title').textContent = tab.title;
        document.getElementById('input-title').value = tab.title;
        document.getElementById('modal-screenshot').src = '';
        document.getElementById('add-item-modal').style.display = 'block';

        document.getElementById('btn-save').onclick = () => saveItem(collectionId, tab.url, screenshotDataUrl);
        document.getElementById('btn-cancel').onclick = () => {
            document.getElementById('add-item-modal').style.display = 'none';
        };

        captureScreenshot(tab.id, (dataUrl) => {
            screenshotDataUrl = dataUrl;
            document.getElementById('modal-screenshot').src = dataUrl;
        });
    });
}

/**
 * @param {number} tabId
 * @param {(dataUrl: string) => void} callback
 */
function captureScreenshot(tabId, callback) {
    chrome.runtime.sendMessage({ action: 'captureScreenshot', tabId }, (response) => {
        if (response?.dataUrl) {
            callback(response.dataUrl);
        } else {
            console.error('Screenshot not available:', response?.error);
        }
    });
}

/**
 * @param {string} collectionId
 * @param {string} url
 * @param {string} dataUrl
 */
async function saveItem(collectionId, url, dataUrl) {
    const title = document.getElementById('input-title').value.trim();
    const note = document.getElementById('input-note').value.trim();

    const collections = await getCollections();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    /** @type {Item} */
    const item = {
        id: crypto.randomUUID(),
        title,
        url,
        note,
        screenshot: dataUrl,
        order: collection.items.length,
        addedAt: new Date().toISOString()
    };

    collection.items.push(item);
    await saveCollections(collections);

    document.getElementById('add-item-modal').style.display = 'none';
    renderItems(collection.items);
}