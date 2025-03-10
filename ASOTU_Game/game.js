// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
let player, cursors, platforms, tokens, obstacles, scoreText;
let gameStarted = false;
let score = 0;
let isHit = false;
let selectedPlayer = null;
let lastPlatformX = 0;
let lastPlatformY = 0;
let lastDirectionUp = false;
let isClickingLeft = false;
let isClickingRight = false;
let startMusic, gameplayMusic; // Music variables

const playerStartX = 400;
const playerStartY = 450;
const maxVisiblePlatforms = 10;
const maxVisibleTokens = 8;
const maxJumpHeight = 150;
const minPlatformSpacingX = 120;
const maxPlatformSpacingX = 220;
const minPlatformY = 150;
const maxPlatformY = 550;
const verticalStepMin = 50;
const verticalStepMax = 180;
const overlapBuffer = 20;
const minTokenSpacingY = 50;

function preload() {
    this.load.image('platform_small', 'assets/obstacles/junker_small.png');
    console.log('Loading platform_small from assets/obstacles/junker_small.png');
    this.load.image('platform_medium', 'assets/obstacles/junker_medium.png');
    console.log('Loading platform_medium from assets/obstacles/junker_medium.png');
    this.load.image('platform_large', 'assets/obstacles/junker_large.png');
    console.log('Loading platform_large from assets/obstacles/junker_large.png');
    this.load.image('token', 'assets/obstacles/token.png');
    this.load.image('obstacle', 'assets/obstacles/obstacle.png');
    this.load.spritesheet('obstacle_hit', 'assets/obstacles/obstacle_hit.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('geartickler', 'assets/characters/geartickler.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('kyle', 'assets/characters/kyle.png', { frameWidth: 48, frameHeight: 48 });
    // Load music tracks
    this.load.audio('start_music', 'assets/audio/start_music.mp3');
    this.load.audio('gameplay_music', 'assets/audio/gameplay_music.mp3');
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

    if (tokens.getChildren().length < maxVisibleTokens && Phaser.Math.Between(0, 1) === 1) {
        const isOnPlatform = Phaser.Math.Between(0, 1) === 1;
        let tokenY;
        if (isOnPlatform) {
            tokenY = platformY - newPlatform.height / 2 - 10;
        } else {
            tokenY = Phaser.Math.Between(minPlatformY + maxJumpHeight, maxPlatformY - maxJumpHeight);
            const platformBounds = newPlatform.getBounds();
            const minDistance = 100;
            if (Math.abs(tokenY - platformY) < minDistance) {
                tokenY = platformY > config.height / 2 
                    ? platformY - minDistance 
                    : platformY + minDistance;
                tokenY = Phaser.Math.Clamp(tokenY, minPlatformY + maxJumpHeight, maxPlatformY - maxJumpHeight);
            }
        }
        tokens.create(xPosition, tokenY, 'token').setGravityY(-300);
        console.log(`Token created at (${xPosition}, ${tokenY}) - ${isOnPlatform ? 'On platform' : 'Mid-air'}`);
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
    const startY = isClimbing ? config.height + 50 : -50;
    const obstacle = obstacles.create(obstacleX, startY, 'obstacle');
    obstacle.setVelocityY(isClimbing ? -150 : 150);
    obstacle.setGravityY(-300);
    console.log(`Obstacle created at (${obstacleX}, ${startY}) - ${isClimbing ? 'Climbing' : 'Falling'}`);
}

function collectToken(player, token) {
    token.destroy();
    score += 1;
    scoreText.setText('CON Points: ' + score);
    console.log('Token collected!');
}

function hitObstacle(player, obstacle) {
    console.log('Hit obstacle! Triggering interaction animation.');
    isHit = true;
    player.anims.stop();
    player.anims.play('hit_animation', true);
    player.setTint(0xff4201);

    obstacle.setVelocityY(0);
    obstacle.setTexture('obstacle_hit');
    obstacle.anims.play('obstacle_hit_anim', true);

    obstacle.once('animationcomplete-obstacle_hit_anim', () => {
        obstacle.destroy();
        console.log('Obstacle destroyed after animation.');
        player.once('animationcomplete-hit_animation', () => {
            isHit = false;
            player.clearTint();
            player.anims.play('idle', true);
        });
    });

    score = Math.max(0, score - 1);
    scoreText.setText('CON Points: ' + score);
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

    // Ensure gameplay music continues (no action needed if already playing)
    if (!gameplayMusic || !gameplayMusic.isPlaying) {
        gameplayMusic = scene.sound.add('gameplay_music', { loop: true });
        gameplayMusic.play();
        console.log('Gameplay music started on game over screen.');
    }

    const cameraCenterX = scene.cameras.main.scrollX + config.width / 2;
    const cameraCenterY = scene.cameras.main.scrollY + config.height / 2;

    scene.add.rectangle(cameraCenterX, cameraCenterY, 800, 600, 0x0e343c).setDepth(10);

    scene.add.text(cameraCenterX, cameraCenterY - 200, 
        'The Road to ASOTU CON ends in Baltimore\non May 13-16. We hope to see you there!', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    scene.add.text(cameraCenterX, cameraCenterY - 80, `Final Score: ${score}`, 
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
            scene.scene.restart();
            // Restart gameplay music if it stopped
            if (gameplayMusic && !gameplayMusic.isPlaying) {
                gameplayMusic.play();
                console.log('Gameplay music restarted.');
            }
        });
}

function startGame(scene) {
    console.log('Initializing game...');
    gameStarted = true;
    score = 0;

    // Stop start music and start gameplay music
    if (startMusic && startMusic.isPlaying) {
        startMusic.stop();
        console.log('Start music stopped.');
    }
    if (!gameplayMusic) {
        gameplayMusic = scene.sound.add('gameplay_music', { loop: true, volume: 0.5 });
    }
    if (!gameplayMusic.isPlaying) {
        gameplayMusic.play();
        console.log('Gameplay music started.');
    }

    const playerSprite = selectedPlayer === 'paul' ? 'geartickler' : 'kyle';
    player = scene.physics.add.sprite(playerStartX, playerStartY, playerSprite);
    player.setBounce(0.2);
    player.setCollideWorldBounds(false);
    player.setDepth(1);

    platforms = scene.physics.add.group({
        immovable: true,
        allowGravity: false
    });

    tokens = scene.physics.add.group();
    obstacles = scene.physics.add.group();

    console.log('Generating initial platforms...');
    generateInitialPlatforms(scene);

    cursors = scene.input.keyboard.createCursorKeys();

    scene.cameras.main.setBounds(0, 0, 100000, config.height); 
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);

    scene.anims.create({
        key: 'idle',
        frames: [{ key: playerSprite, frame: 0 }],
        frameRate: 1
    });

    scene.anims.create({
        key: 'move_left',
        frames: [{ key: playerSprite, frame: 3 }],
        frameRate: 1
    });

    scene.anims.create({
        key: 'move_right',
        frames: [{ key: playerSprite, frame: 5 }],
        frameRate: 1
    });

    scene.anims.create({
        key: 'hit_animation',
        frames: scene.anims.generateFrameNumbers(playerSprite, { start: 6, end: 7 }),
        frameRate: 20,
        repeat: 7
    });

    scene.anims.create({
        key: 'obstacle_hit_anim',
        frames: scene.anims.generateFrameNumbers('obstacle_hit', { start: 6, end: 7 }),
        frameRate: 10,
        repeat: 0
    });

    scene.physics.add.collider(player, platforms, (player, platform) => {
        if (player.body.touching.up) {
            player.setVelocityY(-330);
        } else if (player.body.touching.down) {
            player.setVelocityY(-330);
        } else if (player.body.touching.left || player.body.touching.right) {
            player.setVelocityX(-player.body.velocity.x);
        }
    });

    scene.physics.add.overlap(player, tokens, collectToken, null, scene);
    scene.physics.add.overlap(player, obstacles, hitObstacle, null, scene);

    scoreText = scene.add.text(16, 16, 'CON Points: ' + score, { fontSize: '32px', fill: '#ffffff' });
    scoreText.setScrollFactor(0);

    scene.time.addEvent({
        delay: 1500,
        callback: () => generateObstacle(scene),
        callbackScope: scene,
        loop: true
    });

    scene.input.enabled = true;
    scene.input.on('pointerdown', (pointer) => {
        const clickX = pointer.x;
        console.log(`Pointer down at X: ${clickX}, ScrollX: ${scene.cameras.main.scrollX}`);
        if (clickX < config.width / 2) {
            isClickingLeft = true;
            isClickingRight = false;
            console.log('Moving left');
        } else {
            isClickingRight = true;
            isClickingLeft = false;
            console.log('Moving right');
        }
    });

    scene.input.on('pointerup', (pointer) => {
        console.log('Pointer up');
        isClickingLeft = false;
        isClickingRight = false;
    });
}

function create() {
    console.log('Displaying player selection screen...');

    // Start the start screen music
    startMusic = this.sound.add('start_music', { loop: true, volume: 0.5 });
    startMusic.play();
    console.log('Start music started.');

    this.add.text(400, 150, 'Choose Your Player', 
        { fontSize: '48px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const paulPreview = this.add.sprite(300, 300, 'geartickler', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'paul';
            console.log('Selected Paul');
            paulPreview.setTint(0x00ff00);
            kylePreview.clearTint();
            startButton.setStyle({ fill: '#ffffff' });
        });

    this.add.text(300, 350, 'Paul', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const kylePreview = this.add.sprite(500, 300, 'kyle', 0)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            selectedPlayer = 'kyle';
            console.log('Selected Kyle');
            kylePreview.setTint(0x00ff00);
            paulPreview.clearTint();
            startButton.setStyle({ fill: '#ffffff' });
        });

    this.add.text(500, 350, 'Kyle', 
        { fontSize: '32px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5);

    const startButton = this.add.text(400, 450, 'Start Game', 
        { fontSize: '36px', fill: '#666666', align: 'center' })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            if (selectedPlayer) {
                paulPreview.destroy();
                kylePreview.destroy();
                startButton.destroy();
                this.children.list.filter(child => child.type === 'Text' && child.text !== 'CON Points: 0').forEach(child => child.destroy());
                startGame(this);
            } else {
                console.log('Please select a player first!');
            }
        });
}

function update() {
    if (!gameStarted || !player) return;

    if (isHit) return;

    if ((cursors && cursors.left.isDown) || isClickingLeft) {
        player.setVelocityX(-160);
        player.anims.play('move_left', true);
    } else if ((cursors && cursors.right.isDown) || isClickingRight) {
        player.setVelocityX(160);
        player.anims.play('move_right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('idle', true);
    }

    if (player.y > config.height) {
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
        if (obstacle.y < -50 || obstacle.y > config.height + 50) {
            obstacle.destroy();
            console.log(`Obstacle destroyed at (${obstacle.x}, ${obstacle.y}) - Out of bounds`);
        }
    });

    tokens.getChildren().forEach(token => {
        if (token.x < this.cameras.main.scrollX - config.width * 1.5) {
            token.destroy();
            console.log(`Token destroyed at (${token.x}, ${token.y}) - Out of bounds`);
        }
    });
}