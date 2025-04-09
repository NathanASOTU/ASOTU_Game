// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 750,
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 300 }, 
            debug: false // Disable physics debugging
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    backgroundColor: '#0e343c',
    input: {
        touch: true
    }
};

const game = new Phaser.Game(config);

// Game variables
let player, cursors, platforms, tokens, tokens2, tokens3, obstacles, scoreText, livesText, maxLivesMessage, livesGainedMessage;
let gameStarted = false;
let score = 0;
let lives = 3;
let isHit = false;
let hitCooldown = 0;
let lastHitTime = 0;
let selectedPlayer = null;
let lastPlatformX = 0;
let lastPlatformY = 0;
let lastDirectionUp = false;
let isClickingLeft = false;
let isClickingRight = false;
let startMusic, gameplayMusic, invincibilitySound, obstacleHitSound, obstacleHitNormalSound;
let token1Sound, token2Sound;
let isInvincible = false;
let invincibilityTimer = 0;
let flashTimer = 0;
let isFlashing = false;
let currentSprite = null;
let hud;
let leftButton, rightButton;
let obstacleTimer;

// Parallax background variables
let bgFar, bgMid;
// Smoothed scroll position for parallax
let smoothedScrollX = 0;
const PARALLAX_SMOOTHING = 0.05; // Smoothing factor for parallax movement

const playerStartX = 400;
const playerStartY = 450;
const maxVisiblePlatforms = 10;
const maxVisibleTokens = 12;
const maxVisibleTokens2 = 2;
const maxVisibleTokens3 = 1;
const maxJumpHeight = 150;
const minPlatformSpacingX = 120;
const maxPlatformSpacingX = 220;
const minPlatformY = 150;
const maxPlatformY = 550;
const verticalStepMin = 50;
const verticalStepMax = 180;
const overlapBuffer = 20;
const minTokenSpacingY = 50;
const HIT_COOLDOWN_DURATION = 800;
const HIT_DEBOUNCE_WINDOW = 100;
const INVINCIBILITY_DURATION = 15000;
const FLASH_START_TIME = 2000;
const FLASH_INTERVAL = 500;
const BUTTON_SIZE = 150;
const HUD_HEIGHT = 150;
const GAME_HEIGHT = 600;
const HUD_DEPTH = 10;
const MAX_LIVES = 5;
const WORLD_WIDTH = 200000;
const MIDGROUND_IMAGE_WIDTH = 6144; // Width of the single midground image

// Parallax scroll factors for each layer
const BG_FAR_SCROLL_FACTOR = 0.1;
const BG_MID_SCROLL_FACTOR = 0.3;

// Calculate the distance the player must travel in the game world to see the full midground image
const MIDGROUND_LOOP_DISTANCE = MIDGROUND_IMAGE_WIDTH / BG_MID_SCROLL_FACTOR; // 6144 / 0.3 = 20480 pixels

// Define the preload function
function preload() {
    this.load.image('platform_small', 'assets/obstacles/junker_small.png');
    this.load.image('platform_medium', 'assets/obstacles/junker_medium.png');
    this.load.image('platform_large', 'assets/obstacles/junker_large.png');
    this.load.image('token', 'assets/obstacles/token.png');
    this.load.image('token2', 'assets/obstacles/token2.png');
    this.load.image('token3', 'assets/obstacles/token3.png');
    this.load.image('obstacle', 'assets/obstacles/obstacle.png');
    this.load.spritesheet('obstacle_hit', 'assets/obstacles/obstacle_hit.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('geartickler', 'assets/characters/geartickler.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('geartickler_invincible', 'assets/characters/geartickler_invincible.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('kyle', 'assets/characters/kyle.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('kyle_invincible', 'assets/characters/kyle_invincible.png', { frameWidth: 48, frameHeight: 48 });
    this.load.audio('start_music', 'assets/audio/start_music.mp3');
    this.load.audio('gameplay_music', 'assets/audio/gameplay_music.mp3');
    this.load.audio('invincibility_sound', 'assets/audio/invincibility_sound.mp3');
    this.load.audio('obstacle_hit_sound', 'assets/audio/obstacle_hit_sound.mp3');
    this.load.audio('obstacle_hit_normal_sound', 'assets/audio/obstacle_hit_normal_sound.mp3');
    this.load.audio('token1_sound', 'assets/audio/token1_sound.mp3');
    this.load.audio('token2_sound', 'assets/audio/token2_sound.mp3');
    this.load.image('button_left', 'assets/ui/button_left.png');
    this.load.image('button_right', 'assets/ui/button_right.png');
    this.load.image('button_start', 'assets/ui/button_start.png');
    this.load.image('bg_far', 'assets/backgrounds/bg_far.png');
    this.load.image('bg_mid', 'assets/backgrounds/bg_mid.png');
    this.load.image('logo', 'assets/logo.png');
}

async function create() {
    // Reset game state variables at the start of the scene
    gameStarted = false;
    score = 0;
    lives = 3;
    isHit = false;
    hitCooldown = 0;
    lastHitTime = 0;
    selectedPlayer = null;
    lastPlatformX = 0;
    lastPlatformY = 0;
    lastDirectionUp = false;
    isClickingLeft = false;
    isClickingRight = false;
    isInvincible = false;
    invincibilityTimer = 0;
    flashTimer = 0;
    isFlashing = false;
    currentSprite = null;
    player = null;
    platforms = null;
    tokens = null;
    tokens2 = null;
    tokens3 = null;
    obstacles = null;
    hud = null;
    leftButton = null;
    rightButton = null;
    scoreText = null;
    livesText = null;
    cursors = null;
    bgFar = null;
    bgMid = null;
    smoothedScrollX = 0;
    obstacleTimer = null;

    // Stop any existing audio
    if (startMusic) {
        startMusic.stop();
    }
    if (gameplayMusic) {
        gameplayMusic.stop();
    }
    if (invincibilitySound) {
        invincibilitySound.stop();
    }

    startMusic = this.sound.add('start_music', { loop: true, volume: 0.05 });
    startMusic.play();

    // Add the logo at the top center, 2x size (192x96)
    this.add.image(400, 50, 'logo')
        .setOrigin(0.5)
        .setDisplaySize(192, 96)
        .setDepth(11);

    // Adjust text positions (shift down by logo height + padding)
    // Logo height is 96, add 30 padding
    this.add.text(400, 50 + 96 + 30, 'Choose Your Player', 
        { fontSize: '48px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const paulPreview = this.add.sprite(300, 250, 'geartickler', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'paul';
            paulPreview.setTint(0x00ff00);
            kylePreview.clearTint();
            startButton.setAlpha(1);
        });

    this.add.text(300, 300, 'Paul', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const kylePreview = this.add.sprite(500, 250, 'kyle', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'kyle';
            kylePreview.setTint(0x00ff00);
            paulPreview.clearTint();
            startButton.setAlpha(1);
        });

    this.add.text(500, 300, 'Kyle', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    try {
        let leaderboard = await fetchGlobalLeaderboard();
        this.add.text(400, 500 + 96 + 30, 
            'Global Leaderboard:\n' + (leaderboard.length ? leaderboard.map((entry, index) => 
                `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n') : 'No scores yet'), 
            { fontSize: '16px', fill: '#ffffff', align: 'center' })
            .setOrigin(0.5);
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        this.add.text(400, 500 + 96 + 30, 
            'Global Leaderboard:\nFailed to load', 
            { fontSize: '16px', fill: '#ffffff', align: 'center' })
            .setOrigin(0.5);
    }

    // Start button at y=400 to avoid overlap with leaderboard
    const startButton = this.add.image(400, 400, 'button_start')
        .setOrigin(0.5)
        .setDisplaySize(200, 80)
        .setInteractive()
        .setAlpha(0.5)
        .on('pointerdown', () => {
            if (selectedPlayer) {
                paulPreview.destroy();
                kylePreview.destroy();
                startButton.destroy();
                this.children.list.filter(child => child.type === 'Text' && child.text !== 'Con Coins: ' + score).forEach(child => child.destroy());
                showExplanationScreen(this);
            } else {
                console.log('Please select a player first!');
            }
        })
        .on('pointerover', () => {
            if (selectedPlayer) startButton.setTint(0xcccccc);
        })
        .on('pointerout', () => startButton.clearTint());
}

function showExplanationScreen(scene) {
    scene.children.list.forEach(child => {
        if (child.type !== 'Text' || child.text === 'Con Coins: 0') {
            child.destroy();
        }
    });

    const background = scene.add.rectangle(config.width / 2, config.height / 2, config.width, config.height, 0x0e343c, 0.9)
        .setDepth(10);

    // Add the logo at the top center, 2x size (192x96)
    scene.add.image(config.width / 2, 50, 'logo')
        .setOrigin(0.5)
        .setDisplaySize(192, 96)
        .setDepth(11);

    // Adjust text positions (shift down by logo height + padding)
    const title = scene.add.text(config.width / 2, 120, 'How to Play', {
        fontSize: '48px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5).setDepth(11);

    const instructions = scene.add.text(config.width / 2, 220 + 96 + 30, 
        'Objective: Get to ASOTU CON by collecting \n' + 
        'Con Coins while avoiding industry buzzwords.\n\n' +
        '- Use the left and right buttons \n' +
        'or arrow keys to move. \n' +
        '-Con Coins are +1, +3 or grant Invincibility. \n' +
        '- Hitting buzzwords deducts 1 life and 1 Con Coin. \n' +
        '- While invincible, buzzwords grant 1 life (up to 5).\n' +
        '- You start with 3 lives.\n' +
        '- Game over if you run out of lives \n' +
        'or you fall off the screen.\n\n' +
        'Good luck on your journey to ASOTU CON!',
        {
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(11);

    // Start button at bottom to avoid overlap
    const startButton = scene.add.image(config.width / 2, config.height - 100, 'button_start')
        .setOrigin(0.5)
        .setDisplaySize(200, 80)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            background.destroy();
            title.destroy();
            instructions.destroy();
            startButton.destroy();
            startGame(scene);
        })
        .on('pointerover', () => startButton.setTint(0xcccccc))
        .on('pointerout', () => startButton.clearTint());
}

async function showGameOverScreen(scene) {
    gameStarted = false;
    scene.cameras.main.stopFollow();

    // Clean up timers
    if (obstacleTimer) {
        obstacleTimer.remove();
        obstacleTimer = null;
    }

    // Destroy player and set to null
    if (player) {
        player.destroy();
        player = null;
    }

    // Destroy game objects
    tokens.getChildren().forEach(token => token.destroy());
    tokens.clear(true, true);
    tokens2.getChildren().forEach(token => token.destroy());
    tokens2.clear(true, true);
    tokens3.getChildren().forEach(token => token.destroy());
    tokens3.clear(true, true);
    obstacles.getChildren().forEach(obstacle => obstacle.destroy());
    obstacles.clear(true, true);
    platforms.getChildren().forEach(platform => platform.destroy());
    platforms.clear(true, true);

    // Destroy HUD and its children (including buttons)
    if (hud) {
        hud.getChildren().forEach(child => {
            if (child === leftButton || child === rightButton) {
                child.removeAllListeners();
            }
            child.destroy();
        });
        hud.clear(true, true);
        hud = null;
        leftButton = null;
        rightButton = null;
        scoreText = null;
        livesText = null;
    }

    // Destroy parallax backgrounds
    if (bgFar) {
        bgFar.destroy();
        bgFar = null;
    }
    if (bgMid) {
        bgMid.destroy();
        bgMid = null;
    }

    // Stop audio
    if (gameplayMusic) {
        gameplayMusic.stop();
        gameplayMusic.volume = 0.05;
    }

    if (invincibilitySound && invincibilitySound.isPlaying) {
        invincibilitySound.stop();
    }

    // Reset input states
    isClickingLeft = false;
    isClickingRight = false;
    cursors = null;

    // Reset game state variables
    isHit = false;
    hitCooldown = 0;
    lastHitTime = 0;
    isInvincible = false;
    invincibilityTimer = 0;
    flashTimer = 0;
    isFlashing = false;
    currentSprite = null;
    lastPlatformX = 0;
    lastPlatformY = 0;
    lastDirectionUp = false;
    smoothedScrollX = 0;

    const cameraCenterX = scene.cameras.main.scrollX + config.width / 2;
    const cameraCenterY = scene.cameras.main.scrollY + GAME_HEIGHT / 2;

    scene.add.rectangle(cameraCenterX, cameraCenterY, 800, GAME_HEIGHT, 0x0e343c).setDepth(10);

    // Add the logo at the top center, 2x size (192x96), adjusted for camera scroll
    scene.add.image(cameraCenterX, scene.cameras.main.scrollY + 50, 'logo')
        .setOrigin(0.5)
        .setDisplaySize(192, 96)
        .setDepth(11);

    // Adjust text positions (shift down by logo height + padding)
    scene.add.text(cameraCenterX, cameraCenterY - 275 + 96 + 30, 
        'The Road to ASOTU CON ends in Baltimore\non May 13-16. We hope to see you there!', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    scene.add.text(cameraCenterX, cameraCenterY - 180 + 96 + 30, `Final Con Coins: ${score}`, 
        { fontSize: '36px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    const initialsText = scene.add.text(cameraCenterX, cameraCenterY - 130 + 96 + 30, 'Tap here to enter initials', 
        { fontSize: '24px', fill: '#ffffff', align: 'center', backgroundColor: '#333333', padding: { x: 10, y: 5 } })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', async () => {
            const initials = prompt('Enter 3 initials (A-Z):', '').toUpperCase();
            if (initials && /^[A-Z]{3}$/.test(initials)) {
                const success = await submitScore(initials, score);
                if (success) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    let leaderboard = await fetchGlobalLeaderboard();
                    leaderboardTextObj.setText('Global Leaderboard:\n' + (leaderboard.length ? leaderboard.map((entry, index) => 
                        `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n') : 'No scores yet'));
                    initialsText.setText(`Initials: ${initials}`);
                    initialsText.disableInteractive();
                } else {
                    alert('Failed to submit score. Check console for details.');
                }
            } else {
                alert('Please enter exactly 3 letters (A-Z).');
            }
        });

    let leaderboard = await fetchGlobalLeaderboard();
    let leaderboardTextObj = scene.add.text(cameraCenterX, cameraCenterY + 20 + 96 + 30, 
        'Global Leaderboard:\n' + (leaderboard.length ? leaderboard.map((entry, index) => 
            `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n') : 'No scores yet'), 
        { fontSize: '20px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    const startButton = scene.add.image(cameraCenterX, cameraCenterY + 250 + 96 + 30, 'button_start')
        .setOrigin(0.5)
        .setDisplaySize(200, 80)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            score = 0;
            lives = 3;
            scene.scene.restart();
        })
        .on('pointerover', () => startButton.setTint(0xcccccc))
        .on('pointerout', () => startButton.clearTint());
}

function startGame(scene) {
    gameStarted = true;
    score = 0;
    lives = 3;
    lastHitTime = 0;
    isInvincible = false;
    invincibilityTimer = 0;
    flashTimer = 0;
    isFlashing = false;
    smoothedScrollX = 0;
    isClickingLeft = false;
    isClickingRight = false;

    if (startMusic && startMusic.isPlaying) {
        startMusic.stop();
    }
    if (!gameplayMusic) {
        gameplayMusic = scene.sound.add('gameplay_music', { loop: true, volume: 0.05 });
    }
    if (!gameplayMusic.isPlaying) {
        gameplayMusic.play();
    }

    if (!invincibilitySound) {
        invincibilitySound = scene.sound.add('invincibility_sound', { volume: 0.15 });
    }

    if (!obstacleHitSound) {
        obstacleHitSound = scene.sound.add('obstacle_hit_sound', { volume: 0.1 });
    }

    if (!obstacleHitNormalSound) {
        obstacleHitNormalSound = scene.sound.add('obstacle_hit_normal_sound', { volume: 0.1 });
    }

    if (!token1Sound) {
        token1Sound = scene.sound.add('token1_sound', { volume: 0.1 });
    }

    if (!token2Sound) {
        token2Sound = scene.sound.add('token2_sound', { volume: 0.1 });
    }

    // Create parallax background layers (no logo here)
    bgFar = scene.add.tileSprite(0, 0, config.width, GAME_HEIGHT, 'bg_far')
        .setOrigin(0, 0)
        .setDepth(-3)
        .setScrollFactor(0)
        .setAlpha(1)
        .setVisible(true);

    bgMid = scene.add.tileSprite(0, 0, config.width, GAME_HEIGHT, 'bg_mid')
        .setOrigin(0, 0)
        .setDepth(-2)
        .setScrollFactor(0)
        .setAlpha(0.8)
        .setVisible(true);

    const playerSprite = selectedPlayer === 'paul' ? 'geartickler' : 'kyle';
    currentSprite = playerSprite;
    player = scene.physics.add.sprite(playerStartX, playerStartY, playerSprite);
    player.setBounce(0);
    player.setCollideWorldBounds(false);
    player.setDepth(1);
    player.setScale(1);

    scene.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    platforms = scene.physics.add.group({
        immovable: true,
        allowGravity: false
    });

    tokens = scene.physics.add.group();
    tokens2 = scene.physics.add.group();
    tokens3 = scene.physics.add.group();
    obstacles = scene.physics.add.group();

    generateInitialPlatforms(scene);

    cursors = scene.input.keyboard.createCursorKeys();

    scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);

    updateAnimations(scene, currentSprite);

    const obstacleFrames = scene.anims.generateFrameNumbers('obstacle_hit', { start: 0, end: 1 });
    if (obstacleFrames.length > 0) {
        scene.anims.create({
            key: 'obstacle_hit_anim',
            frames: obstacleFrames,
            frameRate: 10,
            repeat: 0
        });
    } else {
        console.error('Failed to generate frames for obstacle_hit_anim. Check obstacle_hit spritesheet.');
    }

    scene.physics.add.collider(player, platforms, (player, platform) => {
        try {
            if (player.body.touching.down || player.body.touching.up) {
                player.setVelocityY(-330);
            }

            if (!isInvincible) {
                if (player.body.touching.down) {
                    platform.hitCount = (platform.hitCount || 0) + 1;
                    if (platform.hitCount >= 2) {
                        let currentAlpha = platform.alpha || 1;
                        currentAlpha -= 0.25;
                        platform.setAlpha(currentAlpha);
                        if (currentAlpha <= 0) {
                            platform.destroy();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in platform collider callback:', error);
        }
    });

    scene.physics.add.overlap(player, tokens, (p, t) => collectToken(p, t, 'token'), null, scene);
    scene.physics.add.overlap(player, tokens2, (p, t) => collectToken(p, t, 'token2'), null, scene);
    scene.physics.add.overlap(player, tokens3, (p, t) => collectToken(p, t, 'token3'), null, scene);
    scene.physics.add.overlap(player, obstacles, hitObstacle, null, scene);

    hud = scene.add.group();
    hud.setDepth(HUD_DEPTH);

    const separatorBar = scene.add.rectangle(config.width / 2, GAME_HEIGHT, config.width, 5, 0x000000)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH);

    const hudBackground = scene.add.rectangle(config.width / 2, config.height - HUD_HEIGHT / 2, config.width, HUD_HEIGHT, 0xe00b8d1)
        .setAlpha(1)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH);
    hud.add(hudBackground);

    scoreText = scene.add.text(config.width / 2, config.height - HUD_HEIGHT / 2 - 40, 'Con Coins: ' + score, { 
        fontFamily: 'Arial', 
        fontSize: '40px',
        fontStyle: 'bold',
        fill: '#ffffff' 
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1);
    hud.add(scoreText);

    livesText = scene.add.text(config.width / 2, config.height - HUD_HEIGHT / 2, 'Lives: ' + lives, { 
        fontFamily: 'Arial', 
        fontSize: '40px',
        fontStyle: 'bold',
        fill: '#ffffff' 
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1);
    hud.add(livesText);

    // Add the logo to the HUD at original size (96x48)
    const logo = scene.add.image(config.width / 2, config.height - HUD_HEIGHT / 2 + 40, 'logo')
        .setOrigin(0.5)
        .setDisplaySize(96, 48)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1);
    hud.add(logo);

    leftButton = scene.add.image(BUTTON_SIZE / 2, config.height - HUD_HEIGHT / 2, 'button_left')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(BUTTON_SIZE, BUTTON_SIZE)
        .setAlpha(1)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1)
        .setInteractive()
        .on('pointerdown', () => {
            isClickingLeft = true;
            isClickingRight = false;
        })
        .on('pointerup', () => {
            isClickingLeft = false;
        })
        .on('pointerout', () => {
            isClickingLeft = false;
        })
        .on('pointerupoutside', () => {
            isClickingLeft = false;
        });
    hud.add(leftButton);

    rightButton = scene.add.image(config.width - BUTTON_SIZE / 2, config.height - HUD_HEIGHT / 2, 'button_right')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(BUTTON_SIZE, BUTTON_SIZE)
        .setAlpha(1)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1)
        .setInteractive()
        .on('pointerdown', () => {
            isClickingRight = true;
            isClickingLeft = false;
        })
        .on('pointerup', () => {
            isClickingRight = false;
        })
        .on('pointerout', () => {
            isClickingRight = false;
        })
        .on('pointerupoutside', () => {
            isClickingRight = false;
        });
    hud.add(rightButton);

    obstacleTimer = scene.time.addEvent({
        delay: 1500,
        callback: () => generateObstacle(scene),
        callbackScope: scene,
        loop: true
    });
}

function update() {
    if (!gameStarted || !player) {
        return;
    }

    if (isHit) {
        player.setVelocityX(0);
        return;
    }

    if (hitCooldown > 0) {
        hitCooldown -= this.game.loop.delta;
        if (hitCooldown <= 0) {
            hitCooldown = 0;
        }
    }

    if (isInvincible) {
        invincibilityTimer -= this.game.loop.delta;

        if (invincibilityTimer > FLASH_START_TIME) {
            const invincibleSprite = selectedPlayer === 'paul' ? 'geartickler_invincible' : 'kyle_invincible';
            if (currentSprite !== invincibleSprite) {
                currentSprite = invincibleSprite;
                player.setTexture(currentSprite);
                updateAnimations(this, currentSprite);
                player.setScale(1.5);
            }
        }

        if (invincibilityTimer <= 0) {
            isInvincible = false;
            invincibilityTimer = 0;
            isFlashing = false;
            flashTimer = 0;

            currentSprite = selectedPlayer === 'paul' ? 'geartickler' : 'kyle';
            player.setTexture(currentSprite);
            updateAnimations(this, currentSprite);
            player.setScale(1);
            player.anims.play('idle', true);

            if (gameplayMusic) {
                this.tweens.add({
                    targets: gameplayMusic,
                    volume: 0.05,
                    duration: 500,
                    ease: 'Linear'
                });
            }
        } else if (invincibilityTimer <= FLASH_START_TIME) {
            isFlashing = true;
            flashTimer += this.game.loop.delta;
            if (flashTimer >= FLASH_INTERVAL) {
                flashTimer = 0;
                const originalSprite = selectedPlayer === 'paul' ? 'geartickler' : 'kyle';
                const invincibleSprite = selectedPlayer === 'paul' ? 'geartickler_invincible' : 'kyle_invincible';
                currentSprite = currentSprite === invincibleSprite ? originalSprite : invincibleSprite;
                player.setTexture(currentSprite);
                player.setScale(currentSprite.includes('invincible') ? 1.5 : 1);
                updateAnimations(this, currentSprite);
            }
        }
    }

    let currentAnimation = player.anims.currentAnim ? player.anims.currentAnim.key : 'idle';
    if ((cursors && cursors.left.isDown) || isClickingLeft) {
        player.setVelocityX(-160);
        if (currentAnimation !== 'move_left') {
            player.anims.play('move_left', true);
        }
    } else if ((cursors && cursors.right.isDown) || isClickingRight) {
        player.setVelocityX(160);
        if (currentAnimation !== 'move_right') {
            player.anims.play('move_right', true);
        }
    } else {
        player.setVelocityX(0);
        if (currentAnimation !== 'idle') {
            player.anims.play('idle', true);
        }
    }

    if (player.y > GAME_HEIGHT) {
        console.log('Game Over Triggered: Player fell below visible screen');
        showGameOverScreen(this);
        return;
    }

    const cameraRightEdge = this.cameras.main.scrollX + config.width;
    if (player.x > lastPlatformX - config.width * 2) {
        const newPlatformX = lastPlatformX + Phaser.Math.Between(minPlatformSpacingX, maxPlatformSpacingX);
        generatePlatform(this, newPlatformX);
    }

    const cameraScrollX = this.cameras.main.scrollX;
    smoothedScrollX += (cameraScrollX - smoothedScrollX) * PARALLAX_SMOOTHING;

    if (bgFar) {
        bgFar.tilePositionX = smoothedScrollX * BG_FAR_SCROLL_FACTOR;
    }
    if (bgMid) {
        bgMid.tilePositionX = (smoothedScrollX * BG_MID_SCROLL_FACTOR) % MIDGROUND_IMAGE_WIDTH;
    }

    platforms.getChildren().forEach(platform => {
        if (platform.x < this.cameras.main.scrollX - config.width * 1.5) {
            platform.destroy();
        }
    });

    obstacles.getChildren().forEach(obstacle => {
        if (obstacle.y < -50 || obstacle.y > GAME_HEIGHT + 50) {
            obstacle.destroy();
        }
    });

    tokens.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
        }
    });

    tokens2.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
        }
    });

    tokens3.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
        }
    });
}

function generateInitialPlatforms(scene) {
    const firstPlatform = platforms.create(player.x, player.y + 100, 'platform_medium').refreshBody();
    firstPlatform.hitCount = 0;
    firstPlatform.setAlpha(1);
    lastPlatformY = firstPlatform.y;

    let previousPlatformX = playerStartX + 50;
    for (let i = 0; i < maxVisiblePlatforms - 1; i++) {
        generatePlatform(scene, previousPlatformX);
        previousPlatformX += Phaser.Math.Between(minPlatformSpacingX, maxPlatformSpacingX);
    }
    lastPlatformX = previousPlatformX;
}

function generatePlatform(scene, xPosition) {
    let platformY;
    lastDirectionUp = !lastDirectionUp;
    if (lastDirectionUp) {
        platformY = lastPlatformY - Phaser.Math.Between(verticalStepMin, verticalStepMax);
    } else {
        platformY = lastPlatformY + Phaser.Math.Between(verticalStepMin, verticalStepMax);
    }

    platformY = Phaser.Math.Clamp(platformY, minPlatformY, maxPlatformY);

    const platformTypes = ['platform_small', 'platform_medium', 'platform_large'];
    const selectedPlatform = Phaser.Utils.Array.GetRandom(platformTypes);

    let newPlatform;
    let attempts = 0;
    const maxAttempts = 10;
    do {
        if (newPlatform) newPlatform.destroy();
        newPlatform = platforms.create(xPosition, platformY, selectedPlatform).refreshBody();
        attempts++;

        if (attempts > maxAttempts) {
            newPlatform.destroy();
            return;
        }

        const bounds = newPlatform.getBounds();
        bounds.width += overlapBuffer;
        bounds.height += overlapBuffer;
        bounds.x -= overlapBuffer / 2;
        bounds.y -= overlapBuffer / 2;

        if (platforms.getChildren().some(p => p !== newPlatform && 
            Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), bounds))) {
            platformY = Phaser.Math.Clamp(lastPlatformY + (lastDirectionUp ? -1 : 1) * Phaser.Math.Between(verticalStepMin, verticalStepMax), minPlatformY, maxPlatformY);
            xPosition += Phaser.Math.Between(10, 50);
        } else {
            break;
        }
    } while (true);

    newPlatform.body.immovable = true;
    newPlatform.body.allowGravity = false;

    newPlatform.hitCount = 0;
    newPlatform.setAlpha(1);

    let hasToken1 = false;

    if (tokens.getChildren().length < maxVisibleTokens && Phaser.Math.Between(0, 99) <= 49) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens.create(tokenX, tokenY, 'token').setGravityY(-300);
        hasToken1 = true;
    }

    if (tokens3.getChildren().length < maxVisibleTokens3 && Phaser.Math.Between(0, 99) <= 19 && !hasToken1) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens3.create(tokenX, tokenY, 'token3').setGravityY(-300);
    }

    if (tokens2.getChildren().length < maxVisibleTokens2 && Phaser.Math.Between(0, 1) === 0 && !hasToken1) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens2.create(tokenX, tokenY, 'token2').setGravityY(-300);
    }

    if (xPosition > lastPlatformX) {
        lastPlatformX = xPosition;
        lastPlatformY = platformY;
    }
}

function generateObstacle(scene) {
    const obstacleX = scene.cameras.main.scrollX + Phaser.Math.Between(0, config.width);
    const isClimbing = Phaser.Math.Between(0, 1) === 1;
    const startY = isClimbing ? GAME_HEIGHT + 50 : -50;
    const obstacle = obstacles.create(obstacleX, startY, 'obstacle');
    obstacle.setVelocityY(isClimbing ? -150 : 150);
    obstacle.setGravityY(-300);
}

function updateAnimations(scene, spriteKey) {
    scene.anims.remove('idle');
    scene.anims.remove('move_left');
    scene.anims.remove('move_right');
    scene.anims.remove('hit_animation');

    scene.anims.create({
        key: 'idle',
        frames: [{ key: spriteKey, frame: 0 }],
        frameRate: 1
    });
    scene.anims.create({
        key: 'move_left',
        frames: [{ key: spriteKey, frame: 3 }],
        frameRate: 1
    });
    scene.anims.create({
        key: 'move_right',
        frames: [{ key: spriteKey, frame: 5 }],
        frameRate: 1
    });
    scene.anims.create({
        key: 'hit_animation',
        frames: scene.anims.generateFrameNumbers(spriteKey, { start: 6, end: 7 }),
        frameRate: 20,
        repeat: 7
    });
}

function collectToken(player, token, tokenType) {
    if (isHit) {
        return;
    }

    token.destroy();
    if (tokenType === 'token') {
        score += 1;
        token1Sound.play();
    } else if (tokenType === 'token2') {
        score += 3;
        token2Sound.play();
    } else if (tokenType === 'token3') {
        isInvincible = true;
        invincibilityTimer = INVINCIBILITY_DURATION;
        flashTimer = 0;
        isFlashing = false;

        if (isHit) {
            isHit = false;
            player.clearTint();
        }

        if (selectedPlayer === 'paul') {
            currentSprite = 'geartickler_invincible';
            player.setTexture('geartickler_invincible');
        } else {
            currentSprite = 'kyle_invincible';
            player.setTexture('kyle_invincible');
        }

        updateAnimations(player.scene, currentSprite);
        player.setScale(1.5);

        invincibilitySound.play();
        if (gameplayMusic && gameplayMusic.isPlaying) {
            player.scene.tweens.add({
                targets: gameplayMusic,
                volume: 0,
                duration: 500,
                ease: 'Linear'
            });
        }
    }
    scoreText.setText('Con Coins: ' + score);
}

function showMaxLivesMessage(scene) {
    if (maxLivesMessage) {
        maxLivesMessage.destroy();
        maxLivesMessage = null;
    }

    maxLivesMessage = scene.add.text(config.width / 2, GAME_HEIGHT - 50, 'Max Lives Reached!', {
        fontFamily: 'Arial',
        fontSize: '28px',
        fontStyle: 'bold',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 2)
        .setAlpha(1);

    scene.tweens.add({
        targets: maxLivesMessage,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
            if (maxLivesMessage) {
                maxLivesMessage.destroy();
                maxLivesMessage = null;
            }
        }
    });
}

function showLivesGainedMessage(scene) {
    if (livesGainedMessage) {
        livesGainedMessage.destroy();
        livesGainedMessage = null;
    }

    livesGainedMessage = scene.add.text(config.width / 2, GAME_HEIGHT - 50, '+1 Lives', {
        fontFamily: 'Arial',
        fontSize: '28px',
        fontStyle: 'bold',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 2)
        .setAlpha(1);

    scene.tweens.add({
        targets: livesGainedMessage,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
            if (livesGainedMessage) {
                livesGainedMessage.destroy();
                livesGainedMessage = null;
            }
        }
    });
}

function hitObstacle(player, obstacle) {
    const currentTime = Date.now();

    if (hitCooldown > 0 || (currentTime - lastHitTime < HIT_DEBOUNCE_WINDOW)) {
        return;
    }

    hitCooldown = HIT_COOLDOWN_DURATION;
    lastHitTime = currentTime;

    obstacle.setVelocityY(0);
    obstacle.setTexture('obstacle_hit');
    if (player.scene.anims.exists('obstacle_hit_anim')) {
        obstacle.anims.play('obstacle_hit_anim', true);
    } else {
        console.error('obstacle_hit_anim not found. Available animations:', player.scene.anims.anims.keys());
        console.error('Forcing obstacle destruction due to missing animation.');
        obstacle.destroy();
        if (!isInvincible) {
            player.once('animationcomplete-hit_animation', () => {
                isHit = false;
                player.clearTint();
                player.anims.play('idle', true);
            });
        }
        return;
    }

    if (isInvincible && isHit === false) {
        if (lives < MAX_LIVES) {
            lives = Math.min(MAX_LIVES, lives + 1);
            livesText.setText('Lives: ' + lives);
            showLivesGainedMessage(player.scene);
        } else {
            showMaxLivesMessage(player.scene);
        }

        obstacle.once('animationcomplete-obstacle_hit_anim', () => {
            obstacle.destroy();
        });
        obstacleHitSound.play();
        isHit = false;

        return;
    }

    isHit = true;

    score = Math.max(0, score - 1);
    scoreText.setText('Con Coins: ' + score);

    lives = Math.max(0, lives - 1);
    livesText.setText('Lives: ' + lives);

    player.anims.stop();
    player.anims.play('hit_animation', true);
    player.setTint(0xff4201);

    obstacle.once('animationcomplete-obstacle_hit_anim', () => {
        obstacle.destroy();
        player.once('animationcomplete-hit_animation', () => {
            isHit = false;
            player.clearTint();
            player.anims.play('idle', true);
        });
    });

    obstacleHitNormalSound.play();

    if (lives <= 0) {
        console.log('Game Over Triggered: Lives depleted');
        setTimeout(() => {
            showGameOverScreen(player.scene);
        }, 100);
    }
}

async function fetchGlobalLeaderboard() {
    try {
        const response = await fetch('https://road-to-asotu-con-default-rtdb.firebaseio.com/leaderboard.json', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        const leaderboard = data ? Object.values(data).sort((a, b) => b.score - a.score).slice(0, 10) : [];
        return leaderboard;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function submitScore(initials, score) {
    try {
        const response = await fetch('https://road-to-asotu-con-default-rtdb.firebaseio.com/leaderboard.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initials, score, timestamp: Date.now() })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return true;
    } catch (error) {
        console.error('Error submitting score:', error);
        return false;
    }
}