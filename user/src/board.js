// ============================================
// DRAW BOARD MODULE
// ============================================

export const BOARD_SIZE = 10;
export const CELL_SIZE = 30;
export const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Board data (will be set from ships.js)
export let myBoardData = null;
export let enemyBoardData = null;

// Set board data references
export function setBoardData(myData, enemyData) {
    myBoardData = myData;
    enemyBoardData = enemyData;
}

// Draw grid lines on canvas
export function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
}

// Draw coordinate labels (letters A-J and numbers 1-10)
export function drawCoordinateLabels() {
    // Left board - column labels (A-J) above the canvas
    const leftColLabels = document.getElementById('leftColLabels');
    if (leftColLabels) {
        leftColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            leftColLabels.appendChild(label);
        }
    }
    
    // Left board - row labels (1-10) to the left
    const leftRowLabels = document.getElementById('leftRowLabels');
    if (leftRowLabels) {
        leftRowLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = i + 1;
            leftRowLabels.appendChild(label);
        }
    }
    
    // Right board - column labels (A-J) above the canvas
    const rightColLabels = document.getElementById('rightColLabels');
    if (rightColLabels) {
        rightColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            rightColLabels.appendChild(label);
        }
    }
    
    // Right board - row labels (1-10) to the left
    const rightRowLabels = document.getElementById('rightRowLabels');
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

// Draw left board (my ships - always visible)
export function drawLeftBoard() {
    const canvas = document.getElementById('leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with water color
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ships, hits, misses
    if (myBoardData) {
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
                    // Hit
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    
                    // Explosion X mark
                    ctx.fillStyle = '#c0392b';
                    ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                    ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
                } else if (cell === 3) {
                    // Miss
                    ctx.fillStyle = '#ecf0f1';
                    ctx.beginPath();
                    ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    // Draw grid overlay
    drawGrid(ctx, canvas);
}

// Draw right board (enemy - ships hidden)
export function drawRightBoard() {
    const canvas = document.getElementById('rightBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with water color
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw hits and misses only (ships are hidden)
    if (enemyBoardData) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                const cell = enemyBoardData[row][col];
                
                if (cell === 2) {
                    // Hit
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    
                    // Explosion X mark
                    ctx.fillStyle = '#c0392b';
                    ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                    ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
                } else if (cell === 3) {
                    // Miss
                    ctx.fillStyle = '#ecf0f1';
                    ctx.beginPath();
                    ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    // Draw grid overlay
    drawGrid(ctx, canvas);
}

// Update both boards
export function updateBoards() {
    drawLeftBoard();
    drawRightBoard();
}

// Initialize empty boards (just labels, no data)
export function initBoards() {
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
}