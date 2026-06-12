// =============================================================
// UI MODULE
// =============================================================

import { getElement } from './utils.js';
import { sendPlayerReady } from './network.js';
import { initShipPlacement, placedShips, removeShipPlacementEvents } from './ships.js';
import { startBattle } from './game_logic.js';

// ============================================
// SCREEN NAVIGATION
// ============================================

export function showMainMenu() {
    const menu = getElement('menu');
    const waitingRoom = getElement('waitingRoom');
    const gameBoard = getElement('gameBoard');

    if (menu) menu.style.display = 'block';
    if (waitingRoom) waitingRoom.style.display = 'none';
    if (gameBoard) gameBoard.style.display = 'none';
}

export function showWaitingRoom(roomId) {
    const menu = getElement('menu');
    const waitingRoom = getElement('waitingRoom');
    const gameBoard = getElement('gameBoard');

    if (menu) menu.style.display = 'none';
    if (waitingRoom) waitingRoom.style.display = 'block';
    if (gameBoard) gameBoard.style.display = 'none';

    const roomIdDisplay = getElement('roomIdDisplay');
    if (roomIdDisplay) roomIdDisplay.innerText = roomId;

    const roomStatus = getElement('roomStatus');
    if (roomStatus) roomStatus.innerText = 'Waiting for opponent to join...';
}

export function showGameBoard() {
    const menu = getElement('menu');
    const waitingRoom = getElement('waitingRoom');
    const gameBoard = getElement('gameBoard');
    
    if (menu) menu.style.display = 'none';
    if (waitingRoom) waitingRoom.style.display = 'none';
    if (gameBoard) gameBoard.style.display = 'flex';

     initShipPlacement();
}

// Hide ALL ship placement UI
export function hideShipPlacementUI() {
    // Hide ship buttons palette
    const shipPalette = getElement('shipPalette');
    if (shipPalette) shipPalette.style.display = 'none';
    
    // Hide action buttons
    const randBtn = getElement('randomBtn');
    const rotateBtn = getElement('rotateBtn');
    const resetBtn = getElement('resetBtn');
    const readyBtn = getElement('readyBtn');
    const readyIndicator = getElement('readyIndicator');

    if (randBtn) randBtn.style.display = 'none';
    if (rotateBtn) rotateBtn.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
    if (readyBtn) readyBtn.style.display = 'none';
    if (readyIndicator) readyIndicator.style.display = 'none';
}

// Show battle UI
export function showBattleUI() {
    // Show give up button
    const giveupBtn = getElement('giveupBtn');
    if (giveupBtn) {
        giveupBtn.style.display = 'block';
    }
    
    // Show turn indicator
    const turnIndicator = getElement('turnIndicator');
    if (turnIndicator) {
        turnIndicator.style.display = 'block';
    }
}

// Show ship placement UI (for reset or rematch)
export function showShipPlacementUI() {
    const shipPalette = getElement('shipPalette');
    if (shipPalette) shipPalette.style.display = 'flex';
    
    const randBtn = getElement('randomBtn');
    const rotateBtn = getElement('rotateBtn');
    const resetBtn = getElement('resetBtn');
    const readyBtn = getElement('readyBtn');
    const readyIndicator = getElement('readyIndicator');

    if (randBtn) randBtn.style.display = 'inline-block';
    if (rotateBtn) rotateBtn.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'inline-block';
    if (readyBtn) readyBtn.style.display = 'inline-block';
    if (readyIndicator) readyIndicator.style.display = 'block';
    
    // Hide give up button
    const giveupBtn = getElement('giveupBtn');
    if (giveupBtn) giveupBtn.style.display = 'none';
}

export function updateTurnDisplayWaiting() {
    const turnIndicator = getElement('turnIndicator');
    if (!turnIndicator) return;
    
    turnIndicator.textContent = '⏳ WAITING FOR SERVER...';
    turnIndicator.style.background = '#95a5a6';
}

// ============================================
// BOARD LABELS AND NAMES
// ============================================

export function updateBoardLabels() {
    const leftLabel = document.getElementById('leftBoardLabel');
    const rightLabel = document.getElementById('rightBoardLabel');

    if (leftLabel) leftLabel.textContent = '⚓ YOUR FLEET';
    if (rightLabel) rightLabel.textContent = '⚔️ ENEMY FLEET';
}

export function updatePlayerNames(myNickname, opponentNickname) {
    const leftNameEl = document.getElementById('leftPlayerName');
    const rightNameEl = document.getElementById('rightPlayerName');

    if (leftNameEl) leftNameEl.textContent = myNickname || 'You';
    if (rightNameEl) rightNameEl.textContent = opponentNickname || 'Opponent';
}

// ============================================
// SHIP BUTTONS (receives data as parameters)
// ============================================

export function updateShipButtons(remainingShips, selectedShipSize, isShipAttached) {
    // Safety check
    if (!remainingShips) {
        console.warn('updateShipButtons: remainingShips is undefined');
        return;
    }
    
    const shipButtons = document.querySelectorAll('.ship-btn');
    
    shipButtons.forEach(button => {
        const size = parseInt(button.getAttribute('data-size'));
        
        if (!isNaN(size) && remainingShips[size] === 0) {
            button.disabled = true;
            button.classList.add('placed');
        } else {
            button.disabled = false;
            button.classList.remove('placed');
        }
        
        button.removeEventListener('click', handleShipButtonClick);
        button.addEventListener('click', handleShipButtonClick);
    });
    
    // Highlight selected ship button
    const allShipBtns = document.querySelectorAll('.ship-btn');
    allShipBtns.forEach(btn => {
        const size = parseInt(btn.getAttribute('data-size'));
        if (selectedShipSize === size && isShipAttached) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function handleShipButtonClick(e) {
    const button = e.currentTarget;
    const size = parseInt(button.getAttribute('data-size'));
    
    if (isNaN(size)) return;
    
    console.log('Ship button clicked, size:', size);
    
    import('./ships.js').then(module => {
        module.selectShip(size);
    });
}

// Update ready button (without auto-hiding)
export function updateReadyButton(placedShipsCount) {
    const readyBtn = getElement('readyBtn');
    const readyIndicator = getElement('readyIndicator');
    
    if (!readyBtn) return;
    
    if (placedShipsCount === 10) {
        readyBtn.disabled = false;
        readyBtn.style.opacity = '1';
        readyBtn.style.cursor = 'pointer';
        if (readyIndicator) {
            readyIndicator.textContent = '✓ READY TO FIGHT!';
            readyIndicator.className = 'ready-indicator ready';
        }

    } else {
        readyBtn.disabled = true;
        readyBtn.style.opacity = '0.5';
        readyBtn.style.cursor = 'not-allowed';
        if (readyIndicator) {
            const remaining = 10 - placedShipsCount;
            readyIndicator.textContent = `⚡ PLACE YOUR SHIPS (${remaining} left)`;
            readyIndicator.className = 'ready-indicator not-ready';
        }
    }
}

export function onReadyButtonClick() {
    if (placedShips.length === 10) {
        sendPlayerReady();  
        const readyBtn = getElement('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = true;
            readyBtn.textContent = '✓ WAITING FOR OPPONENT...';
        }
    } else {
        alert('Place all ships first!');
    }
}


// ui.js - switchToBattleMode
export function switchToBattleMode() {
    removeShipPlacementEvents();
    hideShipPlacementUI();
    showBattleUI();
    
    
    const enemyBoard = document.getElementById('rightBoard');
    if (enemyBoard) {
        enemyBoard.style.cursor = 'crosshair';
    }
    
    console.log('Switched to battle mode - waiting for turn from server');
}