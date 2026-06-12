// =============================================================
// SERVER MODULE - COMPLETE BATTLE SHIP SERVER
// =============================================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("morgan");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 8002;

// Helper function to generate room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to get room
function getRoom(roomId) {
    return rooms.get(roomId);
}

// Middleware
app.use(cookieParser());
app.use(logger("dev"));
app.use(express.static('public'));
app.use('/unit', express.static('user'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// ============================================
// ROOMS AND PLAYERS
// ============================================

const rooms = new Map(); // roomId -> room object
const players = new Map(); // socketId -> player object

// Create new room
function createRoom(roomId, hostSocketId) {
    const room = {
        id: roomId,
        players: [hostSocketId],
        status: 'waiting', // waiting, ready, playing, finished
        readyStatus: {},
        currentTurn: null,
        gameState: {
            board1: Array(10).fill().map(() => Array(10).fill(0)), // Player 1 ships
            board2: Array(10).fill().map(() => Array(10).fill(0)), // Player 2 ships
            hits1: 0,  // Player 1 hits on enemy
            hits2: 0,  // Player 2 hits on enemy
            totalShipCells: 20  // 4+3+3+2+2+2+1+1+1+1 = 20
        },
        createdAt: Date.now()
    };
    rooms.set(roomId, room);
    return room;
}

// Join existing room
function joinRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2 && room.status === 'waiting') {
        room.players.push(socketId);
        if (room.players.length === 2) {
            room.status = 'ready';
            // Инициализируем readyStatus для обоих игроков
            room.readyStatus = {
                [room.players[0]]: false,
                [room.players[1]]: false
            };
            console.log(`Room ${roomId} is now ready. Players:`, room.players);
            console.log(`ReadyStatus initialized:`, room.readyStatus);
        }
        return true;
    }
    return false;
}

// Leave room
function leaveRoom(socketId) {
    const player = players.get(socketId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (room) {
        room.players = room.players.filter(id => id !== socketId);
        if (room.players.length === 0) {
            rooms.delete(player.roomId);
        } else {
            room.status = 'waiting';
            room.currentTurn = null;
            // Notify remaining player
            io.to(room.players[0]).emit('opponentLeft', { message: 'Opponent left the game' });
        }
    }
    players.delete(socketId);
}

// Process move and update game state
function processMove(room, player, row, col) {
    const playerIndex = room.players.indexOf(player.socketId);
    const opponentIndex = playerIndex === 0 ? 1 : 0;

    // Get opponent's board
    const opponentBoard = playerIndex === 0 ? room.gameState.board2 : room.gameState.board1;

    // Check if already shot
    if (opponentBoard[row][col] === 2 || opponentBoard[row][col] === 3) {
        return { hit: false, error: 'Already shot there' };
    }

    let hit = false;
    let shipDestroyed = false;

    // Check for hit
    if (opponentBoard[row][col] === 1) {
        opponentBoard[row][col] = 2;
        hit = true;

        // Update hit counter
        if (playerIndex === 0) {
            room.gameState.hits1++;
        } else {
            room.gameState.hits2++;
        }

        // Check if ship is destroyed (simplified - all connected cells)
        shipDestroyed = checkShipDestroyed(opponentBoard, row, col);
    } else {
        opponentBoard[row][col] = 3;
        hit = false;
    }

    return { hit, shipDestroyed, error: null };
}

// Check if ship is completely destroyed
function checkShipDestroyed(board, hitRow, hitCol) {
    // Find all connected ship cells
    const shipCells = [];
    const queue = [{ row: hitRow, col: hitCol }];
    const visited = new Set();

    while (queue.length > 0) {
        const { row, col } = queue.shift();
        const key = `${row},${col}`;

        if (visited.has(key)) continue;
        if (row < 0 || row >= 10 || col < 0 || col >= 10) continue;
        if (board[row][col] !== 1 && board[row][col] !== 2) continue;

        visited.add(key);
        shipCells.push({ row, col });

        // Check neighbors
        queue.push({ row: row - 1, col }); // up
        queue.push({ row: row + 1, col }); // down
        queue.push({ row, col: col - 1 }); // left
        queue.push({ row, col: col + 1 }); // right
    }

    // Check if all ship cells are hit (value === 2)
    return shipCells.every(cell => board[cell.row][cell.col] === 2);
}

// Check if game is over
function checkGameOver(room) {
    if (room.gameState.hits1 >= room.gameState.totalShipCells) {
        return { gameOver: true, winner: room.players[0] };
    }
    if (room.gameState.hits2 >= room.gameState.totalShipCells) {
        return { gameOver: true, winner: room.players[1] };
    }
    return { gameOver: false, winner: null };
}

// ============================================
// SOCKET.IO PROCESSORS
// ============================================

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initialize player data
    players.set(socket.id, {
        socketId: socket.id,
        nickname: null,
        roomId: null
    });

    // ========================================
    // CREATE ROOM
    // ========================================
    socket.on('createRoom', (data, callback) => {
        const { nickname } = data;
        const roomId = generateRoomId();

        // Update player info
        players.set(socket.id, {
            socketId: socket.id,
            nickname: nickname || 'Player_' + socket.id.slice(0, 4),
            roomId: roomId
        });

        // Create room and join
        createRoom(roomId, socket.id);
        socket.join(roomId);

        console.log(`Room created: ${roomId} by ${nickname}`);

        callback({
            success: true,
            roomId: roomId,
            message: 'Room created successfully'
        });

        // Notify player they are waiting
        socket.emit('waitingForOpponent', {
            roomId: roomId,
            message: 'Waiting for opponent to join...'
        });
    });

    // ========================================
    // JOIN ROOM
    // ========================================
    socket.on('joinRoom', (data, callback) => {
        const { roomId, nickname } = data;

        const room = getRoom(roomId);

        if (!room) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        if (room.players.length >= 2) {
            callback({ success: false, message: 'Room is full' });
            return;
        }

        if (room.status !== 'waiting') {
            callback({ success: false, message: 'Game already in progress' });
            return;
        }

        // Join room
        const success = joinRoom(roomId, socket.id);

        if (success) {
            players.set(socket.id, {
                socketId: socket.id,
                nickname: nickname || 'Player_' + socket.id.slice(0, 4),
                roomId: roomId
            });

            socket.join(roomId);

            console.log(`Player ${nickname} joined room ${roomId}`);

            callback({
                success: true,
                roomId: roomId,
                message: 'Joined room successfully'
            });

            // Notify both players that game is ready
            const roomPlayers = getRoom(roomId).players;
            io.to(roomId).emit('gameReady', {
                players: roomPlayers.map(id => ({
                    id: id,
                    nickname: players.get(id).nickname
                })),
                message: 'Both players are ready! Start placing ships.'
            });
        } else {
            callback({ success: false, message: 'Failed to join room' });
        }
    });

    // ========================================
    // PLAYER READY (after placing ships)
    // ========================================

    // server.js - полностью перепиши обработчик playerReady
    socket.on('playerReady', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        room.readyStatus[socket.id] = true;
        console.log(`Player ${socket.id} is ready. Status:`, room.readyStatus);
        console.log(`Room players:`, room.players);
        console.log(`Ready status:`, room.readyStatus);

        const allReady = room.players.length === 2 &&
            room.players.every(id => room.readyStatus[id] === true);

        if (allReady) {
            room.status = 'playing';
            room.currentTurn = room.players[0]; // Player 1 starts

            console.log(`Room ${player.roomId} - both players ready! Battle starts!`);
            console.log(`Current turn set to: ${room.currentTurn}`);
            console.log(`Sending to players: ${room.players[0]} and ${room.players[1]}`);

            // Send to BOTH players with currentTurn
            io.to(player.roomId).emit('startBattle', {
                currentTurn: room.currentTurn,
                message: 'Both players are ready! Battle begins!'
            });
        }
    });
    // ========================================
    // MAKE MOVE
    // ========================================
    socket.on('makeMove', (data, callback) => {
        const { roomId, row, col } = data;
        const room = rooms.get(roomId);
        const player = players.get(socket.id);

        if (!room || !player) {
            if (callback) callback({ success: false, error: 'Room or player not found' });
            return;
        }

        // Check if game is playing
        if (room.status !== 'playing') {
            if (callback) callback({ success: false, error: 'Game not in progress' });
            return;
        }

        // Check if it's this player's turn
        if (room.currentTurn !== socket.id) {
            if (callback) callback({ success: false, error: 'Not your turn!' });
            return;
        }

        // Process the move
        const moveResult = processMove(room, player, row, col);

        if (moveResult.error) {
            if (callback) callback({ success: false, error: moveResult.error });
            return;
        }

        // Check for game over
        const gameOverResult = checkGameOver(room);
        const opponentId = room.players.find(id => id !== socket.id);

        // Switch turn (if miss and game not over)
        let newTurn = room.currentTurn;
        if (!moveResult.hit && !gameOverResult.gameOver) {
            newTurn = opponentId;
        }
        room.currentTurn = newTurn;

        // Prepare result for clients
        const result = {
            success: true,
            playerId: socket.id,
            row: row,
            col: col,
            hit: moveResult.hit,
            shipDestroyed: moveResult.shipDestroyed,
            currentTurn: room.currentTurn,
            gameOver: gameOverResult.gameOver,
            winner: gameOverResult.winner
        };

        // Send result to both players
        io.to(roomId).emit('moveResult', result);

        console.log(`Move in room ${roomId}: Player ${socket.id} ${moveResult.hit ? 'HIT' : 'MISS'} at (${row},${col})`);

        if (gameOverResult.gameOver) {
            room.status = 'finished';
            console.log(`Game over in room ${roomId}! Winner: ${gameOverResult.winner}`);
        }

        if (callback) callback({ success: true });
    });

    // ========================================
    // UPDATE SHIPS (send ship placement to opponent)
    // ========================================
    socket.on('updateShips', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        const playerIndex = room.players.indexOf(socket.id);

        // Store ships on server
        if (playerIndex === 0) {
            room.gameState.board1 = data.boardData;
        } else {
            room.gameState.board2 = data.boardData;
        }

        console.log(`Player ${socket.id} sent ship placement data`);
    });

    // ========================================
    // GET LIST OF AVAILABLE ROOMS
    // ========================================
    socket.on('getRooms', (callback) => {
        const availableRooms = [];
        for (const [roomId, room] of rooms) {
            if (room.status === 'waiting' && room.players.length === 1) {
                availableRooms.push({
                    id: roomId,
                    players: room.players.length,
                    status: room.status
                });
            }
        }
        if (typeof callback === 'function') {
            callback(availableRooms);
        }
    });

    // ========================================
    // LEAVE ROOM
    // ========================================
    socket.on('leaveRoom', (callback) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            const roomId = player.roomId;
            leaveRoom(socket.id);
            socket.leave(roomId);

            if (typeof callback === 'function') {
                callback({ success: true, message: 'Left room successfully' });
            }
            socket.emit('roomLeft', { message: 'You left the room' });
        } else {
            if (typeof callback === 'function') {
                callback({ success: false, message: 'Not in a room' });
            }
        }
    });

    // ========================================
    // DISCONNECT
    // ========================================
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        const player = players.get(socket.id);
        if (player && player.roomId) {
            const room = rooms.get(player.roomId);
            if (room) {
                room.players = room.players.filter(id => id !== socket.id);

                if (room.players.length === 0) {
                    rooms.delete(player.roomId);
                    console.log(`Room ${player.roomId} deleted (empty)`);
                } else if (room.players.length === 1) {
                    // Notify remaining player
                    io.to(room.players[0]).emit('opponentLeft', {
                        message: 'Opponent disconnected'
                    });
                    room.status = 'waiting';
                    room.currentTurn = null;
                    room.readyStatus = {};
                    console.log(`Room ${player.roomId} back to waiting (1 player left)`);
                }
            }
        }

        players.delete(socket.id);
        console.log(`Active players: ${players.size}`);
    });
});

// Start server
server.listen(port, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     SEA BATTLE SERVER STARTED          ║
    ╠════════════════════════════════════════╣
    ║  Port: ${port}                            ║
    ║  URL:  http://localhost:${port}          ║
    ╚════════════════════════════════════════╝
    `);
});