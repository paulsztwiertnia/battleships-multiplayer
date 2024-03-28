const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));

let players = [];

function broadcast(data) {
    players.forEach((player) => {
        if (player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', function connection(ws) {
    if (players.length >= 2) {
        console.log('New player attempted to connect, but the game is full.');
        ws.close(1000, 'Game full');
        return;
    }

    players.push(ws);
    console.log(`Player ${players.length} connected to the game.`);

    // Assign player number upon connection
    ws.send(JSON.stringify({ type: "player_number", playerNumber: players.length }));

    if (players.length === 2) {
        broadcast({ type: "start_game" });
        console.log('Game starting with 2 players.');
    }

    ws.on('message', function incoming(message) {
        console.log('Message received: %s', message);
        // Broadcast the message to the other player
        players.forEach(function each(player) {
            if (player !== ws && player.readyState === WebSocket.OPEN) {
                player.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Player disconnected');
        // Notify the other player that their opponent has left
        broadcast({ type: "player_left" });
        players = players.filter(p => p !== ws); // Remove disconnected player
        // Optionally, handle game restart or waiting for a new player
    });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


