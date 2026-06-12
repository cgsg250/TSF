// =============================================================
// GAME LOGIC MODULE - ONLINE MULTIPLAYER
// =============================================================

import { BOARD_SIZE, updateBoards } from './board.js';
import { getElement } from './utils.js';
import { enemyBoardData, myBoardData, placedShips } from './ships.js';
import { sendMoveToServer, sendPlayerReady } from './network.js';

// =============================================================
// GAME STATE VARIABLES
// =============================================================

export let isPlayerTurn = false;      // Initially false, server will set
export let gameWinner = null;          // 'player', 'enemy', or null
export let mySocketId = null;          // Current player's socket ID
export let isGameActive = false;       // Whether battle is active

// Hit counters (for local display)
let playerHits = 0;
let enemyHits = 0;
const TOTAL_SHIP_CELLS = 20;

// =============================================================
// INITIALIZATION
// =============================================================

// Set current player's socket ID (called from network.js)
export function setMySocketId(socketId) {
    mySocketId = socketId;
    console.log('My socket ID set:', mySocketId);
}


// Start battle (called from ui.js switchToBattleMode)
// game-logic.js - исправь startBattle
export function startBattle(currentTurn) {
    console.log('startBattle called with currentTurn:', currentTurn);
    console.log('mySocketId:', mySocketId);
    
    // Reset all game state
    gameWinner = null;
    isGameActive = true;  // ← ВАЖНО! Активируем игру
    playerHits = 0;
    enemyHits = 0;
    
    // Set turn based on server data
    isPlayerTurn = (currentTurn === mySocketId);
    
    // Clear boards visually (but keep ship data)
    updateBoards();
    updateTurnDisplay();
    hideGameOverModal();
    
    console.log(`Battle started! Game active: ${isGameActive}, Your turn: ${isPlayerTurn}`);
}

// Исправь initGame
export function initGame() {
    console.log('Initializing game...');
    gameWinner = null;
    isGameActive = true;  // ← ВАЖНО!
    playerHits = 0;
    enemyHits = 0;
    updateTurnDisplay();
    hideGameOverModal();
}

// Исправь setMyTurn
export function setMyTurn(isMyTurn) {
    console.log('setMyTurn called with:', isMyTurn, 'mySocketId:', mySocketId);
    isPlayerTurn = isMyTurn;
    isGameActive = true;  // ← ВАЖНО!
    updateTurnDisplay();
    console.log(`Turn set: ${isPlayerTurn ? 'YOUR turn' : 'ENEMY turn'}, Game active: ${isGameActive}`);
}

// Reset game for rematch
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

// Make a move - send to server
export function makeMove(row, col) {
    // Check if game is active
    if (!isGameActive) {
        console.log('Game not active!');
        return { success: false, message: 'Game not active' };
    }
    
    // Check if game is over
    if (gameWinner !== null) {
        console.log('Game already over!');
        return { success: false, message: 'Game already over' };
    }
    
    // Check if it's player's turn
    if (!isPlayerTurn) {
        console.log('Not your turn!');
        return { success: false, message: 'Not your turn' };
    }
    
    // Check if already shot here
    if (enemyBoardData[row][col] === 2 || enemyBoardData[row][col] === 3) {
        console.log('Already shot here!');
        return { success: false, message: 'Already shot here' };
    }
    
    // Send move to server
    sendMoveToServer(row, col);
    
    // Show waiting indicator
    updateTurnDisplayWaiting();
    
    return { success: true, pending: true };
}

// Update board after move from server
export function updateAfterMove(data) {
    const { playerId, row, col, hit, shipDestroyed, currentTurn, gameOver, winner } = data;
    
    console.log('Updating after move:', { playerId, row, col, hit, currentTurn, gameOver });
    
    // Update board data
    if (playerId === mySocketId) {
        // My move - update enemy board
        if (hit) {
            enemyBoardData[row][col] = 2;
            playerHits++;
            console.log(`Your HIT at (${row}, ${col})! Player hits: ${playerHits}/${TOTAL_SHIP_CELLS}`);
            
            // Show hit effect
            showHitEffect(row, col, true);
        } else {
            enemyBoardData[row][col] = 3;
            console.log(`Your MISS at (${row}, ${col})`);
            showHitEffect(row, col, false);
        }
    } else {
        // Enemy move - update my board
        if (hit) {
            myBoardData[row][col] = 2;
            enemyHits++;
            console.log(`Enemy HIT at (${row}, ${col})! Enemy hits: ${enemyHits}/${TOTAL_SHIP_CELLS}`);
            showHitEffect(row, col, true);
        } else {
            myBoardData[row][col] = 3;
            console.log(`Enemy MISS at (${row}, ${col})`);
            showHitEffect(row, col, false);
        }
    }
    
    // Update turn
    isPlayerTurn = (currentTurn === mySocketId);
    
    // Update UI
    updateBoards();
    updateTurnDisplay();
    
    // Check for game over
    if (gameOver) {
        isGameActive = false;
        gameWinner = winner === mySocketId ? 'player' : 'enemy';
        const message = gameWinner === 'player' ? '🎉 YOU WIN! 🎉' : '😢 YOU LOSE! 😢';
        showGameOverModal(message);
    }
    
    // If ship was destroyed, show explosion animation
    if (shipDestroyed) {
        showShipDestroyedAnimation(row, col);
    }
}

// =============================================================
// READY SYSTEM
// =============================================================

// Send ready signal to server
export function sendReady() {
    if (placedShips.length === 10) {
        console.log('Sending ready signal to server...');
        sendPlayerReady();
        
        // Disable ready button
        const readyBtn = getElement('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = true;
            readyBtn.textContent = '✓ WAITING FOR OPPONENT...';
        }
    } else {
        console.log('Cannot ready: not all ships placed');
        alert('Please place all ships first!');
    }
}

// =============================================================
// UI FUNCTIONS
// =============================================================

// Update turn display
// game-logic.js
export function updateTurnDisplay() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    console.log('updateTurnDisplay: isPlayerTurn =', isPlayerTurn, 'isGameActive =', isGameActive);
    
    if (!isGameActive || gameWinner !== null) {
        turnIndicator.textContent = gameWinner === 'player' ? '🏆 YOU WIN! 🏆' : '😢 YOU LOSE 😢';
        turnIndicator.style.background = '#34495e';
        return;
    }
    
    if (isPlayerTurn) {
        turnIndicator.textContent = '🎯 YOUR TURN!';
        turnIndicator.style.background = '#27ae60';
        turnIndicator.style.border = '2px solid #2ecc71';
    } else {
        turnIndicator.textContent = '⏳ ENEMY TURN...';
        turnIndicator.style.background = '#e67e22';
        turnIndicator.style.border = '2px solid #f39c12';
    }
}
// Show waiting indicator
export function updateTurnDisplayWaiting() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    turnIndicator.textContent = '⏳ SENDING MOVE...';
    turnIndicator.style.background = '#95a5a6';
    turnIndicator.style.border = '2px solid #7f8c8d';
}

// Show hit/miss effect on board
function showHitEffect(row, col, isHit) {
    const canvas = document.getElementById(isHit ? 'rightBoard' : 'leftBoard');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / BOARD_SIZE;
    const x = col * cellSize;
    const y = row * cellSize;
    
    if (isHit) {
        // Flash red
        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Draw explosion X
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
        // Flash white
        ctx.fillStyle = 'rgba(236, 240, 241, 0.8)';
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Draw dot
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(x + cellSize/2, y + cellSize/2, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Fade out effect
    setTimeout(() => {
        updateBoards();
    }, 200);
}

// Show ship destroyed animation
function showShipDestroyedAnimation(row, col) {
    console.log('Ship destroyed at', row, col);
    // You can add more fancy animation here
}

// Show game over modal
export function showGameOverModal(message) {
    const modal = getElement('gameOverModal');
    const messageEl = getElement('gameOverMessage');
    
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.style.display = 'flex';
    updateTurnDisplay();
}

// Hide game over modal
export function hideGameOverModal() {
    const modal = getElement('gameOverModal');
    if (modal) modal.style.display = 'none';
}

// =============================================================
// SURRENDER
// =============================================================

// Surrender the game
export function surrender() {
    if (!isGameActive) return;
    if (gameWinner !== null) return;
    
    isGameActive = false;
    gameWinner = 'enemy';
    showGameOverModal('😢 YOU SURRENDERED! 😢');
    console.log('Player surrendered');
    
    // Send surrender to server if needed
    // sendSurrenderToServer();
}

// =============================================================
// DEBUG FUNCTIONS
// =============================================================

// Get current game state (for debugging)
export function getGameState() {
    return {
        isPlayerTurn,
        gameWinner,
        playerHits,
        enemyHits,
        isGameActive
    };
}

// Log current state (for debugging)
export function logGameState() {
    console.log('=== GAME STATE ===');
    console.log('isPlayerTurn:', isPlayerTurn);
    console.log('gameWinner:', gameWinner);
    console.log('playerHits:', playerHits);
    console.log('enemyHits:', enemyHits);
    console.log('isGameActive:', isGameActive);
    console.log('================');
}