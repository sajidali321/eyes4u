// game.js
// Handles rendering, game logic, AI, and network multiplayer synchronization

window.gameEngine = (function() {
    let canvas, ctx;
    let config = {};
    let boardSize = 8;
    let board = []; // 2D array representation
    let turn = 1; // 1 for Player 1 (Red), 2 for Player 2 (Black)
    let selectedPiece = null;
    let validMoves = [];
    let isReversed = false; // True if player is Black (for rendering board upside down in multiplayer)

    // Constants
    const EMPTY = 0;
    const P1_PIECE = 1; // Red
    const P2_PIECE = 2; // Black
    const P1_KING = 3;
    const P2_KING = 4;

    function init(gameState, playAsPlayer2) {
        config = gameState;
        canvas = document.getElementById('checkers-board');
        ctx = canvas.getContext('2d');

        boardSize = config.rules === 'international' ? 10 : 8;

        // Setup Canvas size
        const containerWidth = document.getElementById('board-container').clientWidth;
        const size = Math.min(containerWidth - 20, 600); // max 600px
        canvas.width = size;
        canvas.height = size;

        isReversed = playAsPlayer2;
        turn = 1;
        selectedPiece = null;
        validMoves = [];

        initBoard();

        // Listeners
        canvas.addEventListener('click', onCanvasClick);

        // If Multiplayer, listen for socket events
        if (config.mode === 'multi_lan' && window.socket) {
            window.socket.off('opponent_moved'); // clear old listener
            window.socket.on('opponent_moved', handleOpponentMove);
        }

        updateStatus();
        drawBoard();
    }

    function stop() {
        canvas.removeEventListener('click', onCanvasClick);
    }

    function initBoard() {
        board = [];
        let rowsOfPieces = boardSize === 10 ? 4 : 3;
        for (let row = 0; row < boardSize; row++) {
            let rowArray = [];
            for (let col = 0; col < boardSize; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < rowsOfPieces) rowArray.push(P2_PIECE); // Black top
                    else if (row >= boardSize - rowsOfPieces) rowArray.push(P1_PIECE); // Red bottom
                    else rowArray.push(EMPTY);
                } else {
                    rowArray.push(EMPTY);
                }
            }
            board.push(rowArray);
        }
    }

    function drawBoard() {
        const tileSize = canvas.width / boardSize;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {

                // If reversed (Player 2 view), draw from bottom up
                let drawR = isReversed ? (boardSize - 1 - r) : r;
                let drawC = isReversed ? (boardSize - 1 - c) : c;

                // Draw tile
                ctx.fillStyle = (drawR + drawC) % 2 === 1 ? '#b58863' : '#f0d9b5';
                ctx.fillRect(drawC * tileSize, drawR * tileSize, tileSize, tileSize);

                // Highlight selected piece
                if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
                    ctx.fillRect(drawC * tileSize, drawR * tileSize, tileSize, tileSize);
                }

                // Highlight valid moves
                if (validMoves) {
                    for (let move of validMoves) {
                        if (move.toR === r && move.toC === c) {
                            ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
                            ctx.fillRect(drawC * tileSize, drawR * tileSize, tileSize, tileSize);
                        }
                    }
                }

                // Draw pieces
                let piece = board[r][c];
                if (piece !== EMPTY) {
                    drawPiece(drawR, drawC, piece, tileSize);
                }
            }
        }
    }

    function drawPiece(r, c, piece, tileSize) {
        const x = c * tileSize + tileSize / 2;
        const y = r * tileSize + tileSize / 2;
        const radius = tileSize * 0.4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (piece === P1_PIECE || piece === P1_KING) {
            ctx.fillStyle = '#e74c3c'; // Red
        } else {
            ctx.fillStyle = '#2c3e50'; // Black
        }

        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        if (piece === P1_KING || piece === P2_KING) {
            ctx.fillStyle = '#fff';
            ctx.font = `${tileSize * 0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('K', x, y);
        }
    }

    function onCanvasClick(e) {
        // Prevent interaction if it's not our turn
        if (config.mode === 'ai' && turn === 2) return;
        if (config.mode === 'multi_lan' && turn !== config.playerColor) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tileSize = canvas.width / boardSize;

        let clickedC = Math.floor(x / tileSize);
        let clickedR = Math.floor(y / tileSize);

        // Adjust click coordinate if board is reversed
        if (isReversed) {
            clickedR = boardSize - 1 - clickedR;
            clickedC = boardSize - 1 - clickedC;
        }

        handleCellClick(clickedR, clickedC);
    }

    function handleCellClick(r, c) {
        let piece = board[r][c];

        // If clicking own piece, select it
        if ((turn === 1 && (piece === P1_PIECE || piece === P1_KING)) ||
            (turn === 2 && (piece === P2_PIECE || piece === P2_KING))) {

            // Check if jumps are available globally
            const jumps = getAllPossibleJumps(turn);
            if (jumps.length > 0) {
                // Must select a piece that can jump
                let canThisPieceJump = jumps.some(m => m.fromR === r && m.fromC === c);
                if (!canThisPieceJump) return; // Ignore click
                validMoves = jumps.filter(m => m.fromR === r && m.fromC === c);
            } else {
                validMoves = getValidMovesForPiece(r, c);
            }
            selectedPiece = { r, c };
            drawBoard();
            return;
        }

        // If clicking a valid move square, make the move
        if (selectedPiece) {
            let move = validMoves.find(m => m.toR === r && m.toC === c);
            if (move) {
                executeMove(move);
            } else {
                selectedPiece = null;
                validMoves = [];
                drawBoard();
            }
        }
    }

    // --- Rules Logic ---

    function getValidMovesForPiece(r, c) {
        let moves = [];
        let piece = board[r][c];
        if (piece === EMPTY) return moves;

        let isKing = (piece === P1_KING || piece === P2_KING);
        let player = (piece === P1_PIECE || piece === P1_KING) ? 1 : 2;
        let forward = (player === 1) ? -1 : 1; // P1 moves up(-1), P2 moves down(+1)

        let directions = [];

        if (config.rules === 'normal') {
            if (isKing) directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            else directions = [[forward, 1], [forward, -1]];

            // Normal simple moves
            for (let d of directions) {
                let nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                    if (board[nr][nc] === EMPTY) {
                        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, jump: null });
                    }
                }
            }
        } else {
            // Brazilian / International rules (Flying kings, backward capture for normal)
            if (isKing) {
                directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (let d of directions) {
                    for(let step = 1; step < boardSize; step++) {
                        let nr = r + d[0]*step, nc = c + d[1]*step;
                        if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) break;
                        if (board[nr][nc] === EMPTY) {
                            moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, jump: null });
                        } else {
                            break; // blocked
                        }
                    }
                }
            } else {
                directions = [[forward, 1], [forward, -1]];
                for (let d of directions) {
                    let nr = r + d[0], nc = c + d[1];
                    if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                        if (board[nr][nc] === EMPTY) {
                            moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, jump: null });
                        }
                    }
                }
            }
        }
        return moves;
    }

    function getAllPossibleJumps(player) {
        let jumps = [];
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                let piece = board[r][c];
                if ((player === 1 && (piece === P1_PIECE || piece === P1_KING)) ||
                    (player === 2 && (piece === P2_PIECE || piece === P2_KING))) {
                    jumps = jumps.concat(getJumpsForPiece(r, c, []));
                }
            }
        }
        // In International/Brazilian, must choose path with max captures.
        // For simplicity, we just enforce that A jump must be made.
        if (config.rules !== 'normal' && jumps.length > 0) {
            let maxLen = Math.max(...jumps.map(j => j.path.length));
            jumps = jumps.filter(j => j.path.length === maxLen);
        }
        return jumps;
    }

    function getJumpsForPiece(r, c, capturedSoFar, currentBoard = null) {
        let moves = [];
        let b = currentBoard || cloneBoard(board);
        let piece = b[r][c];
        let isKing = (piece === P1_KING || piece === P2_KING);
        let player = (piece === P1_PIECE || piece === P1_KING) ? 1 : 2;
        let forward = (player === 1) ? -1 : 1;

        let directions = [];
        if (config.rules === 'normal') {
            if (isKing) directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            else directions = [[forward, 1], [forward, -1]];

            for (let d of directions) {
                let nr = r + d[0], nc = c + d[1];
                let jr = r + 2*d[0], jc = c + 2*d[1];
                if (jr >= 0 && jr < boardSize && jc >= 0 && jc < boardSize) {
                    if (isOpponent(player, b[nr][nc]) && b[jr][jc] === EMPTY && !capturedSoFar.includes(`${nr},${nc}`)) {

                        let path = [...capturedSoFar, `${nr},${nc}`];
                        let newB = cloneBoard(b);
                        newB[jr][jc] = piece;
                        newB[r][c] = EMPTY;
                        // Don't remove captured piece yet in recursive search for long paths

                        let furtherJumps = getJumpsForPiece(jr, jc, path, newB);
                        if (furtherJumps.length > 0) {
                            moves = moves.concat(furtherJumps.map(fm => {
                                return { fromR: r, fromC: c, toR: fm.toR, toC: fm.toC, jump: fm.jump, path: fm.path };
                            }));
                        } else {
                            moves.push({ fromR: r, fromC: c, toR: jr, toC: jc, jump: {r: nr, c: nc}, path: path });
                        }
                    }
                }
            }
        } else {
            // Brazilian / International jumps (backward for normal, flying for kings)
            if (isKing) {
                 directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                 for (let d of directions) {
                     let foundEnemy = null;
                     for(let step = 1; step < boardSize; step++) {
                         let nr = r + d[0]*step, nc = c + d[1]*step;
                         if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) break;

                         let targetPiece = b[nr][nc];
                         if (targetPiece === EMPTY) {
                             if (foundEnemy) {
                                 // valid landing spot after jump
                                 let path = [...capturedSoFar, `${foundEnemy.r},${foundEnemy.c}`];
                                 let newB = cloneBoard(b);
                                 newB[nr][nc] = piece;
                                 newB[r][c] = EMPTY;
                                 let furtherJumps = getJumpsForPiece(nr, nc, path, newB);
                                 if (furtherJumps.length > 0) {
                                     moves = moves.concat(furtherJumps.map(fm => {
                                         return { fromR: r, fromC: c, toR: fm.toR, toC: fm.toC, jump: foundEnemy, path: fm.path };
                                     }));
                                 } else {
                                     moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, jump: foundEnemy, path: path });
                                 }
                             }
                         } else if (isOpponent(player, targetPiece)) {
                             if (foundEnemy || capturedSoFar.includes(`${nr},${nc}`)) break; // Can't jump two in a row or same piece twice
                             foundEnemy = {r: nr, c: nc};
                         } else {
                             break; // own piece blocks
                         }
                     }
                 }
            } else {
                // Normal piece backward jump allowed
                directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (let d of directions) {
                    let nr = r + d[0], nc = c + d[1];
                    let jr = r + 2*d[0], jc = c + 2*d[1];
                    if (jr >= 0 && jr < boardSize && jc >= 0 && jc < boardSize) {
                        if (isOpponent(player, b[nr][nc]) && b[jr][jc] === EMPTY && !capturedSoFar.includes(`${nr},${nc}`)) {
                            let path = [...capturedSoFar, `${nr},${nc}`];
                            let newB = cloneBoard(b);
                            newB[jr][jc] = piece;
                            newB[r][c] = EMPTY;
                            let furtherJumps = getJumpsForPiece(jr, jc, path, newB);
                            if (furtherJumps.length > 0) {
                                moves = moves.concat(furtherJumps.map(fm => {
                                    return { fromR: r, fromC: c, toR: fm.toR, toC: fm.toC, jump: fm.jump, path: fm.path };
                                }));
                            } else {
                                moves.push({ fromR: r, fromC: c, toR: jr, toC: jc, jump: {r: nr, c: nc}, path: path });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    function isOpponent(player, piece) {
        if (piece === EMPTY) return false;
        if (player === 1 && (piece === P2_PIECE || piece === P2_KING)) return true;
        if (player === 2 && (piece === P1_PIECE || piece === P1_KING)) return true;
        return false;
    }

    function cloneBoard(b) {
        return b.map(row => [...row]);
    }

    function executeMove(move, isNetworkMove = false) {
        // Broadcast move if LAN and we initiated it
        if (config.mode === 'multi_lan' && !isNetworkMove) {
            window.socket.emit('move', { room: config.room, move_data: move });
        }

        let piece = board[move.fromR][move.fromC];
        board[move.toR][move.toC] = piece;
        board[move.fromR][move.fromC] = EMPTY;

        // Remove jumped pieces
        if (move.path) {
            for (let p of move.path) {
                let parts = p.split(',');
                board[parseInt(parts[0])][parseInt(parts[1])] = EMPTY;
            }
        } else if (move.jump) {
            board[move.jump.r][move.jump.c] = EMPTY;
        }

        // King promotion
        if (piece === P1_PIECE && move.toR === 0) board[move.toR][move.toC] = P1_KING;
        if (piece === P2_PIECE && move.toR === boardSize - 1) board[move.toR][move.toC] = P2_KING;

        // Next Turn
        selectedPiece = null;
        validMoves = [];
        turn = (turn === 1) ? 2 : 1;

        updateStatus();
        drawBoard();
        checkGameOver();

        // Trigger AI if needed
        if (config.mode === 'ai' && turn === 2) {
            setTimeout(makeAIMove, 500);
        }
    }

    function handleOpponentMove(move_data) {
        executeMove(move_data, true);
    }

    function updateStatus() {
        const statusEl = document.getElementById('game-status');
        let text = turn === 1 ? "Turn: Player 1 (Red)" : "Turn: Player 2 (Black)";
        if (config.mode === 'multi_lan') {
            if (turn === config.playerColor) text = "Your Turn!";
            else text = "Waiting for Opponent...";
        } else if (config.mode === 'ai' && turn === 2) {
            text = "Computer is thinking...";
        }
        statusEl.innerText = text;
    }

    function checkGameOver() {
        let p1Count = 0, p2Count = 0;
        let p1Moves = false, p2Moves = false;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                let piece = board[r][c];
                if (piece === P1_PIECE || piece === P1_KING) {
                    p1Count++;
                    if (!p1Moves) {
                         let j = getJumpsForPiece(r, c, []);
                         let m = getValidMovesForPiece(r, c);
                         if(j.length > 0 || m.length > 0) p1Moves = true;
                    }
                }
                if (piece === P2_PIECE || piece === P2_KING) {
                    p2Count++;
                    if (!p2Moves) {
                         let j = getJumpsForPiece(r, c, []);
                         let m = getValidMovesForPiece(r, c);
                         if(j.length > 0 || m.length > 0) p2Moves = true;
                    }
                }
            }
        }

        let statusEl = document.getElementById('game-status');
        if (p1Count === 0 || !p1Moves) {
            statusEl.innerText = "Black (Player 2) Wins!";
            turn = 0; // stop game
        } else if (p2Count === 0 || !p2Moves) {
            statusEl.innerText = "Red (Player 1) Wins!";
            turn = 0;
        }
    }

    // --- AI Logic (Minimax) ---
    function evaluateBoard(b) {
        let score = 0;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                let piece = b[r][c];
                if (piece === P2_PIECE) score += 10;
                else if (piece === P2_KING) score += 15;
                else if (piece === P1_PIECE) score -= 10;
                else if (piece === P1_KING) score -= 15;
            }
        }
        return score;
    }

    function minimax(b, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) return evaluateBoard(b);

        let playerTurn = isMaximizingPlayer ? 2 : 1;
        let allJumps = [];
        let possibleMoves = [];

        // To simulate get jumps/moves for a theoretical board, we temporarily replace the global board
        let tempBoard = board;
        board = b;

        allJumps = getAllPossibleJumps(playerTurn);
        if (allJumps.length > 0) {
            possibleMoves = allJumps;
        } else {
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    let piece = board[r][c];
                    if ((playerTurn === 2 && (piece === P2_PIECE || piece === P2_KING)) ||
                        (playerTurn === 1 && (piece === P1_PIECE || piece === P1_KING))) {
                        possibleMoves = possibleMoves.concat(getValidMovesForPiece(r, c));
                    }
                }
            }
        }

        board = tempBoard; // restore global board

        if (possibleMoves.length === 0) {
            return isMaximizingPlayer ? -1000 : 1000; // Loss / Win
        }

        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (let move of possibleMoves) {
                let newB = simulateMove(b, move);
                let eval = minimax(newB, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of possibleMoves) {
                let newB = simulateMove(b, move);
                let eval = minimax(newB, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function simulateMove(b, move) {
        let newB = cloneBoard(b);
        let piece = newB[move.fromR][move.fromC];
        newB[move.toR][move.toC] = piece;
        newB[move.fromR][move.fromC] = EMPTY;

        if (move.path) {
            for (let p of move.path) {
                let parts = p.split(',');
                newB[parseInt(parts[0])][parseInt(parts[1])] = EMPTY;
            }
        } else if (move.jump) {
            newB[move.jump.r][move.jump.c] = EMPTY;
        }

        // King promotion
        if (piece === P1_PIECE && move.toR === 0) newB[move.toR][move.toC] = P1_KING;
        if (piece === P2_PIECE && move.toR === boardSize - 1) newB[move.toR][move.toC] = P2_KING;

        return newB;
    }

    function makeAIMove() {
        if(turn !== 2) return;

        let allJumps = getAllPossibleJumps(2);
        let possibleMoves = [];

        if (allJumps.length > 0) {
            possibleMoves = allJumps;
        } else {
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    let piece = board[r][c];
                    if (piece === P2_PIECE || piece === P2_KING) {
                        let m = getValidMovesForPiece(r, c);
                        possibleMoves = possibleMoves.concat(m);
                    }
                }
            }
        }

        if (possibleMoves.length === 0) {
            checkGameOver(); // Force win for Player 1
            return;
        }

        let depth = 1; // easy
        if (config.difficulty === 'medium') depth = 3;
        else if (config.difficulty === 'hard') depth = 5;

        // If Easy, introduce a lot of randomness or just depth 1 minimax
        if (config.difficulty === 'easy' && Math.random() < 0.5) {
            let randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            executeMove(randomMove);
            return;
        }

        let bestScore = -Infinity;
        let bestMoves = [];

        for (let move of possibleMoves) {
            let newB = simulateMove(board, move);
            let score = minimax(newB, depth - 1, -Infinity, Infinity, false);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        let selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        executeMove(selectedMove);
    }

    return {
        init,
        stop
    };

})();
