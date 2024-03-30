document.addEventListener('DOMContentLoaded', function() { 
    // Setup canvas for both players
    const canvasPlayer1 = document.getElementById('playerCanvas');
    const canvasPlayer2 = document.getElementById('enemyCanvas'); // Now represents player 2's canvas
    const ctxPlayer1 = canvasPlayer1.getContext('2d');
    const ctxPlayer2 = canvasPlayer2.getContext('2d');
    const gridSize = 10;
    const cellSize = canvasPlayer1.width / gridSize; // Assuming both canvases are the same size

    let player1Ships = [];
    let player2Ships = [];
    let player1Attacks = [];
    let player2Attacks = [];
    let player1ShipHits = [];
    let player2ShipHits = [];
    let currentPlayer = 1; 
    let phase = "placement"; // Game phase: placement or attack

    let numberOfShips = 3; // Number of ships each player should place
    let shipToPlace = false; // Flag for whether the player is currently placing ships

    // Initialize the server connection
    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = function(event) {
        console.log("Connection establish");
    };

    socket.onmessage = handleSocketMessage; 

    socket.onclose = function(event) {
        console.log("Connection closed");
    };

    function handleSocketMessage(event) { // function to handle message from server
        if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = function() {
                try {
                    const message = JSON.parse(reader.result);
                    processSocketMessage(message);
                } catch (e) {
                    console.error("Error parsing Blob message as JSON:", e);
                }
            };
            reader.readAsText(event.data);
        } else { // handle the non-Blob messages 
            try {
                const message = JSON.parse(event.data);
                processSocketMessage(message);
            } catch (e) {
                console.error("Error parsing message as JSON:", e);
            }
        }
    }

    function processSocketMessage(message) { // function to process the moves from the users
        switch (message.type) {
            case "place_ship":
                if (message.player !== currentPlayer) {
                    const opponentShips = currentPlayer === 1 ? player2Ships : player1Ships;
                    opponentShips.push(message.coordinates);
                    
                    
                    const ctx = currentPlayer === 1 ? ctxPlayer2 : ctxPlayer1;
                    drawBoard(ctx, opponentShips, currentPlayer === 1 ? player2Attacks : player1Attacks, phase === 'placement');
                }
                break;
            case "player_number":
                currentPlayer = message.playerNumber; 
                console.log(`You are Player ${currentPlayer}`);
                break;
            case "start_game":
                console.log('Game started');
                break;
        }
    }
    
    

    // function to switch from ship placement to attacking phase
    function switchToAttackPhase() {
        phase = "attack";
        drawBoard(ctxPlayer1, player1Ships, player1Attacks, false); // Hide player 1 ships
        drawBoard(ctxPlayer2, player2Ships, player2Attacks, false); // Hide player 2 ships

        canvasPlayer1.style.display = "block";
        canvasPlayer2.style.display = "block";
        canvasPlayer1.style.opacity = "1";
        canvasPlayer2.style.opacity = "1";
        updateGameMessage("All ships placed, player 1 starts attacking!");
        updateUI();
    }
    // function to switch turns between players
    function switchTurns() {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateUI();

        if (currentPlayer == 1) {
            updateGameMessage("Player 2's turn");
        } else {
            updateGameMessage("Player 1's turn");
        }
    }

    // Update UI based on the turn and phase
    function updateUI() {
        if (phase === "attack") {
            pickUpShipButton.style.display = "none";
        }
    }
    // logic for picking up ship
    var pickUpShipButton = document.getElementById('shipToPlace');
    pickUpShipButton.addEventListener('click', function() {
        if (phase !== "placement") return;

        if ((currentPlayer === 1 && player1Ships.length < numberOfShips) || 
            (currentPlayer === 2 && player2Ships.length < numberOfShips)) {
            shipToPlace = !shipToPlace; // Toggle ship placement flag
            this.textContent = shipToPlace ? 'Cancel Ship Placement' : 'Pick Up Ship';
            this.classList.toggle('btn-warning');
            this.classList.toggle('btn-secondary');
        }
    });
    // new game button
    var newGameButton = document.getElementById('newGame'); 
    newGameButton.addEventListener('click', function() {
        location.reload(); 
    });
    // function to draw new board
    function drawBoard(ctx, ships, attacks, showShips) {
        ctx.clearRect(0, 0, canvasPlayer1.width, canvasPlayer1.height);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }
        // Draw attacks
        attacks.forEach(function(attack) {
            const hit = ships.some(ship => ship[0] === attack[0] && ship[1] === attack[1]);
            ctx.fillStyle = hit ? 'red' : 'white';
            ctx.beginPath();
            ctx.arc(attack[0] * cellSize + cellSize / 2, attack[1] * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI); // draw a circle where user attacks
            ctx.fill();
        });
    }

    // Event listener for ship placement
    function placeShip(event) {
        if (!shipToPlace || phase !== "placement") return;
    
        const rect = currentPlayer === 1 ? canvasPlayer1.getBoundingClientRect() : canvasPlayer2.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        const currentShips = currentPlayer === 1 ? player1Ships : player2Ships;
    
        if (currentShips.some(ship => ship[0] === gridX && ship[1] === gridY)) {
            alert("You already placed a ship here!");
            return;
        }
    
        currentShips.push([gridX, gridY]);
        drawBoard(currentPlayer === 1 ? ctxPlayer1 : ctxPlayer2, currentShips, currentPlayer === 1 ? player1Attacks : player2Attacks);
    
        // ship placement logic
        pickUpShipButton.textContent = 'Pick Up Ship'; // Reset the button text if needed
        pickUpShipButton.classList.remove('btn-warning');
        pickUpShipButton.classList.add('btn-secondary');
        shipToPlace = false; // Disable ship placement mode
    
        if (currentShips.length === numberOfShips && currentPlayer === 2) {
            // If both players have finished placing ships then switch to attack phase
            switchToAttackPhase();
        } else if (currentShips.length === numberOfShips) {
            // Switch turns if the current player finished placing ships
            switchTurns();
        }
    }
    

    // function for attacking
    function handleAttack(event) {
        if (phase !== "attack") return;
    
        const attackingCanvas = currentPlayer === 1 ? canvasPlayer2 : canvasPlayer1;
        const rect = attackingCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        const currentAttacks = currentPlayer === 1 ? player1Attacks : player2Attacks;
        const opponentShips = currentPlayer === 1 ? player2Ships : player1Ships;
        const opponentShipHits = currentPlayer === 1 ? player1ShipHits : player2ShipHits;
    
        if (currentAttacks.some(attack => attack[0] === gridX && attack[1] === gridY)) {
            alert("You already attacked this square!");
            return;
        }
    
        currentAttacks.push([gridX, gridY]);
    
        // check if the attack hits any of the opponent's ships
        const hit = opponentShips.some(ship => ship[0] === gridX && ship[1] === gridY);
        if (hit) {
            opponentShipHits.push([gridX, gridY]); 
            if (opponentShipHits.length === numberOfShips) {
                document.getElementById("gameStatus").textContent = `Game over! Player ${currentPlayer} wins by sinking all ships!`;
                gameOver = true;
                return;
            }
        }
        drawBoard(currentPlayer === 1 ? ctxPlayer2 : ctxPlayer1, opponentShips, currentAttacks, phase === 'placement');
        switchTurns();
    }
    // listener for player1 placement
    canvasPlayer1.addEventListener('click', function(event) {
        if (phase === "placement" && currentPlayer === 1) {
            placeShip(event);
        }
    });
    // listener for player 2 placement
    canvasPlayer2.addEventListener('click', function(event) {
        if (phase === "placement" && currentPlayer === 2) {
            placeShip(event);
        } else if (phase === "attack" && currentPlayer === 1) {
            handleAttack(event);
        }
    });
    // listener for player 1
    canvasPlayer1.addEventListener('click', function(event) {
        if (phase === "attack" && currentPlayer === 2) {
            handleAttack(event);
        }
    });

    // function to update the game message info
    function updateGameMessage(message) {
        const gameMessage = document.getElementById("gameMessage");
        gameMessage.textContent = message;
    }

    // Initialize the game
    function initGame() {
        drawBoard(ctxPlayer1, player1Ships, player1Attacks);
        drawBoard(ctxPlayer2, player2Ships, player2Attacks);
    }

    initGame();
    updateGameMessage("Player 2 starts by placing their ships."); // Initial message
});