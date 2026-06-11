// ============================================
// MAIN ENTRY POINT
// ============================================

import { getElement } from './utils.js';
import { showMainMenu } from './ui.js';
import { initSocket, createRoom, joinRoom, leaveRoom, refreshRoomsList } from './network.js';

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Sea Battle...');

    // Initialize socket connection
    initSocket();

    // Setup event listeners for buttons
    const createRoomBtn = getElement('createRoomBtn');
    if (createRoomBtn) createRoomBtn.addEventListener('click', createRoom);

    const joinRoomBtn = getElement('joinRoomBtn');
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', joinRoom);

    const leaveRoomBtn = getElement('leaveRoomBtn');
    if (leaveRoomBtn) leaveRoomBtn.addEventListener('click', leaveRoom);

    const refreshRoomsBtn = getElement('refreshRoomsBtn');
    if (refreshRoomsBtn) refreshRoomsBtn.addEventListener('click', refreshRoomsList);

    // Start with main menu visible
    showMainMenu();

    // Refresh rooms list every 5 seconds
    setInterval(refreshRoomsList, 5000);
});