const gameBoard = document.getElementById('gameBoard');
const scoreElement = document.getElementById('score');
const startMenu = document.getElementById('startMenu');
const startButton = document.getElementById('startButton');
const menuTitle = document.getElementById('menuTitle');
const eatSound = document.getElementById('eatSound');
const dieSound = document.getElementById('dieSound');

// Grab the background music and set the volume
const bgMusic = document.getElementById('bgMusic');
bgMusic.volume = 0.3; 

const gridSize = 20;
let cells = [];
let snake = [];
let food = {};
let goldenFood = null;
let obstacles = [];
let dx = 0;
let dy = 0;
let score = 0;
let gameInterval;
let currentGameSpeed = 150;

function createGrid() {
    gameBoard.innerHTML = '';
    cells = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            gameBoard.appendChild(cell);
            cells.push(cell);
        }
    }
}

function getIndex(x, y) { return y * gridSize + x; }

function draw() {
    cells.forEach(cell => cell.className = 'cell');
    
    // Draw Food
    cells[getIndex(food.x, food.y)].classList.add('food');
    if (goldenFood) cells[getIndex(goldenFood.x, goldenFood.y)].classList.add('golden-food');
    
    // Draw Obstacles
    obstacles.forEach(obs => cells[getIndex(obs.x, obs.y)].classList.add('obstacle'));
    
    // Draw Snake
    snake.forEach((part, index) => {
        const cell = cells[getIndex(part.x, part.y)];
        cell.classList.add('snake');
        if (index === 0) cell.classList.add('snake-head');
    });
}

function move() {
    if (dx === 0 && dy === 0) return;

    // Portal Wall Logic (Wrap around)
    let nextX = snake[0].x + dx;
    let nextY = snake[0].y + dy;
    if (nextX < 0) nextX = gridSize - 1;
    if (nextX >= gridSize) nextX = 0;
    if (nextY < 0) nextY = gridSize - 1;
    if (nextY >= gridSize) nextY = 0;
    
    const head = { x: nextX, y: nextY };
    
    // Collision (Self or Obstacle)
    if (
        snake.some(part => part.x === head.x && part.y === head.y) ||
        obstacles.some(obs => obs.x === head.x && obs.y === head.y)
    ) {
        return gameOver();
    }

    snake.unshift(head);

    // Eating Logic
    let ateSomething = false;
    
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        ateSomething = true;
        generateFood();
        
        // 15% chance to spawn golden food
        if (Math.random() < 0.15 && !goldenFood) {
            goldenFood = spawnItem();
            setTimeout(() => { goldenFood = null; draw(); }, 5000); // Disappears in 5s
        }
        
        // Add obstacles after 50 points
        if (score > 0 && score % 50 === 0) obstacles.push(spawnItem());
    } else if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
        score += 50;
        ateSomething = true;
        goldenFood = null;
    } else {
        snake.pop(); // Remove tail
    }

    if (ateSomething) {
        scoreElement.innerText = score;
        eatSound.currentTime = 0;
        eatSound.play().catch(e => console.log("Audio requires interaction first"));
        
        // Speed Ramp-up
        currentGameSpeed = Math.max(60, currentGameSpeed - 2);
        clearInterval(gameInterval);
        gameInterval = setInterval(move, currentGameSpeed);
    }
    
    draw();
}

function spawnItem() {
    let newItem;
    while (true) {
        newItem = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        const onSnake = snake.some(part => part.x === newItem.x && part.y === newItem.y);
        const onObstacle = obstacles.some(obs => obs.x === newItem.x && obs.y === newItem.y);
        const onFood = (food.x === newItem.x && food.y === newItem.y);
        if (!onSnake && !onObstacle && !onFood) return newItem;
    }
}

function generateFood() { food = spawnItem(); }

function gameOver() {
    clearInterval(gameInterval);
    dieSound.play().catch(e => console.log("Audio issue"));
    
    // Stop the music and rewind it
    bgMusic.pause();
    bgMusic.currentTime = 0; 
    
    // Trigger screen shake
    document.querySelector('.game-wrapper').classList.add('shake');
    setTimeout(() => { document.querySelector('.game-wrapper').classList.remove('shake'); }, 400);

    menuTitle.innerText = "Game Over!";
    startButton.innerText = "Play Again";
    startMenu.style.display = "flex";
}

function startGame() {
    startMenu.style.display = "none";
    snake = [{x: 10, y: 10}];
    dx = 1; dy = 0;
    score = 0;
    currentGameSpeed = 150;
    obstacles = [];
    goldenFood = null;
    scoreElement.innerText = score;
    generateFood();
    draw();
    
    clearInterval(gameInterval);
    gameInterval = setInterval(move, currentGameSpeed);
    
    // Start the music!
    bgMusic.play().catch(e => console.log("Waiting for user to click"));
}

// Listen for Keyboard Inputs
document.addEventListener('keydown', (e) => {
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingLeft = dx === -1;
    const goingRight = dx === 1;
    if (e.key === 'ArrowUp' && !goingDown) { dx = 0; dy = -1; }
    if (e.key === 'ArrowDown' && !goingUp) { dx = 0; dy = 1; }
    if (e.key === 'ArrowLeft' && !goingRight) { dx = -1; dy = 0; }
    if (e.key === 'ArrowRight' && !goingLeft) { dx = 1; dy = 0; }
});

startButton.addEventListener('click', startGame);
createGrid();


// --- MOBILE SWIPE CONTROLS ---
let touchStartX = 0;
let touchStartY = 0;

// Record where the finger first touches the screen
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

// Record where the finger leaves the screen and calculate direction
document.addEventListener('touchend', (e) => {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
});

function handleSwipe(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Ignore tiny accidental taps (must swipe at least 30 pixels)
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) return;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingLeft = dx === -1;
    const goingRight = dx === 1;

    // Was the swipe more horizontal or vertical?
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal Swipe
        if (deltaX > 0 && !goingLeft) { dx = 1; dy = 0; } // Right
        else if (deltaX < 0 && !goingRight) { dx = -1; dy = 0; } // Left
    } else {
        // Vertical Swipe
        if (deltaY > 0 && !goingUp) { dx = 0; dy = 1; } // Down
        else if (deltaY < 0 && !goingDown) { dx = 0; dy = -1; } // Up
    }
}