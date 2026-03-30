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
  function onResize() {
    resize();
    if (activeScene && activeScene.onResize) activeScene.onResize();
  }
  window.addEventListener("resize", onResize);
  resize();

  // ---- Utility ----
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- Shared: hillY (used by bedtime + hills scenes) ----
  function hillY(x, seed, baseY, amp, freq) {
    return baseY
      + Math.sin(x * freq + seed) * amp
      + Math.sin(x * freq * 2.3 + seed * 1.7) * amp * 0.4
      + Math.sin(x * freq * 0.6 + seed * 0.3) * amp * 0.6;
  }

  // ---- Scene orchestrator ----
  const SCENES = {};
  let activeScene = null;

  function startScene(name) {
    twinkles.length = 0;
    activeScene = SCENES[name];
    activeScene.init();
    if (activeScene.onResize) activeScene.onResize();
  }

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
  // ---- Touch twinkles ----
  const MAX_TWINKLES = 120;
  const twinkles = [];

  // light = true for swipe trail (fewer, smaller, faster-fading particles)
  function addTwinkle(px, py, light) {
    const count = light ? Math.floor(rand(2, 4)) : Math.floor(rand(5, 10));
    const maxSpeed = light ? 1.2 : 2.5;
    const decayLo = light ? 0.02 : 0.008;
    const decayHi = light ? 0.04 : 0.02;

    // If near the cap, remove oldest particles to make room
    while (twinkles.length + count > MAX_TWINKLES) {
      twinkles.shift();
    }

    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.2, maxSpeed);
      twinkles.push({
        x: px * devicePixelRatio,
        y: py * devicePixelRatio,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(2.5, light ? 4.5 : 6),
        life: 1,
        decay: rand(decayLo, decayHi),
        hue: rand(42, 55),
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
    const n = twinkles.length;
    // Use simple circles when many particles, radial gradients when few
    const simple = n > 50;

    for (const p of twinkles) {
      const alpha = p.life * 0.8;
      if (simple) {
        // Fast path: single filled circle with glow approximated by larger faded circle
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillStyle = `hsl(${p.hue}, 70%, 80%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 80%, 92%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Pretty path: radial gradient glow
        ctx.globalAlpha = alpha;
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
    }
    ctx.globalAlpha = 1;
  }

  function updateTwinkleParticles() {
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

    if (activeScene) {
      activeScene.draw(t);
      activeScene.update(t);
    }

    drawTwinkles();
    updateTwinkleParticles();

    if (running) requestAnimationFrame(frame);
  }

  // ==== SCENE: Bedtime ====
  function updateBedtimeShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) shootingStars.splice(i, 1);
    }
  }

  SCENES.bedtime = {
    init() {
      createStars();
      createClouds();
      createFireflies();
      sizeMoon();
      shootingStars.length = 0;
    },
    draw(t) {
      drawSky(t);
      drawMoon(t);
      drawStars(t);
      drawShootingStars();
      drawClouds(t);
      drawHills(t);
      drawFireflies(t);
    },
    update(t) {
      updateBedtimeShootingStars();
      maybeSpawnShootingStar();
    },
    onTap(px, py) { /* shared twinkle + music is sufficient */ },
    onResize() { sizeMoon(); },
  };

  // ==== SCENE: Beach ====
  const beachBubbles = [];
  const beachSandPuffs = [];
  const beachTappedClouds = [];
  let beachSun = { x: 0.82, y: 0.12, r: 0, glowR: 0 };

  function sizeBeachSun() {
    beachSun.r = Math.min(W, H) * 0.04;
    beachSun.glowR = beachSun.r * 4;
  }

  // Beach zone boundaries (fraction of screen height)
  const BEACH_SKY_END = 0.55;   // sky occupies top 55%
  const BEACH_SAND_END = 0.65;  // sand strip 55%-65%
  // sea occupies 65%-100%

  function drawBeachSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H * BEACH_SKY_END);
    grad.addColorStop(0, "#4a90d9");
    grad.addColorStop(0.7, "#87CEEB");
    grad.addColorStop(1, "#B0E0E6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * BEACH_SKY_END);
  }

  function drawBeachSun() {
    const sx = beachSun.x * W;
    const sy = beachSun.y * H;
    const glowGrad = ctx.createRadialGradient(sx, sy, beachSun.r * 0.3, sx, sy, beachSun.glowR);
    glowGrad.addColorStop(0, "rgba(255, 240, 150, 0.25)");
    glowGrad.addColorStop(0.4, "rgba(255, 220, 100, 0.08)");
    glowGrad.addColorStop(1, "rgba(255, 220, 100, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, beachSun.glowR, 0, Math.PI * 2);
    ctx.fill();
    const discGrad = ctx.createRadialGradient(sx - beachSun.r * 0.2, sy - beachSun.r * 0.2, 0, sx, sy, beachSun.r);
    discGrad.addColorStop(0, "rgba(255, 250, 200, 0.98)");
    discGrad.addColorStop(1, "rgba(255, 220, 120, 0.92)");
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, beachSun.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBeachSand() {
    const y0 = H * BEACH_SKY_END;
    const y1 = H * BEACH_SAND_END;
    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, "#f0dca0");
    grad.addColorStop(1, "#e8cc88");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, W, y1 - y0);
  }

  function drawBeachSea(t) {
    const seaTop = H * BEACH_SAND_END;
    // base sea fill
    const grad = ctx.createLinearGradient(0, seaTop, 0, H);
    grad.addColorStop(0, "#3ab5c4");
    grad.addColorStop(0.4, "#2196a8");
    grad.addColorStop(1, "#1a6e80");
    ctx.fillStyle = grad;
    ctx.fillRect(0, seaTop, W, H - seaTop);

    // animated wave layers
    for (let layer = 0; layer < 3; layer++) {
      const baseY = seaTop + layer * (H - seaTop) * 0.15;
      const amp = H * 0.008;
      const freq = 0.005 + layer * 0.002;
      const speed = 0.8 + layer * 0.3;
      const alpha = 0.12 - layer * 0.03;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = baseY + Math.sin(x * freq + t * speed) * amp
                        + Math.sin(x * freq * 1.7 + t * speed * 0.6) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBeachBubbles() {
    for (const b of beachBubbles) {
      ctx.globalAlpha = b.life * 0.6;
      ctx.strokeStyle = `rgba(180, 230, 255, 0.7)`;
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      // highlight
      ctx.globalAlpha = b.life * 0.3;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBeachSandPuffs() {
    for (const p of beachSandPuffs) {
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = "#d4b876";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBeachTappedClouds() {
    for (const c of beachTappedClouds) {
      ctx.globalAlpha = c.life * 0.35;
      ctx.fillStyle = "#fff";
      const w = c.w;
      const h = c.h;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, w * 0.5, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x - w * 0.25, c.y + h * 0.2, w * 0.33, h * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + w * 0.28, c.y + h * 0.15, w * 0.36, h * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateBeachParticles() {
    for (let i = beachBubbles.length - 1; i >= 0; i--) {
      const b = beachBubbles[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vx += rand(-0.05, 0.05); // wobble
      b.life -= b.decay;
      if (b.life <= 0) beachBubbles.splice(i, 1);
    }
    for (let i = beachSandPuffs.length - 1; i >= 0; i--) {
      const p = beachSandPuffs[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02; // rise slightly
      p.vx *= 0.97;
      p.r *= 1.01; // expand
      p.life -= p.decay;
      if (p.life <= 0) beachSandPuffs.splice(i, 1);
    }
    for (let i = beachTappedClouds.length - 1; i >= 0; i--) {
      const c = beachTappedClouds[i];
      c.x += c.vx;
      c.life -= c.decay;
      if (c.life <= 0) beachTappedClouds.splice(i, 1);
    }
  }

  function spawnBeachBubbles(px, py) {
    const count = Math.floor(rand(5, 10));
    for (let i = 0; i < count; i++) {
      beachBubbles.push({
        x: px * devicePixelRatio + rand(-15, 15),
        y: py * devicePixelRatio + rand(-10, 10),
        vx: rand(-0.3, 0.3),
        vy: rand(-1.5, -0.5),
        r: rand(3, 8) * devicePixelRatio,
        life: 1,
        decay: rand(0.006, 0.015),
      });
    }
  }

  function spawnBeachSandPuff(px, py) {
    const count = Math.floor(rand(8, 14));
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.5, 2);
      beachSandPuffs.push({
        x: px * devicePixelRatio,
        y: py * devicePixelRatio,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        r: rand(2, 5) * devicePixelRatio,
        life: 1,
        decay: rand(0.015, 0.035),
      });
    }
  }

  function spawnBeachCloud(px, py) {
    beachTappedClouds.push({
      x: px * devicePixelRatio,
      y: py * devicePixelRatio,
      w: rand(40, 80) * devicePixelRatio,
      h: rand(8, 16) * devicePixelRatio,
      vx: rand(0.1, 0.4) * (Math.random() < 0.5 ? 1 : -1),
      life: 1,
      decay: rand(0.001, 0.003),
    });
  }

  SCENES.beach = {
    init() {
      beachBubbles.length = 0;
      beachSandPuffs.length = 0;
      beachTappedClouds.length = 0;
      sizeBeachSun();
    },
    draw(t) {
      drawBeachSky();
      drawBeachSun();
      drawBeachTappedClouds();
      drawBeachSand();
      drawBeachSea(t);
      drawBeachBubbles();
      drawBeachSandPuffs();
    },
    update(t) {
      updateBeachParticles();
    },
    onTap(px, py) {
      const yNorm = py / window.innerHeight;
      if (yNorm < BEACH_SKY_END) {
        spawnBeachCloud(px, py);
      } else if (yNorm < BEACH_SAND_END) {
        spawnBeachSandPuff(px, py);
      } else {
        spawnBeachBubbles(px, py);
      }
    },
    onResize() { sizeBeachSun(); },
  };

  // ==== SCENE: Hills ====
  const GREEN_HILL_COLORS = [
    [55, 160, 60],
    [45, 140, 50],
    [35, 115, 42],
  ];
  const hillBirds = [];
  const hillBunnies = [];
  const hillButterflies = [];

  function createBirds() {
    hillBirds.length = 0;
    for (let i = 0; i < 6; i++) {
      hillBirds.push({
        x: rand(0, 1),
        y: rand(0.08, 0.35),
        speed: rand(0.01, 0.025),
        flapSpeed: rand(3, 6),
        flapPhase: rand(0, Math.PI * 2),
        size: rand(6, 12) * devicePixelRatio,
        bobPhase: rand(0, Math.PI * 2),
        bobAmp: rand(0.005, 0.015),
      });
    }
  }

  function createBunnies() {
    hillBunnies.length = 0;
    for (let i = 0; i < 4; i++) {
      hillBunnies.push({
        x: rand(0.1, 0.9),
        layer: Math.floor(rand(0, 3)),
        earPhase: rand(0, Math.PI * 2),
        earSpeed: rand(1.5, 3),
        size: rand(8, 14) * devicePixelRatio,
      });
    }
  }

  function drawHillsSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    grad.addColorStop(0, "#3a7bd5");
    grad.addColorStop(0.6, "#6db3f2");
    grad.addColorStop(1, "#a8d8ea");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGreenHills(t) {
    const drift = t * 0.01;
    for (let layer = 0; layer < 3; layer++) {
      const baseY = H * (0.52 + layer * 0.12);
      const amp = H * (0.05 - layer * 0.008);
      const freq = 0.0015 + layer * 0.0005;
      const col = GREEN_HILL_COLORS[layer];
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = hillY(x, layer * 50 + drift * (layer + 1) * 3, baseY, amp, freq);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBirds(t) {
    ctx.strokeStyle = "#2a3a50";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.lineCap = "round";
    for (const b of hillBirds) {
      const bx = b.x * W;
      const by = (b.y + Math.sin(t * 0.5 + b.bobPhase) * b.bobAmp) * H;
      const wingAngle = Math.sin(t * b.flapSpeed + b.flapPhase) * 0.5;
      const s = b.size;
      ctx.beginPath();
      ctx.moveTo(bx - s, by + wingAngle * s);
      ctx.quadraticCurveTo(bx - s * 0.3, by - Math.abs(wingAngle) * s * 0.3, bx, by);
      ctx.quadraticCurveTo(bx + s * 0.3, by - Math.abs(wingAngle) * s * 0.3, bx + s, by + wingAngle * s);
      ctx.stroke();
    }
  }

  function getBunnyHillY(bunny, t) {
    const drift = t * 0.01;
    const layer = bunny.layer;
    const baseY = H * (0.52 + layer * 0.12);
    const amp = H * (0.05 - layer * 0.008);
    const freq = 0.0015 + layer * 0.0005;
    return hillY(bunny.x * W, layer * 50 + drift * (layer + 1) * 3, baseY, amp, freq);
  }

  function drawBunnies(t) {
    for (const b of hillBunnies) {
      const bx = b.x * W;
      const by = getBunnyHillY(b, t);
      const s = b.size;
      const earTwitch = Math.sin(t * b.earSpeed + b.earPhase) * 0.15;

      // Body (oval)
      ctx.fillStyle = "#c8b898";
      ctx.beginPath();
      ctx.ellipse(bx, by - s * 0.4, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(bx, by - s * 1.0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.fillStyle = "#c8b898";
      // Left ear
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.15, by - s * 1.55, s * 0.1, s * 0.3, -0.15 + earTwitch, 0, Math.PI * 2);
      ctx.fill();
      // Right ear
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.15, by - s * 1.55, s * 0.1, s * 0.3, 0.15 - earTwitch, 0, Math.PI * 2);
      ctx.fill();

      // Inner ears (pink)
      ctx.fillStyle = "#e8b8b0";
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.15, by - s * 1.55, s * 0.05, s * 0.2, -0.15 + earTwitch, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.15, by - s * 1.55, s * 0.05, s * 0.2, 0.15 - earTwitch, 0, Math.PI * 2);
      ctx.fill();

      // Tail (small circle)
      ctx.fillStyle = "#e8e0d8";
      ctx.beginPath();
      ctx.arc(bx - s * 0.45, by - s * 0.25, s * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(bx + s * 0.1, by - s * 1.05, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHillButterflies(t) {
    for (const bf of hillButterflies) {
      const wingFlap = Math.sin(t * 8 + bf.phase) * 0.7;
      ctx.globalAlpha = bf.life;
      ctx.fillStyle = `hsl(${bf.hue}, 70%, 70%)`;

      // Left wing
      ctx.beginPath();
      ctx.ellipse(bf.x - bf.size * 0.4, bf.y, bf.size * 0.5, bf.size * 0.3 * Math.abs(Math.cos(wingFlap)), 0, 0, Math.PI * 2);
      ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.ellipse(bf.x + bf.size * 0.4, bf.y, bf.size * 0.5, bf.size * 0.3 * Math.abs(Math.cos(wingFlap)), 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.ellipse(bf.x, bf.y, bf.size * 0.08, bf.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateHillsEntities(t) {
    // birds drift across screen
    for (const b of hillBirds) {
      b.x += b.speed * (1 / 60);
      if (b.x > 1.1) b.x = -0.1;
    }
    // butterflies flutter upward and fade
    for (let i = hillButterflies.length - 1; i >= 0; i--) {
      const bf = hillButterflies[i];
      bf.x += bf.vx;
      bf.y += bf.vy;
      bf.vx += rand(-0.15, 0.15);
      bf.vx *= 0.95;
      bf.life -= bf.decay;
      if (bf.life <= 0) hillButterflies.splice(i, 1);
    }
  }

  function spawnButterfly(px, py) {
    hillButterflies.push({
      x: px * devicePixelRatio,
      y: py * devicePixelRatio,
      vx: rand(-0.5, 0.5),
      vy: rand(-1.2, -0.4),
      size: rand(8, 16) * devicePixelRatio,
      phase: rand(0, Math.PI * 2),
      hue: rand(280, 340),
      life: 1,
      decay: rand(0.004, 0.01),
    });
  }

  SCENES.hills = {
    init() {
      createBirds();
      createBunnies();
      hillButterflies.length = 0;
    },
    draw(t) {
      drawHillsSky();
      drawBirds(t);
      drawGreenHills(t);
      drawBunnies(t);
      drawHillButterflies(t);
    },
    update(t) {
      updateHillsEntities(t);
    },
    onTap(px, py) {
      spawnButterfly(px, py);
    },
    onResize() {
      // birds/bunnies use normalized coords, so nothing needed
    },
  };

  // ============================================================
  //  MUSIC ENGINE – gentle generative lullaby
  // ============================================================

  let audioCtx = null;
  let masterGain = null;
  let reverbNode = null;

  // Melody notes: C major pentatonic in a warm, music-box range (C4–G5)
  // Avoiding A (can sound tense) — using C D E G only across two octaves
  const MELODY_NOTES = [
    261.63, 293.66, 329.63, 392.00,           // C4 D4 E4 G4
    523.25, 587.33, 659.25, 783.99,           // C5 D5 E5 G5
  ];

  // Harmonious intervals: for any melody note, pick a consonant partner
  // (a third above, a fifth above, or an octave)
  function getHarmony(freq) {
    const options = [freq * 5 / 4, freq * 3 / 2, freq * 2]; // major 3rd, 5th, octave
    return options[Math.floor(Math.random() * options.length)];
  }

  // Warm pad chord roots — all major-feeling (C, F, G in comfortable octaves)
  const PAD_CHORDS = [
    [261.63, 329.63, 392.00],  // C major  (C4 E4 G4)
    [349.23, 440.00, 523.25],  // F major  (F4 A4 C5)
    [392.00, 493.88, 587.33],  // G major  (G4 B4 D5)
  ];
  let currentChordIdx = 0;

  let padOscs = [];
  let padGains = [];
  let droneOscs = [];
  let droneGains = [];
  let melodyTimer = null;
  let chordTimer = null;

  function createReverb() {
    // Short, warm reverb — fast decay avoids eerie trailing wash
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * 1.5; // 1.5 seconds (shorter = warmer)
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Steeper exponential decay (4.0) for a cosy room feel
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4.0);
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
    // Warm, soft major chord drone using triangle waves (no vibrato — steady and safe)
    const chord = PAD_CHORDS[0]; // Start on C major
    for (let i = 0; i < chord.length; i++) {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = chord[i];

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + 4);

      // Gentle lowpass to keep it soft
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 0.3;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start();

      droneOscs.push(osc);
      droneGains.push(gain);
    }

    // Slowly cycle through major chords for gentle harmonic movement
    scheduleChordChange();
  }

  function scheduleChordChange() {
    chordTimer = setTimeout(function changeChord() {
      currentChordIdx = (currentChordIdx + 1) % PAD_CHORDS.length;
      const chord = PAD_CHORDS[currentChordIdx];
      const now = audioCtx.currentTime;
      for (let i = 0; i < droneOscs.length; i++) {
        droneOscs[i].frequency.setValueAtTime(droneOscs[i].frequency.value, now);
        droneOscs[i].frequency.linearRampToValueAtTime(chord[i], now + 4);
      }
      chordTimer = setTimeout(changeChord, rand(10000, 18000));
    }, rand(10000, 18000));
  }

  function startPad() {
    // Extra-soft high sine pad for shimmer — just the root an octave up
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 523.25; // C5

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.2;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();

    padOscs.push(osc);
    padGains.push(gain);
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
    // Play gentle stepwise melodies — prefer small intervals (neighbouring notes)
    // rather than random jumps, which sound more musical and less eerie
    let lastIdx = Math.floor(MELODY_NOTES.length / 2); // start in the middle

    function next() {
      // Step to a nearby note (±1 or ±2 in the scale) for smooth melodic motion
      const step = Math.random() < 0.7
        ? (Math.random() < 0.5 ? -1 : 1)   // small step
        : (Math.random() < 0.5 ? -2 : 2);   // slightly larger step
      lastIdx = clamp(lastIdx + step, 0, MELODY_NOTES.length - 1);

      const note = MELODY_NOTES[lastIdx];
      const duration = rand(1.8, 3.0);
      playNote(note, duration, 0, rand(0.06, 0.10));

      // Occasionally add a consonant harmony (major 3rd, 5th, or octave)
      if (Math.random() < 0.25) {
        const harmony = getHarmony(note);
        playNote(harmony, duration * 0.7, 0.15, rand(0.02, 0.04));
      }

      const interval = rand(2000, 4500);
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

    // Play a touch-responsive note from the melody scale
    const scaleIdx = Math.floor(xNorm * MELODY_NOTES.length);
    const note = MELODY_NOTES[clamp(scaleIdx, 0, MELODY_NOTES.length - 1)];
    const vol = lerp(0.08, 0.14, 1 - yNorm);
    playNote(note, rand(1.0, 2.0), 0, vol);

    // Play a consonant chime (major 3rd or 5th above, never random)
    const chime = getHarmony(note);
    playNote(chime, rand(0.6, 1.2), 0.05, vol * 0.2);

    // Gently nudge the drone chord based on screen third
    const chordIdx = yNorm < 0.33 ? 2 : yNorm < 0.66 ? 0 : 1; // G, C, F
    if (chordIdx !== currentChordIdx) {
      currentChordIdx = chordIdx;
      const chord = PAD_CHORDS[chordIdx];
      const now = audioCtx.currentTime;
      for (let i = 0; i < droneOscs.length; i++) {
        droneOscs[i].frequency.setValueAtTime(droneOscs[i].frequency.value, now);
        droneOscs[i].frequency.linearRampToValueAtTime(chord[i], now + 3);
      }
    }
  }

  // ---- Swipe note tracking ----
  // Track which "pitch lane" each finger is in so we play a new note
  // each time the finger crosses into a different lane (like a harp).
  const activeTouches = new Map(); // touchId -> { lastLane, lastTwinkleX, lastTwinkleY }

  function getLane(px) {
    const xNorm = px / window.innerWidth;
    return clamp(Math.floor(xNorm * MELODY_NOTES.length), 0, MELODY_NOTES.length - 1);
  }

  function handleSwipeMove(px, py, touchId) {
    const lane = getLane(px);
    const state = activeTouches.get(touchId);
    if (!state) return;

    // Spawn light trailing twinkles along the swipe path (throttled by distance)
    const dx = px - state.lastTwinkleX;
    const dy = py - state.lastTwinkleY;
    if (dx * dx + dy * dy > 1600) { // ~40px apart
      addTwinkle(px, py, true);
      state.lastTwinkleX = px;
      state.lastTwinkleY = py;
    }

    // Play a note when the finger enters a new pitch lane
    if (lane !== state.lastLane) {
      state.lastLane = lane;
      const note = MELODY_NOTES[lane];
      const yNorm = py / window.innerHeight;
      const vol = lerp(0.06, 0.12, 1 - yNorm);
      // Shorter, lighter notes for swipe — feels like plucking strings
      playNote(note, rand(0.6, 1.2), 0, vol);
    }
  }

  // ---- Input handling ----
  const overlay = document.getElementById("start-overlay");
  const picker = document.getElementById("scene-picker");
  let started = false;
  let pickerOpen = false;

  // Step 1: tap start overlay → show scene picker
  function handleStart() {
    if (pickerOpen || started) return;
    pickerOpen = true;

    overlay.classList.add("hidden");
    setTimeout(() => overlay.style.display = "none", 1600);

    picker.classList.add("visible");
  }

  // Step 2: pick a scene → init audio + start
  document.querySelectorAll(".scene-btn").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      if (started) return;
      started = true;

      const sceneName = btn.getAttribute("data-scene");

      picker.classList.add("hidden");
      setTimeout(() => picker.style.display = "none", 1600);

      // Init audio inside THIS user gesture
      initAudio();

      startScene(sceneName);
      running = true;
      requestAnimationFrame(frame);

      // Try fullscreen
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    });
    // Also handle touch for mobile
    btn.addEventListener("touchend", function(e) {
      e.stopPropagation();
      btn.click();
    }, { passive: false });
  });

  function handleInteract(px, py) {
    addTwinkle(px, py);
    onTouch(px, py);
    if (activeScene && activeScene.onTap) {
      activeScene.onTap(px, py);
    }
  }

  // ---- Touch events (primary — handles taps + swipes + multi-touch) ----
  document.addEventListener("touchstart", function (e) {
    if (!started) return;
    for (const touch of e.changedTouches) {
      activeTouches.set(touch.identifier, {
        lastLane: getLane(touch.clientX),
        lastTwinkleX: touch.clientX,
        lastTwinkleY: touch.clientY,
      });
    }
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    if (!started) return;
    for (const touch of e.changedTouches) {
      handleSwipeMove(touch.clientX, touch.clientY, touch.identifier);
    }
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (!started) {
      handleStart();
      return;
    }
    for (const touch of e.changedTouches) {
      // If the finger didn't move much, treat as a tap (play full note + chime)
      const state = activeTouches.get(touch.identifier);
      if (state) {
        const dx = touch.clientX - state.lastTwinkleX;
        const dy = touch.clientY - state.lastTwinkleY;
        // Always play a tap note on lift
        handleInteract(touch.clientX, touch.clientY);
      }
      activeTouches.delete(touch.identifier);
    }
  }, false);

  document.addEventListener("touchcancel", function (e) {
    for (const touch of e.changedTouches) {
      activeTouches.delete(touch.identifier);
    }
  }, { passive: true });

  // ---- Mouse events (fallback for desktop — supports click + drag) ----
  let mouseDown = false;
  let mouseId = "mouse";

  document.addEventListener("mousedown", function (e) {
    if (!started) {
      handleStart();
      return;
    }
    mouseDown = true;
    activeTouches.set(mouseId, {
      lastLane: getLane(e.clientX),
      lastTwinkleX: e.clientX,
      lastTwinkleY: e.clientY,
    });
    handleInteract(e.clientX, e.clientY);
  }, false);

  document.addEventListener("mousemove", function (e) {
    if (!started || !mouseDown) return;
    handleSwipeMove(e.clientX, e.clientY, mouseId);
  }, false);

  document.addEventListener("mouseup", function () {
    mouseDown = false;
    activeTouches.delete(mouseId);
  }, false);


})();
