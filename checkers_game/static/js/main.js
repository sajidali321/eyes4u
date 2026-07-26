document.addEventListener('DOMContentLoaded', () => {

    // UI Elements
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const aiDifficultySection = document.getElementById('ai-difficulty-section');
    const lanSection = document.getElementById('lan-section');
    const startBtn = document.getElementById('btn-start-game');
    const backBtn = document.getElementById('btn-back-menu');

    // State Variables
    window.gameState = {
        mode: 'ai',           // 'ai', 'multi_lan', 'multi_local'
        difficulty: 'easy',   // 'easy', 'medium', 'hard'
        rules: 'normal',      // 'normal', 'brazilian', 'international'
        room: null,
        playerColor: 1        // 1 for Red (Player 1), 2 for Black (Player 2). Important for LAN.
    };

    // --- Menu Logic ---

    // Generic function to handle button group selection
    function setupButtonGroup(btnClass, stateKey, onChangeCallback) {
        const buttons = document.querySelectorAll(`.${btnClass}`);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.gameState[stateKey] = btn.getAttribute(`data-${stateKey === 'difficulty' ? 'diff' : stateKey === 'rules' ? 'rule' : 'mode'}`);
                if (onChangeCallback) onChangeCallback();
            });
        });
    }

    setupButtonGroup('mode-btn', 'mode', () => {
        // Toggle UI sections based on mode
        if (window.gameState.mode === 'ai') {
            aiDifficultySection.style.display = 'block';
            lanSection.style.display = 'none';
            startBtn.style.display = 'block';
        } else if (window.gameState.mode === 'multi_lan') {
            aiDifficultySection.style.display = 'none';
            lanSection.style.display = 'block';
            startBtn.style.display = 'none'; // Replaced by Create/Join Room buttons
        } else if (window.gameState.mode === 'multi_local') {
            aiDifficultySection.style.display = 'none';
            lanSection.style.display = 'none';
            startBtn.style.display = 'block';
        }
    });

    setupButtonGroup('diff-btn', 'difficulty');
    setupButtonGroup('rule-btn', 'rules');


    // --- Transitions ---

    startBtn.addEventListener('click', () => {
        startGameUI();
    });

    backBtn.addEventListener('click', () => {
        gameScreen.classList.remove('active');
        mainMenu.classList.add('active');
        if(window.gameEngine) window.gameEngine.stop();
        if(window.socket && window.gameState.mode === 'multi_lan') {
            // Optional: tell server we left the room
            window.socket.disconnect();
            window.socket.connect(); // Reconnect for a clean state
            document.getElementById('lan-message').innerText = "";
        }
    });

    window.startGameUI = function(isPlayer2 = false) {
        mainMenu.classList.remove('active');
        gameScreen.classList.add('active');

        document.getElementById('game-title').innerText =
            `Checkers - ${window.gameState.rules.charAt(0).toUpperCase() + window.gameState.rules.slice(1)} Rules`;

        // Initialize Game Engine (defined in game.js)
        if(window.gameEngine) {
            window.gameEngine.init(window.gameState, isPlayer2);
        }
    };

    // --- LAN Multiplayer Logic ---

    // We only connect Socket.IO if we are using it
    window.socket = io();

    const btnCreateRoom = document.getElementById('btn-create-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const roomIdInput = document.getElementById('room-id');
    const lanMessage = document.getElementById('lan-message');

    btnCreateRoom.addEventListener('click', () => {
        const room = roomIdInput.value.trim();
        if(!room) {
            lanMessage.innerText = "Please enter a Room ID.";
            return;
        }
        window.gameState.room = room;
        window.gameState.playerColor = 1; // Creator is Player 1 (Red)
        socket.emit('create_room', { room: room, rules: window.gameState.rules });
    });

    btnJoinRoom.addEventListener('click', () => {
        const room = roomIdInput.value.trim();
        if(!room) {
            lanMessage.innerText = "Please enter a Room ID.";
            return;
        }
        window.gameState.room = room;
        window.gameState.playerColor = 2; // Joiner is Player 2 (Black)
        socket.emit('join_room', { room: room });
    });

    socket.on('room_created', (data) => {
        lanMessage.innerText = data.message;
    });

    socket.on('room_joined', (data) => {
        lanMessage.innerText = data.message;
        // The joiner gets the rules from the room creator
        window.gameState.rules = data.rules;
    });

    socket.on('game_start', (data) => {
        window.gameState.rules = data.rules;
        lanMessage.innerText = "Starting game...";
        setTimeout(() => {
            startGameUI(window.gameState.playerColor === 2);
        }, 1000);
    });

    socket.on('error', (data) => {
        lanMessage.innerText = data.message;
    });

});
