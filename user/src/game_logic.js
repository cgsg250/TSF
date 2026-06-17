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
                                 
// Set mysocketid variavble
export function setMySocketId(socketId) {
    mySocketId = socketId;
    console.log('My socket ID set:', mySocketId);
}
                
// Fill game state and start game
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
              
// First init game
export function initGame() {
    console.log('Initializing game...');
    gameWinner = null;
    isGameActive = true;
    playerHits = 0;
    enemyHits = 0;
    updateTurnDisplay();
    hideGameOverModal();
}
                              
// Set my turn
export function setMyTurn(isMyTurn) {
    console.log('setMyTurn called with:', isMyTurn, 'mySocketId:', mySocketId);
    isPlayerTurn = isMyTurn;
    isGameActive = true;
    updateTurnDisplay();
    console.log(`Turn set: ${isPlayerTurn ? 'YOUR turn' : 'ENEMY turn'}, Game active: ${isGameActive}`);
}
                      
// Start new game in this room
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
                           
// Make move by player
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
                
// Update boards after turn                                                         
export function updateAfterMove(data) {
    const { playerId, row, col, hit, shipDestroyed, destroyedCells, currentTurn, gameOver, winner } = data;
    
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
               
// Update turn
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
 
// Update turn 
export function updateTurnDisplayWaiting() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    turnIndicator.textContent = 'SENDING MOVE...';
    turnIndicator.style.background = '#95a5a6';
    turnIndicator.style.border = '2px solid #7f8c8d';
}
       
// Show last panel
export function showGameOverModal(message) {
    const modal = getElement('gameOverModal');
    const messageEl = getElement('gameOverMessage');
    
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.style.display = 'flex';
    updateTurnDisplay();
}

// Hide last panel
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
                
// Get value game state function to others module
export function getGameState() {
    return {
        isPlayerTurn,
        gameWinner,
        playerHits,
        enemyHits,
        isGameActive
    };
}
                                                 
// Log game state (debug)
export function logGameState() {
    console.log('=== GAME STATE ===');
    console.log('isPlayerTurn:', isPlayerTurn);
    console.log('gameWinner:', gameWinner);
    console.log('playerHits:', playerHits);
    console.log('enemyHits:', enemyHits);
    console.log('isGameActive:', isGameActive);
    console.log('================');
}