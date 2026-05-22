/** @import { Item } from './types.js' */
import { getCollections, saveCollections, findCollectionById } from './storage.js';
import { getScreenshot, saveScreenshot, deleteScreenshot } from './screenshot-store.js';

/** @type {Item[]} */
let currentItems = [];

/** @type {string|null} */
let currentCollectionId = null;

/** @type {string|null} */
let draggedId = null;

/** @type {Map<string, string>} itemId → screenshot URL */
let screenshotCache = new Map();

/**
 * @param {Item[]} items
 * @param {string} collectionId
 */
export async function renderItems(items, collectionId) {
    currentCollectionId = collectionId;
    currentItems = [...items].sort((a, b) => a.order - b.order);

    screenshotCache = new Map();
    await Promise.all(currentItems.map(async item => {
        const url = await getScreenshot(item.id);
        if (url) screenshotCache.set(item.id, url);
    }));

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
    el.draggable = true;
    el.dataset.id = item.id;

    const handle = document.createElement('div');
    handle.className = 'item-handle';
    handle.innerHTML = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="3" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/></svg>`;

    el.addEventListener('dragstart', (e) => {
        draggedId = item.id;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => el.classList.add('dragging'), 0);
    });

    el.addEventListener('dragend', () => {
        draggedId = null;
        el.classList.remove('dragging');
        document.querySelectorAll('.item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
    });

    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedId === item.id) return;
        const isTopHalf = e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2;
        el.classList.toggle('drag-over-top', isTopHalf);
        el.classList.toggle('drag-over-bottom', !isTopHalf);
    });

    el.addEventListener('dragleave', (e) => {
        if (!el.contains(e.relatedTarget)) {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });

    el.addEventListener('drop', async (e) => {
        e.preventDefault();
        el.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!draggedId || draggedId === item.id) return;

        const insertBefore = e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2;
        const fromIdx = currentItems.findIndex(i => i.id === draggedId);
        const [moved] = currentItems.splice(fromIdx, 1);
        const toIdx = currentItems.findIndex(i => i.id === item.id);
        currentItems.splice(insertBefore ? toIdx : toIdx + 1, 0, moved);
        currentItems.forEach((it, idx) => { it.order = idx; });

        const collections = await getCollections();
        const collection = findCollectionById(collections, currentCollectionId);
        if (collection) {
            collection.items = [...currentItems];
            await saveCollections(collections);
        }

        applyFilter(document.getElementById('input-filter').value);
    });

    const left = document.createElement('div');
    left.className = 'item-left';
    left.appendChild(handle);

    const screenshotUrl = screenshotCache.get(item.id);
    if (screenshotUrl) {
        const img = document.createElement('img');
        img.className = 'item-screenshot';
        img.src = screenshotUrl;
        img.alt = '';
        img.addEventListener('click', () => chrome.tabs.create({ url: item.url }));
        left.appendChild(img);
    }

    el.appendChild(left);

    const right = document.createElement('div');
    right.className = 'item-right';

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

    const host = document.createElement('span');
    host.className = 'item-host';
    host.textContent = new URL(item.url).hostname;
    body.appendChild(host);

    right.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(createActionButton('Edit', `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`, () => editItem(item), 'btn-item-edit'));
    actions.appendChild(createActionButton('Delete', `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`, () => deleteItem(item), 'btn-item-delete'));
    right.appendChild(actions);

    el.appendChild(right);

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
    let pendingScreenshot = screenshotCache.get(item.id) ?? null;
    let screenshotChanged = false;

    document.getElementById('modal-title').textContent = new URL(item.url).hostname;
    document.getElementById('input-title').value = item.title;
    document.getElementById('input-note').value = item.note ?? '';
    document.getElementById('modal-screenshot').src = pendingScreenshot ?? '';
    recaptureBtn.style.display = pendingScreenshot ? 'flex' : 'none';
    modal.style.display = 'block';

    recaptureBtn.onclick = () => {
        recaptureBtn.disabled = true;
        chrome.runtime.sendMessage({ action: 'captureNow' }, async (response) => {
            recaptureBtn.disabled = false;
            if (response?.dataUrl) {
                pendingScreenshot = await compressImage(response.dataUrl);
                screenshotChanged = true;
                document.getElementById('modal-screenshot').src = pendingScreenshot;
                recaptureBtn.style.display = 'flex';
            } else {
                console.error('Recapture failed:', response?.error);
            }
        });
    };

    document.getElementById('btn-save').onclick = () =>
        updateItem(item, screenshotChanged ? pendingScreenshot : undefined);
    document.getElementById('btn-cancel').onclick = () => {
        modal.style.display = 'none';
    };
}

/**
 * @param {Item} item
 * @param {string|null|undefined} pendingScreenshot - undefined means unchanged
 */
async function updateItem(item, pendingScreenshot) {
    const title = document.getElementById('input-title').value.trim();
    const note = document.getElementById('input-note').value.trim();

    const collections = await getCollections();
    const collection = findCollectionById(collections, currentCollectionId);
    if (!collection) return;

    const existing = collection.items.find(i => i.id === item.id);
    if (!existing) return;

    existing.title = title;
    existing.note = note;
    await saveCollections(collections);

    if (pendingScreenshot !== undefined && pendingScreenshot) {
        await saveScreenshot(item.id, pendingScreenshot);
        screenshotCache.set(item.id, pendingScreenshot);
    }

    document.getElementById('add-item-modal').style.display = 'none';
    await renderItems(collection.items, currentCollectionId);
}

/** @param {Item} item */
async function deleteItem(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;

    const collections = await getCollections();
    const collection = findCollectionById(collections, currentCollectionId);
    if (!collection) return;

    collection.items = collection.items.filter(i => i.id !== item.id);
    await saveCollections(collections);
    await deleteScreenshot(item.id);
    screenshotCache.delete(item.id);

    await renderItems(collection.items, currentCollectionId);
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

        const youtubeThumbnail = getYoutubeThumbnail(tab.url);
        if (youtubeThumbnail) {
            screenshotDataUrl = youtubeThumbnail;
            document.getElementById('modal-screenshot').src = youtubeThumbnail;
        } else {
            captureScreenshot((dataUrl) => {
                screenshotDataUrl = dataUrl;
                document.getElementById('modal-screenshot').src = dataUrl;
            });
        }
    });
}

/**
 * @param {string} url
 * @returns {string|null}
 */
function getYoutubeThumbnail(url) {
    const { hostname, href } = new URL(url);
    if (!hostname.includes('youtube')) return null;
    const match = href.match(/[?&]v=([^&]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

/** @param {(dataUrl: string) => void} callback */
function captureScreenshot(callback) {
    chrome.runtime.sendMessage({ action: 'captureNow' }, async (response) => {
        if (response?.dataUrl) {
            callback(await compressImage(response.dataUrl));
        } else {
            console.error('Screenshot not available:', response?.error);
        }
    });
}

/**
 * @param {string} dataUrl
 * @returns {Promise<string>}
 */
function compressImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const maxWidth = 480;
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

/**
 * @param {string} collectionId
 * @param {string} url
 * @param {string|null} screenshotDataUrl
 */
async function saveItem(collectionId, url, screenshotDataUrl) {
    const title = document.getElementById('input-title').value.trim();
    const note = document.getElementById('input-note').value.trim();

    const collections = await getCollections();
    const collection = findCollectionById(collections, collectionId);
    if (!collection) return;

    const id = crypto.randomUUID();
    /** @type {Item} */
    const item = {
        id,
        title,
        url,
        note,
        order: collection.items.length,
        addedAt: new Date().toISOString()
    };

    collection.items.push(item);
    await saveCollections(collections);

    if (screenshotDataUrl) {
        await saveScreenshot(id, screenshotDataUrl);
        screenshotCache.set(id, screenshotDataUrl);
    }

    document.getElementById('add-item-modal').style.display = 'none';
    await renderItems(collection.items, collectionId);
}