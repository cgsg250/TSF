// =============================================================
// UTILIT MODULE
// =============================================================

// Get element by ID
export function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element "${id}" not found`);
    }
    return element;
}    

// Generate unique room ID
export function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
