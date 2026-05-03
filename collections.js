/** @import { Collection } from './types.js' */
import { getCollections, saveCollections } from './storage.js';

/**
 * @param {string} nome
 * @returns {Promise<Collection[]>}
 */
export async function newCollection(nome) {
    const collections = await getCollections();
    /** @type {Collection} */
    const collection = {
        id: crypto.randomUUID(),
        name: nome,
        order: collections.length,
        items: []
    };
    collections.push(collection);
    await saveCollections(collections);
    return collections;
}

/**
 * @param {Collection[]} collections
 * @param {(id: string) => void} onCollectionClick
 */
export function renderCollections(collections, onCollectionClick) {
    const lista = document.getElementById('collections-list');
    lista.innerHTML = '';
    collections
        .sort((a, b) => a.order - b.order)
        .forEach(collection => {
            const div = document.createElement('div');
            div.className = 'collection';
            div.textContent = collection.name;
            lista.appendChild(div);
            div.addEventListener('click', () => onCollectionClick(collection.id));
        });
}