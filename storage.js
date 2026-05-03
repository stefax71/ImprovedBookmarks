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