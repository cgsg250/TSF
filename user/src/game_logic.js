// =============================================================
// GAME LOGIC MODULE - ONLINE MULTIPLAYER
// =============================================================

import { BOARD_SIZE, updateBoards, addDestroyedShip } from './board.js';
import { getElement } from './utils.js';
import { enemyBoardData, myBoardData, placedShips } from './ships.js';
import { sendMoveToServer } from './network.js';

// =============================================================
// GAME STATE VARIABLES
// =============================================================

export let isPlayerTurn = false;
export let gameWinner = null;
export let mySocketId = null;
export let isGameActive = false;

let playerHits = 0;
let enemyHits = 0;
const TOTAL_SHIP_CELLS = 20;

// =============================================================
// INITIALIZATION
// =============================================================

export function setMySocketId(socketId) {
    mySocketId = socketId;
    console.log('My socket ID set:', mySocketId);
}

export function startBattle(currentTurn) {
    console.log('startBattle called with currentTurn:', currentTurn);
    console.log('mySocketId:', mySocketId);
    
    gameWinner = null;
    isGameActive = true;
    playerHits = 0;
    enemyHits = 0;
    
    isPlayerTurn = (currentTurn === mySocketId);
    
    updateBoards();
    updateTurnDisplay();
    hideGameOverModal();
    
    console.log(`Battle started! Game active: ${isGameActive}, Your turn: ${isPlayerTurn}`);
}

export function initGame() {
    console.log('Initializing game...');
    gameWinner = null;
    isGameActive = true;
    playerHits = 0;
    enemyHits = 0;
    updateTurnDisplay();
    hideGameOverModal();
}

export function setMyTurn(isMyTurn) {
    console.log('setMyTurn called with:', isMyTurn, 'mySocketId:', mySocketId);
    isPlayerTurn = isMyTurn;
    isGameActive = true;
    updateTurnDisplay();
    console.log(`Turn set: ${isPlayerTurn ? 'YOUR turn' : 'ENEMY turn'}, Game active: ${isGameActive}`);
}

export function resetGame() {
    gameWinner = null;
    isGameActive = true;
    isPlayerTurn = false;
    playerHits = 0;
    enemyHits = 0;
    updateTurnDisplay();
    hideGameOverModal();
}

// =============================================================
// MOVE HANDLING
// =============================================================

export function makeMove(row, col) {
    if (!isGameActive) {
        console.log('Game not active!');
        return { success: false, message: 'Game not active' };
    }
    
    if (gameWinner !== null) {
        console.log('Game already over!');
        return { success: false, message: 'Game already over' };
    }
    
    if (!isPlayerTurn) {
        console.log('Not your turn!');
        return { success: false, message: 'Not your turn' };
    }
    
    if (enemyBoardData[row][col] === 2 || enemyBoardData[row][col] === 3) {
        console.log('Already shot here!');
        return { success: false, message: 'Already shot here' };
    }
    
    sendMoveToServer(row, col);
    updateTurnDisplayWaiting();
    
    return { success: true, pending: true };
}

export function updateAfterMove(data) {
    const { playerId, row, col, hit, shipDestroyed, destroyedCells, currentTurn, gameOver, winner } = data;
    
    console.log(`=== MOVE RESULT ===`);
    console.log(`Server says: ${hit ? 'HIT' : 'MISS'} at (${row}, ${col})`);
    console.log(`Ship destroyed: ${shipDestroyed}`);
    
    if (playerId === mySocketId) {
        if (hit) {
            enemyBoardData[row][col] = 2;
            playerHits++;
            
            if (shipDestroyed && destroyedCells && destroyedCells.length > 0) {
                console.log('Ship destroyed! Adding outline...');
                addDestroyedShip(destroyedCells);
            }
        } else {
            enemyBoardData[row][col] = 3;
        }
    } else {
        if (hit) {
            myBoardData[row][col] = 2;
            enemyHits++;
        } else {
            myBoardData[row][col] = 3;
        }
    }
    
    isPlayerTurn = (currentTurn === mySocketId);
    
    updateBoards();
    updateTurnDisplay();
    
    if (gameOver) {
        isGameActive = false;
        gameWinner = winner === mySocketId ? 'player' : 'enemy';
        const message = gameWinner === 'player' ? 'YOU WIN!' : 'YOU LOSE!';
        showGameOverModal(message);
    }
}

// =============================================================
// UI FUNCTIONS
// =============================================================

export function updateTurnDisplay() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    console.log('updateTurnDisplay: isPlayerTurn =', isPlayerTurn, 'isGameActive =', isGameActive);
    
    if (!isGameActive || gameWinner !== null) {
        turnIndicator.textContent = gameWinner === 'player' ? 'YOU WIN!' : 'YOU LOSE!';
        turnIndicator.style.background = '#34495e';
        return;
    }
    
    if (isPlayerTurn) {
        turnIndicator.textContent = 'YOUR TURN!';
        turnIndicator.style.background = '#27ae60';
        turnIndicator.style.border = '2px solid #2ecc71';
    } else {
        turnIndicator.textContent = 'ENEMY TURN...';
        turnIndicator.style.background = '#e67e22';
        turnIndicator.style.border = '2px solid #f39c12';
    }
}

export function updateTurnDisplayWaiting() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    turnIndicator.textContent = 'SENDING MOVE...';
    turnIndicator.style.background = '#95a5a6';
    turnIndicator.style.border = '2px solid #7f8c8d';
}

function showHitEffect(row, col, isHit) {
    const canvas = document.getElementById(isHit ? 'rightBoard' : 'leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / BOARD_SIZE;
    const x = col * cellSize;
    const y = row * cellSize;
    
    if (isHit) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.fillRect(x, y, cellSize, cellSize);
        
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cellSize - 5, y + 5);
        ctx.lineTo(x + 5, y + cellSize - 5);
        ctx.stroke();
    } else {
        ctx.fillStyle = 'rgba(236, 240, 241, 0.8)';
        ctx.fillRect(x, y, cellSize, cellSize);
        
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(x + cellSize/2, y + cellSize/2, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    setTimeout(() => {
        updateBoards();
    }, 200);
}

function showShipDestroyedAnimation(row, col) {
    console.log('Ship destroyed at', row, col);
}

export function showGameOverModal(message) {
    const modal = getElement('gameOverModal');
    const messageEl = getElement('gameOverMessage');
    
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.style.display = 'flex';
    updateTurnDisplay();
}

export function hideGameOverModal() {
    const modal = getElement('gameOverModal');
    if (modal) modal.style.display = 'none';
}

// =============================================================
// SURRENDER
// =============================================================

export function surrender() {
    if (!isGameActive) return;
    if (gameWinner !== null) return;
    
    isGameActive = false;
    gameWinner = 'enemy';
    showGameOverModal('YOU SURRENDERED!');
    console.log('Player surrendered');
}

// =============================================================
// DEBUG FUNCTIONS
// =============================================================

export function getGameState() {
    return {
        isPlayerTurn,
        gameWinner,
        playerHits,
        enemyHits,
        isGameActive
    };
}

export function logGameState() {
    console.log('=== GAME STATE ===');
    console.log('isPlayerTurn:', isPlayerTurn);
    console.log('gameWinner:', gameWinner);
    console.log('playerHits:', playerHits);
    console.log('enemyHits:', enemyHits);
    console.log('isGameActive:', isGameActive);
    console.log('================');
}