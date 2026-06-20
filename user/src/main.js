// ============================================
// MAIN ENTRY POINT
// ============================================

import { getElement } from './utils.js';
import { showMainMenu, onReadyButtonClick } from './ui.js';
import { initSocket, createRoom, joinRoom, leaveRoom, refreshRoomsList } from './network.js';
import { randomBoard, resetPlacement, rotateBoard, getBoardPosition } from './ships.js';
import { hideGameOverModal, makeMove, resetGame } from './game_logic.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Sea Battle...');
    
    initSocket();

    const createRoomBtn = getElement('createRoomBtn');
    if (createRoomBtn) createRoomBtn.addEventListener('click', createRoom);

    const joinRoomBtn = getElement('joinRoomBtn');
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', joinRoom);

    const leaveRoomBtn = getElement('leaveRoomBtn');
    if (leaveRoomBtn) leaveRoomBtn.addEventListener('click', leaveRoom);

    const refreshRoomsBtn = getElement('refreshRoomsBtn');
    if (refreshRoomsBtn) refreshRoomsBtn.addEventListener('click', refreshRoomsList);

    const randomBtn = getElement('randomBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            randomBoard();
        });
    }

    const resetBtn = getElement('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetPlacement();
        });
    }

    const rotateBtn = getElement('rotateBtn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            rotateBoard();
        });
    }

    const readyBtn = getElement('readyBtn');
    if (readyBtn) {
        readyBtn.addEventListener('click', onReadyButtonClick);
    }

    const enemyBoard = document.getElementById('rightBoard');
    if (enemyBoard) {
        enemyBoard.addEventListener('click', (e) => {
            const pos = getBoardPosition('rightBoard', e.clientX, e.clientY);
            if (pos) {
                const result = makeMove(pos.row, pos.col);
                if (result && !result.success) {
                    console.log('Move failed:', result.message);
                }
            }
        });
    }

    const backToMenuBtn = getElement('backToMenuBtn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            leaveRoom();
            resetGame();
            resetPlacement();
            hideGameOverModal();
            showMainMenu();
        });
    }

    showMainMenu();
    setInterval(refreshRoomsList, 5000);
});