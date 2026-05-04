/** @import { Item } from './types.js' */
import { getCollections, saveCollections } from './storage.js';

/** @type {Item[]} */
let currentItems = [];

/** @type {string|null} */
let currentCollectionId = null;

/**
 * @param {Item[]} items
 * @param {string} collectionId
 */
export function renderItems(items, collectionId) {
    currentCollectionId = collectionId;
    currentItems = [...items].sort((a, b) => a.order - b.order);

    const filter = document.getElementById('input-filter');
    filter.value = '';
    filter.oninput = () => applyFilter(filter.value);

    applyFilter('');
}

/** @param {string} query */
function applyFilter(query) {
    const q = query.toLowerCase();
    const list = document.getElementById('items-list');
    list.innerHTML = '';

    const filtered = q
        ? currentItems.filter(item =>
            item.title.toLowerCase().includes(q) ||
            item.url.toLowerCase().includes(q) ||
            item.note?.toLowerCase().includes(q)
          )
        : currentItems;

    for (const item of filtered) {
        list.appendChild(createItemElement(item));
    }
}

/** @param {Item} item */
function createItemElement(item) {
    const el = document.createElement('div');
    el.className = 'item';

    if (item.screenshot) {
        const img = document.createElement('img');
        img.className = 'item-screenshot';
        img.src = item.screenshot;
        img.alt = '';
        img.addEventListener('click', () => chrome.tabs.create({ url: item.url }));
        el.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'item-body';

    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = item.title;
    title.addEventListener('click', () => chrome.tabs.create({ url: item.url }));
    body.appendChild(title);

    if (item.note) {
        const note = document.createElement('span');
        note.className = 'item-note';
        note.textContent = item.note;
        body.appendChild(note);
    }

    const footer = document.createElement('div');
    footer.className = 'item-footer';

    const host = document.createElement('span');
    host.className = 'item-host';
    host.textContent = new URL(item.url).hostname;
    footer.appendChild(host);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    actions.appendChild(createActionButton('Edit', `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`, () => editItem(item), 'btn-item-edit'));
    actions.appendChild(createActionButton('Delete', `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`, () => deleteItem(item), 'btn-item-delete'));

    footer.appendChild(actions);
    body.appendChild(footer);
    el.appendChild(body);

    return el;
}

/**
 * @param {string} label
 * @param {string} iconSvg
 * @param {() => void} onClick
 * @param {string} [extraClass]
 */
function createActionButton(label, iconSvg, onClick, extraClass) {
    const btn = document.createElement('button');
    btn.className = 'btn-item-action' + (extraClass ? ` ${extraClass}` : '');
    btn.innerHTML = `${iconSvg} ${label}`;
    btn.addEventListener('click', onClick);
    return btn;
}

/** @param {Item} item */
function editItem(item) {
    const modal = document.getElementById('add-item-modal');
    const recaptureBtn = document.getElementById('btn-recapture');
    document.getElementById('modal-title').textContent = new URL(item.url).hostname;
    document.getElementById('input-title').value = item.title;
    document.getElementById('input-note').value = item.note ?? '';
    document.getElementById('modal-screenshot').src = item.screenshot ?? '';
    recaptureBtn.style.display = item.screenshot ? 'flex' : 'none';
    modal.style.display = 'block';

    recaptureBtn.onclick = () => recaptureScreenshot(item);

    document.getElementById('btn-save').onclick = () => updateItem(item);
    document.getElementById('btn-cancel').onclick = () => {
        modal.style.display = 'none';
    };
}

/** @param {Item} item */
function recaptureScreenshot(item) {
    const btn = document.getElementById('btn-recapture');
    btn.disabled = true;
    chrome.runtime.sendMessage({ action: 'captureNow' }, (response) => {
        btn.disabled = false;
        if (response?.dataUrl) {
            item.screenshot = response.dataUrl;
            document.getElementById('modal-screenshot').src = response.dataUrl;
        } else {
            console.error('Recapture failed:', response?.error);
        }
    });
}

/**
 * @param {Item} item
 */
async function updateItem(item) {
    const title = document.getElementById('input-title').value.trim();
    const note = document.getElementById('input-note').value.trim();

    const collections = await getCollections();
    const collection = collections.find(c => c.id === currentCollectionId);
    if (!collection) return;

    const existing = collection.items.find(i => i.id === item.id);
    if (!existing) return;

    existing.title = title;
    existing.note = note;
    existing.screenshot = item.screenshot;
    await saveCollections(collections);

    document.getElementById('add-item-modal').style.display = 'none';
    renderItems(collection.items, currentCollectionId);
}

/** @param {Item} item */
async function deleteItem(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;

    const collections = await getCollections();
    const collection = collections.find(c => c.id === currentCollectionId);
    if (!collection) return;

    collection.items = collection.items.filter(i => i.id !== item.id);
    await saveCollections(collections);

    renderItems(collection.items, currentCollectionId);
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
        document.getElementById('btn-recapture').style.display = 'none';
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
    renderItems(collection.items, collectionId);
}