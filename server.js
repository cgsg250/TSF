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

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoom(roomId) {
    return rooms.get(roomId);
}

app.use(cookieParser());
app.use(logger("dev"));
app.use(express.static('public'));
app.use('/unit', express.static('user'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const rooms = new Map();
const players = new Map();

function createRoom(roomId, hostSocketId) {
    const room = {
        id: roomId,
        players: [hostSocketId],
        status: 'waiting',
        readyStatus: {},
        currentTurn: null,
        gameState: {
            board1: Array(10).fill().map(() => Array(10).fill(0)),
            board2: Array(10).fill().map(() => Array(10).fill(0)),
            hits1: 0,
            hits2: 0,
            totalShipCells: 20
        },
        createdAt: Date.now()
    };
    rooms.set(roomId, room);
    return room;
}

function joinRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2 && room.status === 'waiting') {
        room.players.push(socketId);
        if (room.players.length === 2) {
            room.status = 'ready';
            room.readyStatus = {
                [room.players[0]]: false,
                [room.players[1]]: false
            };
            console.log(`Room ${roomId} is now ready. Players:`, room.players);
        }
        return true;
    }
    return false;
}

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
            io.to(room.players[0]).emit('opponentLeft', { message: 'Opponent left the game' });
        }
    }
    players.delete(socketId);
}

function checkShipDestroyed(board, hitRow, hitCol) {
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
        
        queue.push({ row: row - 1, col });
        queue.push({ row: row + 1, col });
        queue.push({ row, col: col - 1 });
        queue.push({ row, col: col + 1 });
    }
    
    const allHit = shipCells.length > 0 && shipCells.every(cell => board[cell.row][cell.col] === 2);
    
    return { destroyed: allHit, cells: shipCells };
}

function processMove(room, player, row, col) {
    const playerIndex = room.players.indexOf(player.socketId);
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    
    const opponentBoard = playerIndex === 0 ? room.gameState.board2 : room.gameState.board1;
    
    if (opponentBoard[row][col] === 2 || opponentBoard[row][col] === 3) {
        return { hit: false, error: 'Already shot there', shipDestroyed: false, destroyedCells: [] };
    }
    
    let hit = false;
    let shipDestroyed = false;
    let destroyedCells = [];
    
    if (opponentBoard[row][col] === 1) {
        opponentBoard[row][col] = 2;
        hit = true;
        
        if (playerIndex === 0) {
            room.gameState.hits1++;
        } else {
            room.gameState.hits2++;
        }
        
        const shipCheck = checkShipDestroyed(opponentBoard, row, col);
        shipDestroyed = shipCheck.destroyed;
        destroyedCells = shipCheck.cells;
        
        console.log(`HIT at (${row},${col})! Ship destroyed: ${shipDestroyed}`);
    } else {
        opponentBoard[row][col] = 3;
        hit = false;
        console.log(`MISS at (${row},${col})`);
    }
    
    return { hit, error: null, shipDestroyed, destroyedCells };
}

function checkGameOver(room) {
    if (room.gameState.hits1 >= room.gameState.totalShipCells) {
        return { gameOver: true, winner: room.players[0] };
    }
    if (room.gameState.hits2 >= room.gameState.totalShipCells) {
        return { gameOver: true, winner: room.players[1] };
    }
    return { gameOver: false, winner: null };
}

function countShipCells(boardData) {
    if (!boardData) return 0;
    let count = 0;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (boardData[i][j] === 1) count++;
        }
    }
    return count;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    players.set(socket.id, {
        socketId: socket.id,
        nickname: null,
        roomId: null
    });

    socket.on('createRoom', (data, callback) => {
        const { nickname } = data;
        const roomId = generateRoomId();

        players.set(socket.id, {
            socketId: socket.id,
            nickname: nickname || 'Player_' + socket.id.slice(0, 4),
            roomId: roomId
        });

        createRoom(roomId, socket.id);
        socket.join(roomId);

        console.log(`Room created: ${roomId} by ${nickname}`);

        callback({
            success: true,
            roomId: roomId,
            message: 'Room created successfully'
        });

        socket.emit('waitingForOpponent', {
            roomId: roomId,
            message: 'Waiting for opponent to join...'
        });
    });

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

    socket.on('playerReady', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        room.readyStatus[socket.id] = true;
        console.log(`Player ${socket.id} is ready. Status:`, room.readyStatus);

        const allReady = room.players.length === 2 &&
            room.players.every(id => room.readyStatus[id] === true);

        if (allReady) {
            room.status = 'playing';
            room.currentTurn = room.players[0];

            console.log(`Room ${player.roomId} - both players ready! Battle starts!`);
            console.log(`Current turn set to: ${room.currentTurn}`);

            io.to(player.roomId).emit('startBattle', {
                currentTurn: room.currentTurn,
                message: 'Both players are ready! Battle begins!'
            });
        }
    });

    socket.on('makeMove', (data, callback) => {
        const { roomId, row, col } = data;
        const room = rooms.get(roomId);
        const player = players.get(socket.id);

        if (!room || !player) {
            if (callback) callback({ success: false, error: 'Room or player not found' });
            return;
        }

        if (room.status !== 'playing') {
            if (callback) callback({ success: false, error: 'Game not in progress' });
            return;
        }

        if (room.currentTurn !== socket.id) {
            if (callback) callback({ success: false, error: 'Not your turn!' });
            return;
        }

        const moveResult = processMove(room, player, row, col);

        if (moveResult.error) {
            if (callback) callback({ success: false, error: moveResult.error });
            return;
        }

        const gameOverResult = checkGameOver(room);
        const opponentId = room.players.find(id => id !== socket.id);

        let newTurn = room.currentTurn;
        if (!moveResult.hit && !gameOverResult.gameOver) {
            newTurn = opponentId;
        }
        room.currentTurn = newTurn;

        const result = {
            success: true,
            playerId: socket.id,
            row: row,
            col: col,
            hit: moveResult.hit,
            shipDestroyed: moveResult.shipDestroyed,
            destroyedCells: moveResult.destroyedCells,
            currentTurn: room.currentTurn,
            gameOver: gameOverResult.gameOver,
            winner: gameOverResult.winner
        };

        io.to(roomId).emit('moveResult', result);

        console.log(`Move in room ${roomId}: Player ${socket.id} ${moveResult.hit ? 'HIT' : 'MISS'} at (${row},${col})`);

        if (gameOverResult.gameOver) {
            room.status = 'finished';
            console.log(`Game over in room ${roomId}! Winner: ${gameOverResult.winner}`);
        }

        if (callback) callback({ success: true });
    });

    socket.on('updateShips', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) {
            console.log(`updateShips: Player ${socket.id} not in a room`);
            return;
        }

        const room = rooms.get(player.roomId);
        if (!room) {
            console.log(`updateShips: Room ${player.roomId} not found`);
            return;
        }

        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex === -1) {
            console.log(`updateShips: Player ${socket.id} not in room players list`);
            return;
        }

        console.log(`Received ships from player ${playerIndex} (${socket.id})`);

        if (playerIndex === 0) {
            room.gameState.board1 = data.boardData;
            const shipCount = countShipCells(room.gameState.board1);
            console.log(`Player 1 placed ships, total ship cells: ${shipCount}`);
        } else {
            room.gameState.board2 = data.boardData;
            const shipCount = countShipCells(room.gameState.board2);
            console.log(`Player 2 placed ships, total ship cells: ${shipCount}`);
        }
    });

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

server.listen(port, () => {
    console.log(`
    ========================================
    SEA BATTLE SERVER STARTED
    ========================================
    Port: ${port}
    URL: http://localhost:${port}
    ========================================
    `);
});