const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const { connect } = require('http2');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const connectedUsers = [];

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', socket => {
  console.log('A user has connected');
	connectedUsers.push(socket.id);
	socket.emit('setCanvas', canvasWidth, canvasHeight);

	if (connectedUsers.length < 2) {
		socket.emit('notifyWaiting');
	}

	if (connectedUsers.length == 2) {
    initializeObjects();
		io.emit('notifyStart');
		setTimeout(startGame, 3000);
  }
  
  if (connectedUsers.length > 2) {
    socket.emit('tooManyUsers');      // snake game cannot have more than 2 players
  }

	socket.on('keyPress', key => {
		console.log(key);
		if (connectedUsers.indexOf(socket.id) == 0) {
			snakeOneDirection = handleKeydown(key, snakeOneDirection);
		} else if (connectedUsers.indexOf(socket.id) == 1) {
			snakeTwoDirection = handleKeydown(key, snakeTwoDirection);
		}

		console.log(connectedUsers.indexOf(socket.id)); //maybe just use socket instead of socket.id
	});

	socket.on('startOver', () => {
    initializeObjects();
    io.emit('reset');
		io.emit('notifyStart');
		setTimeout(startGame, 3000);
	});

	socket.on('disconnect', () => {
		var i = connectedUsers.indexOf(socket.id);
		connectedUsers.splice(i, 1);
		console.log('A user has disconnected');
	});
});
const PORT = process.env.PORT || 3000;
server.listen(PORT);
console.log('listening on port');

app.use(express.static('public'));

const boxSize = 16; // snake and food box size

const canvasWidth = 1000;
const canvasHeight = 600;

const frameRate = 240;

const direction = {
	UP: 'up',
	DOWN: 'down',
	LEFT: 'left',
	RIGHT: 'right',
};

let snakeOneDirection = null; 
let snakeTwoDirection = null; 
let snakeOnePositions = null;       // initializing values in global scope
let snakeTwoPositions = null;     
let foodPosition = null;

function initializeObjects() {
  snakeOneDirection = direction.RIGHT; // snakeOne spawns in top left corner so it should always start moving right
  snakeTwoDirection = direction.LEFT; // snakeTwo spawns in bottom right corner so it should always start moving left

  snakeOnePositions = [
    [2 * (boxSize + 1), 0], // first element is "head" of the snake
    [boxSize + 1, 0],
    [0, 0], // spawn in top left corner
  ];
  
  snakeTwoPositions = [
    [canvasWidth - (3 * boxSize + 2), canvasHeight - boxSize], // first element is "head" of the snake
    [canvasWidth - (2 * boxSize + 1), canvasHeight - boxSize],
    [canvasWidth - boxSize, canvasHeight - boxSize], // spawn in bottom right corner
  ];
  
  foodPosition = [
    Math.floor(Math.random() * Math.floor(canvasWidth - boxSize)),
    Math.floor(Math.random() * Math.floor(canvasHeight - boxSize)),
  ]; // random food position
}

let lastWinner = null; // the winner of the last game

let snakeOneName = 'Player 1';
let snakeTwoName = 'Player 2';

function handleKeydown(key, snakeDirection) {
	switch (key) {
		case 'ArrowUp':
			if (snakeDirection != direction.DOWN) {
				snakeDirection = direction.UP;
			}
			break;
		case 'ArrowDown':
			if (snakeDirection != direction.UP) {
				snakeDirection = direction.DOWN;
			}
			break;
		case 'ArrowLeft':
			if (snakeDirection != direction.RIGHT) {
				snakeDirection = direction.LEFT;
			}
			break;
		case 'ArrowRight':
			if (snakeDirection != direction.LEFT) {
				snakeDirection = direction.RIGHT;
			}
			break;
		default:
		//Do nothing when arrows keys are not pressed
	}
	return snakeDirection;
}

function updateSnakePositions(snakePositions, snakeDirection, ateFood) {
	let newPositions = [];
	for (let i = snakePositions.length - 1; i > 0; i--) {
		newPositions.push(snakePositions[i - 1]); // update position of all "trailing boxes"
	}
	switch (snakeDirection) {
		case direction.UP:
			newPositions.push([
				snakePositions[0][0],
				snakePositions[0][1] - (boxSize + 1),
			]);
			break;
		case direction.DOWN:
			newPositions.push([
				snakePositions[0][0],
				snakePositions[0][1] + (boxSize + 1),
			]);
			break; // update position of first box (snake head)
		case direction.LEFT:
			newPositions.push([
				snakePositions[0][0] - (boxSize + 1),
				snakePositions[0][1],
			]);
			break;
		case direction.RIGHT:
			newPositions.push([
				snakePositions[0][0] + (boxSize + 1),
				snakePositions[0][1],
			]);
	}
	newPositions = newPositions.reverse(); // the head must be first element of list, but it was pushed to newPositions last so return reverse
	if (ateFood) {
		newPositions.push([
			snakePositions[snakePositions.length - 1][0],
			snakePositions[snakePositions.length - 1][1],
		]);
	}
	return newPositions;
}

function AteFood(snakePositions) {
	if (touchingBoxes(foodPosition, snakePositions[0])) {
		foodPosition = [
			Math.floor(Math.random() * Math.floor(canvasWidth - boxSize)),
			Math.floor(Math.random() * Math.floor(canvasHeight - boxSize)),
		];
		return true;
	}
	return false;
}

function touchingBoxes(boxOne, boxTwo) {
	let xDistance = boxOne[0] - boxTwo[0]; // helper function to check if 2 boxes are touching
	let yDistance = boxOne[1] - boxTwo[1];
	return Math.abs(xDistance) <= boxSize && Math.abs(yDistance) <= boxSize;
}

function startGame() {
	var gameLoop = setInterval(() => {
		// game loop
		io.emit(
			'drawObjects',
			boxSize,
			snakeOnePositions, // client draws game objects
			snakeTwoPositions,
			foodPosition
		);
		if (gameOver()) {
			// check if game should end
			clearInterval(gameLoop);
			io.emit('gameOver', lastWinner);
		} else {
			snakeOnePositions = updateSnakePositions(
				snakeOnePositions, // update object positions if game does not end
				snakeOneDirection,
				AteFood(snakeOnePositions)
			);
			snakeTwoPositions = updateSnakePositions(
				snakeTwoPositions,
				snakeTwoDirection,
				AteFood(snakeTwoPositions)
			);
		}
	}, 1000 / frameRate); // frameRate = frames/second
}

function gameOver() {
	//gameOver for both snakes
	const outOfBounds = coordinates =>
		coordinates[0] > canvasWidth ||
		coordinates[0] < 0 ||
		coordinates[1] > canvasHeight ||
		coordinates[1] < 0;

	const touchSnakeHeadOne = position =>
		touchingBoxes(position, snakeOnePositions[0]);
	const touchSnakeHeadTwo = position =>
		touchingBoxes(position, snakeTwoPositions[0]);

	if (
		snakeOnePositions.slice(1).some(touchSnakeHeadOne) ||
		snakeTwoPositions.slice(1).some(touchSnakeHeadOne) ||
		snakeOnePositions.some(outOfBounds)
	) {
		// snakeOne loses since it hit its tail or it hit snakeTwo's tail or it went out of bounds
		lastWinner = snakeTwoName;
		return true;
	}
	if (
		snakeTwoPositions.slice(1).some(touchSnakeHeadTwo) || //snakePositions.slice(1) is a list of snake box positions excluding the head
		snakeOnePositions.slice(1).some(touchSnakeHeadTwo) ||
		snakeTwoPositions.some(outOfBounds)
	) {
		// snakeTwo loses since it hit its tail or it hit snakeOne's tail or it went out of bounds
		lastWinner = snakeOneName;
		return true;
	}
	if (touchingBoxes(snakeOnePositions[0], snakeTwoPositions[0])) {
		// snake heads hit each other, pick random winner
		let rand = Math.floor(Math.random());
		if (rand < 0.5) {
			lastWinner = snakeOneName;
		} else {
			lastWinner = snakeTwoName;
		}
		return true;
	}
	return false;
}
