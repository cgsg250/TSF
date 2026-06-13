// ============================================
// DRAW BOARD MODULE
// ============================================

export const BOARD_SIZE = 10;
export const CELL_SIZE = 30;
export const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export let myBoardData = null;
export let enemyBoardData = null;
export let destroyedEnemyShips = [];

export function setBoardData(myData, enemyData) {
    myBoardData = myData;
    enemyBoardData = enemyData;
}

export function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
}

export function drawCoordinateLabels() {
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

function drawDestroyedShip(ctx, cells, cellSize) {
    if (!cells || cells.length === 0) return;
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    
    cells.forEach(cell => {
        minRow = Math.min(minRow, cell.row);
        maxRow = Math.max(maxRow, cell.row);
        minCol = Math.min(minCol, cell.col);
        maxCol = Math.max(maxCol, cell.col);
    });
    
    const x = minCol * cellSize;
    const y = minRow * cellSize;
    const width = (maxCol - minCol + 1) * cellSize;
    const height = (maxRow - minRow + 1) * cellSize;
    
    ctx.strokeRect(x, y, width, height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + width, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
}

export function drawLeftBoard() {
    const canvas = document.getElementById('leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / BOARD_SIZE;
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (myBoardData) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const x = col * cellSize;
                const y = row * cellSize;
                const cell = myBoardData[row][col];
                
                if (cell === 1) {
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillRect(x, y, cellSize, cellSize);
                    ctx.fillStyle = '#95a5a6';
                    ctx.fillRect(x + 4, y + 8, cellSize - 8, 4);
                    ctx.fillRect(x + 8, y + 15, cellSize - 16, 3);
                } else if (cell === 2) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(x, y, cellSize, cellSize);
                    ctx.fillStyle = '#c0392b';
                    ctx.fillRect(x + cellSize/2 - 4, y + cellSize/2 - 2, 8, 4);
                    ctx.fillRect(x + cellSize/2 - 2, y + cellSize/2 - 4, 4, 8);
                } else if (cell === 3) {
                    ctx.fillStyle = '#ecf0f1';
                    ctx.beginPath();
                    ctx.arc(x + cellSize/2, y + cellSize/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    drawGrid(ctx, canvas);
}

export function drawRightBoard() {
    const canvas = document.getElementById('rightBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / BOARD_SIZE;
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (enemyBoardData) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const x = col * cellSize;
                const y = row * cellSize;
                const cell = enemyBoardData[row][col];
                
                if (cell === 2) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(x, y, cellSize, cellSize);
                    ctx.fillStyle = '#c0392b';
                    ctx.fillRect(x + cellSize/2 - 4, y + cellSize/2 - 2, 8, 4);
                    ctx.fillRect(x + cellSize/2 - 2, y + cellSize/2 - 4, 4, 8);
                } else if (cell === 3) {
                    ctx.fillStyle = '#ecf0f1';
                    ctx.beginPath();
                    ctx.arc(x + cellSize/2, y + cellSize/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    destroyedEnemyShips.forEach(shipCells => {
        drawDestroyedShip(ctx, shipCells, cellSize);
    });
    
    drawGrid(ctx, canvas);
}

export function addDestroyedShip(cells) {
    destroyedEnemyShips.push(cells);
    drawRightBoard();
}

export function updateBoards() {
    drawLeftBoard();
    drawRightBoard();
}

export function initBoards() {
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
}