// =============================================================
// UI MODULE
// =============================================================

import { getElement } from './utils.js';
import { sendPlayerReady } from './network.js';
import { initShipPlacement, placedShips, removeShipPlacementEvents } from './ships.js';
import { sendMyShipsToServer } from './ships.js';

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

    showShipPlacementUI();
    
    initShipPlacement();
    
    console.log('Game board shown, ship placement UI displayed');
}

export function hideShipPlacementUI() {
    const shipPalette = getElement('shipPalette');
    if (shipPalette) shipPalette.style.display = 'none';
    
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

export function showBattleUI() {    
    const turnIndicator = getElement('turnIndicator');
    if (turnIndicator) {
        turnIndicator.style.display = 'block';
    }
}

export function showShipPlacementUI() {
    const shipPalette = getElement('shipPalette');
    const randBtn = getElement('randomBtn');
    const rotateBtn = getElement('rotateBtn');
    const resetBtn = getElement('resetBtn');
    const readyBtn = getElement('readyBtn');
    const readyIndicator = getElement('readyIndicator');
    const turnIndicator = getElement('turnIndicator');  

    if (turnIndicator) {
        turnIndicator.style.display = 'none';
    }

    if (shipPalette) shipPalette.style.display = 'flex';
    if (randBtn) randBtn.style.display = 'inline-block';
    if (rotateBtn) rotateBtn.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'inline-block';
    if (readyBtn) {
        readyBtn.style.display = 'inline-block';
        readyBtn.disabled = true;
        readyBtn.textContent = 'PLACE SHIPS';
    }
    if (readyIndicator) {
        readyIndicator.style.display = 'block';
        readyIndicator.textContent = 'PLACE YOUR SHIPS (10 left)';
        readyIndicator.className = 'ready-indicator not-ready';
    }
}

export function hideShipPlacementButtons() {
    const randBtn = getElement('randomBtn');
    const rotateBtn = getElement('rotateBtn');
    const resetBtn = getElement('resetBtn');

    if (randBtn) randBtn.style.display = 'none';
    if (rotateBtn) rotateBtn.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
}

// ============================================
// BOARD LABELS AND NAMES
// ============================================

export function updateBoardLabels() {
    const leftLabel = document.getElementById('leftBoardLabel');
    const rightLabel = document.getElementById('rightBoardLabel');

    if (leftLabel) leftLabel.textContent = 'YOUR FLEET';
    if (rightLabel) rightLabel.textContent = 'ENEMY FLEET';
}

export function updatePlayerNames(myNickname, opponentNickname) {
    const leftNameEl = document.getElementById('leftPlayerName');
    const rightNameEl = document.getElementById('rightPlayerName');

    if (leftNameEl) leftNameEl.textContent = myNickname || 'You';
    if (rightNameEl) rightNameEl.textContent = opponentNickname || 'Opponent';
}

// ============================================
// SHIP BUTTONS
// ============================================

export function updateShipButtons(remainingShips, selectedShipSize, isShipAttached) {
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
    
    import('./ships.js').then(module => {
        module.selectShip(size);
    });
}

export function updateReadyButton(placedShipsCount) {
    const readyBtn = getElement('readyBtn');
    const readyIndicator = getElement('readyIndicator');
    
    if (!readyBtn) return;
    
    readyBtn.removeEventListener('click', onReadyButtonClick);
    
    if (placedShipsCount === 10) {
        readyBtn.disabled = false;
        readyBtn.style.opacity = '1';
        readyBtn.style.cursor = 'pointer';
        readyBtn.addEventListener('click', onReadyButtonClick);
        
        if (readyIndicator) {
            readyIndicator.textContent = 'READY TO FIGHT!';
            readyIndicator.className = 'ready-indicator ready';
        }
    } else {
        readyBtn.disabled = true;
        readyBtn.style.opacity = '0.5';
        readyBtn.style.cursor = 'not-allowed';
        
        if (readyIndicator) {
            const remaining = 10 - placedShipsCount;
            readyIndicator.textContent = `PLACE SHIPS (${remaining} left)`;
            readyIndicator.className = 'ready-indicator not-ready';
        }
    }
}

export function onReadyButtonClick() {
    console.log('Ready button clicked. Placed ships:', placedShips.length);
    
    if (placedShips.length === 10) {
        sendMyShipsToServer();
        hideShipPlacementButtons();
        
        setTimeout(() => {
            sendPlayerReady();
        }, 100);
        
        const readyBtn = getElement('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = true;
            readyBtn.textContent = 'WAITING FOR OPPONENT...';
        }
    } else {
        alert(`Place all ships first! (${placedShips.length}/10 placed)`);
    }
}

export function switchToBattleMode() {
    removeShipPlacementEvents();
    hideShipPlacementUI();
    showBattleUI();
    
    const enemyBoard = document.getElementById('rightBoard');
    if (enemyBoard) {
        enemyBoard.style.cursor = 'crosshair';
    }
}