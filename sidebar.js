import { getCollections, saveCollections } from './storage.js';
import { newCollection, renderCollections } from './collections.js';
import { openCollection, goBack, refreshCurrentCollection, currentCollectionId } from './navigation.js';
import { addItemToCollection } from './items.js';

document.getElementById('btn-new-collection').addEventListener('click', async () => {
    const name = prompt('Collection Name:');
    if (!name || name.trim() === '') return;
    const collections = await newCollection(name.trim());
    renderCollections(collections, openCollection);
});

document.getElementById('btn-back').addEventListener('click', goBack);

document.getElementById('btn-new-subcollection').addEventListener('click', async () => {
    const name = prompt('Sub-collection name:');
    if (!name || name.trim() === '') return;
    await newCollection(name.trim(), currentCollectionId);
    await refreshCurrentCollection();
});

document.getElementById('btn-add-item').addEventListener('click', () => addItemToCollection(currentCollectionId));

// --- Menu ---
const toolbarMenu = document.getElementById('toolbar-menu');

document.getElementById('btn-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    toolbarMenu.style.display = toolbarMenu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', () => {
    toolbarMenu.style.display = 'none';
});

// Export
document.getElementById('btn-export').addEventListener('click', async () => {
    toolbarMenu.style.display = 'none';
    const collections = await getCollections();
    const blob = new Blob([JSON.stringify(collections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Import
const inputImport = document.getElementById('input-import');

document.getElementById('btn-import').addEventListener('click', () => {
    toolbarMenu.style.display = 'none';
    inputImport.click();
});

inputImport.addEventListener('change', async () => {
    const file = inputImport.files[0];
    if (!file) return;

    let imported;
    try {
        imported = JSON.parse(await file.text());
    } catch {
        alert('Invalid JSON file.');
        inputImport.value = '';
        return;
    }

    if (!Array.isArray(imported)) {
        alert('Invalid format: expected an array of collections.');
        inputImport.value = '';
        return;
    }

    if (!confirm(`This will replace all existing collections with ${imported.length} imported collection(s). Continue?`)) {
        inputImport.value = '';
        return;
    }

    await saveCollections(imported);
    inputImport.value = '';
    await goBack();
});

getCollections().then(collections => renderCollections(collections, openCollection));