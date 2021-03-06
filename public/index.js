var canvas = document.querySelector('#game-area');

var ctx = canvas.getContext('2d');

const snakeOneColor = 'red';
const snakeTwoColor = 'blue';
const textColor = 'yellow';
const foodColor = 'limegreen';

var socket = io({ transports: ['websocket'], upgrade: false }); // forces use of websockets instead of polling connections
// prevents ghost connections/disconnections

function setCanvas(canvasWidth, canvasHeight) {
	canvas.width = canvasWidth; // initialize canvas width and height
	canvas.height = canvasHeight;
}

function drawFood(boxSize, foodPosition) {
	ctx.fillStyle = foodColor; // draw food on canvas
	ctx.fillRect(foodPosition[0], foodPosition[1], boxSize, boxSize);
}

function drawSnake(boxSize, snakePositions, snakeColor) {
	for (let i = 0; i < snakePositions.length; i++) {
		// draw snakes on canvas
		ctx.fillStyle = snakeColor;
		ctx.fillRect(snakePositions[i][0], snakePositions[i][1], boxSize, boxSize);
	}
}

function drawTimer() {                                // draw time for the game to start
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${canvas.width / 5}px  courier`;
	ctx.fillStyle = textColor;
	ctx.textAlign = 'center';
	ctx.fillText('3', canvas.width / 2, canvas.height / 2);
	setTimeout(() => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillText('2', canvas.width / 2, canvas.height / 2);
		setTimeout(() => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillText('1', canvas.width / 2, canvas.height / 2);
		}, 1000);
	}, 1000);
}

function drawWaiting() {                          // notify player that we are waiting for more users to join
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${canvas.width / 30}px courier`;
	ctx.fillStyle = textColor;
	ctx.textAlign = 'center';
	ctx.fillText('Waiting for players...', canvas.width / 2, canvas.height / 2);
}

function drawGameOver(winner) {                 // draw game end screen
	ctx.font = `${canvas.width / 30}px courier`;
	ctx.fillStyle = textColor;
	ctx.textAlign = 'center';
	ctx.fillText(
		'Game over!',
		canvas.width / 2,
		canvas.height / 2 - canvas.height / 5
	);
	ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2);
}

socket.on('setCanvas', (canvasWidth, canvasHeight) => {
	setCanvas(canvasWidth, canvasHeight);
});

socket.on(
	'drawObjects',
	(boxSize, snakeOnePositions, snakeTwoPositions, foodPosition) => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawSnake(boxSize, snakeOnePositions, snakeOneColor);
		drawSnake(boxSize, snakeTwoPositions, snakeTwoColor);
		drawFood(boxSize, foodPosition);
	}
);

socket.on('notifyStart', () => {
	drawTimer();
});

socket.on('notifyWaiting', () => {
	drawWaiting();
});

socket.on('gameOver', winner => {
	drawGameOver(winner);
	var playAgain = document.createElement('button');
	playAgain.innerHTML = 'Play Again!';
	playAgain.className = 'play-again-button';
	playAgain.onclick = () => {
		socket.emit('startOver');
	};
	document.querySelector('.flex-container').appendChild(playAgain);
});

socket.on('reset', () => {
	var playAgain = document.querySelector('.play-again-button');
	playAgain.remove();
	ctx.clearRect(0, 0, canvas.width, canvas.height); // reset game by removing play again button and clearing canvas
});

document.addEventListener('keydown', function (event) {
	socket.emit('keyPress', event.key); //emit keypress to the server
});

socket.on('tooManyUsers', () => {
	alert('You cannot connect because there are too many users!');
	socket.close(); // disconnect socket since there are too many users connected
});
