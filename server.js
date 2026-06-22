// =============================================================
// SERVER MODULE - BATTLE SHIP SERVER
// =============================================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("morgan");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8002;

// --- Middleware ---
app.use(cookieParser());
app.use(logger("dev"));
app.use(express.static("public"));
app.use("/unit", express.static("user"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// --- Storage ---
const rooms = new Map();
const players = new Map();

// --- Helpers ---
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoom(roomId) {
    return rooms.get(roomId);
}

function createRoom(roomId, hostSocketId) {
    const room = {
        id: roomId,
        players: [hostSocketId],
        status: "waiting",
        readyStatus: {},
        currentTurn: null,
        gameState: {
            board1: Array(10).fill().map(() => Array(10).fill(0)),
            board2: Array(10).fill().map(() => Array(10).fill(0)),
            hits1: 0,
            hits2: 0,
            totalShipCells: 20,
        },
        createdAt: Date.now(),
    };
    rooms.set(roomId, room);
    return room;
}

function deleteRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach((playerId) => {
        if (players.has(playerId)) {
            players.delete(playerId);
        }
        const playerSocket = io.sockets.sockets.get(playerId);
        if (playerSocket) {
            playerSocket.leave(roomId);
        }
    });

    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted with cleanup`);
}

function clearPlayerData(socketId) {
    if (players.has(socketId)) {
        const oldPlayer = players.get(socketId);
        if (oldPlayer && oldPlayer.roomId) {
            const oldRoom = rooms.get(oldPlayer.roomId);
            if (oldRoom) {
                oldRoom.players = oldRoom.players.filter((id) => id !== socketId);
                if (oldRoom.players.length === 0) {
                    const roomToDelete = rooms.get(oldPlayer.roomId);
                    if (roomToDelete) {
                        roomToDelete.players.forEach((id) => {
                            if (players.has(id)) {
                                players.delete(id);
                            }
                        });
                    }
                    rooms.delete(oldPlayer.roomId);
                }
            }
        }
        players.delete(socketId);
        console.log(`Player ${socketId} completely cleared`);
    }
}

function joinRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2 && room.status === "waiting") {
        room.players.push(socketId);
        if (room.players.length === 2) {
            room.status = "ready";
            room.currentTurn = null;
            room.readyStatus = {
                [room.players[0]]: false,
                [room.players[1]]: false,
            };
            room.gameState = {
                board1: Array(10).fill().map(() => Array(10).fill(0)),
                board2: Array(10).fill().map(() => Array(10).fill(0)),
                hits1: 0,
                hits2: 0,
                totalShipCells: 20,
            };
        }
        return true;
    }
    return false;
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

    const allHit = shipCells.length > 0 && shipCells.every((cell) => board[cell.row][cell.col] === 2);
    return { destroyed: allHit, cells: shipCells };
}

function processMove(room, player, row, col) {
    const playerIndex = room.players.indexOf(player.socketId);
    const opponentBoard = playerIndex === 0 ? room.gameState.board2 : room.gameState.board1;

    if (opponentBoard[row][col] === 2 || opponentBoard[row][col] === 3) {
        return { hit: false, error: "Already shot there", shipDestroyed: false, destroyedCells: [] };
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

// =============================================================
// SOCKET HANDLERS
// =============================================================

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // --- CREATE ROOM ---
    socket.on("createRoom", (data, callback) => {
        const { nickname } = data;
        const roomId = generateRoomId();

        clearPlayerData(socket.id);

        players.set(socket.id, {
            socketId: socket.id,
            nickname: nickname || "Player_" + socket.id.slice(0, 4),
            roomId: roomId,
        });

        createRoom(roomId, socket.id);
        socket.join(roomId);

        callback({
            success: true,
            roomId: roomId,
            message: "Room created successfully",
        });

        socket.emit("waitingForOpponent", {
            roomId: roomId,
            message: "Waiting for opponent to join...",
        });
    });

    // --- JOIN ROOM ---
    socket.on("joinRoom", (data, callback) => {
        const { roomId, nickname } = data;
        const room = getRoom(roomId);

        if (!room) {
            callback({ success: false, message: "Room not found" });
            return;
        }
        if (room.players.length >= 2) {
            callback({ success: false, message: "Room is full" });
            return;
        }
        if (room.status !== "waiting") {
            callback({ success: false, message: "Game already in progress" });
            return;
        }

        clearPlayerData(socket.id);

        players.set(socket.id, {
            socketId: socket.id,
            nickname: nickname || "Player_" + socket.id.slice(0, 4),
            roomId: roomId,
        });

        const success = joinRoom(roomId, socket.id);

        if (success) {
            socket.join(roomId);

            callback({
                success: true,
                roomId: roomId,
                message: "Joined room successfully",
            });

            const roomPlayers = getRoom(roomId).players;
            io.to(roomId).emit("gameReady", {
                players: roomPlayers.map((id) => ({
                    id: id,
                    nickname: players.get(id).nickname,
                })),
                message: "Both players are ready! Start placing ships.",
            });
        } else {
            callback({ success: false, message: "Failed to join room" });
        }
    });

    // --- PLAYER READY ---
    socket.on("playerReady", () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        room.readyStatus[socket.id] = true;

        const allReady = room.players.length === 2 &&
            room.players.every((id) => room.readyStatus[id] === true);

        if (allReady) {
            room.status = "playing";
            room.currentTurn = room.players[0];

            io.to(player.roomId).emit("startBattle", {
                currentTurn: room.currentTurn,
                message: "Both players are ready! Battle begins!",
            });
        }
    });

    // --- MAKE MOVE ---
    socket.on("makeMove", (data, callback) => {
        const { roomId, row, col } = data;
        const room = rooms.get(roomId);
        const player = players.get(socket.id);

        if (!room || !player) {
            if (callback) callback({ success: false, error: "Room or player not found" });
            return;
        }
        if (room.status !== "playing") {
            if (callback) callback({ success: false, error: "Game not in progress" });
            return;
        }
        if (room.currentTurn !== socket.id) {
            if (callback) callback({ success: false, error: "Not your turn!" });
            return;
        }

        const moveResult = processMove(room, player, row, col);
        if (moveResult.error) {
            if (callback) callback({ success: false, error: moveResult.error });
            return;
        }

        const gameOverResult = checkGameOver(room);
        const opponentId = room.players.find((id) => id !== socket.id);

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
            winner: gameOverResult.winner,
        };

        io.to(roomId).emit("moveResult", result);

        if (gameOverResult.gameOver) {
            room.status = "finished";
            setTimeout(() => {
                if (rooms.has(roomId)) {
                    deleteRoom(roomId);
                }
            }, 5000);
        }

        if (callback) callback({ success: true });
    });

    // --- UPDATE SHIPS ---
    socket.on("updateShips", (data) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex === -1) return;

        if (playerIndex === 0) {
            room.gameState.board1 = data.boardData;
        } else {
            room.gameState.board2 = data.boardData;
        }
    });

    // --- GET ROOMS ---
    socket.on("getRooms", (callback) => {
        const availableRooms = [];
        for (const [roomId, room] of rooms) {
            if (room.status === "waiting" && room.players.length === 1) {
                availableRooms.push({
                    id: roomId,
                    players: room.players.length,
                    status: room.status,
                });
            }
        }
        if (typeof callback === "function") {
            callback(availableRooms);
        }
    });

    // --- LEAVE ROOM ---
    socket.on("leaveRoom", (callback) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            const roomId = player.roomId;
            const room = rooms.get(roomId);

            if (room) {
                room.players = room.players.filter((id) => id !== socket.id);
                socket.leave(roomId);

                if (room.players.length === 0 || room.status === "finished") {
                    if (rooms.has(roomId)) {
                        const roomToDelete = rooms.get(roomId);
                        if (roomToDelete) {
                            roomToDelete.players.forEach((id) => {
                                if (players.has(id)) {
                                    players.delete(id);
                                }
                            });
                        }
                        rooms.delete(roomId);
                    }
                } else {
                    room.status = "waiting";
                    room.currentTurn = null;
                    room.readyStatus = {};
                    players.delete(socket.id);
                    io.to(room.players[0]).emit("opponentLeft", {
                        message: "Opponent left the game",
                    });
                }
            } else {
                players.delete(socket.id);
            }

            if (typeof callback === "function") {
                callback({ success: true, message: "Left room successfully" });
            }
            socket.emit("roomLeft", { message: "You left the room" });
        } else {
            players.delete(socket.id);
            if (typeof callback === "function") {
                callback({ success: false, message: "Not in a room" });
            }
        }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        const player = players.get(socket.id);
        if (player && player.roomId) {
            const room = rooms.get(player.roomId);
            if (room) {
                room.players = room.players.filter((id) => id !== socket.id);
                if (room.players.length === 0) {
                    deleteRoom(player.roomId);
                } else {
                    io.to(room.players[0]).emit("opponentLeft", {
                        message: "Opponent disconnected",
                    });
                    room.status = "waiting";
                    room.currentTurn = null;
                    room.readyStatus = {};
                    players.delete(socket.id);
                }
            } else {
                players.delete(socket.id);
            }
        } else {
            players.delete(socket.id);
        }
    });
});

server.listen(port, () => {
    console.log(`Sea Battle Server running on port ${port}`);
});
