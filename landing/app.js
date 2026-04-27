/* ========== Nav scroll ========== */
const nav = document.getElementById('nav');
const onScroll = () => {
  if (window.scrollY > 12) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ========== Reveal on scroll ========== */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ========== Card glow follow ========== */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
  });
});

/* ========== Animated bars ========== */
(() => {
  const svg = document.getElementById('barsSvg');
  if (!svg) return;
  const bars = svg.querySelectorAll('.bar');
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        bars.forEach((b, i) => {
          const h = +b.dataset.h;
          const baseY = 380;
          setTimeout(() => {
            const start = performance.now();
            const dur = 900;
            const tick = (t) => {
              const k = Math.min(1, (t - start) / dur);
              const eased = 1 - Math.pow(1 - k, 3);
              const hh = h * eased;
              b.setAttribute('height', hh);
              b.setAttribute('y', baseY - hh);
              if (k < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }, i * 80);
        });
        obs.disconnect();
      }
    }
  }, { threshold: 0.3 });
  obs.observe(svg);
})();

/* ========== Scroll-driven app screens ========== */
(() => {
  const track = document.getElementById('scrollscene-track');
  if (!track) return;
  const progressEl = document.getElementById('scrollProgress');
  const counterEl = document.getElementById('counterStep');
  const steps = document.querySelectorAll('.scrollscene-text .step');
  const imgs = document.querySelectorAll('.scrollphone-img');
  const total = imgs.length;

  let currentStep = -1;

  function update() {
    const r = track.getBoundingClientRect();
    const dist = r.height - window.innerHeight;
    const scrolled = -r.top;
    let p = scrolled / dist;
    p = Math.max(0, Math.min(1, p));

    // progress
    progressEl.style.height = (p * 100) + '%';

    // step picker — split scroll evenly across the steps
    let stepIdx = Math.min(total - 1, Math.floor(p * total));
    // anchor first step at the very start; final step at the end
    if (p >= 0.999) stepIdx = total - 1;

    if (stepIdx !== currentStep) {
      currentStep = stepIdx;
      steps.forEach((s, i) => s.classList.toggle('active', i === stepIdx));
      imgs.forEach((im, i) => im.classList.toggle('active', i === stepIdx));
      counterEl.textContent = String(stepIdx + 1).padStart(2, '0');
    }

    requestAnimationFrame(update);
  }

  // Initialize first state
  imgs[0].classList.add('active');
  steps[0].classList.add('active');
  counterEl.textContent = '01';

  requestAnimationFrame(update);
})();
