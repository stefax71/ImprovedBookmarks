import { getCollections } from './storage.js';
import { renderCollections } from './collections.js';
import { renderItems } from './items.js';

/** @type {string|null} */
export let currentCollectionId = null;

/** @param {string} id */
export async function openCollection(id) {
    currentCollectionId = id;
    const collections = await getCollections();
    const collection = collections.find(c => c.id === id);
    if (!collection) return;

    document.getElementById('toolbar-title').textContent = collection.name;
    document.getElementById('btn-back').style.display = 'block';
    document.getElementById('btn-new-collection').style.display = 'none';
    document.getElementById('collections-list').style.display = 'none';
    document.getElementById('collection-view').style.display = 'block';

    renderItems(collection.items, collection.id);
}

export async function goBack() {
    currentCollectionId = null;

    document.getElementById('add-item-modal').style.display = 'none';
    document.getElementById('toolbar-title').textContent = 'My Collections';
    document.getElementById('btn-back').style.display = 'none';
    document.getElementById('btn-new-collection').style.display = 'block';
    document.getElementById('collection-view').style.display = 'none';
    document.getElementById('collections-list').style.display = 'block';

    const collections = await getCollections();
    renderCollections(collections, openCollection);
}