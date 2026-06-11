// myBoardData, placedShips, remainingShips, selectedShipSize и т.д.                  ready
// initShipPlacement, resetPlacement, resetAllShips                                   ready
// selectShip, deselectShip, selectNextShip                                           
// canPlaceShip, isValidCell, hasNoAdjacentShips
// placeShip, removeShipAtCell                                                        
// onMouseMove, onBoardClick, onBoardRightClick, onWheelRotate                        ready
// toggleDirection, setupShipPlacementEvents                                          ready

// ============================================
// SHIPS MODULE
// ============================================

// Imports
import { BOARD_SIZE, CELL_SIZE, drawLeftBoard, drawRightBoard, drawCoordinateLabels } from './board.js';
import { updateShipButtons, updateReadyButton } from './ui.js';
import { getElement } from './utils.js';

// ============================================
// BOARD DATA (exported for board.js)
// ============================================

export let myBoardData = null;      // 10x10 array: 0=empty, 1=ship, 2=hit, 3=miss
export let enemyBoardData = null;   // 10x10 array for enemy board

// Ship placement state
export let placedShips = [];         // Array of placed ships {id, size, cells, direction}
export let selectedShipSize = null;  // Currently selected ship size for placement
export let isShipAttached = false;   // Whether ship is following cursor
export let currentDirection = 'horizontal'; // 'horizontal' or 'vertical'
export let ghostCells = [];           // Current ghost ship cells
export let isValidPlacement = false;  // Whether current ghost position is valid
export let currentHoverCell = null;   // Current cell under cursor {row, col, clientX, clientY}

// Remaining ships to place
export let remainingShips = {
    4: 1,  // One 4-cell ship
    3: 2,  // Two 3-cell ships
    2: 3,  // Three 2-cell ships
    1: 4   // Four 1-cell ships
};

// Ship ID counter for unique identification
let nextShipId = 1;

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get click position on board
function getBoardPosition(canvasId, clientX, clientY) {
    const canvas = document.getElementById(canvasId);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    const row = Math.floor(canvasY / CELL_SIZE);
    const col = Math.floor(canvasX / CELL_SIZE);
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null;
}

// Get all cells of a ship based on start position, size and direction
function getShipCells(startRow, startCol, size, direction) {
    const cells = [];
    
    if (direction === 'horizontal') {
        for (let i = 0; i < size; i++) {
            cells.push({ row: startRow, col: startCol + i });
        }
    } else {
        for (let i = 0; i < size; i++) {
            cells.push({ row: startRow + i, col: startCol });
        }
    }
    
    return cells;
}

// Check if a cell is within board boundaries
function isValidCell(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Check if there are any adjacent ships (including diagonals)
function hasNoAdjacentShips(cells) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const cell of cells) {
        for (const [dr, dc] of directions) {
            const newRow = cell.row + dr;
            const newCol = cell.col + dc;
            
            if (isValidCell(newRow, newCol)) {
                if (myBoardData[newRow][newCol] === 1) {
                    return false; // Adjacent ship found
                }
            }
        }
    }
    
    return true;
}

// Check if ship can be placed at given cells
function canPlaceShip(cells) {
    // Check boundaries
    for (const cell of cells) {
        if (!isValidCell(cell.row, cell.col)) {
            return false;
        }
    }
    
    // Check if cells are empty
    for (const cell of cells) {
        if (myBoardData[cell.row][cell.col] !== 0) {
            return false;
        }
    }
    
    // Check adjacent ships
    if (!hasNoAdjacentShips(cells)) {
        return false;
    }
    
    return true;
}

// Check if all ships are placed
export function areAllShipsPlaced() {
    const totalShipsPlaced = placedShips.length;
    const totalShipsNeeded = 10;
    return totalShipsPlaced === totalShipsNeeded;
}

// Get ship at specific cell (for removal)
export function getShipAtCell(row, col) {
    return placedShips.find(ship => 
        ship.cells.some(cell => cell.row === row && cell.col === col)
    );
}

// ============================================================
// SHIP PLACEMENT FUNCTIONS
// ============================================================

// Reset entire placement (clear all ships)
export function resetPlacement() {
    console.log('Resetting ship placement...');
    
    // Clear board
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    // Reset placement state
    placedShips = [];
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    ghostCells = [];
    isValidPlacement = false;
    currentHoverCell = null;
    nextShipId = 1;
    
    // Reset remaining ships
    remainingShips = {
        4: 1,
        3: 2,
        2: 3,
        1: 4
    };
    
    // Redraw board
    drawLeftBoard();
    
    // Reset ship buttons
    updateShipButtons();
    
    // Update ready button
    updateReadyButton();
    
    // Clear any ghost ship
    clearGhostShip();
}

// Place a ship on the board
function placeShip(cells, size) {
    const shipId = nextShipId++;
    
    // Mark cells on board
    for (const cell of cells) {
        myBoardData[cell.row][cell.col] = 1;
    }
    
    // Save ship info
    placedShips.push({
        id: shipId,
        size: size,
        cells: cells,
        direction: currentDirection
    });
    
    // Decrease remaining ships count
    remainingShips[size]--;
    
    // Redraw board
    drawLeftBoard();
    
    console.log(`Ship placed: size ${size}, direction ${currentDirection}`);
}

// Remove ship from board (by right-click)
function removeShip(ship) {
    if (!ship) return false;
    
    // Clear cells on board
    for (const cell of ship.cells) {
        myBoardData[cell.row][cell.col] = 0;
    }
    
    // Increase remaining ships count
    remainingShips[ship.size]++;
    
    // Remove from placed ships array
    const index = placedShips.indexOf(ship);
    if (index > -1) {
        placedShips.splice(index, 1);
    }
    
    // Redraw board
    drawLeftBoard();
    updateShipButtons();
    updateReadyButton();
    
    console.log(`Ship removed: size ${ship.size}`);
    return true;
}

// Random ship placement
export function randomBoard() {
    resetPlacement();
    
    const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const maxAttempts = 1000;
    
    for (const size of shipSizes) {
        let placed = false;
        
        for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
            const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const maxRow = direction === 'horizontal' ? BOARD_SIZE : BOARD_SIZE - size;
            const maxCol = direction === 'vertical' ? BOARD_SIZE : BOARD_SIZE - size;
            
            const startRow = Math.floor(Math.random() * maxRow);
            const startCol = Math.floor(Math.random() * maxCol);
            
            const cells = getShipCells(startRow, startCol, size, direction);
            
            if (canPlaceShip(cells)) {
                // Mark cells on board
                for (const cell of cells) {
                    myBoardData[cell.row][cell.col] = 1;
                }
                
                // Save ship
                placedShips.push({
                    id: nextShipId++,
                    size: size,
                    cells: cells,
                    direction: direction
                });
                
                placed = true;
                console.log(`Random placed: size ${size} ${direction}`);
            }
        }
        
        if (!placed) {
            console.log(`Failed to place ship of size ${size}, restarting...`);
            resetPlacement();
            randomBoard();
            return;
        }
    }
    
    // Update remaining ships (all should be zero)
    remainingShips = { 4: 0, 3: 0, 2: 0, 1: 0 };
    
    // Update UI
    drawLeftBoard();
    updateShipButtons();
    updateReadyButton();
    
    console.log('Random placement complete!');
}

// Rotate current ship direction
export function rotateBoard() {
    if (!isShipAttached) {
        console.log('No ship selected to rotate');
        return;
    }
    
    // Toggle direction
    currentDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
    
    console.log(`Direction changed to: ${currentDirection}`);
    
    // Update ghost ship if mouse is over board
    if (currentHoverCell && isShipAttached) {
        // Recalculate ghost with new direction
        onMouseMove({ clientX: currentHoverCell.clientX, clientY: currentHoverCell.clientY });
    }
    
    // Visual feedback on button
    const rotateBtn = getElement('rotateBtn');
    if (rotateBtn) {
        rotateBtn.style.background = '#2ecc71';
        setTimeout(() => {
            rotateBtn.style.background = '';
        }, 200);
    }
}

// Select a ship for placement
export function selectShip(size) {
    console.log(`Selecting ship of size ${size}`);
    
    // Check if this ship size is still available
    if (remainingShips[size] === 0) {
        console.log(`No more ${size}-cell ships available`);
        return;
    }
    
    // If already attached, deselect current first
    if (isShipAttached) {
        deselectShip();
    }
    
    // Set selected ship
    selectedShipSize = size;
    isShipAttached = true;
    currentDirection = 'horizontal';
    
    // Update UI
    updateShipButtons();
    
    // Add visual feedback to the board
    const leftBoard = document.getElementById('leftBoard');
    if (leftBoard) {
        leftBoard.style.cursor = 'crosshair';
    }
    
    console.log(`Ship of size ${size} attached to cursor`);
}

// Deselect current ship
export function deselectShip() {
    if (!isShipAttached) return;
    
    console.log('Deselecting ship');
    
    // Clear selection
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    
    // Clear ghost ship
    clearGhostShip();
    
    // Reset cursor
    const leftBoard = document.getElementById('leftBoard');
    if (leftBoard) {
        leftBoard.style.cursor = 'pointer';
    }
    
    // Update UI
    updateShipButtons();
}

// Get remaining ships object
export function getRemainingShips() {
    return { ...remainingShips };
}

// Get next available ship size
export function getNextUnplacedShip() {
    const sizes = [4, 3, 2, 1];
    for (const size of sizes) {
        if (remainingShips[size] > 0) {
            return size;
        }
    }
    return null;
}

// ============================================
// GHOST SHIP FUNCTIONS
// ============================================

// Calculate ghost ship cells based on cursor position
function calculateGhostShip(row, col, size, direction) {
    const cells = getShipCells(row, col, size, direction);
    const valid = canPlaceShip(cells);
    return { cells, valid };
}

// Draw ghost ship on board
function drawGhostShip() {
    if (!isShipAttached || ghostCells.length === 0) return;
    
    const canvas = document.getElementById('leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Save current state and redraw board
    drawLeftBoard();
    
    // Draw ghost overlay
    for (const cell of ghostCells) {
        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;
        
        if (isValidPlacement) {
            ctx.fillStyle = 'rgba(46, 204, 113, 0.5)'; // Green - valid
        } else {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.5)'; // Red - invalid
        }
        
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = isValidPlacement ? '#2ecc71' : '#e74c3c';
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
}

// Clear ghost ship
export function clearGhostShip() {
    ghostCells = [];
    isValidPlacement = false;
    drawLeftBoard();
}

// ============================================
// EVENT SETUP
// ============================================

// Mouse move handler
function onMouseMove(e) {
    const canvas = document.getElementById('leftBoard');
    if (!canvas || !isShipAttached || !selectedShipSize) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    const row = Math.floor(canvasY / CELL_SIZE);
    const col = Math.floor(canvasX / CELL_SIZE);
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        currentHoverCell = { row, col, clientX: e.clientX, clientY: e.clientY };
        
        const result = calculateGhostShip(row, col, selectedShipSize, currentDirection);
        ghostCells = result.cells;
        isValidPlacement = result.valid;
        
        drawGhostShip();
    }
}

// Click handler for placing ship
function onBoardClick(e) {
    if (!isShipAttached || !selectedShipSize) return;
    
    const pos = getBoardPosition('leftBoard', e.clientX, e.clientY);
    if (!pos) return;
    
    const cells = getShipCells(pos.row, pos.col, selectedShipSize, currentDirection);
    
    if (canPlaceShip(cells)) {
        placeShip(cells, selectedShipSize);
        deselectShip();
        
        // Auto-select next ship if available
        const nextShip = getNextUnplacedShip();
        if (nextShip) {
            selectShip(nextShip);
        }
        
        updateShipButtons();
        updateReadyButton();
    } else {
        console.log('Invalid placement!');
    }
}

// Right click handler for removing ship
function onBoardRightClick(e) {
    e.preventDefault();
    
    if (isShipAttached) {
        deselectShip();
        return;
    }
    
    const pos = getBoardPosition('leftBoard', e.clientX, e.clientY);
    if (!pos) return;
    
    const ship = getShipAtCell(pos.row, pos.col);
    if (ship) {
        removeShip(ship);
    }
}

// Wheel handler for rotating ship
function onWheelRotate(e) {
    e.preventDefault();
    if (isShipAttached) {
        rotateBoard();
    }
}

// Setup mouse event listeners
export function setupShipPlacementEvents() {
    const leftBoard = document.getElementById('leftBoard');
    if (!leftBoard) return;
    
    leftBoard.removeEventListener('mousemove', onMouseMove);
    leftBoard.removeEventListener('click', onBoardClick);
    leftBoard.removeEventListener('contextmenu', onBoardRightClick);
    leftBoard.removeEventListener('wheel', onWheelRotate);
    
    leftBoard.addEventListener('mousemove', onMouseMove);
    leftBoard.addEventListener('click', onBoardClick);
    leftBoard.addEventListener('contextmenu', onBoardRightClick);
    leftBoard.addEventListener('wheel', onWheelRotate);
    
    console.log('Ship placement events setup');
}

// ============================================
// INITIALIZATION
// ============================================

export function initShipPlacement() {
    console.log('Initializing ship placement...');
    
    // Reset board data
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    enemyBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    // Reset placement state
    placedShips = [];
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    ghostCells = [];
    isValidPlacement = false;
    currentHoverCell = null;
    nextShipId = 1;
    
    // Reset remaining ships
    remainingShips = {
        4: 1,
        3: 2,
        2: 3,
        1: 4
    };
    
    // Draw empty boards
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
    
    // Reset ship buttons UI
    updateShipButtons();
    
    // Update ready button state
    updateReadyButton();
    
    // Setup event listeners
    setupShipPlacementEvents();
    
    console.log('Ship placement initialized');
}