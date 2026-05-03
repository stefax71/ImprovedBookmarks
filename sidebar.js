import { getCollections } from './storage.js';
import { newCollection, renderCollections } from './collections.js';
import { openCollection, goBack, currentCollectionId } from './navigation.js';
import { addItemToCollection } from './items.js';

document.getElementById('btn-new-collection').addEventListener('click', async () => {
    const nome = prompt('Collection Name:');
    if (!nome || nome.trim() === '') return;
    const collections = await newCollection(nome.trim());
    renderCollections(collections, openCollection);
});

document.getElementById('btn-back').addEventListener('click', goBack);

document.getElementById('btn-add-item').addEventListener('click', () => addItemToCollection(currentCollectionId));

getCollections().then(collections => renderCollections(collections, openCollection));