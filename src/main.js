import { inject } from '@vercel/analytics';
import confetti from 'canvas-confetti';

inject();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const interactive = finePointer && !reduceMotion;

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Live local time in Cagayan de Oro
const timeEl = document.getElementById('local-time');
const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
});
const tick = () => { timeEl.textContent = timeFmt.format(new Date()); };
tick();
setInterval(tick, 15_000);

// ---------- Confetti ----------
const CONFETTI_COLORS = ['#7f9c7a', '#a9c4a3', '#d6be96', '#f6f3ee', '#3f9b62'];

function burstFrom(el) {
  if (reduceMotion) return;
  const r = el.getBoundingClientRect();
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    scalar: 0.9,
    ticks: 180,
    colors: CONFETTI_COLORS,
    origin: {
      x: (r.left + r.width / 2) / innerWidth,
      y: (r.top + r.height / 2) / innerHeight,
    },
    disableForReducedMotion: true,
  });
}

// Copy email to clipboard
const copyBtn = document.querySelector('.copy-email');
const copyText = copyBtn.querySelector('.copy-text');
copyBtn.addEventListener('click', async () => {
  const email = copyBtn.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    return;
  }
  copyText.textContent = 'Copied to clipboard ✓';
  copyBtn.classList.add('copied');
  burstFrom(copyBtn);
  setTimeout(() => {
    copyText.textContent = email;
    copyBtn.classList.remove('copied');
  }, 1800);
});

const cta = document.querySelector('[data-magnetic]');
cta.addEventListener('click', () => burstFrom(cta));

// ---------- Waving hand ----------
const wave = document.querySelector('.wave');
const waveAgain = () => {
  if (reduceMotion) return;
  wave.classList.remove('again');
  void wave.offsetWidth; // restart the animation
  wave.classList.add('again');
};
document.querySelector('h1 .line').addEventListener('pointerenter', waveAgain);

if (interactive) {
  // ---------- Weight-shifting headline ----------
  const h1 = document.querySelector('h1');
  h1.setAttribute('aria-label', h1.textContent.replace('👋', '').replace(/\s+/g, ' ').trim());
  h1.querySelectorAll('.line').forEach((l) => l.setAttribute('aria-hidden', 'true'));

  const textNodes = [];
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.textContent.trim() && !n.parentElement.closest('.wave')) textNodes.push(n);
  }
  for (const node of textNodes) {
    const frag = document.createDocumentFragment();
    for (const char of node.textContent.trim()) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = char;
      frag.appendChild(span);
    }
    node.replaceWith(frag);
  }

  const chars = [...h1.querySelectorAll('.ch')];
  const BASE = 380, MAX = 600, RADIUS = 110;
  let centers = [];
  const measure = () => {
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left + r.width / 2 + scrollX, r.top + r.height / 2 + scrollY];
    });
  };

  h1.addEventListener('pointerenter', measure);
  h1.addEventListener('pointermove', (e) => {
    if (!centers.length) measure();
    const px = e.pageX, py = e.pageY;
    chars.forEach((c, i) => {
      const [cx, cy] = centers[i];
      const t = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / RADIUS);
      c.style.fontWeight = Math.round(BASE + (MAX - BASE) * t * t);
    });
  });
  h1.addEventListener('pointerleave', () => {
    chars.forEach((c) => { c.style.fontWeight = ''; });
  });

  // ---------- 3D tilt + glare on the photo ----------
  const photo = document.querySelector('[data-tilt]');
  photo.addEventListener('pointermove', (e) => {
    const r = photo.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    photo.classList.add('is-tilting');
    photo.style.setProperty('--ry', `${(px - 0.5) * 14}deg`);
    photo.style.setProperty('--rx', `${(0.5 - py) * 14}deg`);
    photo.style.setProperty('--gx', `${px * 100}%`);
    photo.style.setProperty('--gy', `${py * 100}%`);
  });
  photo.addEventListener('pointerleave', () => {
    photo.classList.remove('is-tilting');
    photo.style.setProperty('--rx', '0deg');
    photo.style.setProperty('--ry', '0deg');
  });

  // ---------- Magnetic CTA (pulls in when the cursor nears its edge) ----------
  const PULL_RANGE = 110; // px outside the button where the pull starts
  const STRENGTH = 0.35;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  addEventListener('pointermove', (e) => {
    const r = cta.getBoundingClientRect();
    // measure from the button's resting position, not its pulled position
    const left = r.left - curX, top = r.top - curY;
    const right = left + r.width, bottom = top + r.height;
    const dx = Math.max(left - e.clientX, 0, e.clientX - right);
    const dy = Math.max(top - e.clientY, 0, e.clientY - bottom);
    const distToEdge = Math.hypot(dx, dy);

    if (distToEdge < PULL_RANGE) {
      const pull = 1 - distToEdge / PULL_RANGE;
      targetX = (e.clientX - (left + r.width / 2)) * STRENGTH * pull;
      targetY = (e.clientY - (top + r.height / 2)) * STRENGTH * pull;
    } else {
      targetX = 0;
      targetY = 0;
    }
    cta.style.setProperty('--cx', `${e.clientX - r.left}px`);
    cta.style.setProperty('--cy', `${e.clientY - r.top}px`);
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });

  const loop = () => {
    curX += (targetX - curX) * 0.18;
    curY += (targetY - curY) * 0.18;
    cta.style.setProperty('--tx', `${curX.toFixed(2)}px`);
    cta.style.setProperty('--ty', `${curY.toFixed(2)}px`);
    requestAnimationFrame(loop);
  };
  loop();
}
