import './style.css';
import { initWaves } from './waves.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// ─── WAVE ANIMATION ──────────────────────────────────────────────────────────
const hero = document.querySelector('.hero');
if (hero) initWaves(hero);

// ─── PAGE LOAD CURTAIN ───────────────────────────────────────────────────────
const loader = document.getElementById('page-loader');
const loaderText = loader?.querySelector('.loader-text');
if (loader) {
  const loadTl = gsap.timeline();
  loadTl
    .to(loaderText, { opacity: 1, duration: 0.5, ease: 'power2.out' })
    .to(loaderText, { opacity: 0, duration: 0.4, delay: 0.3 })
    .to(loader, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.2')
    .set(loader, { display: 'none' });
}

// ─── HERO CURSOR SPOTLIGHT ───────────────────────────────────────────────────
const heroEl = document.querySelector('.hero');
if (heroEl && window.matchMedia('(pointer: fine)').matches) {
  const spotlight = document.createElement('div');
  spotlight.className = 'hero-spotlight';
  heroEl.appendChild(spotlight);

  let spotX = 0, spotY = 0, curX = 0, curY = 0;
  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    curX = e.clientX - rect.left;
    curY = e.clientY - rect.top;
  });

  (function raf() {
    spotX += (curX - spotX) * 0.08;
    spotY += (curY - spotY) * 0.08;
    spotlight.style.transform = `translate(${spotX}px, ${spotY}px)`;
    requestAnimationFrame(raf);
  })();
}

// ─── WAITLIST FORM ───────────────────────────────────────────────────────────
const waitlistForm = document.getElementById('waitlist-form');
if (waitlistForm) {
  waitlistForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    })
      .then(() => { window.location.href = '/thank-you'; })
      .catch(() => { window.location.href = '/thank-you'; });
  });
}

// ─── SCROLL PROGRESS BAR ─────────────────────────────────────────────────────
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      progressBar.style.width = (self.progress * 100) + '%';
    },
  });
}

// ─── FAQ ACCORDION (spring-eased via GSAP) ───────────────────────────────────
document.querySelectorAll('.faq-question').forEach((btn) => {
  btn.addEventListener('click', function () {
    const item   = this.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');

    // Close all others
    document.querySelectorAll('.faq-item').forEach((el) => {
      if (el === item) return;
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      gsap.to(el.querySelector('.faq-answer'), { height: 0, duration: 0.4, ease: 'power3.out' });
    });

    if (!isOpen) {
      item.classList.add('open');
      this.setAttribute('aria-expanded', 'true');
      gsap.fromTo(answer, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'power3.out' });
    } else {
      item.classList.remove('open');
      this.setAttribute('aria-expanded', 'false');
      gsap.to(answer, { height: 0, duration: 0.4, ease: 'power3.out' });
    }
  });
});

// ─── INTERSECTION OBSERVER FADE-UP ───────────────────────────────────────────
// GSAP manages .about / .pillars / .format / .evening / .charity.
// Everything else with .fade-up (tickets, sponsor, footer, etc.) stays here.
const gsapManaged = new Set(
  document.querySelectorAll(
    '.about .fade-up, .pillars .fade-up, .format .fade-up, .evening .fade-up, .charity .fade-up'
  )
);
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll('.fade-up').forEach((el) => {
  if (!gsapManaged.has(el)) fadeObserver.observe(el);
});

// ─── NAV SCROLL BEHAVIOUR ────────────────────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ─── HAMBURGER MENU ──────────────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const menuOverlay  = document.getElementById('menu-overlay');

function openMenu() {
  menuOverlay.classList.add('open');
  menuOverlay.removeAttribute('aria-hidden');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  // Move focus to first menu link
  const firstLink = menuOverlay.querySelector('.menu-link');
  if (firstLink) firstLink.focus();
}

function closeMenu() {
  menuOverlay.classList.remove('open');
  menuOverlay.setAttribute('aria-hidden', 'true');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  hamburgerBtn.focus();
}

if (hamburgerBtn && menuOverlay) {
  hamburgerBtn.addEventListener('click', () => {
    if (menuOverlay.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // ESC key closes menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOverlay.classList.contains('open')) {
      closeMenu();
    }
  });

  // Click on overlay backdrop (outside nav) closes menu
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) closeMenu();
  });

  // Each menu link closes the menu and lets native scroll handle the anchor
  menuOverlay.querySelectorAll('.menu-link').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
}

// ─── GSAP SCROLL ANIMATIONS ──────────────────────────────────────────────────
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

  // ── Mask-reveal helper — rises each word up from underneath its container ──
  function maskReveal(selector, triggerSelector, start = 'top 80%') {
    const el = document.querySelector(selector);
    if (!el) return;
    // Clear any fade-up CSS state so IO doesn't fight GSAP
    el.classList.remove('fade-up');
    gsap.set(el, { opacity: 1 });
    const words = el.textContent.split(/\s+/).filter(Boolean);
    el.innerHTML = words
      .map((w) => `<span style="display:inline-block;overflow:hidden;vertical-align:top"><span class="mask-word" style="display:inline-block">${w}</span></span>`)
      .join(' ');
    gsap.fromTo(
      el.querySelectorAll('.mask-word'),
      { yPercent: 110 },
      {
        yPercent: 0,
        stagger: 0.06,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: triggerSelector || el, start, once: true },
      }
    );
  }

  // 1. HERO ENTRANCE (runs once on load) ──────────────────────────────────
  const heroEntrance = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.1 } });
  heroEntrance
    .fromTo('.hero-logo',       { y: 40, opacity: 0 }, { y: 0, opacity: 1 })
    .fromTo('.hero-title',      { y: 60, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.9')
    .fromTo('.hero-subtitle',   { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.85')
    .fromTo('.hero-tagline',    { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.8')
    .fromTo('.hero-date',       { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.78')
    .fromTo('#hero-countdown',  { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.75')
    .fromTo('.hero-cta',        { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.7');

  // 2. HERO PIN + LAYERED EXIT ─────────────────────────────────────────────
  // Each element exits at a slightly different rate for cinematic depth.
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && heroEl) {
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl,
        start: 'top top',
        end: '+=100%',
        scrub: 1,
        pin: true,
        pinSpacing: true,
      },
    });

    heroTl
      .fromTo('.hero-title',     { y: 0, filter: 'blur(0px)', opacity: 1 }, { y: -40, filter: 'blur(6px)', opacity: 0, ease: 'none' }, 0)
      .fromTo('.hero-subtitle',  { y: 0, opacity: 1 }, { y: -30, opacity: 0, ease: 'none' }, 0.1)
      .fromTo('.hero-tagline',   { y: 0, opacity: 1 }, { y: -20, opacity: 0, ease: 'none' }, 0.15)
      .fromTo('#hero-countdown', { y: 0, opacity: 1 }, { y: -15, opacity: 0, ease: 'none' }, 0.2)
      .fromTo('.hero-date',      { y: 0, opacity: 1 }, { y: -12, opacity: 0, ease: 'none' }, 0.22)
      .fromTo('.hero-cta',       { y: 0, opacity: 1 }, { y: -10, opacity: 0, ease: 'none' }, 0.25)
      .fromTo(heroEl,            { scale: 1 },         { scale: 0.98, ease: 'none' }, 0);
  }

  ScrollTrigger.refresh();

  // 2. ABOUT — CLIP-PATH WORD REVEAL ───────────────────────────────────────
  const aboutSection = document.querySelector('.about');
  if (aboutSection) {
    const aboutLabel = aboutSection.querySelector('.section-label');
    const aboutBody  = aboutSection.querySelector('.section-text');

    // Heading — mask-rise reveal
    maskReveal('.about .section-title', '.about');

    // Label — simple fade up
    if (aboutLabel) {
      gsap.fromTo(
        aboutLabel,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, scrollTrigger: { trigger: aboutSection, start: 'top 80%' } }
      );
    }

    // Body — word-wrap clip-path reveal
    if (aboutBody) {
      const words = aboutBody.textContent.split(/\s+/).filter(Boolean);
      aboutBody.innerHTML = words
        .map((w) => `<span class="word-wrap" style="display:inline-block;overflow:hidden"><span class="word" style="display:inline-block">${w}</span></span>`)
        .join(' ');
      gsap.fromTo(
        aboutBody.querySelectorAll('.word'),
        { clipPath: 'inset(0 0 100% 0)', y: 12 },
        {
          clipPath: 'inset(0 0 0% 0)',
          y: 0,
          stagger: 0.025,
          duration: 0.45,
          ease: 'power3.out',
          scrollTrigger: { trigger: aboutSection, start: 'top 80%' },
        }
      );
    }

    // Parallax: label + title drift up slightly while scrolling through section
    gsap.to('.about .section-label, .about .section-title', {
      yPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  }

  // 3. PILLARS — STAGGERED CARD ENTRANCE ───────────────────────────────────
  const pillars = document.querySelectorAll('.pillar');
  if (pillars.length) {
    gsap.fromTo(
      pillars,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.pillars', start: 'top 80%' },
      }
    );
  }

  // 4. FORMAT — MASK-REVEAL HEADING + COUNT-UP NUMBERS ────────────────────
  maskReveal('.format .section-title', '.format');

  const formatNumbers = document.querySelectorAll('.format-number');
  if (formatNumbers.length) {
    const numberData = Array.from(formatNumbers).map((el) => {
      const raw = el.textContent.trim();
      const isPercent = raw.endsWith('%');
      const target = parseInt(raw, 10);
      el.textContent = '0' + (isPercent ? '%' : '');
      return { el, target, isPercent };
    });

    const formatItems = document.querySelectorAll('.format-item');

    ScrollTrigger.create({
      trigger: '.format',
      start: 'top 80%',
      once: true,
      onEnter() {
        gsap.fromTo(
          formatItems,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, delay: 0.2 }
        );
        numberData.forEach(({ el, target, isPercent }, i) => {
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 1.5,
            delay: i * 0.1 + 0.4,
            ease: 'power2.out',
            onUpdate() {
              el.textContent = Math.round(obj.val) + (isPercent ? '%' : '');
            },
          });
        });
      },
    });
  }

  // 5. EVENING — TIMELINE ENTRANCE + TIME-COLUMN PARALLAX ─────────────────
  maskReveal('.evening .section-title', '.evening');

  const eveningSection = document.querySelector('.evening');
  if (eveningSection) {
    eveningSection.querySelectorAll('.timeline-item').forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.5, delay: i * 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 85%' },
        }
      );
    });

    // Time labels scroll slightly slower than content — creates depth
    gsap.to('.timeline-time', {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.evening',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  }

  // 6. CHARITY — BADGE FADE + MASK HEADING ─────────────────────────────────
  maskReveal('.charity .section-title', '.charity', 'top 75%');

  const charityBadge = document.querySelector('.charity-badge');
  if (charityBadge) {
    gsap.fromTo(
      charityBadge,
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power1.inOut',
        scrollTrigger: { trigger: '.charity', start: 'top 70%' } }
    );
  }

  // 7. OTHER SECTION TITLE MASK REVEALS ────────────────────────────────────
  maskReveal('.tickets .section-title',  '.tickets',  'top 80%');
  maskReveal('.faq .section-title',      '.faq',      'top 80%');
  maskReveal('.signup .section-title',   '.signup',   'top 80%');

  // 8. DIVIDERS — SELF-DRAWING LINES ───────────────────────────────────────
  document.querySelectorAll('.divider-path').forEach((path) => {
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: path,
        start: 'top 85%',
        once: true,
      },
    });
  });

} // end prefers-reduced-motion guard

// ─── CUSTOM CURSOR ───────────────────────────────────────────────────────────
if (window.matchMedia('(pointer: fine)').matches) {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });

  (function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('a, button, .faq-question, .pillar').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
}

// ─── MAGNETIC BUTTONS ────────────────────────────────────────────────────────
if (window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.hero-cta, .ticket-cta, .nav-cta, .sponsor-link').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });
}
