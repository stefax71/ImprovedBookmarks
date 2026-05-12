import { getCollections, findCollectionById } from './storage.js';
import { renderCollections } from './collections.js';
import { renderItems } from './items.js';

/** @type {string[]} */
let stack = [];

/** @type {string|null} */
export let currentCollectionId = null;

/** @param {string} id */
export async function openCollection(id) {
    stack.push(id);
    currentCollectionId = id;
    await renderCurrentCollection();
}

export async function refreshCurrentCollection() {
    await renderCurrentCollection();
}

async function renderCurrentCollection() {
    const id = stack[stack.length - 1];
    const collections = await getCollections();
    const collection = findCollectionById(collections, id);
    if (!collection) return;

    currentCollectionId = id;

    document.getElementById('toolbar-title').textContent = collection.name;
    document.getElementById('btn-back').style.display = 'block';
    document.getElementById('btn-new-collection').style.display = 'none';
    document.getElementById('collections-list').style.display = 'none';
    document.getElementById('collection-view').style.display = 'block';

    const subcollEl = document.getElementById('subcollections-list');
    renderCollections(collection.subcollections ?? [], openCollection, subcollEl);

    renderItems(collection.items, id);
}

export async function goBack() {
    stack.pop();
    currentCollectionId = stack.length > 0 ? stack[stack.length - 1] : null;

    document.getElementById('add-item-modal').style.display = 'none';

    if (stack.length === 0) {
        document.getElementById('toolbar-title').textContent = 'My Collections';
        document.getElementById('btn-back').style.display = 'none';
        document.getElementById('btn-new-collection').style.display = 'block';
        document.getElementById('collection-view').style.display = 'none';
        document.getElementById('collections-list').style.display = 'block';

        const collections = await getCollections();
        renderCollections(collections, openCollection);
    } else {
        await renderCurrentCollection();
    }
}