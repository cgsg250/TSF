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
}

export function startBattle(currentTurn) {
    gameWinner = null;
    isGameActive = true;
    playerHits = 0;
    enemyHits = 0;
    
    isPlayerTurn = (currentTurn === mySocketId);
    
    updateBoards();
    updateTurnDisplay();
    hideGameOverModal();
}

export function initGame() {
    gameWinner = null;
    isGameActive = true;
    playerHits = 0;
    enemyHits = 0;
    updateTurnDisplay();
    hideGameOverModal();
}

export function setMyTurn(isMyTurn) {
    isPlayerTurn = isMyTurn;
    isGameActive = true;
    updateTurnDisplay();
}

export function resetGame() {
    gameWinner = null;
    isGameActive = false;
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
        return { success: false, message: 'Game not active' };
    }
    
    if (gameWinner !== null) {
        return { success: false, message: 'Game already over' };
    }
    
    if (!isPlayerTurn) {
        return { success: false, message: 'Not your turn' };
    }
    
    if (enemyBoardData[row][col] === 2 || enemyBoardData[row][col] === 3) {
        return { success: false, message: 'Already shot here' };
    }
    
    sendMoveToServer(row, col);
    updateTurnDisplayWaiting();
    
    return { success: true, pending: true };
}

export function updateAfterMove(data) {
    const { playerId, row, col, hit, shipDestroyed, destroyedCells, currentTurn, gameOver, winner } = data;
    
    if (playerId === mySocketId) {
        if (hit) {
            enemyBoardData[row][col] = 2;
            playerHits++;
            
            if (shipDestroyed && destroyedCells && destroyedCells.length > 0) {
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