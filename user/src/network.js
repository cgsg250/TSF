// =============================================================
// NETWORK MODULE
// =============================================================

import { getElement } from './utils.js';
import { showWaitingRoom, showMainMenu, showGameBoard, updatePlayerNames, updateBoardLabels, switchToBattleMode } from './ui.js';
import { updateAfterMove, setMyTurn, setMySocketId, startBattle, resetGame } from './game_logic.js';

export let socket = null;
export let currentRoomId = null;

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

export function sendShipsToServer(boardData) {
    if (!socket || !currentRoomId) {
        console.error('Cannot send ships: not connected');
        return false;
    }

    socket.emit('updateShips', {
        roomId: currentRoomId,
        boardData: boardData
    });
    return true;
}

export function sendPlayerReady() {
    if (!socket || !currentRoomId) {
        console.error('Cannot send ready: not connected');
        return false;
    }

    socket.emit('playerReady');
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

    // --- GAME READY - shows placement screen ---
    socket.on('gameReady', (data) => {
        console.log('Game ready!', data);

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

        updatePlayerNames(myNickname, opponentNickname);
        updateBoardLabels();
        
        // Show placement screen
        showGameBoard();
    });

    // --- START BATTLE - switches to battle mode ---
    socket.on('startBattle', (data) => {
        console.log('Start battle!', data);

        let currentTurn = data.currentTurn;
        if (!currentTurn) {
            currentTurn = socket.id;
        }

        startBattle(currentTurn);
        setMyTurn(currentTurn === socket.id);
        switchToBattleMode();
    });

    socket.on('roomLeft', (data) => {
        console.log(data.message);
        currentRoomId = null;
        showMainMenu();
    });

    socket.on('opponentLeft', (data) => {
        console.log(data.message);
        alert(data.message);
        currentRoomId = null;
        showMainMenu();
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        alert(data.message);
    });

    socket.on('moveResult', (data) => {
        console.log('Move result received:', data);

        updateAfterMove({
            playerId: data.playerId,
            row: data.row,
            col: data.col,
            hit: data.hit,
            shipDestroyed: data.shipDestroyed,
            destroyedCells: data.destroyedCells,
            currentTurn: data.currentTurn,
            gameOver: data.gameOver,
            winner: data.winner
        });

        setMyTurn(data.currentTurn === socket.id);
    });
}

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
    });
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
    if (!socket) return;
    
    resetGame();
    
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
    if (!socket) return;

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
            button.removeEventListener('click', handleJoinClick);
            button.addEventListener('click', handleJoinClick);
        });
    });
}

function handleJoinClick(e) {
    const button = e.currentTarget;
    const roomId = button.getAttribute('data-room-id');
    joinRoomById(roomId);
}