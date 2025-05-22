// js/menu.js

/**
 * @fileoverview Manages the game's main menu, including navigation and music.
 */

/** 
 * Flag to track if an attempt to play menu music has been made,
 * to prevent multiple fallbacks or console warnings.
 * @type {boolean} 
 */
let menuMusicAttemptedToPlay = false;

/**
 * Initializes and displays the main menu.
 * Sets up menu buttons and handles menu music playback.
 */
function initializeMenu() {
    const menuContainer = document.getElementById('menu-container');
    const gameCanvas = document.getElementById('canvas');
    const gameContainer = document.getElementById('game-container');

    const menuAudio = document.getElementById('menuMusic');
    const gameAudio = document.getElementById('inGameMusic');

    if (!menuContainer || !gameCanvas || !gameContainer) {
        console.error("MENU_ERROR: Essential HTML containers (menu or game) not found!");
        return;
    }
    if (!menuAudio) {
        console.warn("MENU_MUSIC_WARN: menuMusic audio element not found!");
    }
    if (!gameAudio) {
        console.warn("MENU_MUSIC_WARN: inGameMusic audio element not found!");
    }

    menuContainer.style.display = 'block';
    gameContainer.style.display = 'none';
    if (gameCanvas) gameCanvas.style.display = 'block';

    if (menuAudio && !menuMusicAttemptedToPlay) {
        menuAudio.volume = 0.35;

        let playPromise = menuAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                menuMusicAttemptedToPlay = true;
            }).catch(error => {
                console.warn("MUSIC: Menu music auto-play failed. Waiting for user interaction on menu.", error.name);
                const startMenuMusicOnInteraction = () => {
                    if (menuAudio.paused) {
                        menuAudio.play().then(() => {
                            menuMusicAttemptedToPlay = true;
                        }).catch(err => console.warn("MUSIC: Menu music still failed on menu interaction.", err.name));
                    }
                    menuContainer.removeEventListener('click', startMenuMusicOnInteraction);
                    document.removeEventListener('keydown', startMenuMusicOnInteractionForKey);
                };
                const startMenuMusicOnInteractionForKey = () => {
                    startMenuMusicOnInteraction();
                };

                if (!menuMusicAttemptedToPlay) {
                    menuContainer.addEventListener('click', startMenuMusicOnInteraction, { once: true });
                    document.addEventListener('keydown', startMenuMusicOnInteractionForKey, { once: true });
                }
            });
        } else {
            menuMusicAttemptedToPlay = true;
        }
    }

    menuContainer.innerHTML = '';

    const coverImageElement = document.createElement('img');
    coverImageElement.src = 'img/cover.jpeg';
    coverImageElement.alt = 'Game Cover';
    coverImageElement.className = 'cover-image';

    const menuDiv = document.createElement('div');
    menuDiv.className = 'menu';

    const menuButtons = [
        {
            text: 'Start',
            action: () => {
                if (menuAudio && !menuAudio.paused) {
                    menuAudio.pause();
                    menuAudio.currentTime = 0;
                }
                if (gameAudio && !gameAudio.paused) {
                    gameAudio.pause();
                    gameAudio.currentTime = 0;
                }

                if (menuContainer) menuContainer.style.display = 'none';
                if (gameContainer) gameContainer.style.display = 'block';

                if (typeof initializeGame === 'function') {
                    initializeGame();
                } else {
                    console.error("MENU_ERROR: Game initialization function 'initializeGame' not found!");
                }
            },
            imageSrc: 'img/button_start.png'
        },
        {
            text: 'Levels',
            action: () => alert("Feature not yet available."),
            imageSrc: 'img/button_levels.png'
        }
    ];

    menuButtons.forEach(({ text, action, imageSrc }) => {
        const buttonImageElement = document.createElement('img');
        buttonImageElement.src = imageSrc;
        buttonImageElement.alt = text;
        buttonImageElement.className = 'menu-button-img';
        buttonImageElement.onclick = action;
        menuDiv.appendChild(buttonImageElement);
    });

    menuContainer.appendChild(coverImageElement);
    menuContainer.appendChild(menuDiv);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMenu);
} else {
    initializeMenu();
}