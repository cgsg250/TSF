let socket = null;
let currentRoomId = null;

// ============================================
// DOM ELEMENTS 
// ============================================
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element "${id}" not found`);
    }
    return element;
}

// ============================================
// UI FUNCTIONS
// ============================================
function showMainMenu() {
    const menu = getElement('menu');
    const waitingRoom = getElement('waitingRoom');
    const gameBoard = getElement('gameBoard');

    if (menu) menu.style.display = 'block';
    if (waitingRoom) waitingRoom.style.display = 'none';
    if (gameBoard) gameBoard.style.display = 'none';
}

function showWaitingRoom(roomId) {
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

function showGameBoard() {
    const menu = getElement('menu');
    const waitingRoom = getElement('waitingRoom');
    const gameBoard = getElement('gameBoard');
    
    if (menu) menu.style.display = 'none';
    if (waitingRoom) waitingRoom.style.display = 'none';
    if (gameBoard) gameBoard.style.display = 'flex';
    
    // Initialize boards
    initBoards();
    
    // Setup ship placement
    initShipPlacement();
}

// ============================================
// GAME FUNCTIONS
// ============================================
function createRoom() {
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

function joinRoom() {
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

function joinRoomById(roomId) {
    console.log('Joining room:', roomId);
    const roomIdInput = getElement('roomIdInput');
    if (roomIdInput) {
        roomIdInput.value = roomId;
    }
    joinRoom();
}

function leaveRoom() {
    socket.emit('leaveRoom', (response) => {
        console.log('Server response:', response);
        if (response && response.success) {
            console.log('Left room:', response.message);
        }
        currentRoomId = null;
        showMainMenu();
    });
}

function refreshRoomsList() {
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

// ============================================
// SOCKET HANDLERS
// ============================================
function initSocket() {
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
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Sea Battle...');

    initSocket();

    // Setup event listeners
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

// ============================================
// UPDATE PLAYER NAMES ON BOARDS
// ============================================

function updatePlayerNames(myNickname, opponentNickname) {
    const leftNameEl = document.getElementById('leftPlayerName');
    const rightNameEl = document.getElementById('rightPlayerName');

    // Left board - always shows current player's nickname
    if (leftNameEl) {
        leftNameEl.textContent = myNickname || 'You';
    }

    // Right board - shows opponent's nickname
    if (rightNameEl) {
        rightNameEl.textContent = opponentNickname || 'Opponent';
    }
}

// Update labels to be neutral
function updateBoardLabels() {
    const leftLabel = document.getElementById('leftBoardLabel');
    const rightLabel = document.getElementById('rightBoardLabel');

    if (leftLabel) leftLabel.textContent = '⚓ YOUR FLEET';
    if (rightLabel) rightLabel.textContent = '⚔️ ENEMY FLEET';
}

// ============================================
// BOARD DRAWING FUNCTIONS
// ============================================

// ============================================
// BOARD DRAWING FUNCTIONS
// ============================================

const BOARD_SIZE = 10;
const CELL_SIZE = 30;
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Global board data
let myBoardData = null;      // Left board - player's ships
let enemyBoardData = null;   // Right board - enemy's ships (hits/misses only)

// Draw coordinate labels for both boards
function drawCoordinateLabels() {
    // Left board labels
    const leftColLabels = document.getElementById('leftColLabels');
    const leftRowLabels = document.getElementById('leftRowLabels');
    
    if (leftColLabels) {
        leftColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            leftColLabels.appendChild(label);
        }
    }
    
    if (leftRowLabels) {
        leftRowLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = i + 1;
            leftRowLabels.appendChild(label);
        }
    }
    
    // Right board labels
    const rightColLabels = document.getElementById('rightColLabels');
    const rightRowLabels = document.getElementById('rightRowLabels');
    
    if (rightColLabels) {
        rightColLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = COL_LETTERS[i];
            rightColLabels.appendChild(label);
        }
    }
    
    if (rightRowLabels) {
        rightRowLabels.innerHTML = '';
        for (let i = 0; i < BOARD_SIZE; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = i + 1;
            rightRowLabels.appendChild(label);
        }
    }
}

// Draw grid on canvas
function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
}

// Draw left board (my ships - always visible)
function drawLeftBoard() {
    const canvas = document.getElementById('leftBoard');
    if (!canvas || !myBoardData) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const cell = myBoardData[row][col];
            
            if (cell === 1) {
                // Ship
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Wood texture
                ctx.fillStyle = '#95a5a6';
                ctx.fillRect(x + 4, y + 8, CELL_SIZE - 8, 4);
                ctx.fillRect(x + 8, y + 15, CELL_SIZE - 16, 3);
            } else if (cell === 2) {
                // Hit on my ship
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
            } else if (cell === 3) {
                // Miss on my board
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawGrid(ctx, canvas);
}

// Draw right board (enemy - ships hidden)
function drawRightBoard() {
    const canvas = document.getElementById('rightBoard');
    if (!canvas || !enemyBoardData) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2c3e6e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const cell = enemyBoardData[row][col];
            
            if (cell === 2) {
                // Hit on enemy ship
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(x + CELL_SIZE/2 - 4, y + CELL_SIZE/2 - 2, 8, 4);
                ctx.fillRect(x + CELL_SIZE/2 - 2, y + CELL_SIZE/2 - 4, 4, 8);
            } else if (cell === 3) {
                // Miss on enemy board
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawGrid(ctx, canvas);
}

// Initialize empty boards
function initBoards() {
    myBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    enemyBoardData = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    
    drawCoordinateLabels();
    drawLeftBoard();
    drawRightBoard();
}

// Update boards after moves
function updateBoards() {
    drawLeftBoard();
    drawRightBoard();
}

// Get click position on board
function getBoardPosition(canvasId, clientX, clientY) {
    const canvas = document.getElementById(canvasId);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    const row = Math.floor(canvasY / CELL_SIZE);
    const col = Math.floor(canvasX / CELL_SIZE);
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null;
}