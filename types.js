/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} note
 * @property {string} screenshot
 * @property {number} order
 * @property {string} addedAt
 */

/**
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} name
 * @property {number} order
 * @property {Item[]} items
 * @property {Collection[]} subcollections
 */