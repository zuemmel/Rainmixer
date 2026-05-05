let refreshRain = null;

function getTargetRainAmount() {
    return Math.floor(12 + rainSettings.intensity * (1.45 + rainSettings.wind * 0.02));
}

document.addEventListener("DOMContentLoaded", () => {
    const audioBoxes = document.querySelectorAll(".audio-box");
    const addButton = document.querySelector(".add-button");
    const boxesContainer = document.querySelector(".boxes-container");

    const rainDock = document.querySelector(".rain-settings-dock");
    const rainGear = document.querySelector(".rain-settings-gear");
    const rainPopout = document.querySelector(".rain-settings-popout");
    const rainEnabledToggle = document.querySelector(".rain-enabled-toggle");
    const cowEnabledToggle = document.querySelector(".cow-enabled-toggle");
    const fogEnabledToggle = document.querySelector(".fog-enabled-toggle");
    const sleepyCowSignature = document.querySelector(".sleepy-cow-signature");
    const fogLayer = document.querySelector(".fog-layer");
    const rainResetButton = document.querySelector(".rain-reset-button");
    const iconToggleSwitches = document.querySelectorAll(".icon-toggle-switch");
    const rainIntensitySlider = document.querySelector(".rain-intensity-slider");
    const rainWindSlider = document.querySelector(".rain-wind-slider");
    const rainOpacitySlider = document.querySelector(".rain-opacity-slider");

    rainEnabledToggle.checked = rainSettings.enabled;
    cowEnabledToggle.checked = false;
    fogEnabledToggle.checked = true;
    sleepyCowSignature.classList.remove("visible");
    fogLayer.style.display = fogEnabledToggle.checked ? "" : "none";

    rainEnabledToggle.addEventListener("change", () => {
        rainSettings.enabled = rainEnabledToggle.checked;
    });

    cowEnabledToggle.addEventListener("change", () => {
        if (cowEnabledToggle.checked) {
            sleepyCowSignature.style.display = "";
            requestAnimationFrame(() => {
                sleepyCowSignature.classList.add("visible");
            });
        } else {
            sleepyCowSignature.classList.remove("visible");
        }
    });

    fogEnabledToggle.addEventListener("change", () => {
        fogLayer.style.display = fogEnabledToggle.checked ? "" : "none";
    });

    rainGear.addEventListener("click", () => {
        tactileClick(rainGear, { frequency: 680, volume: 0.024 });
    });

    rainResetButton.addEventListener("click", () => {
        tactileClick(rainResetButton, { frequency: 560, volume: 0.026 });
    });

    iconToggleSwitches.forEach((toggle) => {
        toggle.addEventListener("click", () => {
            tactileClick(toggle, { frequency: 820, duration: 0.035, volume: 0.018 });
        });
    });

    rainIntensitySlider.value = rainSettings.intensity;
    rainWindSlider.value = rainSettings.wind;
    rainOpacitySlider.value = rainSettings.opacity * 100;

    function updateRangeProgress(slider) {
        const min = Number(slider.min || 0);
        const max = Number(slider.max || 100);
        const value = Number(slider.value);
        const percent = ((value - min) / (max - min)) * 100;
        slider.style.setProperty("--range-progress", `${percent}%`);
    }

    rainIntensitySlider.addEventListener("input", () => {
        rainSettings.intensity = Number(rainIntensitySlider.value);
        updateRangeProgress(rainIntensitySlider);
        if (refreshRain) refreshRain();
    });

    rainWindSlider.addEventListener("input", () => {
        rainSettings.wind = Number(rainWindSlider.value);
        updateRangeProgress(rainWindSlider);
    });

    rainOpacitySlider.addEventListener("input", () => {
        rainSettings.opacity = Number(rainOpacitySlider.value) / 100;
        updateRangeProgress(rainOpacitySlider);
    });

    updateRangeProgress(rainIntensitySlider);
    updateRangeProgress(rainWindSlider);
    updateRangeProgress(rainOpacitySlider);

    let rainMenuCloseTimeout;

    function openRainMenu() {
        clearTimeout(rainMenuCloseTimeout);
        rainDock.classList.add("open");
    }

    function closeRainMenu() {
        clearTimeout(rainMenuCloseTimeout);
        rainMenuCloseTimeout = setTimeout(() => {
            rainDock.classList.remove("open");
        }, 180);
    }

    rainResetButton.addEventListener("click", () => {
        rainSettings = { ...DEFAULT_RAIN_SETTINGS };

        rainIntensitySlider.value = DEFAULT_RAIN_SETTINGS.intensity;
        rainWindSlider.value = DEFAULT_RAIN_SETTINGS.wind;
        rainOpacitySlider.value = DEFAULT_RAIN_SETTINGS.opacity * 100;
        rainEnabledToggle.checked = rainSettings.enabled;
        cowEnabledToggle.checked = false;
        fogEnabledToggle.checked = true;

        sleepyCowSignature.classList.remove("visible");
        fogLayer.style.display = fogEnabledToggle.checked ? "" : "none";

        if (refreshRain) refreshRain();
    });

    rainDock.addEventListener("mouseenter", openRainMenu);
    rainDock.addEventListener("mouseleave", closeRainMenu);

    audioBoxes.forEach((box) => {
        setupAudioBox(box, false);
    });

    addButton.addEventListener("click", () => {
        tactileClick(addButton);
        const newBox = createAudioBox();

        animateBoxesLayoutChange(boxesContainer, () => {
            boxesContainer.appendChild(newBox);
        });

        setupAudioBox(newBox, false);

        setTimeout(() => {
            newBox.scrollIntoView({
                behavior: "smooth",
                inline: "end",
                block: "nearest"
            });
        }, 10);
    });

    setupRainEffect();
});

const DEFAULT_RAIN_SETTINGS = {
    intensity: 90,
    wind: 6,
    opacity: 0.7,
    enabled: true
};

let rainSettings = { ...DEFAULT_RAIN_SETTINGS };

let uiAudioContext = null;

function playUIClickSound({
    frequency = 720,
    duration = 0.045,
    volume = 0.028
} = {}) {
    try {
        if (!uiAudioContext) {
            uiAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (uiAudioContext.state === "suspended") {
            uiAudioContext.resume();
        }

        const now = uiAudioContext.currentTime;
        const oscillator = uiAudioContext.createOscillator();
        const gainNode = uiAudioContext.createGain();
        const filter = uiAudioContext.createBiquadFilter();

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1800, now);
        filter.Q.value = 0.8;

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(uiAudioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + duration);
    } catch (error) {
        console.log("UI-Klicksound konnte nicht abgespielt werden:", error);
    }
}

function tactileClick(button, soundOptions = {}) {
    button.animate(
        [
            { transform: "translateY(0) scale(1)" },
            { transform: "translateY(1px) scale(0.97)" },
            { transform: "translateY(0) scale(1)" }
        ],
        {
            duration: 140,
            easing: "ease-out"
        }
    );

    playUIClickSound(soundOptions);
}

function popIcon(element) {
    element.animate(
        [
            { transform: "scale(0.82)" },
            { transform: "scale(1.08)" },
            { transform: "scale(1)" }
        ],
        {
            duration: 180,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)"
        }
    );
}

function setupAudioBox(box, isFirstBox = false) {
    const slider = box.querySelector(".volume-slider");
    const fill = box.querySelector(".volume-fill");
    const thumb = box.querySelector(".volume-thumb");
    const select = box.querySelector(".audio-select");
    const muteButton = box.querySelector(".mute-button");
    const playButton = box.querySelector(".play-button");
    const removeButton = box.querySelector(".remove-button");
    const volumeIcon = box.querySelector(".icon-volume");
    const volumeMutedIcon = box.querySelector(".icon-volume-muted");
    const audio = new Audio();

    const FADE_DURATION = 260;
    const FADE_INTERVAL = 16;

    audio.loop = true;
    audio.volume = 0;

    let lastVolume = 0.7;
    let isMuted = false;
    let isPlaying = false;
    let isTransitioning = false;
    let fadeIntervalId = null;

    box.classList.add("paused");

    function getSliderValue() {
        return Number(slider.dataset.value);
    }

    function getTargetVolume() {
        if (isMuted) return 0;
        return getSliderValue() / 100;
    }

    function setSliderValue(value) {
        const clampedValue = Math.max(0, Math.min(100, value));
        slider.dataset.value = clampedValue;

        fill.style.height = clampedValue + "%";
        thumb.style.bottom = clampedValue + "%";
    }

    function stopFade() {
        if (fadeIntervalId) {
            clearInterval(fadeIntervalId);
            fadeIntervalId = null;
        }
    }

    function fadeAudioTo(targetVolume, duration = FADE_DURATION, onComplete) {
        stopFade();

        const startVolume = audio.volume;
        const delta = targetVolume - startVolume;

        if (Math.abs(delta) < 0.001) {
            audio.volume = targetVolume;
            if (onComplete) onComplete();
            return;
        }

        const steps = Math.max(1, Math.round(duration / FADE_INTERVAL));
        let currentStep = 0;

        fadeIntervalId = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            audio.volume = Math.max(0, Math.min(1, startVolume + delta * progress));

            if (currentStep >= steps) {
                stopFade();
                audio.volume = targetVolume;
                if (onComplete) onComplete();
            }
        }, FADE_INTERVAL);
    }

    function updatePlaybackStateClasses() {
        if (isPlaying) {
            box.classList.remove("paused");
            box.classList.add("playing");
        } else {
            box.classList.remove("playing");
            box.classList.add("paused");
        }
    }

    function startCurrentAudioWithFade() {
        if (isTransitioning) return;

        const selectedSrc = select.value;
        const targetVolume = getTargetVolume();

        isTransitioning = true;
        isPlaying = true;
        updatePlaybackStateClasses();

        if (audio.src && audio.src.includes(selectedSrc)) {
            audio.play().then(() => {
                fadeAudioTo(targetVolume, FADE_DURATION, () => {
                    isTransitioning = false;
                });
            }).catch((error) => {
                isPlaying = false;
                isTransitioning = false;
                updatePlaybackStateClasses();
                console.log("Audio konnte nicht gestartet werden:", error);
            });
            return;
        }

        stopFade();
        audio.pause();
        audio.src = selectedSrc;
        audio.load();
        audio.volume = 0;

        audio.play().then(() => {
            fadeAudioTo(targetVolume, FADE_DURATION, () => {
                isTransitioning = false;
            });
        }).catch((error) => {
            isPlaying = false;
            isTransitioning = false;
            updatePlaybackStateClasses();
            console.log("Audio konnte nicht gestartet werden:", error);
        });
    }

    function stopAudioWithFade() {
        if (isTransitioning) return;

        isTransitioning = true;
        isPlaying = false;
        updatePlaybackStateClasses();

        fadeAudioTo(0, FADE_DURATION, () => {
            audio.pause();
            isTransitioning = false;
        });
    }

    setSliderValue(70);

    function updateMuteIcon() {
        if (isMuted) {
            muteButton.classList.add("is-muted");
        } else {
            muteButton.classList.remove("is-muted");
        }
    }

    function updateSliderDisabledState() {
        if (isMuted) {
            slider.classList.add("is-disabled");
        } else {
            slider.classList.remove("is-disabled");
        }
    }

    updateMuteIcon();
    updateSliderDisabledState();
    const activeMuteIcon = isMuted ? volumeMutedIcon : volumeIcon;
    popIcon(activeMuteIcon);

    select.addEventListener("change", () => {
        if (!audio.src) {
            startCurrentAudioWithFade();
            return;
        }

        if (!isPlaying) {
            audio.src = select.value;
            audio.load();
            audio.volume = 0;
            return;
        }

        fadeAudioTo(0, FADE_DURATION, () => {
            audio.pause();
            audio.src = select.value;
            audio.load();
            audio.volume = 0;

            audio.play().then(() => {
                isPlaying = true;
                updatePlaybackStateClasses();
                fadeAudioTo(getTargetVolume());
            }).catch((error) => {
                console.log("Audio konnte nicht gestartet werden:", error);
            });
        });
    });

    muteButton.addEventListener("click", () => {
        tactileClick(muteButton);

        if (!isMuted) {
            lastVolume = getSliderValue() / 100;
            isMuted = true;
            fadeAudioTo(0);
        } else {
            const restoredVolume = lastVolume > 0 ? lastVolume : 0.7;
            setSliderValue(restoredVolume * 100);
            isMuted = false;

            if (isPlaying) {
                fadeAudioTo(restoredVolume);
            } else {
                audio.volume = restoredVolume;
            }
        }

        updateMuteIcon();
        updateSliderDisabledState();
    });

    playButton.addEventListener("click", () => {
        if (isTransitioning) return;

        tactileClick(playButton);

        if (!audio.src) {
            startCurrentAudioWithFade();
            const playIcon = box.querySelector(".icon-play");
            popIcon(playIcon);
            return;
        }

        if (isPlaying) {
            stopAudioWithFade();
            const pauseIcon = box.querySelector(".icon-pause");
            popIcon(pauseIcon);
        } else {
            startCurrentAudioWithFade();
            const playIcon = box.querySelector(".icon-play");
            popIcon(playIcon);
        }
    });

    removeButton.addEventListener("click", () => {
        tactileClick(removeButton);
        const parent = box.parentElement;
        const row = parent.closest(".audio-row");
        const addButton = row ? row.querySelector(".add-button") : null;

        const remainingBoxes = [...parent.querySelectorAll(".audio-box")].filter(
            (b) => b !== box
        );
        const firstPositions = new Map();

        remainingBoxes.forEach((b) => {
            firstPositions.set(b, b.getBoundingClientRect());
        });

        const addButtonFirst = addButton ? addButton.getBoundingClientRect() : null;

        stopFade();
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        audio.load();
        audio.volume = 0;

        isPlaying = false;
        isMuted = false;

        box.classList.add("removing");

        box.addEventListener(
            "animationend",
            () => {
                box.remove();

                const boxesAfterRemoval = [...parent.querySelectorAll(".audio-box")];

                boxesAfterRemoval.forEach((b) => {
                    const first = firstPositions.get(b);
                    if (!first) return;

                    const last = b.getBoundingClientRect();
                    const deltaX = first.left - last.left;
                    const deltaY = first.top - last.top;

                    if (deltaX !== 0 || deltaY !== 0) {
                        b.animate(
                            [
                                { transform: `translate(${deltaX}px, ${deltaY}px)` },
                                { transform: "translate(0, 0)" }
                            ],
                            {
                                duration: 320,
                                easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                            }
                        );
                    }
                });

                if (addButton && addButtonFirst) {
                    const addButtonLast = addButton.getBoundingClientRect();
                    const deltaX = addButtonFirst.left - addButtonLast.left;
                    const deltaY = addButtonFirst.top - addButtonLast.top;

                    if (deltaX !== 0 || deltaY !== 0) {
                        addButton.animate(
                            [
                                { transform: `translate(${deltaX}px, ${deltaY}px)` },
                                { transform: "translate(0, 0)" }
                            ],
                            {
                                duration: 320,
                                easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                            }
                        );
                    }
                }
            },
            { once: true }
        );
    });

    // Autostart bei Klick auf die ganze Box entfernt.
    // Audio startet jetzt nur noch bewusst über den Play-Button
    // oder beim direkten Wechsel der Auswahl im Dropdown.

    function updateVolumeFromPointer(clientY) {
        if (isMuted) return;

        const rect = slider.getBoundingClientRect();
        const offsetY = clientY - rect.top;
        const percentage = 100 - (offsetY / rect.height) * 100;

        setSliderValue(percentage);

        const volume = getSliderValue() / 100;
        lastVolume = volume;

        if (isPlaying) {
            fadeAudioTo(volume, 80);
        } else {
            audio.volume = volume;
        }
    }

    let isDraggingSlider = false;

    slider.addEventListener("mousedown", (event) => {
        isDraggingSlider = true;
        updateVolumeFromPointer(event.clientY);
    });

    document.addEventListener("mousemove", (event) => {
        if (!isDraggingSlider) return;
        updateVolumeFromPointer(event.clientY);
    });

    document.addEventListener("mouseup", () => {
        isDraggingSlider = false;
    });

    slider.addEventListener("click", (event) => {
        updateVolumeFromPointer(event.clientY);
    });
}

function animateBoxesLayoutChange(container, updateLayout) {
    const row = container.closest(".audio-row");
    const addButton = row ? row.querySelector(".add-button") : null;

    const existingBoxes = [...container.querySelectorAll(".audio-box")];
    const firstPositions = new Map();

    existingBoxes.forEach((box) => {
        firstPositions.set(box, box.getBoundingClientRect());
    });

    const addButtonFirst = addButton ? addButton.getBoundingClientRect() : null;

    updateLayout();

    const boxesAfterUpdate = [...container.querySelectorAll(".audio-box")];

    boxesAfterUpdate.forEach((box) => {
        const first = firstPositions.get(box);
        if (!first) return;

        const last = box.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;

        if (deltaX !== 0 || deltaY !== 0) {
            box.animate(
                [
                    { transform: `translate(${deltaX}px, ${deltaY}px)` },
                    { transform: "translate(0, 0)" }
                ],
                {
                    duration: 320,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                }
            );
        }
    });

    if (addButton && addButtonFirst) {
        const addButtonLast = addButton.getBoundingClientRect();
        const deltaX = addButtonFirst.left - addButtonLast.left;
        const deltaY = addButtonFirst.top - addButtonLast.top;

        if (deltaX !== 0 || deltaY !== 0) {
            addButton.animate(
                [
                    { transform: `translate(${deltaX}px, ${deltaY}px)` },
                    { transform: "translate(0, 0)" }
                ],
                {
                    duration: 320,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                }
            );
        }
    }

    const newBox = boxesAfterUpdate.find((box) => !firstPositions.has(box));

    if (newBox) {
        newBox.animate(
            [
                { opacity: 0, transform: "translateX(18px) scale(0.98)" },
                { opacity: 1, transform: "translateX(0) scale(1)" }
            ],
            {
                duration: 260,
                easing: "ease"
            }
        );
    }
}

function createAudioBox() {
    const box = document.createElement("div");
    box.className = "audio-box";

    box.innerHTML = `
    <div class="slider-container">
        <div class="volume-slider" data-value="70">
            <div class="volume-fill"></div>
            <div class="volume-thumb"></div>
        </div>
    </div>

    <select class="audio-select">
        <option value="audio/rain.mp3">Regen</option>
        <option value="audio/waves.mp3">Wellen</option>
        <option value="audio/forest.mp3">Wald</option>
        <option value="audio/fire.mp3">Kamin</option>
        <option value="audio/regenzelt.mp3">Zelt</option>
        <option value="audio/brown.mp3">Brown Noise</option>
    </select>

    <div class="button-row">
        <button class="mute-button icon-button" aria-label="Stummschalten">
        <svg class="icon-volume" viewBox="0 0 24 24">
            <path d="M3 10v4h4l5 4V6L7 10H3z"></path>
            <path d="M16 9a4 4 0 0 1 0 6"></path>
            <path d="M18.5 7a7 7 0 0 1 0 10"></path>
      </svg>

      <svg class="icon-volume-muted" viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3z"></path>
        <line x1="16" y1="8" x2="22" y2="14"></line>
        <line x1="22" y1="8" x2="16" y2="14"></line>
      </svg>
    </button>

    <button class="play-button play-main-button" aria-label="Play oder Pause">
      <svg class="icon-play" viewBox="0 0 24 24">
        <polygon points="8,5 19,12 8,19"></polygon>
      </svg>

      <svg class="icon-pause" viewBox="0 0 24 24">
        <rect x="6" y="5" width="4" height="14"></rect>
        <rect x="14" y="5" width="4" height="14"></rect>
      </svg>
    </button>

    <button class="remove-button icon-button" aria-label="Panel entfernen">
      <svg viewBox="0 0 24 24">
        <line x1="7" y1="7" x2="17" y2="17"></line>
        <line x1="17" y1="7" x2="7" y2="17"></line>
      </svg>
    </button>
  </div>
    `;

    return box;
}

function setupRainEffect() {
    let windOffset = 0;
    const canvas = document.getElementById("rain-canvas");
    const ctx = canvas.getContext("2d");

    let drops = [];
    let splashes = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createDrop() {
        const baseSpeed = 7.2;
        const baseLength = 17;
        const baseDrift = rainSettings.wind * 0.11;

        return {
            x: -canvas.width * 0.2 + Math.random() * canvas.width * 1.4,
            y: Math.random() * -canvas.height,
            length: baseLength + (Math.random() - 0.5) * 3.2,
            speed: baseSpeed + (Math.random() - 0.5) * 1.4,
            drift: baseDrift + (Math.random() - 0.5) * 0.28
        };
    }

    function createSplash(x, y, side = "top", splashScale = 1) {
        const amount = Math.max(2, Math.round((6 + rainSettings.intensity * 0.08) * splashScale));

        for (let i = 0; i < amount; i++) {
            let vx = (-2.8 + Math.random() * 5.6) * splashScale;
            let vy = (-2.2 - Math.random() * 3.4) * splashScale;

            if (side === "left") {
                vx = (-1.4 - Math.random() * 2.2) * splashScale;
                vy = (-1.1 + (Math.random() - 0.5) * 1.8) * splashScale;
            }

            if (side === "right") {
                vx = (1.4 + Math.random() * 2.2) * splashScale;
                vy = (-1.1 + (Math.random() - 0.5) * 1.8) * splashScale;
            }

            splashes.push({
                x,
                y,
                vx,
                vy,
                life: (18 + Math.random() * 10) * (0.85 + splashScale * 0.2),
                size: (1.8 + Math.random() * 1.4) * (0.75 + splashScale * 0.35)
            });
        }
    }

    function initRain() {
        drops = [];
        const amount = getTargetRainAmount();

        for (let i = 0; i < amount; i++) {
            drops.push(createDrop());
        }
    }

    function syncRainAmountSmooth() {
        const targetAmount = getTargetRainAmount();

        if (drops.length < targetAmount) {
            const missing = targetAmount - drops.length;

            for (let i = 0; i < missing; i++) {
                drops.push(createDrop());
            }
        } else if (drops.length > targetAmount) {
            drops.splice(targetAmount);
        }
    }

    refreshRain = syncRainAmountSmooth;

    function updateRain() {
        if (!rainSettings.enabled) {
            return;
        }

        windOffset += 0.014;
        const collisionShapes = getCollisionShapes();

        for (const drop of drops) {
            const wind = Math.sin(windOffset) * rainSettings.wind * 0.05;
            drop.x += drop.drift + wind;
            drop.y += drop.speed;

            let hitBox = false;

            for (const shape of collisionShapes) {
                const dropBottomY = drop.y + drop.length;

                if (shape.type === "rect") {
                    const dropTopY = drop.y;
                    const nextX = drop.x + drop.drift + wind;
                    const splashY = Math.max(shape.top + 4, Math.min(dropBottomY, shape.bottom - 4));

                    const hitsTop =
                        nextX >= shape.left &&
                        nextX <= shape.right &&
                        dropBottomY >= shape.top &&
                        dropTopY < shape.top;

                    const hitsLeft =
                        drop.y < shape.bottom &&
                        dropBottomY > shape.top &&
                        drop.x < shape.left &&
                        nextX >= shape.left;

                    const hitsRight =
                        drop.y < shape.bottom &&
                        dropBottomY > shape.top &&
                        drop.x > shape.right &&
                        nextX <= shape.right;

                    if (hitsTop) {
                        createSplash(nextX, shape.top + 2, "top", drop.splashScale);
                        resetDrop(drop);
                        hitBox = true;
                        break;
                    }

                    if (hitsLeft) {
                        createSplash(shape.left - 2, splashY, "left", drop.splashScale);
                        resetDrop(drop);
                        hitBox = true;
                        break;
                    }

                    if (hitsRight) {
                        createSplash(shape.right + 2, splashY, "right", drop.splashScale);
                        resetDrop(drop);
                        hitBox = true;
                        break;
                    }
                }

                if (shape.type === "circle") {
                    const dx = drop.x - shape.cx;
                    const dy = dropBottomY - shape.cy;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= shape.r && drop.y < shape.cy) {
                        const angle = Math.atan2(dy, dx);
                        const hitX = shape.cx + Math.cos(angle) * shape.r;
                        const hitY = shape.cy + Math.sin(angle) * shape.r;

                        createSplash(hitX, hitY, "top", drop.splashScale);
                        resetDrop(drop);
                        hitBox = true;
                        break;
                    }
                }
            }

            if (hitBox) continue;

            if (
                drop.y >= canvas.height - 2 ||
                drop.x < -canvas.width * 0.25 ||
                drop.x > canvas.width * 1.25
            ) {
                if (drop.y >= canvas.height - 2) {
                    createSplash(drop.x, canvas.height - 2, "top", drop.splashScale);
                }
                resetDrop(drop);
            }
        }

        for (let i = splashes.length - 1; i >= 0; i--) {
            const s = splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.24;
            s.life -= 1;

            if (s.life <= 0) {
                splashes.splice(i, 1);
            }
        }
    }

    function drawRain() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!rainSettings.enabled) {
            return;
        }

        const baseAlpha = rainSettings.opacity;

        for (const drop of drops) {
            const tailX = drop.x + drop.drift * 1.5;
            const tailY = drop.y + drop.length;

            const primaryAlpha = (0.04 + baseAlpha * 0.38) * drop.alphaMultiplier;
            const glowAlpha = (0.012 + baseAlpha * 0.08) * drop.alphaMultiplier;

            ctx.strokeStyle = `rgba(205, 222, 255, ${primaryAlpha})`;
            ctx.lineWidth = (0.95 + baseAlpha * 0.42) * drop.widthMultiplier;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            ctx.strokeStyle = `rgba(140, 170, 255, ${glowAlpha})`;
            ctx.lineWidth = 1.4 * drop.widthMultiplier;
            ctx.beginPath();
            ctx.moveTo(drop.x - 0.1, drop.y - 0.7);
            ctx.lineTo(tailX, tailY + 0.8);
            ctx.stroke();
        }

        for (const s of splashes) {
            ctx.fillStyle = `rgba(220, 235, 255, ${(s.life / 30) * (0.55 + baseAlpha)})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);

            ctx.fillStyle = `rgba(255, 255, 255, ${(s.life / 38) * (0.25 + baseAlpha * 0.55)})`;
            ctx.fillRect(
                s.x - s.size * 0.22,
                s.y - s.size * 0.22,
                Math.max(1.8, s.size * 0.5),
                Math.max(1.8, s.size * 0.5)
            );
        }
    }

    function animate() {
        updateRain();
        drawRain();
        requestAnimationFrame(animate);
    }

    resizeCanvas();
    initRain();
    animate();

    window.addEventListener("resize", () => {
        resizeCanvas();
        initRain();
    });

    function getCollisionShapes() {
        const boxShapes = [...document.querySelectorAll(".audio-box")].map((box) => {
            const rect = box.getBoundingClientRect();
            return {
                type: "rect",
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom
            };
        });

        const addButton = document.querySelector(".add-button");
        let addButtonShape = [];

        if (addButton) {
            const rect = addButton.getBoundingClientRect();
            addButtonShape.push({
                type: "circle",
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
                r: rect.width / 2
            });
        }

        return [...boxShapes, ...addButtonShape];
    }

    function resetDrop(drop) {
        const baseSpeed = 7.2;
        const baseLength = 17;
        const baseDrift = rainSettings.wind * 0.11;

        const layerRoll = Math.random();
        let layer = "mid";
        let speedMultiplier = 1;
        let lengthMultiplier = 1;
        let driftMultiplier = 1;
        let alphaMultiplier = 1;
        let widthMultiplier = 1;
        let splashScale = 1;

        if (layerRoll < 0.3) {
            layer = "back";
            speedMultiplier = 0.72;
            lengthMultiplier = 0.72;
            driftMultiplier = 0.78;
            alphaMultiplier = 0.45;
            widthMultiplier = 0.72;
            splashScale = 0.45;
        } else if (layerRoll > 0.76) {
            layer = "front";
            speedMultiplier = 1.22;
            lengthMultiplier = 1.28;
            driftMultiplier = 1.12;
            alphaMultiplier = 1.22;
            widthMultiplier = 1.2;
            splashScale = 1.15;
        }

        drop.x = -canvas.width * 0.2 + Math.random() * canvas.width * 1.4;
        drop.y = -20 - Math.random() * canvas.height;
        drop.layer = layer;
        drop.alphaMultiplier = alphaMultiplier;
        drop.widthMultiplier = widthMultiplier;
        drop.splashScale = splashScale;
        drop.length = (baseLength + (Math.random() - 0.5) * 3.2) * lengthMultiplier;
        drop.speed = (baseSpeed + (Math.random() - 0.5) * 1.4) * speedMultiplier;
        drop.drift = (baseDrift + (Math.random() - 0.5) * 0.28) * driftMultiplier;
    }
}