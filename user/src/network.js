// =============================================================
// USER MODULE
// =============================================================

import { getElement } from './utils.js';
import { showWaitingRoom, showMainMenu, showGameBoard, updatePlayerNames, updateBoardLabels, switchToBattleMode } from './ui.js';
import { updateAfterMove, setMyTurn, setMySocketId } from './game_logic.js';

export let socket = null;
export let currentRoomId = null;

// Send move to server
export function sendMoveToServer(row, col) {
    if (!socket || !currentRoomId) {
        console.error('Cannot send move: not connected');
        return false;
    }

    socket.emit('makeMove', {
        roomId: currentRoomId,
        row: row,
        col: col
    });

    return true;
}

// Send player ready signal to server
export function sendPlayerReady() {
    if (!socket || !currentRoomId) {
        console.error('Cannot send ready: not connected');
        return false;
    }

    socket.emit('playerReady');
    console.log('Player ready signal sent');
    return true;
}

export function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        setMySocketId(socket.id);
    });

    socket.on('createRoom', (response) => {
        console.log('Room created:', response.roomId);
        currentRoomId = response.roomId;
        showWaitingRoom(response.roomId);
    });

    socket.on('waitingForOpponent', (data) => {
        console.log(data.message);
        const roomStatus = getElement('roomStatus');
        if (roomStatus) {
            roomStatus.innerText = `Room: ${data.roomId} - ${data.message}`;
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        currentRoomId = null;
        showMainMenu();
        alert('Connection to server lost. Please refresh the page.');
    });

    socket.on('gameReady', (data) => {
        console.log('Game ready!', data);

        // Determine which player is me
        let myNickname = '';
        let opponentNickname = '';

        if (data.players && data.players.length === 2) {
            const player1 = data.players[0];
            const player2 = data.players[1];

            if (player1.id === socket.id) {
                myNickname = player1.nickname;
                opponentNickname = player2.nickname;
            } else {
                myNickname = player2.nickname;
                opponentNickname = player1.nickname;
            }
        }

        // network.js - обработчик startBattle
        socket.on('startBattle', (data) => {
            console.log('🔥 START BATTLE RECEIVED! 🔥');
            console.log('Full data:', data);

            let currentTurn = data.currentTurn;

            // Временный фикс: если currentTurn undefined, назначаем текущего игрока
            if (!currentTurn) {
                console.warn('currentTurn is undefined! Setting current player as first turn');
                currentTurn = socket.id;
            }

            console.log('Current turn socket ID:', currentTurn);
            console.log('My socket ID:', socket.id);
            console.log('Is my turn?', currentTurn === socket.id);

            // Pass currentTurn to startBattle function
            if (typeof startBattle === 'function') {
                startBattle(currentTurn);
            }

            // Also set turn directly
            setMyTurn(currentTurn === socket.id);

            // Switch to battle UI
            switchToBattleMode();
        });
        // Update board names
        updatePlayerNames(myNickname, opponentNickname);
        updateBoardLabels();

        showGameBoard();
    });

    socket.on('roomLeft', (data) => {
        console.log(data.message);
        showMainMenu();
    });

    socket.on('opponentLeft', (data) => {
        console.log(data.message);
        alert(data.message);
        showMainMenu();
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        alert(data.message);
    });

    socket.on('moveResult', (data) => {
        console.log('Move result received:', data);

        // Update game state
        updateAfterMove({
            playerId: data.playerId,
            row: data.row,
            col: data.col,
            hit: data.hit,
            currentTurn: data.currentTurn,
            gameOver: data.gameOver,
            winner: data.winner
        });

        // Update turn display
        setMyTurn(data.currentTurn === socket.id);
    });

    // Handle start battle
    socket.on('startBattle', (data) => {
        console.log('Start battle!', data);
        switchToBattleMode();
        setMyTurn(data.currentTurn === socket.id);
    });
}

// ============================================
// GAME FUNCTIONS
// ============================================

export function createRoom() {
    const nicknameInput = getElement('nickname');
    const nickname = nicknameInput ? nicknameInput.value : 'Player';

    socket.emit('createRoom', { nickname: nickname }, (response) => {
        console.log('Server response:', response);
        if (response.success) {
            currentRoomId = response.roomId;
            showWaitingRoom(response.roomId);
        } else {
            alert('Failed to create room: ' + response.message);
        }
    });
}

export function joinRoom() {
    const roomIdInput = getElement('roomIdInput');
    const nicknameInput = getElement('nickname');

    const roomId = roomIdInput ? roomIdInput.value : '';
    const nickname = nicknameInput ? nicknameInput.value : 'Player';

    if (!roomId) {
        alert('Enter room ID');
        return;
    }

    socket.emit('joinRoom', { roomId: roomId, nickname: nickname }, (response) => {
        console.log('Server response:', response);
        if (response.success) {
            currentRoomId = response.roomId;
            showWaitingRoom(response.roomId);
        } else {
            alert('Failed to join room: ' + response.message);
        }
    });;
}

export function joinRoomById(roomId) {
    console.log('Joining room:', roomId);
    const roomIdInput = getElement('roomIdInput');
    if (roomIdInput) {
        roomIdInput.value = roomId;
    }
    joinRoom();
}

export function leaveRoom() {
    socket.emit('leaveRoom', (response) => {
        console.log('Server response:', response);
        if (response && response.success) {
            console.log('Left room:', response.message);
        }
        currentRoomId = null;
        showMainMenu();
    });
}

export function refreshRoomsList() {
    socket.emit('getRooms', (rooms) => {
        const roomsList = getElement('roomsList');
        if (!roomsList) return;

        roomsList.innerHTML = '';
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div>No rooms available</div>';
            return;
        }

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                Room: ${room.id} (${room.players}/2 players)
                <button class="join-room-btn" data-room-id="${room.id}">Join</button>
            `;
            roomsList.appendChild(roomElement);
        });

        const joinButtons = document.querySelectorAll('.join-room-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const roomId = button.getAttribute('data-room-id');
                joinRoomById(roomId);
            });
        });
    });
}


