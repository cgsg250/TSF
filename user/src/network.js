import { getElement } from './utils.js';
import { showWaitingRoom, showMainMenu, showGameBoard, updatePlayerNames, updateBoardLabels } from './ui.js';

export let socket = null;
export let currentRoomId = null;

export function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
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
