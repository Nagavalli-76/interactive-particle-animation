
// ── CANVAS SETUP ─────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas ? canvas.getContext('2d') : null;

if (!canvas || !ctx) {
  console.warn('Canvas or 2D context not available. Animation aborted.');
} else {

  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initParticles();
  });

// ── STATE ────────────────────────────────────────
let paused      = false;
let showLines   = true;
let mouseMode   = 'attract'; // 'attract' | 'repel'
let speedMult   = 1;
let maxDist     = 140;
let particleCount = 120;
let colorThemeIdx = 0;
let lineCount   = 0;

const mouse = { x: W / 2, y: H / 2, active: false };

// ── COLOR THEMES ─────────────────────────────────
const themes = [
  { name: 'Cyan',    base: [0,   212, 255], accent: [0,   150, 255] },
  { name: 'Violet',  base: [180, 100, 255], accent: [120,  60, 220] },
  { name: 'Coral',   base: [255, 100,  80], accent: [255, 160,  60] },
  { name: 'Mint',    base: [0,   220, 140], accent: [0,   180, 100] },
  { name: 'Gold',    base: [255, 200,  50], accent: [255, 140,  20] },
  { name: 'Rose',    base: [255,  80, 160], accent: [200,  60, 220] },
];

function getTheme() { return themes[colorThemeIdx]; }

function rgbStr(arr, a = 1) {
  return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;
}

// ── PARTICLE CLASS ───────────────────────────────
class Particle {
  constructor() { this.reset(true); }

  reset(initial = false) {
    this.x  = initial ? Math.random() * W : Math.random() * W;
    this.y  = initial ? Math.random() * H : Math.random() * H;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.radius = Math.random() * 2 + 1;
    this.alpha  = Math.random() * 0.5 + 0.4;
    // Each particle gets a slight hue shift
    this.hueShift = (Math.random() - 0.5) * 60;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }

  update(t) {
    const spd = speedMult;
    // Mouse interaction
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = 160;
      if (dist < range && dist > 0) {
        const force = (range - dist) / range * 0.6;
        const dir   = mouseMode === 'attract' ? 1 : -1;
        this.vx += (dx / dist) * force * dir * 0.4;
        this.vy += (dy / dist) * force * dir * 0.4;
      }
    }

    // Speed cap
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = 3 * spd;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Friction
    this.vx *= 0.985;
    this.vy *= 0.985;

    this.x += this.vx * spd;
    this.y += this.vy * spd;

    // Wrap edges
    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10) this.y = H + 10;
    if (this.y > H + 10) this.y = -10;

    // Pulse radius
    this.currentRadius = this.radius + Math.sin(t * 0.002 + this.pulseOffset) * 0.4;
  }

  draw(t) {
    const theme = getTheme();
    // Pulse glow
    const glowR = this.currentRadius * 4;
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
    grd.addColorStop(0, rgbStr(theme.base, this.alpha));
    grd.addColorStop(1, rgbStr(theme.base, 0));
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = rgbStr(theme.base, this.alpha + 0.3);
    ctx.fill();
  }
}

// ── PARTICLES ARRAY ──────────────────────────────
let particles = [];

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function syncParticleCount() {
  while (particles.length < particleCount) particles.push(new Particle());
  while (particles.length > particleCount) particles.pop();
}

// ── EXPLOSION ────────────────────────────────────
function explode(cx, cy) {
  particles.forEach(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = Math.min(300 / dist, 12);
    p.vx += (dx / dist) * force;
    p.vy += (dy / dist) * force;
  });
}

// ── FPS TRACKING ─────────────────────────────────
let fps = 60, lastTime = performance.now(), frameCount = 0;

// ── DRAW CONNECTIONS ─────────────────────────────
function drawConnections() {
  const theme = getTheme();
  lineCount = 0;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        lineCount++;
        const alpha = (1 - dist / maxDist) * 0.35;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = rgbStr(theme.accent, alpha);
        ctx.lineWidth = (1 - dist / maxDist) * 1.2;
        ctx.stroke();
      }
    }
  }
}

// ── MOUSE RING ───────────────────────────────────
function drawMouseRing(t) {
  if (!mouse.active) return;
  const theme = getTheme();
  const r = 160;
  const pulse = Math.sin(t * 0.004) * 8;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, r + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = rgbStr(theme.base, 0.08);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = rgbStr(theme.base, 0.5);
  ctx.fill();
}

// ── STAR BACKGROUND ──────────────────────────────
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random() * 0.8 + 0.2,
  a: Math.random() * 0.3 + 0.05,
  twinkle: Math.random() * Math.PI * 2
}));

function drawStars(t) {
  stars.forEach(s => {
    const alpha = s.a + Math.sin(t * 0.001 + s.twinkle) * 0.08;
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  });
}

// ── MAIN LOOP ────────────────────────────────────
function loop(t) {
  if (paused) return;

  // FPS
  frameCount++;
  if (t - lastTime >= 500) {
    fps = Math.round(frameCount * 1000 / (t - lastTime));
    frameCount = 0;
    lastTime = t;
    document.getElementById('statFps').textContent = fps;
    document.getElementById('statLines').textContent = lineCount;
    document.getElementById('statParticles').textContent = particles.length;
  }

  // Clear
  ctx.fillStyle = 'rgba(4,8,15,0.18)';
  ctx.fillRect(0, 0, W, H);

  drawStars(t);
  if (showLines) drawConnections();

  particles.forEach(p => {
    p.update(t);
    p.draw(t);
  });

  drawMouseRing(t);

  if (!paused) requestAnimationFrame(loop);
}

// ── EVENTS ───────────────────────────────────────

// Custom cursor
const cursorEl  = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
  cursorEl.style.left  = e.clientX + 'px';
  cursorEl.style.top   = e.clientY + 'px';
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top  = e.clientY + 'px';
});

window.addEventListener('mouseleave', () => { mouse.active = false; });

// Left click: repel burst
canvas.addEventListener('click', e => {
  if (mouseMode === 'repel') return; // already repelling — do nothing extra
  explode(e.clientX, e.clientY);
});

// Right click: big explosion
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  explode(e.clientX, e.clientY);
  // Temporarily scale up all velocities
  particles.forEach(p => {
    p.vx *= 2.5;
    p.vy *= 2.5;
  });
});

// Controls
document.getElementById('btnPlay').addEventListener('click', function() {
  paused = !paused;
  this.innerHTML = paused
    ? `<svg viewBox="0 0 16 16" style="width:14px;height:14px;fill:currentColor"><path d="M4 2l10 6-10 6z"/></svg> Play`
    : `<svg viewBox="0 0 16 16" style="width:14px;height:14px;fill:currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg> Pause`;
  this.classList.toggle('active', !paused);
  if (!paused) requestAnimationFrame(loop);
});

document.getElementById('btnAttract').addEventListener('click', function() {
  mouseMode = 'attract';
  this.classList.add('active');
  document.getElementById('btnRepel').classList.remove('active');
});

document.getElementById('btnRepel').addEventListener('click', function() {
  mouseMode = 'repel';
  this.classList.add('active');
  document.getElementById('btnAttract').classList.remove('active');
});

document.getElementById('speedSlider').addEventListener('input', function() {
  speedMult = parseFloat(this.value);
});

document.getElementById('countSlider').addEventListener('input', function() {
  particleCount = parseInt(this.value);
  syncParticleCount();
});

document.getElementById('distSlider').addEventListener('input', function() {
  maxDist = parseInt(this.value);
});

document.getElementById('btnColor').addEventListener('click', function() {
  colorThemeIdx = (colorThemeIdx + 1) % themes.length;
  document.getElementById('colorLabel').textContent = getTheme().name;
  // Update CSS accent variable for UI
  const t = getTheme();
  document.documentElement.style.setProperty('--accent', `rgb(${t.base.join(',')})`);
  document.documentElement.style.setProperty('--accent-dim', `rgba(${t.base.join(',')},0.12)`);
});

document.getElementById('btnLines').addEventListener('click', function() {
  showLines = !showLines;
  this.classList.toggle('active', showLines);
});

document.getElementById('btnReset').addEventListener('click', () => {
  speedMult = 1;
  particleCount = 120;
  maxDist = 140;
  colorThemeIdx = 0;
  showLines = true;
  mouseMode = 'attract';
  document.getElementById('speedSlider').value = 1;
  document.getElementById('countSlider').value = 120;
  document.getElementById('distSlider').value = 140;
  document.getElementById('colorLabel').textContent = 'Cyan';
  document.documentElement.style.setProperty('--accent', `rgb(0,212,255)`);
  document.documentElement.style.setProperty('--accent-dim', `rgba(0,212,255,0.12)`);
  document.getElementById('btnAttract').classList.add('active');
  document.getElementById('btnRepel').classList.remove('active');
  document.getElementById('btnLines').classList.add('active');
  initParticles();
});

// Touch support
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
  mouse.active = true;
}, { passive: false });

canvas.addEventListener('touchend', () => { mouse.active = false; });

// ── INIT ─────────────────────────────────────────
initParticles();
requestAnimationFrame(loop);
}