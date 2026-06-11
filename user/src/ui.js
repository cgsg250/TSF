import { getElement } from './utils.js';
import { initShipPlacement } from './ships.js'

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