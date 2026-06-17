// =============================================================
// SHIP PLACEMENT MODULE
// =============================================================

import { BOARD_SIZE, CELL_SIZE, drawLeftBoard, drawRightBoard, drawCoordinateLabels, setBoardData, drawGrid } from './board.js';
import { updateShipButtons, updateReadyButton } from './ui.js';
import { getElement } from './utils.js';
import { sendShipsToServer } from './network.js';

// ============================================
// STATE VARIABLES
// ============================================

export let myBoardData = null;
export let enemyBoardData = null;
export let placedShips = [];
export let selectedShipSize = null;
export let isShipAttached = false;
export let currentDirection = 'horizontal';
export let ghostCells = [];
export let isValidPlacement = false;
export let currentHoverCell = null;
export let remainingShips = {
    4: 1,
    3: 2,
    2: 3,
    1: 4
};
let nextShipId = 1;

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get cell by coord of mouse
export function getBoardPosition(canvasId, clientX, clientY) {
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
                             
// Get cells of ship by it parametrs
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
                                    
// Logic function who checked cell in board or no
function isValidCell(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}
                                                 
// Check ship arround
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
                    return false;
                }
            }
        }
    }
    
    return true;
}
                     
// Can player place ship
function canPlaceShip(cells) {
    for (const cell of cells) {
        if (!isValidCell(cell.row, cell.col)) return false;
        if (myBoardData[cell.row][cell.col] !== 0) return false;
    }
    
    if (!hasNoAdjacentShips(cells)) return false;
    
    return true;
}
                        
function getShipAtCell(row, col) {
    return placedShips.find(ship => 
        ship.cells.some(cell => cell.row === row && cell.col === col)
    );
}

// ============================================
// UI UPDATE
// ============================================
                 
// Update all buttons
function updateUI() {
    updateShipButtons(remainingShips, selectedShipSize, isShipAttached);
    updateReadyButton(placedShips.length);
}
                     
// Send turn to server
export function sendMyShipsToServer() {
    if (myBoardData) {
        console.log('Sending my ships to server...');
        sendShipsToServer(myBoardData);
    }
}

// ============================================
// CORE SHIP PLACEMENT FUNCTIONS
// ============================================
       
// Place one ship
function placeShip(cells, size) {
    const shipId = nextShipId++;
    
    for (const cell of cells) {
        myBoardData[cell.row][cell.col] = 1;
    }
    
    placedShips.push({
        id: shipId,
        size: size,
        cells: cells,
        direction: currentDirection
    });
    
    remainingShips[size]--;
    drawLeftBoard();
    updateUI();
}
                                             
// Delete ship from board
function removeShip(ship) {
    if (!ship) return false;
    
    for (const cell of ship.cells) {
        myBoardData[cell.row][cell.col] = 0;
    }
    
    remainingShips[ship.size]++;
    
    const index = placedShips.indexOf(ship);
    if (index > -1) {
        placedShips.splice(index, 1);
    }
    
    drawLeftBoard();
    updateUI();
    
    return true;
}

// ============================================
// PUBLIC API
// ============================================
                   
// Reset all ships (clear array and variables)
export function resetPlacement() {
    console.log('Resetting ship placement...');
    
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    placedShips = [];
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    ghostCells = [];
    isValidPlacement = false;
    currentHoverCell = null;
    nextShipId = 1;
    
    remainingShips = {
        4: 1,
        3: 2,
        2: 3,
        1: 4
    };
    
    setBoardData(myBoardData, enemyBoardData);
    
    const leftCanvas = document.getElementById('leftBoard');
    if (leftCanvas) {
        const ctx = leftCanvas.getContext('2d');
        ctx.fillStyle = '#2c3e6e';
        ctx.fillRect(0, 0, leftCanvas.width, leftCanvas.height);
        drawGrid(ctx, leftCanvas);
    }
    
    drawLeftBoard();
    updateUI();
    clearGhostShip();
    
    console.log('Reset complete, board cleared');
}
                                  
// Random board set
export function randomBoard() {
    console.log('Random board generation started...');
    
    resetPlacement();
    
    const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const maxAttempts = 1000;
    let totalPlaced = 0;
    
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
                for (const cell of cells) {
                    myBoardData[cell.row][cell.col] = 1;
                }
                
                placedShips.push({
                    id: nextShipId++,
                    size: size,
                    cells: cells,
                    direction: direction
                });
                
                remainingShips[size]--;
                totalPlaced++;
                placed = true;
                console.log(`Placed ship of size ${size} ${direction}`);
            }
        }
        
        if (!placed) {
            console.log(`Failed to place ship of size ${size}, restarting...`);
            randomBoard();
            return;
        }
    }
    
    setBoardData(myBoardData, enemyBoardData);
    sendMyShipsToServer();
    updateUI();         
    drawLeftBoard();    
    
    console.log('Random placement complete! Ships placed:', totalPlaced);
}
                  
// Rotate board function (SWAP X -> Y)
export function rotateBoard() {
    if (!isShipAttached) {
        console.log('No ship selected to rotate');
        return;
    }
    
    currentDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
    
    if (currentHoverCell && isShipAttached) {
        const fakeEvent = { clientX: currentHoverCell.clientX, clientY: currentHoverCell.clientY };
        onMouseMove(fakeEvent);
    }
    
    const rotateBtn = getElement('rotateBtn');
    if (rotateBtn) {
        rotateBtn.style.background = '#2ecc71';
        setTimeout(() => {
            rotateBtn.style.background = '';
        }, 200);
    }
}
                    
// Select one ship by size
export function selectShip(size) {
    if (remainingShips[size] === 0) {
        console.log(`No more ${size}-cell ships available`);
        return;
    }
    
    if (isShipAttached) {
        deselectShip();
    }
    
    selectedShipSize = size;
    isShipAttached = true;
    currentDirection = 'horizontal';
    
    updateUI();
    
    const leftBoard = document.getElementById('leftBoard');
    if (leftBoard) {
        leftBoard.style.cursor = 'crosshair';
    }
    
    console.log(`Selected ship of size ${size}`);
}
                 
// Deselect ui ships
export function deselectShip() {
    if (!isShipAttached) return;
    
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    
    clearGhostShip();
    
    const leftBoard = document.getElementById('leftBoard');
    if (leftBoard) {
        leftBoard.style.cursor = 'pointer';
    }
    
    updateUI();
    
    console.log('Ship deselected');
}
                                     
// Del ghost ship
export function clearGhostShip() {
    ghostCells = [];
    isValidPlacement = false;
    drawLeftBoard();
}

// ============================================
// GHOST SHIP & EVENT HANDLERS
// ============================================
                            
// Aproximate place potentionaly ship
function calculateGhostShip(row, col, size, direction) {
    const cells = getShipCells(row, col, size, direction);
    const valid = canPlaceShip(cells);
    return { cells, valid };
}
                                      
// Draw potential place ship
function drawGhostShip() {
    if (!isShipAttached || ghostCells.length === 0) return;
    
    const canvas = document.getElementById('leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    drawLeftBoard();
    
    for (const cell of ghostCells) {
        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;
        
        ctx.fillStyle = isValidPlacement ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = isValidPlacement ? '#2ecc71' : '#e74c3c';
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
}
              
// Function to parser muse move events
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
                                  
// Function to parser left click board
function onBoardClick(e) {
    if (!isShipAttached || !selectedShipSize) return;
    
    const pos = getBoardPosition('leftBoard', e.clientX, e.clientY);
    if (!pos) return;
    
    const cells = getShipCells(pos.row, pos.col, selectedShipSize, currentDirection);
    
    if (canPlaceShip(cells)) {
        placeShip(cells, selectedShipSize);
        deselectShip();
        
        const sizes = [4, 3, 2, 1];
        for (const size of sizes) {
            if (remainingShips[size] > 0) {
                selectShip(size);
                break;
            }
        }
        
        updateUI();
    }
}
                                     
// Function to parser right click to board
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
                                          
// Function to parser wheel rotate
function onWheelRotate(e) {
    e.preventDefault();
    if (isShipAttached) {
        rotateBoard();
    }
}
                                    
// Set events to default ship buttons
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
              
// Delee events from default buttons
export function removeShipPlacementEvents() {
    const leftBoard = document.getElementById('leftBoard');
    if (!leftBoard) return;
    
    leftBoard.removeEventListener('mousemove', onMouseMove);
    leftBoard.removeEventListener('click', onBoardClick);
    leftBoard.removeEventListener('contextmenu', onBoardRightClick);
    leftBoard.removeEventListener('wheel', onWheelRotate);
    
    console.log('Ship placement events removed');
}

// ============================================
// INITIALIZATION
// ============================================

// Clear boards and fill variavbles
export function initShipPlacement() {
    console.log('Initializing ship placement...');
    
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    enemyBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    setBoardData(myBoardData, enemyBoardData);
    
    placedShips = [];
    selectedShipSize = null;
    isShipAttached = false;
    currentDirection = 'horizontal';
    ghostCells = [];
    isValidPlacement = false;
    currentHoverCell = null;
    nextShipId = 1;
    
    remainingShips = {
        4: 1,
        3: 2,
        2: 3,
        1: 4
    };
    
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
    
    updateUI();
    setupShipPlacementEvents();
    
    console.log('Ship placement initialized');
}