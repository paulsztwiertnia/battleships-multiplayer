const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const bin = http.createServer(app);
const wss = new WebSocket.Server({ server: bin });

let players = []

wss.on('connection', function connection(ws) {
    if (players.length < 2 ) {
        players.push(ws);
        console.log(`Players ${players.length} connected to game`);
        if (players.length == 2 ) {
            players.forEach((player, index) => {
                player.send(JSON.stringify({type: "player_number", playerNumber: index + 1}));
            });
        }
    } else {
        ws.close();
    }

    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        players.forEach(function each(player) {
          if (player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(message);
          }
        });
    });
    ws.on('close', function() {
        console.log('Player disconnected');
        players = players.filter(p => p !== ws); // Remove disconnected player
      });
});

const PORT = 3000;
bin.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
