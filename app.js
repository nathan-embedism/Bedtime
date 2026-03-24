// ============================================================
// Bedtime – a gentle nighttime app for babies and young children
// ============================================================

(function () {
  "use strict";

  // ---- Canvas setup ----
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(1, 1); // reset
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- Utility ----
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- Colour palette ----
  const SKY_TOP    = [8, 12, 28];
  const SKY_BOT    = [18, 24, 52];
  const HILL_COLORS = [
    [16, 22, 48],
    [12, 18, 40],
    [10, 14, 34],
  ];

  // ---- Stars ----
  const STAR_COUNT = 220;
  const stars = [];
  function createStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        r: rand(0.5, 2.2),
        brightness: rand(0.3, 1),
        twinkleSpeed: rand(0.3, 1.5),
        twinkleOffset: rand(0, Math.PI * 2),
      });
    }
  }
  createStars();

  // ---- Shooting stars ----
  const shootingStars = [];
  function maybeSpawnShootingStar() {
    if (shootingStars.length < 2 && Math.random() < 0.001) {
      shootingStars.push({
        x: rand(0.1, 0.9) * W,
        y: rand(0.02, 0.25) * H,
        vx: rand(2, 5) * (Math.random() < 0.5 ? 1 : -1),
        vy: rand(1, 3),
        life: 1,
        decay: rand(0.006, 0.015),
        length: rand(40, 100),
      });
    }
  }

  // ---- Moon ----
  const moon = { x: 0.78, y: 0.13, r: 0, glowR: 0 };
  function sizeMoon() {
    moon.r = Math.min(W, H) * 0.045;
    moon.glowR = moon.r * 3.5;
  }
  sizeMoon();
  window.addEventListener("resize", sizeMoon);

  // ---- Rolling hills (vector) ----
  function hillY(x, seed, baseY, amp, freq) {
    // Simple layered sine hills
    return baseY
      + Math.sin(x * freq + seed) * amp
      + Math.sin(x * freq * 2.3 + seed * 1.7) * amp * 0.4
      + Math.sin(x * freq * 0.6 + seed * 0.3) * amp * 0.6;
  }

  // ---- Clouds ----
  const CLOUD_COUNT = 5;
  const clouds = [];
  function createClouds() {
    clouds.length = 0;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      clouds.push({
        x: rand(-0.1, 1.1),
        y: rand(0.06, 0.35),
        w: rand(0.10, 0.22),
        h: rand(0.015, 0.03),
        speed: rand(0.00003, 0.00012),
        opacity: rand(0.04, 0.10),
      });
    }
  }
  createClouds();

  // ---- Touch twinkles ----
  const twinkles = [];

  function addTwinkle(px, py) {
    const count = Math.floor(rand(6, 14));
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.3, 2.5);
      twinkles.push({
        x: px * devicePixelRatio,
        y: py * devicePixelRatio,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(1.5, 4),
        life: 1,
        decay: rand(0.005, 0.018),
        hue: rand(190, 280),
      });
    }
  }

  // ---- Fireflies ----
  const FIREFLY_COUNT = 12;
  const fireflies = [];
  function createFireflies() {
    fireflies.length = 0;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      fireflies.push({
        x: rand(0.05, 0.95),
        y: rand(0.55, 0.92),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.15, 0.5),
        wanderX: rand(0.005, 0.02),
        wanderY: rand(0.003, 0.01),
        brightness: 0,
      });
    }
  }
  createFireflies();

  // ---- Drawing ----
  function drawSky(t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgb(${SKY_TOP.join(",")})`);
    grad.addColorStop(1, `rgb(${SKY_BOT.join(",")})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMoon(t) {
    const mx = moon.x * W;
    const my = moon.y * H;
    // glow
    const glowGrad = ctx.createRadialGradient(mx, my, moon.r * 0.3, mx, my, moon.glowR);
    glowGrad.addColorStop(0, "rgba(200, 210, 255, 0.10)");
    glowGrad.addColorStop(0.4, "rgba(180, 195, 240, 0.04)");
    glowGrad.addColorStop(1, "rgba(180, 195, 240, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moon.glowR, 0, Math.PI * 2);
    ctx.fill();
    // moon disc
    const discGrad = ctx.createRadialGradient(mx - moon.r * 0.25, my - moon.r * 0.25, 0, mx, my, moon.r);
    discGrad.addColorStop(0, "rgba(240, 240, 255, 0.95)");
    discGrad.addColorStop(1, "rgba(200, 210, 240, 0.85)");
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moon.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStars(t) {
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
      const alpha = s.brightness * (0.4 + 0.6 * twinkle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d0d8f0";
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShootingStars() {
    for (const s of shootingStars) {
      ctx.globalAlpha = s.life * 0.8;
      ctx.strokeStyle = "#e0e8ff";
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * s.length * 0.15, s.y - s.vy * s.length * 0.15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(t) {
    for (const c of clouds) {
      const cx = ((c.x + t * c.speed) % 1.4) - 0.15;
      const px = cx * W;
      const py = c.y * H;
      const w = c.w * W;
      const h = c.h * H;
      ctx.globalAlpha = c.opacity;
      ctx.fillStyle = "#8090c0";
      ctx.beginPath();
      // fluffy cloud via overlapping ellipses
      ctx.ellipse(px, py, w * 0.5, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px - w * 0.25, py + h * 0.2, w * 0.33, h * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + w * 0.28, py + h * 0.15, w * 0.36, h * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHills(t) {
    const drift = t * 0.02;
    for (let layer = 0; layer < 3; layer++) {
      const baseY = H * (0.68 + layer * 0.08);
      const amp = H * (0.04 - layer * 0.008);
      const freq = (0.0018 + layer * 0.0006);
      const col = HILL_COLORS[layer];
      ctx.fillStyle = `rgb(${col.join(",")})`;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = hillY(x, layer * 50 + drift * (layer + 1) * 5, baseY, amp, freq);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawFireflies(t) {
    for (const f of fireflies) {
      const blink = 0.5 + 0.5 * Math.sin(t * f.speed + f.phase);
      f.brightness = lerp(f.brightness, blink, 0.02);
      const fx = (f.x + Math.sin(t * 0.1 + f.phase) * f.wanderX) * W;
      const fy = (f.y + Math.sin(t * 0.07 + f.phase * 1.3) * f.wanderY) * H;
      const r = 2.5 * devicePixelRatio;
      ctx.globalAlpha = f.brightness * 0.7;
      const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 6);
      glow.addColorStop(0, "rgba(255, 240, 150, 0.5)");
      glow.addColorStop(1, "rgba(255, 240, 150, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, r * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 245, 180, 0.9)";
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTwinkles() {
    for (const p of twinkles) {
      ctx.globalAlpha = p.life * 0.8;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      glow.addColorStop(0, `hsla(${p.hue}, 70%, 80%, 0.6)`);
      glow.addColorStop(1, `hsla(${p.hue}, 70%, 80%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${p.hue}, 80%, 90%, 0.9)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateParticles() {
    // shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) shootingStars.splice(i, 1);
    }
    // twinkles
    for (let i = twinkles.length - 1; i >= 0; i--) {
      const p = twinkles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0) twinkles.splice(i, 1);
    }
  }

  // ---- Main loop ----
  let startTime = null;
  let running = false;

  function frame(ts) {
    if (!startTime) startTime = ts;
    const t = (ts - startTime) / 1000;

    resize(); // handle dynamic resize

    drawSky(t);
    drawMoon(t);
    drawStars(t);
    drawShootingStars();
    drawClouds(t);
    drawHills(t);
    drawFireflies(t);
    drawTwinkles();

    updateParticles();
    maybeSpawnShootingStar();

    if (running) requestAnimationFrame(frame);
  }

  // ============================================================
  //  MUSIC ENGINE – gentle generative lullaby
  // ============================================================

  let audioCtx = null;
  let masterGain = null;
  let reverbNode = null;

  // Pentatonic scale degrees for gentle melodies (C major pentatonic across octaves)
  const BASE_NOTES = [
    261.63, 293.66, 329.63, 392.00, 440.00, // C4 D4 E4 G4 A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5 D5 E5 G5 A5
  ];

  // Lower drone notes
  const DRONE_NOTES = [130.81, 196.00, 164.81]; // C3, G3, E3

  let currentScale = [...BASE_NOTES];
  let droneOsc = null;
  let droneGain = null;
  let padOscs = [];
  let padGains = [];
  let melodyTimer = null;
  let currentDroneTarget = DRONE_NOTES[0];

  function createReverb() {
    // Simple algorithmic reverb via convolver with generated impulse
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * 3;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    const conv = audioCtx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // iOS Safari: must resume AND play a buffer source in the user gesture
    // to fully unlock audio (including when the hardware silent switch is on).
    audioCtx.resume();

    // Play a tiny silent buffer to "warm up" the audio graph on iOS
    const silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    const silentSrc = audioCtx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(audioCtx.destination);
    silentSrc.start();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 3);

    reverbNode = createReverb();
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    masterGain.connect(audioCtx.destination);
    masterGain.connect(reverbNode);
    reverbNode.connect(reverbGain);
    reverbGain.connect(audioCtx.destination);

    startDrone();
    startPad();
    scheduleMelody();
  }

  function startDrone() {
    droneOsc = audioCtx.createOscillator();
    droneOsc.type = "sine";
    droneOsc.frequency.value = DRONE_NOTES[0];

    droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 4);

    // Gentle slow LFO for subtle vibrato
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain);
    lfoGain.connect(droneOsc.frequency);
    lfo.start();

    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start();
  }

  function startPad() {
    // Soft pad: two detuned triangle waves
    const notes = [261.63, 392.00]; // C4, G4
    for (const freq of notes) {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();

      padOscs.push(osc);
      padGains.push(gain);
    }
  }

  function playNote(freq, duration, delay, volume) {
    const now = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // Gentle filter
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;

    const gain = audioCtx.createGain();
    const vol = volume || 0.10;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.15);
    gain.gain.linearRampToValueAtTime(vol * 0.6, now + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  function scheduleMelody() {
    // Play a gentle note every 1.5-4 seconds
    function next() {
      const note = currentScale[Math.floor(Math.random() * currentScale.length)];
      const duration = rand(1.5, 3.5);
      playNote(note, duration, 0, rand(0.05, 0.12));

      // Occasionally play a soft harmony
      if (Math.random() < 0.3) {
        const harmony = currentScale[Math.floor(Math.random() * currentScale.length)];
        playNote(harmony, duration * 0.8, 0.3, rand(0.03, 0.06));
      }

      const interval = rand(1500, 4000);
      melodyTimer = setTimeout(next, interval);
    }
    next();
  }

  // ---- Touch interaction for music ----
  function onTouch(px, py) {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    // Map touch position to musical parameters
    const xNorm = px / window.innerWidth;   // 0 = left, 1 = right
    const yNorm = py / window.innerHeight;  // 0 = top,  1 = bottom

    // Play a touch-responsive note: pitch based on X, volume on Y
    const scaleIdx = Math.floor(xNorm * currentScale.length);
    const note = currentScale[clamp(scaleIdx, 0, currentScale.length - 1)];
    const vol = lerp(0.08, 0.15, 1 - yNorm);
    playNote(note, rand(1.0, 2.5), 0, vol);

    // Play a soft chime an octave up
    playNote(note * 2, rand(0.8, 1.5), 0.05, vol * 0.3);

    // Gently shift the drone based on touch region
    const droneIdx = Math.floor(xNorm * DRONE_NOTES.length);
    const newDrone = DRONE_NOTES[clamp(droneIdx, 0, DRONE_NOTES.length - 1)];
    if (newDrone !== currentDroneTarget) {
      currentDroneTarget = newDrone;
      droneOsc.frequency.linearRampToValueAtTime(newDrone, audioCtx.currentTime + 2);
    }

    // Shift pad chord gently based on Y position
    const padShift = yNorm < 0.33 ? 1.06 : yNorm < 0.66 ? 1.0 : 0.94;
    for (let i = 0; i < padOscs.length; i++) {
      const baseFreq = i === 0 ? 261.63 : 392.00;
      padOscs[i].frequency.linearRampToValueAtTime(
        baseFreq * padShift, audioCtx.currentTime + 1.5
      );
    }
  }

  // ---- Input handling ----
  const overlay = document.getElementById("start-overlay");
  let started = false;

  function handleStart() {
    if (started) return;
    started = true;

    overlay.classList.add("hidden");
    setTimeout(() => overlay.style.display = "none", 1600);

    // Init audio inside the user gesture — do NOT preventDefault,
    // as iOS Safari may not treat it as a user gesture otherwise.
    initAudio();

    running = true;
    requestAnimationFrame(frame);

    // Try fullscreen AFTER audio is initialised
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function handleInteract(px, py) {
    addTwinkle(px, py);
    onTouch(px, py);
  }

  // Use touchend (most reliable for iOS Safari audio unlock) + click fallback
  document.addEventListener("touchend", function (e) {
    if (!started) {
      handleStart();
      return;
    }
    for (const touch of e.changedTouches) {
      handleInteract(touch.clientX, touch.clientY);
    }
  }, false);

  // Fallback for mouse / non-touch devices
  document.addEventListener("click", function (e) {
    if (!started) {
      handleStart();
      return;
    }
    handleInteract(e.clientX, e.clientY);
  }, false);


})();
