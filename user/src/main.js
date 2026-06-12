// ============================================
// MAIN ENTRY POINT
// ============================================

import { getElement } from './utils.js';
import { showMainMenu, onReadyButtonClick } from './ui.js';
import { initSocket, createRoom, joinRoom, leaveRoom, refreshRoomsList } from './network.js';
import { randomBoard, resetPlacement, rotateBoard, getBoardPosition } from './ships.js';
import { makeMove } from './game_logic.js';

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Sea Battle...');

    // Initialize socket connection
    initSocket();

    // Setup event listeners for room buttons
    const createRoomBtn = getElement('createRoomBtn');
    if (createRoomBtn) createRoomBtn.addEventListener('click', createRoom);

    const joinRoomBtn = getElement('joinRoomBtn');
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', joinRoom);

    const leaveRoomBtn = getElement('leaveRoomBtn');
    if (leaveRoomBtn) leaveRoomBtn.addEventListener('click', leaveRoom);

    const refreshRoomsBtn = getElement('refreshRoomsBtn');
    if (refreshRoomsBtn) refreshRoomsBtn.addEventListener('click', refreshRoomsList);

    // ============================================
    // ACTION BUTTONS (RANDOM, RESET, ROTATE)
    // ============================================

    // RANDOM button
    const randomBtn = getElement('randomBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            console.log('Random button clicked');
            randomBoard();
        });
    }

    // RESET button
    const resetBtn = getElement('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('Reset button clicked');
            resetPlacement();
        });
    }

    // ROTATE button
    const rotateBtn = getElement('rotateBtn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            console.log('Rotate button clicked');
            rotateBoard();
        });
    }

    // READY button
    const readyBtn = getElement('readyBtn');
    if (readyBtn) {
        readyBtn.addEventListener('click', onReadyButtonClick);
    }

    const enemyBoard = document.getElementById('rightBoard');
    if (enemyBoard) {
        enemyBoard.addEventListener('click', (e) => {
            const pos = getBoardPosition('rightBoard', e.clientX, e.clientY);
            if (pos) {
                console.log(`Player shoots at row: ${pos.row}, col: ${pos.col}`);
                const result = makeMove(pos.row, pos.col);
                console.log('Move result:', result);
            }
        });
    }

    // Start with main menu visible
    showMainMenu();

    // Refresh rooms list every 5 seconds
    setInterval(refreshRoomsList, 5000);
});

