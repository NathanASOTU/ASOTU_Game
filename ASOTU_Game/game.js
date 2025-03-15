// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 750, // Increased to include HUD (600px game + 150px HUD)
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 300 }, 
            debug: false 
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
let player, cursors, platforms, tokens, tokens2, tokens3, obstacles, scoreText, livesText, maxLivesMessage;
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
const MAX_LIVES = 10;
const WORLD_WIDTH = 200000;

function preload() {
    this.load.image('platform_small', 'assets/obstacles/junker_small.png');
    console.log('Loading platform_small from assets/obstacles/junker_small.png');
    this.load.image('platform_medium', 'assets/obstacles/junker_medium.png');
    console.log('Loading platform_medium from assets/obstacles/junker_medium.png');
    this.load.image('platform_large', 'assets/obstacles/junker_large.png');
    console.log('Loading platform_large from assets/obstacles/junker_large.png');
    this.load.image('token', 'assets/obstacles/token.png');
    this.load.image('token2', 'assets/obstacles/token2.png');
    this.load.image('token3', 'assets/obstacles/token3.png');
    this.load.image('obstacle', 'assets/obstacles/obstacle.png');
    this.load.spritesheet('obstacle_hit', 'assets/obstacles/obstacle_hit.png', { frameWidth: 64, frameHeight: 64 });
    console.log('Loading obstacle_hit from assets/obstacles/obstacle_hit.png');
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
    console.log('Loading button_left from assets/ui/button_left.png');
    this.load.image('button_right', 'assets/ui/button_right.png');
    console.log('Loading button_right from assets/ui/button_right.png');
}

function generateInitialPlatforms(scene) {
    const firstPlatform = platforms.create(player.x, player.y + 100, 'platform_medium').refreshBody();
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
            console.log(`Failed to place platform at (${xPosition}, ${platformY}) after ${maxAttempts} attempts`);
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

    let hasToken1 = false;

    if (tokens.getChildren().length < maxVisibleTokens && Phaser.Math.Between(0, 99) <= 49) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens.create(tokenX, tokenY, 'token').setGravityY(-300);
        hasToken1 = true;
        console.log(`Token (Type 1) created at (${tokenX}, ${tokenY}) - Below platform (50% chance)`);
    } else {
        console.log(`Token (Type 1) not spawned at (${xPosition}, ${platformY}) - 50% chance failed`);
    }

    if (tokens3.getChildren().length < maxVisibleTokens3 && Phaser.Math.Between(0, 99) <= 19 && !hasToken1) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens3.create(tokenX, tokenY, 'token3').setGravityY(-300);
        console.log(`Token (Type 3) created at (${tokenX}, ${tokenY}) - Below platform (20% chance)`);
    } else {
        console.log(`Token (Type 3) not spawned at (${xPosition}, ${platformY}) - 20% chance failed`);
    }

    if (tokens2.getChildren().length < maxVisibleTokens2 && Phaser.Math.Between(0, 1) === 0 && !hasToken1) {
        let tokenX = xPosition + Phaser.Math.Between(-20, 20);
        let tokenY = platformY - newPlatform.height / 2 - 25;
        tokens2.create(tokenX, tokenY, 'token2').setGravityY(-300);
        console.log(`Token (Type 2) created at (${tokenX}, ${tokenY}) - Below platform (50% chance)`);
    } else {
        console.log(`Token (Type 2) not spawned at (${xPosition}, ${platformY}) - 50% chance failed`);
    }

    if (xPosition > lastPlatformX) {
        lastPlatformX = xPosition;
        lastPlatformY = platformY;
    }
    console.log(`Placed ${selectedPlatform} at (${xPosition}, ${platformY})`);
}

function generateObstacle(scene) {
    const obstacleX = scene.cameras.main.scrollX + Phaser.Math.Between(0, config.width);
    const isClimbing = Phaser.Math.Between(0, 1) === 1;
    const startY = isClimbing ? GAME_HEIGHT + 50 : -50;
    const obstacle = obstacles.create(obstacleX, startY, 'obstacle');
    obstacle.setVelocityY(isClimbing ? -150 : 150);
    obstacle.setGravityY(-300);
    console.log(`Obstacle created at (${obstacleX}, ${startY}) - ${isClimbing ? 'Climbing' : 'Falling'}`);
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
    console.log(`Animations updated for sprite: ${spriteKey}`);
}

function collectToken(player, token, tokenType) {
    if (isHit) {
        console.log('Token collection blocked: Character is in hit state (red).');
        return;
    }

    token.destroy();
    if (tokenType === 'token') {
        score += 1;
        console.log('Token (Type 1) collected! +1 Con Coin. Total: ' + score);
        token1Sound.play();
    } else if (tokenType === 'token2') {
        score += 3;
        console.log('Token (Type 2) collected! +3 Con Coins. Total: ' + score);
        token2Sound.play();
    } else if (tokenType === 'token3') {
        isInvincible = true;
        invincibilityTimer = INVINCIBILITY_DURATION;
        flashTimer = 0;
        isFlashing = false;

        if (isHit) {
            isHit = false;
            player.clearTint();
            console.log('Cleared hit state and tint due to invincibility collection.');
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
                ease: 'Linear',
                onComplete: () => {
                    console.log('Gameplay music faded out during invincibility.');
                }
            });
        }

        console.log('Token (Type 3) collected! Invincibility activated for 15 seconds.');
    }
    scoreText.setText('Con Coins: ' + score);
}

function showMaxLivesMessage(scene) {
    console.log('showMaxLivesMessage called, current maxLivesMessage:', maxLivesMessage);
    if (maxLivesMessage) {
        console.log('Destroying existing maxLivesMessage');
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
            console.log('Tween completed, maxLivesMessage state:', maxLivesMessage);
            if (maxLivesMessage) {
                maxLivesMessage.destroy();
                maxLivesMessage = null;
                console.log('maxLivesMessage destroyed in onComplete');
            } else {
                console.log('maxLivesMessage was null during onComplete, skipping destroy');
            }
        }
    });
}

function hitObstacle(player, obstacle) {
    const currentTime = Date.now();
    console.log(`hitObstacle called for obstacle at (${obstacle.x}, ${obstacle.y}), hitCooldown: ${hitCooldown}, time since last hit: ${currentTime - lastHitTime}ms`);

    if (hitCooldown > 0 || (currentTime - lastHitTime < HIT_DEBOUNCE_WINDOW)) {
        console.log('Hit blocked by cooldown or debounce');
        return;
    }

    hitCooldown = HIT_COOLDOWN_DURATION;
    lastHitTime = currentTime;

    obstacle.setVelocityY(0);
    obstacle.setTexture('obstacle_hit');
    if (player.scene.anims.exists('obstacle_hit_anim')) {
        obstacle.anims.play('obstacle_hit_anim', true);
        console.log('Playing obstacle_hit_anim');
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
        console.log('Hit blocked by invincibility - attempting to gain a life');
        if (lives < MAX_LIVES) {
            lives = Math.min(MAX_LIVES, lives + 1);
            livesText.setText('Lives: ' + lives);
            console.log(`Life gained due to invincibility. New total: ${lives}`);
        } else {
            console.log('Cannot gain life: Max lives reached');
            showMaxLivesMessage(player.scene);
        }

        obstacle.once('animationcomplete-obstacle_hit_anim', () => {
            obstacle.destroy();
            console.log('Obstacle destroyed after animation (invincible hit)');
        });
        obstacleHitSound.play();
        isHit = false;
        return;
    }

    console.log('Processing hit with obstacle.');
    isHit = true;

    score = Math.max(0, score - 1);
    scoreText.setText('Con Coins: ' + score);
    console.log(`Con Coin deducted. New total: ${score}`);

    lives = Math.max(0, lives - 1);
    livesText.setText('Lives: ' + lives);
    console.log(`Life deducted. New total: ${lives}`);

    player.anims.stop();
    player.anims.play('hit_animation', true);
    player.setTint(0xff4201);

    obstacle.once('animationcomplete-obstacle_hit_anim', () => {
        obstacle.destroy();
        console.log('Obstacle destroyed after animation.');
        player.once('animationcomplete-hit_animation', () => {
            isHit = false;
            player.clearTint();
            player.anims.play('idle', true);
        });
    });

    obstacleHitNormalSound.play();
    console.log('Obstacle hit sound played.');

    if (lives <= 0) {
        console.log('Game Over Triggered: Lives depleted');
        setTimeout(() => {
            showGameOverScreen(player.scene);
        }, 100);
        return;
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
        console.log('Raw leaderboard data:', data);
        const leaderboard = data ? Object.values(data).sort((a, b) => b.score - a.score).slice(0, 10) : [];
        console.log('Processed leaderboard:', leaderboard);
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
        console.log('Score submitted successfully:', { initials, score });
        return true;
    } catch (error) {
        console.error('Error submitting score:', error);
        return false;
    }
}

async function showGameOverScreen(scene) {
    console.log('Game Over! Displaying Game Over Screen.');
    gameStarted = false;
    scene.cameras.main.stopFollow();

    if (obstacleTimer) {
        obstacleTimer.remove();
        obstacleTimer = null;
        console.log('Obstacle generation timer stopped.');
    }

    if (player) {
        player.destroy();
        player = null;
        console.log('Player (Geartickler/Kyle) destroyed.');
    }
    tokens.getChildren().forEach(token => token.destroy());
    tokens.clear(true, true);
    console.log('All Type 1 tokens destroyed.');
    tokens2.getChildren().forEach(token => token.destroy());
    tokens2.clear(true, true);
    console.log('All Type 2 tokens destroyed.');
    tokens3.getChildren().forEach(token => token.destroy());
    tokens3.clear(true, true);
    console.log('All Type 3 tokens destroyed.');
    obstacles.getChildren().forEach(obstacle => obstacle.destroy());
    obstacles.clear(true, true);
    console.log('All obstacles destroyed.');
    platforms.getChildren().forEach(platform => platform.destroy());
    platforms.clear(true, true);
    console.log('All platforms destroyed.');

    if (gameplayMusic && gameplayMusic.isPlaying) {
        gameplayMusic.stop();
        console.log('Gameplay music stopped on game over screen.');
    }

    const cameraCenterX = scene.cameras.main.scrollX + config.width / 2;
    const cameraCenterY = scene.cameras.main.scrollY + GAME_HEIGHT / 2;

    scene.add.rectangle(cameraCenterX, cameraCenterY, 800, GAME_HEIGHT, 0x0e343c).setDepth(10);

    scene.add.text(cameraCenterX, cameraCenterY - 200, 
        'The Road to ASOTU CON ends in Baltimore\non May 13-16. We hope to see you there!', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    scene.add.text(cameraCenterX, cameraCenterY - 80, `Final Con Coins: ${score}`, 
        { fontSize: '36px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    const initialsText = scene.add.text(cameraCenterX, cameraCenterY - 40, 'Tap here to enter initials', 
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
                    leaderboard = await fetchGlobalLeaderboard();
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
    let leaderboardTextObj = scene.add.text(cameraCenterX, cameraCenterY + 100, 
        'Global Leaderboard:\n' + (leaderboard.length ? leaderboard.map((entry, index) => 
            `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n') : 'No scores yet'), 
        { fontSize: '20px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    scene.add.text(cameraCenterX, cameraCenterY + 250, 'Start New Game', 
        { fontSize: '36px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            score = 0;
            lives = 3;
            scene.scene.restart();
        });
}

function showExplanationScreen(scene) {
    console.log('Displaying explanation screen...');

    // Clear existing elements from character selection
    scene.children.list.forEach(child => {
        if (child.type !== 'Text' || child.text === 'Con Coins: 0') {
            child.destroy();
        }
    });

    // Add a semi-transparent background
    const background = scene.add.rectangle(config.width / 2, config.height / 2, config.width, config.height, 0x0e343c, 0.9)
        .setDepth(10);

    // Add title
    const title = scene.add.text(config.width / 2, 100, 'How to Play', {
        fontSize: '48px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5).setDepth(11);

    // Add instructions
    const instructions = scene.add.text(config.width / 2, 350, 
        'Objective: Get to ASOTU CON by collecting \n' + 
	'-Con Coins while avoiding industry buzzwords.\n\n' +
        '- Use the left and right buttons \n' +
	'or arrow keys to move. \n' +
        'Con Coins are +1, +3 or grant Invincibility \n' +
        '- Hitting obstacles deducts 1 life and 1 Con Coin. \n' +
        '- While invincible, obstacles grant 1 life (up to 10).\n\n' +
        '- You start with 3 lives.\n' +
        '- Game over if lives reach 0 or you fall off the screen.\n\n' +
        'Good luck on your journey to ASOTU CON!',
        {
            fontSize: '24px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(11);

    // Add a "Start Game" button
    const startButton = scene.add.text(config.width / 2, config.height - 100, 'Start Game', {
        fontSize: '36px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5).setInteractive().setDepth(11)
        .on('pointerdown', () => {
            console.log('Starting game from explanation screen...');
            // Destroy explanation screen elements
            background.destroy();
            title.destroy();
            instructions.destroy();
            startButton.destroy();
            // Proceed to start the game
            startGame(scene);
        });
}

function startGame(scene) {
    console.log('Initializing game...');
    gameStarted = true;
    score = 0;
    lives = 3;
    lastHitTime = 0;
    isInvincible = false;
    invincibilityTimer = 0;
    flashTimer = 0;
    isFlashing = false;

    if (startMusic && startMusic.isPlaying) {
        startMusic.stop();
        console.log('Start music stopped.');
    }
    if (!gameplayMusic) {
        gameplayMusic = scene.sound.add('gameplay_music', { loop: true, volume: 0.05 });
    }
    if (!gameplayMusic.isPlaying) {
        gameplayMusic.play();
        console.log('Gameplay music started.');
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

    const playerSprite = selectedPlayer === 'paul' ? 'geartickler' : 'kyle';
    currentSprite = playerSprite;
    player = scene.physics.add.sprite(playerStartX, playerStartY, playerSprite);
    player.setBounce(0.2);
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

    console.log('Generating initial platforms...');
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
        console.log('Created obstacle_hit_anim animation successfully. Frames:', obstacleFrames, 'Available animations:', scene.anims.anims.keys());
    } else {
        console.error('Failed to generate frames for obstacle_hit_anim. Check obstacle_hit spritesheet.');
    }

    scene.physics.add.collider(player, platforms, (player, platform) => {
        if (player.body.touching.up) {
            player.setVelocityY(-330);
        } else if (player.body.touching.down) {
            player.setVelocityY(-330);
        } else if (player.body.touching.left || player.body.touching.right) {
            player.setVelocityX(-player.body.velocity.x);
            console.log(`Player collided with platform side at x: ${player.x}, platform x: ${platform.x}`);
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

    scoreText = scene.add.text(config.width / 2, config.height - HUD_HEIGHT / 2 - 20, 'Con Coins: ' + score, { 
        fontFamily: 'Arial', 
        fontSize: '40px',
        fontStyle: 'bold',
        fill: '#ffffff' 
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1);
    hud.add(scoreText);

    livesText = scene.add.text(config.width / 2, config.height - HUD_HEIGHT / 2 + 20, 'Lives: ' + lives, { 
        fontFamily: 'Arial', 
        fontSize: '40px',
        fontStyle: 'bold',
        fill: '#ffffff' 
    })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH + 1);
    hud.add(livesText);

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
            console.log('Left button pressed at', Date.now());
        })
        .on('pointerup', () => {
            isClickingLeft = false;
            console.log('Left button released at', Date.now());
        })
        .on('pointerout', () => {
            isClickingLeft = false;
            console.log('Left button out at', Date.now());
        })
        .on('pointerupoutside', () => {
            isClickingLeft = false;
            console.log('Left button up outside at', Date.now());
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
            console.log('Right button pressed at', Date.now());
        })
        .on('pointerup', () => {
            isClickingRight = false;
            console.log('Right button released at', Date.now());
        })
        .on('pointerout', () => {
            isClickingRight = false;
            console.log('Right button out at', Date.now());
        })
        .on('pointerupoutside', () => {
            isClickingRight = false;
            console.log('Right button up outside at', Date.now());
        });
    hud.add(rightButton);

    scene.input.on('pointerdown', (pointer) => {
        console.log('Global pointer down at', pointer.x, pointer.y, 'at', Date.now());
    });
    scene.input.on('pointerup', (pointer) => {
        console.log('Global pointer up at', pointer.x, pointer.y, 'at', Date.now());
    });
    scene.input.on('pointermove', (pointer) => {
        console.log('Pointer move at', pointer.x, pointer.y, 'at', Date.now());
    });

    obstacleTimer = scene.time.addEvent({
        delay: 1500,
        callback: () => generateObstacle(scene),
        callbackScope: scene,
        loop: true
    });
}

async function create() {
    console.log('Displaying player selection screen...');

    startMusic = this.sound.add('start_music', { loop: true, volume: 0.05 });
    startMusic.play();
    console.log('Start music started.');

    this.add.text(400, 100, 'Choose Your Player', 
        { fontSize: '48px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const paulPreview = this.add.sprite(300, 200, 'geartickler', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'paul';
            console.log('Selected Paul');
            paulPreview.setTint(0x00ff00);
            kylePreview.clearTint();
            startButton.setStyle({ fill: '#ffffff' });
        });

    this.add.text(300, 250, 'Paul', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const kylePreview = this.add.sprite(500, 200, 'kyle', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'kyle';
            console.log('Selected Kyle');
            kylePreview.setTint(0x00ff00);
            paulPreview.clearTint();
            startButton.setStyle({ fill: '#ffffff' });
        });

    this.add.text(500, 250, 'Kyle', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    let leaderboard = await fetchGlobalLeaderboard();
    this.add.text(400, 500, 
        'Global Leaderboard:\n' + (leaderboard.length ? leaderboard.map((entry, index) => 
            `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n') : 'No scores yet'), 
        { fontSize: '16px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const startButton = this.add.text(400, 350, 'Start Game', 
        { fontSize: '36px', fill: '#666666', align: 'center' })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            if (selectedPlayer) {
                // Instead of starting the game directly, show the explanation screen
                paulPreview.destroy();
                kylePreview.destroy();
                startButton.destroy();
                this.children.list.filter(child => child.type === 'Text' && child.text !== 'Con Coins: 0').forEach(child => child.destroy());
                showExplanationScreen(this);
            } else {
                console.log('Please select a player first!');
            }
        });
}

function update() {
    if (!gameStarted || !player) return;

    if (isHit) return;

    if (hitCooldown > 0) {
        hitCooldown -= this.game.loop.delta;
        if (hitCooldown <= 0) {
            hitCooldown = 0;
            console.log('Hit cooldown expired.');
        }
    }

    if (isInvincible) {
        invincibilityTimer -= this.game.loop.delta;
        console.log(`Invincibility timer: ${Math.round(invincibilityTimer / 1000)} seconds remaining, currentSprite: ${currentSprite}`);

        if (invincibilityTimer > FLASH_START_TIME) {
            const invincibleSprite = selectedPlayer === 'paul' ? 'geartickler_invincible' : 'kyle_invincible';
            if (currentSprite !== invincibleSprite) {
                currentSprite = invincibleSprite;
                player.setTexture(currentSprite);
                updateAnimations(this, currentSprite);
                player.setScale(1.5);
                console.log(`Forced sprite to invincible: ${currentSprite}`);
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
                    ease: 'Linear',
                    onComplete: () => {
                        console.log('Gameplay music faded back in after invincibility.');
                    }
                });
            }

            console.log('Invincibility expired after 15 seconds.');
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
                console.log(`Flashing: Switched to ${currentSprite} with ${Math.round(invincibilityTimer / 1000)} seconds remaining.`);
            }
        }
    }

    let currentAnimation = player.anims.currentAnim ? player.anims.currentAnim.key : 'idle';
    if ((cursors && cursors.left.isDown) || isClickingLeft) {
        player.setVelocityX(-160);
        if (currentAnimation !== 'move_left') {
            player.anims.play('move_left', true);
            console.log(`Playing move_left animation with sprite: ${currentSprite}`);
        }
    } else if ((cursors && cursors.right.isDown) || isClickingRight) {
        player.setVelocityX(160);
        if (currentAnimation !== 'move_right') {
            player.anims.play('move_right', true);
            console.log(`Playing move_right animation with sprite: ${currentSprite}`);
        }
    } else {
        player.setVelocityX(0);
        if (currentAnimation !== 'idle') {
            player.anims.play('idle', true);
            console.log(`Playing idle animation with sprite: ${currentSprite}`);
        }
    }

    console.log(`Player x: ${player.x}, Camera scrollX: ${this.cameras.main.scrollX}, World bounds: ${this.physics.world.bounds.width}`);

    if (player.y > GAME_HEIGHT) {
        console.log('Game Over Triggered: Player fell below visible screen');
        showGameOverScreen(this);
        return;
    }

    const cameraRightEdge = this.cameras.main.scrollX + config.width;
    if (player.x > lastPlatformX - config.width * 2) {
        const newPlatformX = lastPlatformX + Phaser.Math.Between(minPlatformSpacingX, maxPlatformSpacingX);
        generatePlatform(this, newPlatformX);
        console.log(`Generated new platform at (${newPlatformX}, ${lastPlatformY})`);
    }

    platforms.getChildren().forEach(platform => {
        if (platform.x < this.cameras.main.scrollX - config.width * 1.5) {
            platform.destroy();
            console.log(`Destroyed platform at ${platform.x}`);
        }
    });

    obstacles.getChildren().forEach(obstacle => {
        if (obstacle.y < -50 || obstacle.y > GAME_HEIGHT + 50) {
            obstacle.destroy();
            console.log(`Obstacle destroyed at (${obstacle.x}, ${obstacle.y}) - Out of bounds`);
        }
    });

    tokens.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
            console.log(`Token (Type 1) destroyed at (${token.x}, ${token.y}) - Out of bounds`);
        }
    });

    tokens2.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
            console.log(`Token (Type 2) destroyed at (${token.x}, ${token.y}) - Out of bounds`);
        }
    });

    tokens3.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
            console.log(`Token (Type 3) destroyed at (${token.x}, ${token.y}) - Out of bounds`);
        }
    });
}