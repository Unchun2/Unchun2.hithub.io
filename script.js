document.addEventListener('DOMContentLoaded', () => {
    // Configuración del juego
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const COLORS = [
        '#FF0D72', // Z
        '#0DC2FF', // J
        '#0DFF72', // S
        '#F538FF', // T
        '#FF8E0D', // L
        '#FFE138', // O
        '#3877FF'  // I
    ];

    // Tablero
    const canvas = document.getElementById('tetris-board');
    const ctx = canvas.getContext('2d');
    
    // Panel de siguiente pieza
    const nextPieceCanvas = document.getElementById('next-piece');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    
    // Elementos de UI
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startBtn = document.getElementById('start-btn');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-btn');
    
    // Definición de las piezas con rotaciones
    const TETROMINOS = [
        // Z
        [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        // J
        [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // S
        [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        // T
        [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // L
        [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // O
        [
            [1, 1],
            [1, 1]
        ],
        // I
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    ];

    // Variables de estado del juego
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let gamePaused = true;
    
    let dropCounter = 0;
    let dropInterval = 1000; // Intervalo inicial de caída (ms)
    let lastTime = 0;
    
    let currentPiece = null;
    let nextPiece = null;

    // Inicializar el juego
    function init() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        
        updateScore();
        createPiece();
        
        gameOverElement.style.display = 'none';
        
        if (!gamePaused) {
            update();
        }
    }

    // Crear una nueva pieza
    function createPiece() {
        if (!nextPiece) {
            const pieceType = Math.floor(Math.random() * TETROMINOS.length);
            nextPiece = {
                matrix: TETROMINOS[pieceType],
                color: COLORS[pieceType],
                pos: {x: 3, y: 0}
            };
        }
        
        currentPiece = nextPiece;
        
        // Generar la siguiente pieza
        const pieceType = Math.floor(Math.random() * TETROMINOS.length);
        nextPiece = {
            matrix: TETROMINOS[pieceType],
            color: COLORS[pieceType],
            pos: {x: 3, y: 0}
        };
        
        drawNextPiece();
        
        // Comprobar si la pieza puede ser colocada (game over)
        if (collision(currentPiece)) {
            gameOver = true;
            gameOverElement.style.display = 'block';
            finalScoreElement.textContent = score;
            gamePaused = true;
        }
    }

    // Verificar colisiones
    function collision(piece) {
        const matrix = piece.matrix;
        const pos = piece.pos;
        
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0 &&
                    (board[y + pos.y] === undefined ||
                     board[y + pos.y][x + pos.x] === undefined ||
                     board[y + pos.y][x + pos.x] !== 0)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Rotar la pieza
    function rotate(piece) {
        const matrix = piece.matrix;
        const N = matrix.length;
        
        // Crear una nueva matriz rotada
        const rotated = Array(N).fill().map(() => Array(N).fill(0));
        
        // Rotar 90 grados en sentido horario
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                rotated[x][N - 1 - y] = matrix[y][x];
            }
        }
        
        // Guardar la matriz original para restaurarla si hay colisión
        const originalMatrix = piece.matrix;
        piece.matrix = rotated;
        
        // Si hay colisión, restaurar la matriz original
        if (collision(piece)) {
            piece.matrix = originalMatrix;
        }
    }

    // Mover la pieza lateralmente
    function movePiece(dir) {
        currentPiece.pos.x += dir;
        
        if (collision(currentPiece)) {
            currentPiece.pos.x -= dir;
        }
    }

    // Bajar la pieza
    function dropPiece() {
        currentPiece.pos.y++;
        
        if (collision(currentPiece)) {
            currentPiece.pos.y--;
            mergePiece();
            createPiece();
            
            // Comprobar líneas completas
            clearLines();
        }
        
        dropCounter = 0;
    }

    // Caída instantánea
    function hardDrop() {
        while (!collision(currentPiece)) {
            currentPiece.pos.y++;
        }
        
        currentPiece.pos.y--;
        mergePiece();
        createPiece();
        
        // Comprobar líneas completas
        clearLines();
        
        dropCounter = 0;
    }

    // Fusionar la pieza con el tablero
    function mergePiece() {
        currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + currentPiece.pos.y][x + currentPiece.pos.x] = currentPiece.color;
                }
            });
        });
    }

    // Eliminar líneas completas
    function clearLines() {
        let linesCleared = 0;
        
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Eliminar la línea
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            
            linesCleared++;
        }
        
        // Actualizar puntuación
        if (linesCleared > 0) {
            // Sistema de puntuación clásico de Tetris
            const points = [0, 100, 300, 500, 800];
            score += points[linesCleared] * level;
            lines += linesCleared;
            
            // Subir de nivel cada 10 líneas
            level = Math.floor(lines / 10) + 1;
            
            // Aumentar velocidad con el nivel
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            
            updateScore();
        }
    }

    // Actualizar elementos de puntuación
    function updateScore() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }

    // Dibujar el tablero
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar las piezas fijas
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = value;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Efecto 3D
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 4);
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 4, BLOCK_SIZE);
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(x * BLOCK_SIZE + BLOCK_SIZE - 4, y * BLOCK_SIZE, 4, BLOCK_SIZE);
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE - 4, BLOCK_SIZE, 4);
                }
            });
        });
        
        // Dibujar la pieza actual
        if (currentPiece) {
            ctx.fillStyle = currentPiece.color;
            
            currentPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const posX = (currentPiece.pos.x + x) * BLOCK_SIZE;
                        const posY = (currentPiece.pos.y + y) * BLOCK_SIZE;
                        
                        ctx.fillRect(posX, posY, BLOCK_SIZE, BLOCK_SIZE);
                        
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.strokeRect(posX, posY, BLOCK_SIZE, BLOCK_SIZE);
                        
                        // Efecto 3D
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(posX, posY, BLOCK_SIZE, 4);
                        ctx.fillRect(posX, posY, 4, BLOCK_SIZE);
                        
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        ctx.fillRect(posX + BLOCK_SIZE - 4, posY, 4, BLOCK_SIZE);
                        ctx.fillRect(posX, posY + BLOCK_SIZE - 4, BLOCK_SIZE, 4);
                        
                        ctx.fillStyle = currentPiece.color;
                    }
                });
            });
        }
        
        // Dibujar cuadrícula
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    // Dibujar la siguiente pieza
    function drawNextPiece() {
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        if (nextPiece) {
            // Centrar la pieza en el canvas
            const offset = 4 - nextPiece.matrix.length;
            const blockSize = 24;
            
            nextPieceCtx.fillStyle = nextPiece.color;
            
            nextPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const posX = (x + offset) * blockSize;
                        const posY = (y + 1) * blockSize;
                        
                        nextPieceCtx.fillRect(posX, posY, blockSize, blockSize);
                        
                        nextPieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        nextPieceCtx.strokeRect(posX, posY, blockSize, blockSize);
                        
                        // Efecto 3D
                        nextPieceCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        nextPieceCtx.fillRect(posX, posY, blockSize, 4);
                        nextPieceCtx.fillRect(posX, posY, 4, blockSize);
                        
                        nextPieceCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        nextPieceCtx.fillRect(posX + blockSize - 4, posY, 4, blockSize);
                        nextPieceCtx.fillRect(posX, posY + blockSize - 4, blockSize, 4);
                        
                        nextPieceCtx.fillStyle = nextPiece.color;
                    }
                });
            });
        }
    }

    // Bucle principal de actualización
    function update(time = 0) {
        if (gameOver || gamePaused) {
            return;
        }
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropPiece();
        }
        
        drawBoard();
        requestAnimationFrame(update);
    }

    // Controles del teclado
    document.addEventListener('keydown', event => {
        if (gameOver || gamePaused) {
            return;
        }
        
        switch (event.keyCode) {
            case 37: // Izquierda
                movePiece(-1);
                break;
            case 39: // Derecha
                movePiece(1);
                break;
            case 40: // Abajo
                dropPiece();
                break;
            case 38: // Arriba
                rotate(currentPiece);
                break;
            case 32: // Espacio
                hardDrop();
                break;
        }
        
        drawBoard();
    });

    // Botón de inicio/pausa
    startBtn.addEventListener('click', () => {
        if (gameOver) {
            init();
        }
        
        gamePaused = !gamePaused;
        
        if (!gamePaused) {
            lastTime = 0;
            update();
            startBtn.textContent = 'Pausar';
        } else {
            startBtn.textContent = 'Continuar';
        }
    });

    // Botón de reinicio
    restartBtn.addEventListener('click', () => {
        gamePaused = false;
        init();
        startBtn.textContent = 'Pausar';
        update();
    });

    // Inicializar el juego
    init();
    drawBoard();
    drawNextPiece();
});
