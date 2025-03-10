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

const playerStartX = 400;
const playerStartY = 450;

const maxVisiblePlatforms = 10;
const maxVisibleTokens = 8;

const maxJumpHeight = 150;
const minPlatformSpacingX = 120;
const maxPlatformSpacingX = 220;

const minPlatformY = 150; // As requested
const maxPlatformY = 550; // As requested
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
    this.load.spritesheet('geartickler', 'assets/characters/geartickler.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('kyle', 'assets/characters/kyle.png', { frameWidth: 48, frameHeight: 48 });
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
        const tokenY = platformY - minTokenSpacingY;
        tokens.create(xPosition, tokenY, 'token').setGravityY(-300);
        console.log(`Token created at (${xPosition}, ${tokenY})`);
    }

    if (xPosition > lastPlatformX) {
        lastPlatformX = xPosition;
        lastPlatformY = platformY;
    }
    console.log(`Placed ${selectedPlatform} at (${xPosition}, ${platformY})`);
}

function generateObstacle() {
    const obstacleX = this.cameras.main.scrollX + Phaser.Math.Between(0, config.width);
    const obstacle = obstacles.create(obstacleX, -50, 'obstacle');
    obstacle.setVelocityY(150);
    obstacle.setGravityY(-300);
}

function collectToken(player, token) {
    token.destroy();
    score += 1;
    scoreText.setText('CON Points: ' + score);
    console.log('Token collected!');
}

function hitObstacle(player, obstacle) {
    obstacle.destroy();
    console.log('Hit animation triggered!');
    isHit = true;
    player.anims.stop();
    player.anims.play('hit_animation', true);
    player.setTint(0xff4201);

    player.once('animationcomplete-hit_animation', () => {
        isHit = false;
        player.clearTint();
        player.anims.play('idle', true);
    });

    score = Math.max(0, score - 1);
    scoreText.setText('CON Points: ' + score);
}

function loadLeaderboard() {
    const leaderboard = localStorage.getItem('asotuConLeaderboard');
    return leaderboard ? JSON.parse(leaderboard) : [];
}

function saveLeaderboard(leaderboard) {
    localStorage.setItem('asotuConLeaderboard', JSON.stringify(leaderboard));
}

function updateLeaderboard(initials, score) {
    let leaderboard = loadLeaderboard();
    leaderboard.push({ initials, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    saveLeaderboard(leaderboard);
    return leaderboard;
}

function showGameOverScreen(scene) {
    console.log('Game Over! Displaying Game Over Screen.');
    gameStarted = false;

    scene.cameras.main.stopFollow();

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

    // Consistent leaderboard display
    let leaderboard = loadLeaderboard();
    let leaderboardTextObj = scene.add.text(cameraCenterX, cameraCenterY + 100, 
        'Leaderboard:\n' + leaderboard.map((entry, index) => 
            `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n'), 
        { fontSize: '20px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setDepth(11);

    // Mobile-friendly initials input
    const initialsText = scene.add.text(cameraCenterX, cameraCenterY - 20, 'Tap here to enter initials', 
        { fontSize: '24px', fill: '#ffffff', align: 'center', backgroundColor: '#333333', padding: { x: 10, y: 5 } })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            const initials = prompt('Enter 3 initials (A-Z):', '').toUpperCase();
            if (initials && /^[A-Z]{3}$/.test(initials)) {
                leaderboard = updateLeaderboard(initials, score);
                leaderboardTextObj.setText('Leaderboard:\n' + leaderboard.map((entry, index) => 
                    `${index + 1}. ${entry.initials} - ${entry.score}`).join('\n'));
                initialsText.setText(`Initials: ${initials}`);
                initialsText.disableInteractive();
            } else {
                alert('Please enter exactly 3 letters (A-Z).');
            }
        });

    scene.add.text(cameraCenterX, cameraCenterY + 250, 'Start New Game', 
        { fontSize: '36px', fill: '#ffffff', align: 'center' })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            score = 0;
            scene.scene.restart();
        });
}

function startGame(scene) {
    console.log('Initializing game...');
    gameStarted = true;
    score = 0;

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
        callback: generateObstacle,
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
}