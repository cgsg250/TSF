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

export function formatCoordinate(row, col) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return `${letters[col]}${row + 1}`;
}

// Parse coordinate string to row/col
export function parseCoordinate(coord) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const letter = coord.charAt(0).toUpperCase();
    const number = parseInt(coord.substring(1));
    const col = letters.indexOf(letter);
    const row = number - 1;
    
    if (col === -1 || row < 0 || row >= 10) {
        return null;
    }
    return { row, col };
}