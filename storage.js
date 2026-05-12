/** @import { Collection } from './types.js' */

/** @returns {Promise<Collection[]>} */
export function getCollections() {
    return new Promise(resolve => {
        chrome.storage.local.get('collections', data => resolve(data.collections || []));
    });
}

/** @param {Collection[]} collections */
export function saveCollections(collections) {
    return new Promise(resolve => {
        chrome.storage.local.set({ collections }, resolve);
    });
}

/**
 * @param {Collection[]} collections
 * @param {string} id
 * @returns {Collection|null}
 */
export function findCollectionById(collections, id) {
    for (const c of collections) {
        if (c.id === id) return c;
        if (c.subcollections?.length) {
            const found = findCollectionById(c.subcollections, id);
            if (found) return found;
        }
    }
    return null;
}