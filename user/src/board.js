// BOARD_SIZE, CELL_SIZE, COL_LETTERS
// drawGrid, drawLeftBoard, drawRightBoard
// drawCoordinateLabels, updateBoards

import { myBoardData, enemyBoardData } from './ships.js';

export const BOARD_SIZE = 10;
export const CELL_SIZE = 30;
export const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Draw coordinate labels for both boards
export function drawCoordinateLabels() {
    // Left board labels
    const leftColLabels = document.getElementById('leftColLabels');
    const leftRowLabels = document.getElementById('leftRowLabels');
    
    if (leftColLabels) {
        leftColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            leftColLabels.appendChild(label);
        }
    }
    
    if (leftRowLabels) {
        leftRowLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = i + 1;
            leftRowLabels.appendChild(label);
        }
    }
    
    // Right board labels
    const rightColLabels = document.getElementById('rightColLabels');
    const rightRowLabels = document.getElementById('rightRowLabels');
    
    if (rightColLabels) {
        rightColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            rightColLabels.appendChild(label);
        }
    }
    
    if (rightRowLabels) {
        rightRowLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = i + 1;
            rightRowLabels.appendChild(label);
        }
    }
}

// Draw grid on canvas
function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
}

// Draw left board (my ships - always visible)
export function drawLeftBoard() {
    const canvas = document.getElementById('leftBoard');
    if (!canvas || !myBoardData) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const cell = myBoardData[row][col];
            
            if (cell === 1) {
                // Ship
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Wood texture
                ctx.fillStyle = '#95a5a6';
                ctx.fillRect(x + 4, y + 8, CELL_SIZE - 8, 4);
                ctx.fillRect(x + 8, y + 15, CELL_SIZE - 16, 3);
            } else if (cell === 2) {
                // Hit on my ship
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
            } else if (cell === 3) {
                // Miss on my board
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawGrid(ctx, canvas);
}

// Draw right board (enemy - ships hidden)
export function drawRightBoard() {
    const canvas = document.getElementById('rightBoard');
    if (!canvas || !enemyBoardData) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const cell = enemyBoardData[row][col];
            
            if (cell === 2) {
                // Hit on enemy ship
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
            } else if (cell === 3) {
                // Miss on enemy board
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawGrid(ctx, canvas);
}

// Update boards after moves
export function updateBoards() {
    drawLeftBoard();
    drawRightBoard();
}

// Initialize empty boards
export function initBoards() {
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    enemyBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
}