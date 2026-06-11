// Use require for all (no import)
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

const rooms = new Map(); // roomId -> { players: [], gameState: {...} }
const players = new Map(); // socketId -> { nickname, roomId }

// Create new room
function createRoom(roomId, hostSocketId) {
    const room = {
        id: roomId,
        players: [hostSocketId],
        status: 'waiting',
        currentTurn: null,
        gameState: null,
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
            // Notify remaining player
            io.to(room.players[0]).emit('opponentLeft', { message: 'Opponent left the game' });
        }
    }
    players.delete(socketId);
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
    // START GAME (after ship placement)
    // ========================================
    socket.on('startGame', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = getRoom(player.roomId);
        if (room && room.status === 'ready') {
            room.status = 'playing';
            room.currentTurn = room.players[0];

            io.to(player.roomId).emit('gameStarted', {
                currentTurn: room.currentTurn,
                message: 'Game started! Place your ships.'
            });
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
    console.log(`Server running on http://localhost:${port}`);
});