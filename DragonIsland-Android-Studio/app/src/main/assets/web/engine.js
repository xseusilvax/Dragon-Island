// engine.js — motor compartilhado dos cenários animados do Dragon Island.
// Cada cenário (invasao.html, cidade.html, etc.) só define um "herói" (a nave,
// o foguete, o planeta...) e os detalhes de céu/cor; prédios, chão, carros,
// poeira, bloom e o loop de desenho são todos daqui, pra não duplicar a
// mesma engenharia em cada arquivo.
window.SceneEngine = (function () {
  const W = 512, H = 256, HORIZON = 190, TAU = Math.PI * 2;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let q = Math.imul(a ^ a >>> 15, 1 | a);
      q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
      return ((q ^ q >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const lighten = v => Math.round(v + (255 - v) * 0.6);
  function glowSprite(r, g, b, core) {
    const s = 64, c = makeCanvas(s, s), x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (core !== false) {
      gr.addColorStop(0, `rgba(${lighten(r)},${lighten(g)},${lighten(b)},1)`);
      gr.addColorStop(0.12, `rgba(${r},${g},${b},0.85)`);
      gr.addColorStop(0.35, `rgba(${r},${g},${b},0.28)`);
    } else {
      gr.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
      gr.addColorStop(0.45, `rgba(${r},${g},${b},0.22)`);
    }
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return c;
  }

  function start(cfg) {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let S = 1, t = 0;

    const rand = mulberry32(cfg.seed || 1);
    const R = (a, b) => a + rand() * (b - a);

    const SPR = {
      red: glowSprite(255, 70, 110),
      head: glowSprite(220, 240, 255),
      tail: glowSprite(255, 60, 80),
      cyan: glowSprite(120, 210, 255)
    };
    function spr(img, x, y, size, a) {
      if (a <= 0.004) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(img, x - size, y - size, size * 2, size * 2);
    }

    // ===== estrelas =====
    const stars = [];
    for (let i = 0; i < 150; i++) {
      const depth = rand();
      stars.push({
        x: rand() * W, y: rand() * HORIZON,
        r: 0.3 + depth * 1.3, tw: rand() * TAU, speed: 0.02 + depth * 0.03,
        col: `rgb(${Math.round(200 + depth * 55)},${Math.round(215 + depth * 40)},255)`
      });
    }
    const shooting = [];

    // ===== nuvens =====
    const clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: rand() * W, y: 30 + rand() * 130, w: 60 + rand() * 100, h: 6 + rand() * 10,
        speed: 0.15 + rand() * 0.3, alpha: 0.05 + rand() * 0.1
      });
    }

    // ===== prédios =====
    function makeWindows(b) {
      const wins = [];
      const cols = Math.max(1, Math.floor((b.w - 4) / 7));
      const rows = Math.max(1, Math.floor((b.yBase - b.bodyTop - 6) / 8));
      const offX = b.x + (b.w - (cols * 7 - 5)) / 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (rand() > 0.5) {
            const hue = cfg.windowHues[Math.floor(rand() * cfg.windowHues.length)];
            wins.push({
              x: offX + i * 7, y: b.bodyTop + 5 + j * 8, w: 2, h: 3,
              col: `hsl(${hue},90%,70%)`, on: rand() < 0.75,
              timer: R(60, 1500), tv: rand() < 0.05, level: R(0.55, 1)
            });
          }
        }
      }
      return wins;
    }

    function makeRow(yBase, minH, maxH, minW, maxW, color, isFront) {
      const arr = [];
      let x = -20 + rand() * 10;
      while (x < W + 20) {
        const w = R(minW, maxW), h = R(minH, maxH);
        const roll = rand();
        const type = roll < 0.5 ? 0 : roll < 0.72 ? 1 : roll < 0.87 ? 2 : 3;
        const b = {
          x, w, h, yBase, top: yBase - h, type, color,
          antenna: rand() > 0.72, antennaH: R(6, 22), dish: rand() > 0.85,
          stepInset: w * R(0.15, 0.3), stepH: h * R(0.12, 0.22),
          spireH: R(10, 26), slant: w * R(0.2, 0.5) * (rand() < 0.5 ? -1 : 1),
          blink: rand() * TAU,
          neon: isFront && rand() > 0.7
            ? { side: rand() < 0.5 ? 0 : 1, hue: cfg.neonHues[Math.floor(rand() * cfg.neonHues.length)], h: R(10, 22), y: R(0.15, 0.45), ph: rand() * 100 }
            : null
        };
        b.bodyTop = b.top + (type === 1 ? b.stepH : type === 3 ? Math.abs(b.slant) : 0);
        b.mastBase = type === 2 ? b.top - b.spireH : type === 3 ? b.top + Math.abs(b.slant) / 2 : b.top;
        b.light = type === 2 || b.antenna;
        b.lightY = type === 2 ? b.mastBase : b.mastBase - b.antennaH;
        b.windows = makeWindows(b);
        arr.push(b);
        x += w + R(2, 7);
      }
      return arr;
    }

    const backRow = makeRow(HORIZON, 30, 70, 15, 35, cfg.backColor, false);
    const frontRow = makeRow(HORIZON + 15, 55, 130, 22, 48, cfg.frontColor, true);

    // ===== poeira e carros =====
    const dust = [];
    for (let i = 0; i < 40; i++) {
      dust.push({
        x: rand() * W, y: rand() * H, vx: (rand() - 0.5) * 0.15, vy: -0.05 - rand() * 0.15,
        r: 0.4 + rand() * 0.8, alpha: 0.2 + rand() * 0.4, col: `hsl(${cfg.dustHue + rand() * 40},80%,78%)`
      });
    }
    const cars = [];

    // ===== camadas estáticas (recriadas só no resize) =====
    const L = {};
    function layer() {
      const c = makeCanvas(Math.round(W * S), Math.round(H * S));
      const g = c.getContext('2d');
      g.setTransform(S, 0, 0, S, 0, 0);
      return { c, g };
    }

    function paintSky(g) {
      cfg.paintSky(g, W, H, HORIZON);
    }

    function buildingPath(g, b) {
      const Lx = b.x, Rx = b.x + b.w, T = b.top, B = b.yBase;
      g.beginPath();
      if (b.type === 1) {
        g.moveTo(Lx, B); g.lineTo(Lx, T + b.stepH); g.lineTo(Lx + b.stepInset, T + b.stepH);
        g.lineTo(Lx + b.stepInset, T); g.lineTo(Rx - b.stepInset, T); g.lineTo(Rx - b.stepInset, T + b.stepH);
        g.lineTo(Rx, T + b.stepH); g.lineTo(Rx, B);
      } else if (b.type === 3) {
        g.moveTo(Lx, B); g.lineTo(Lx, T + Math.max(0, b.slant)); g.lineTo(Rx, T + Math.max(0, -b.slant)); g.lineTo(Rx, B);
      } else {
        g.moveTo(Lx, B); g.lineTo(Lx, T); g.lineTo(Rx, T); g.lineTo(Rx, B);
      }
      g.closePath();
    }

    function roofPath(g, b) {
      const Lx = b.x, Rx = b.x + b.w, T = b.top + 0.5;
      g.beginPath();
      if (b.type === 1) {
        g.moveTo(Lx, T + b.stepH); g.lineTo(Lx + b.stepInset, T + b.stepH);
        g.moveTo(Lx + b.stepInset, T); g.lineTo(Rx - b.stepInset, T);
        g.moveTo(Rx - b.stepInset, T + b.stepH); g.lineTo(Rx, T + b.stepH);
      } else if (b.type === 3) {
        g.moveTo(Lx, T + Math.max(0, b.slant)); g.lineTo(Rx, T + Math.max(0, -b.slant));
      } else {
        g.moveTo(Lx, T); g.lineTo(Rx, T);
      }
    }

    function paintRow(g, row, fogTop, fogColor) {
      for (const b of row) {
        const body = g.createLinearGradient(0, b.top, 0, b.yBase);
        body.addColorStop(0, b.color);
        body.addColorStop(1, '#01020a');
        g.fillStyle = body;
        buildingPath(g, b);
        g.fill();

        const cx = b.x + b.w / 2;

        if (b.type === 2) {
          g.fillStyle = b.color;
          g.beginPath();
          g.moveTo(cx - 2.5, b.top); g.lineTo(cx, b.top - b.spireH); g.lineTo(cx + 2.5, b.top);
          g.fill();
          g.strokeStyle = cfg.rimColor;
          g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(cx, b.top); g.lineTo(cx, b.top - b.spireH); g.stroke();
        }

        g.lineWidth = 1;
        g.strokeStyle = cfg.rimColor;
        roofPath(g, b); g.stroke();

        if (b.antenna && b.type !== 2) {
          g.strokeStyle = cfg.rimColor;
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(cx, b.mastBase); g.lineTo(cx, b.mastBase - b.antennaH); g.stroke();
        }

        if (b.dish) {
          const dxp = b.x + b.w * 0.7, dy = b.bodyTop - 4;
          g.strokeStyle = cfg.rimColor;
          g.lineWidth = 1;
          g.beginPath(); g.arc(dxp, dy, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
          g.beginPath(); g.moveTo(dxp, dy); g.lineTo(dxp, dy + 3); g.stroke();
        }
      }

      g.save();
      g.globalCompositeOperation = 'source-atop';
      const fog = g.createLinearGradient(0, fogTop, 0, row[0].yBase);
      fog.addColorStop(0, fogColor.replace('A', '0'));
      fog.addColorStop(1, fogColor.replace('A', '0.35'));
      g.fillStyle = fog;
      g.fillRect(0, fogTop, W, row[0].yBase - fogTop);
      g.restore();
    }

    function paintOverlay(g) {
      g.fillStyle = 'rgba(0,0,0,0.09)';
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      const v = g.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 320);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.68)');
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    }

    function buildLayers() {
      L.sky = layer(); paintSky(L.sky.g);
      L.back = layer(); paintRow(L.back.g, backRow, HORIZON - 45, cfg.backFog);
      L.front = layer(); paintRow(L.front.g, frontRow, 165, cfg.frontFog);
      L.overlay = layer(); paintOverlay(L.overlay.g);
    }

    // ===== bloom barato =====
    const bloomA = makeCanvas(128, 64), bA = bloomA.getContext('2d');
    const bloomB = makeCanvas(128, 64), bB = bloomB.getContext('2d');
    const bloomC = makeCanvas(64, 32), bC = bloomC.getContext('2d');
    function applyBloom() {
      bA.clearRect(0, 0, 128, 64);
      bA.drawImage(canvas, 0, 0, 128, 64);
      bB.globalCompositeOperation = 'source-over';
      bB.clearRect(0, 0, 128, 64);
      bB.drawImage(bloomA, 0, 0);
      bB.globalCompositeOperation = 'multiply';
      bB.drawImage(bloomA, 0, 0);
      bB.drawImage(bloomA, 0, 0);
      bC.clearRect(0, 0, 64, 32);
      bC.drawImage(bloomB, 0, 0, 64, 32);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(bloomB, 0, 0, W, H);
      ctx.globalAlpha = 0.7;
      ctx.drawImage(bloomC, 0, 0, W, H);
      ctx.restore();
    }

    function drawStars(dt) {
      for (const s of stars) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.col;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    function drawShootingStars(dt) {
      if (Math.random() < 0.008 * dt && shooting.length < 3) {
        shooting.push({ x: Math.random() * W * 0.8, y: Math.random() * 60, vx: 2 + Math.random() * 2, vy: 1 + Math.random() * 1.2, life: 40 + Math.random() * 20, max: 60 });
      }
      ctx.lineWidth = 1.5;
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        const a = Math.max(0, s.life / s.max);
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
        g.addColorStop(0, `rgba(220,240,255,${a})`);
        g.addColorStop(1, 'rgba(220,240,255,0)');
        ctx.strokeStyle = g;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12); ctx.stroke();
        if (s.life <= 0 || s.x > W + 20 || s.y > HORIZON) shooting.splice(i, 1);
      }
    }

    function drawClouds(dt) {
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x > W + c.w) c.x = -c.w;
        const grad = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
        grad.addColorStop(0, `rgba(${cfg.cloudRgb},0)`);
        grad.addColorStop(0.5, `rgba(${cfg.cloudRgb},${c.alpha})`);
        grad.addColorStop(1, `rgba(${cfg.cloudRgb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
    }

    function drawRowLive(row, dt) {
      for (const b of row) {
        for (const w of b.windows) {
          w.timer -= dt;
          if (w.timer <= 0) { w.on = Math.random() < 0.72; w.timer = 200 + Math.random() * 1500; }
          if (!w.on) continue;
          let a = w.level;
          if (w.tv) a *= 0.55 + 0.45 * Math.sin(t * 0.9 + w.x) * Math.sin(t * 0.37 + w.y);
          ctx.fillStyle = w.col;
          ctx.globalAlpha = a;
          ctx.fillRect(w.x, w.y, w.w, w.h);
          ctx.globalAlpha = a * 0.18;
          ctx.fillRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);
        }
        if (b.neon) {
          const n = b.neon;
          const buzz = (Math.sin(t * 0.05 + n.ph) > -0.95 && Math.random() > 0.02) ? 1 : 0.2;
          const nx = b.x + (n.side ? b.w - 4 : 2);
          const ny = b.bodyTop + (b.yBase - b.bodyTop) * n.y;
          ctx.fillStyle = `hsl(${n.hue},100%,65%)`;
          ctx.globalAlpha = 0.15 * buzz;
          ctx.fillRect(nx - 2, ny - 2, 6, n.h + 4);
          ctx.globalAlpha = 0.9 * buzz;
          ctx.fillRect(nx, ny, 2, n.h);
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of row) {
        if (!b.light) continue;
        const on = Math.sin(t * 0.08 + b.blink) > 0.3 ? 1 : 0.2;
        spr(SPR.red, b.x + b.w / 2, b.lightY, 4, on * 0.9);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawGround() {
      const g = ctx.createLinearGradient(0, HORIZON, 0, H);
      g.addColorStop(0, cfg.groundNear);
      g.addColorStop(1, '#01020a');
      ctx.fillStyle = g;
      ctx.fillRect(0, HORIZON, W, H - HORIZON);

      if (cfg.groundReflection) {
        const rx = cfg.groundReflection();
        const refl = ctx.createRadialGradient(rx.x, HORIZON + 30, 5, rx.x, HORIZON + 30, rx.r || 180);
        refl.addColorStop(0, rx.color);
        refl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = refl;
        ctx.fillRect(0, HORIZON, W, H - HORIZON);
      }

      ctx.strokeStyle = cfg.gridColor;
      ctx.lineWidth = 1;
      const N = 9, ph = (t * 0.012) % 1;
      for (let i = 0; i < N; i++) {
        const p = (i + ph) / N;
        const y = HORIZON + Math.pow(p, 1.7) * (H - HORIZON);
        ctx.globalAlpha = 0.06 + p * 0.3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.globalAlpha = 0.24;
      const cx = W / 2;
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath(); ctx.moveTo(cx + i * 8, HORIZON); ctx.lineTo(cx + i * 80, H); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function drawCars(dt) {
      if (Math.random() < 0.012 * dt && cars.length < 5) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        cars.push({ x: dir > 0 ? -10 : W + 10, y: 105 + Math.random() * 70, v: dir * (0.6 + Math.random() * 1.2), len: 8 + Math.random() * 10, ph: Math.random() * TAU });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        c.x += c.v * dt;
        if (c.x < -25 || c.x > W + 25) { cars.splice(i, 1); continue; }
        const dir = Math.sign(c.v);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'rgb(255,90,110)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(c.x - dir * 2, c.y); ctx.lineTo(c.x - dir * c.len, c.y); ctx.stroke();
        spr(SPR.tail, c.x - dir * 1.5, c.y, 2.8, 0.8);
        spr(SPR.head, c.x + dir * 1.5, c.y, 3.4, 0.9);
        if (Math.sin(t * 0.3 + c.ph) > 0.7) spr(SPR.cyan, c.x, c.y + 1.2, 2.4, 0.8);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawDust(dt) {
      for (const d of dust) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
        if (d.x < 0) d.x = W;
        if (d.x > W) d.x = 0;
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.col;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const hero = cfg.makeHero({ ctx, W, H, HORIZON, TAU, rand, R, spr, SPR, glowSprite, makeCanvas });

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(3, Math.max(0, (now - last) / 16.667));
      last = now;
      t += dt;

      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      ctx.drawImage(L.sky.c, 0, 0, W, H);
      drawStars(dt);
      drawShootingStars(dt);
      if (hero.behind) hero.behind(dt, t);
      drawClouds(dt);
      ctx.drawImage(L.back.c, 0, 0, W, H);
      drawRowLive(backRow, dt);
      drawGround();
      drawCars(dt);
      drawDust(dt);
      ctx.drawImage(L.front.c, 0, 0, W, H);
      drawRowLive(frontRow, dt);
      if (hero.front) hero.front(dt, t);
      applyBloom();
      ctx.drawImage(L.overlay.c, 0, 0, W, H);

      requestAnimationFrame(frame);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      S = Math.min(4, Math.max(1, (rect.width / W) * dpr));
      canvas.width = Math.round(W * S);
      canvas.height = Math.round(H * S);
      buildLayers();
    }
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
  }

  return { start, glowSprite, makeCanvas };
})();
