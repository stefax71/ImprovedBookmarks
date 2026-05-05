/** @import { Collection } from './types.js' */
import { getCollections, saveCollections } from './storage.js';

/** @type {((id: string) => void) | null} */
let onCollectionClickRef = null;

/** @type {string|null} */
let draggedId = null;

/** @type {Collection[]} */
let currentCollections = [];

document.addEventListener('click', () => {
    document.querySelectorAll('.collection-menu').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.collection.menu-open').forEach(c => c.classList.remove('menu-open'));
});

/**
 * @param {string} name
 * @returns {Promise<Collection[]>}
 */
export async function newCollection(name) {
    const collections = await getCollections();
    /** @type {Collection} */
    const collection = {
        id: crypto.randomUUID(),
        name,
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
    onCollectionClickRef = onCollectionClick;
    currentCollections = [...collections].sort((a, b) => a.order - b.order);
    const lista = document.getElementById('collections-list');
    lista.innerHTML = '';
    currentCollections.forEach(collection => {
        lista.appendChild(createCollectionElement(collection, onCollectionClick));
    });
}

/** @param {Collection} collection @param {(id: string) => void} onCollectionClick */
function createCollectionElement(collection, onCollectionClick) {
    const div = document.createElement('div');
    div.className = 'collection';
    div.draggable = true;
    div.dataset.id = collection.id;

    const handle = document.createElement('div');
    handle.className = 'collection-handle';
    handle.innerHTML = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="3" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/></svg>`;
    div.appendChild(handle);

    div.addEventListener('dragstart', (e) => {
        draggedId = collection.id;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => div.classList.add('dragging'), 0);
    });

    div.addEventListener('dragend', () => {
        draggedId = null;
        div.classList.remove('dragging');
        document.querySelectorAll('.collection').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
    });

    div.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedId === collection.id) return;
        const isTopHalf = e.clientY < div.getBoundingClientRect().top + div.offsetHeight / 2;
        div.classList.toggle('drag-over-top', isTopHalf);
        div.classList.toggle('drag-over-bottom', !isTopHalf);
    });

    div.addEventListener('dragleave', (e) => {
        if (!div.contains(e.relatedTarget)) {
            div.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });

    div.addEventListener('drop', async (e) => {
        e.preventDefault();
        div.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!draggedId || draggedId === collection.id) return;

        const insertBefore = e.clientY < div.getBoundingClientRect().top + div.offsetHeight / 2;
        const fromIdx = currentCollections.findIndex(c => c.id === draggedId);
        const [moved] = currentCollections.splice(fromIdx, 1);
        const toIdx = currentCollections.findIndex(c => c.id === collection.id);
        currentCollections.splice(insertBefore ? toIdx : toIdx + 1, 0, moved);
        currentCollections.forEach((c, idx) => { c.order = idx; });

        const all = await getCollections();
        currentCollections.forEach(c => {
            const existing = all.find(a => a.id === c.id);
            if (existing) existing.order = c.order;
        });
        await saveCollections(all);

        renderCollections(currentCollections, onCollectionClickRef);
    });

    const icon = document.createElement('span');
    icon.className = 'collection-icon';
    icon.textContent = '📁';
    div.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'collection-name';
    nameSpan.textContent = collection.name;
    div.appendChild(nameSpan);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn-icon btn-collection-menu';
    menuBtn.title = 'Options';
    menuBtn.textContent = '⋮';
    div.appendChild(menuBtn);

    const menu = document.createElement('div');
    menu.className = 'collection-menu';
    menu.style.display = 'none';

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename`;
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        div.classList.remove('menu-open');
        startRename(nameSpan, collection);
    });
    menu.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'collection-menu-delete';
    deleteBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete`;
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        div.classList.remove('menu-open');
        await deleteCollection(collection.id);
    });
    menu.appendChild(deleteBtn);

    div.appendChild(menu);

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.style.display !== 'none';
        document.querySelectorAll('.collection-menu').forEach(m => m.style.display = 'none');
        document.querySelectorAll('.collection.menu-open').forEach(c => c.classList.remove('menu-open'));
        if (!isOpen) {
            menu.style.display = 'block';
            div.classList.add('menu-open');
        }
    });

    div.addEventListener('click', () => onCollectionClick(collection.id));
    return div;
}

/**
 * @param {HTMLSpanElement} nameSpan
 * @param {Collection} collection
 */
function startRename(nameSpan, collection) {
    const input = document.createElement('input');
    input.className = 'collection-rename-input';
    input.value = collection.name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
        const newName = input.value.trim();
        if (newName && newName !== collection.name) {
            const collections = await getCollections();
            const c = collections.find(col => col.id === collection.id);
            if (c) {
                c.name = newName;
                await saveCollections(collections);
                renderCollections(collections, onCollectionClickRef);
            }
        } else {
            input.replaceWith(nameSpan);
        }
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.removeEventListener('blur', commit);
            input.replaceWith(nameSpan);
        }
    });
}

/** @param {string} id */
async function deleteCollection(id) {
    if (!confirm('Delete this collection and all its items?')) return;
    const collections = await getCollections();
    const updated = collections.filter(c => c.id !== id);
    updated.forEach((c, i) => { c.order = i; });
    await saveCollections(updated);
    renderCollections(updated, onCollectionClickRef);
}