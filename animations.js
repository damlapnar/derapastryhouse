/* ============================================================
   D'era House — animations.js  v3
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. LOADING SCREEN ── */
  const loader = document.createElement('div');
  loader.id = 'dera-loader';
  loader.innerHTML = `<div class="loader-inner"><div class="loader-icon">🎂</div><div class="loader-brand">D'ERA</div><div class="loader-dots"><span></span><span></span><span></span></div></div>`;
  document.body.prepend(loader);
  window.addEventListener('load', () => {
    setTimeout(() => { loader.classList.add('loader-hidden'); setTimeout(() => loader.remove(), 500); }, 700);
  });

  /* ── 2. DARK MODE ── */
  const savedTheme = localStorage.getItem('dera-theme') || 'light';
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  const dmBtn = document.createElement('button');
  dmBtn.id = 'dark-mode-toggle';
  dmBtn.setAttribute('aria-label', 'Toggle dark mode');
  dmBtn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
  document.body.appendChild(dmBtn);
  dmBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('dera-theme', isDark ? 'light' : 'dark');
    dmBtn.innerHTML = isDark ? '🌙' : '☀️';
  });

  /* ── 3. NAVBAR: active + scroll shrink ── */
  const nav = document.querySelector('.nav-container');
  if (nav) {
    const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-container nav ul li a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) link.classList.add('nav-active');
      link.classList.add('nav-link-anim');
    });
  }

  /* ── 4. SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll(
    '.special-card, .review-card, .about-page section, .value-card, ' +
    '.location-box, .map-embed, .contact-info-box, .contact-form-box, ' +
    '.footer-section, .why-item, .reviews-title, .reviews-subtitle, ' +
    '.menu-card, .gallery-item, .menu-category h2, .custom-order-banner, ' +
    '.menu-order-cta, .insta-card, .custom-order-strip-inner'
  );
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); } });
    }, { threshold: 0.10, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach((el) => {
      el.classList.add('reveal-ready');
      const siblings = [...(el.parentElement?.children || [])].filter(c => c.tagName === el.tagName && c.classList.contains(el.classList[0]));
      const idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = `${Math.min(idx * 70, 280)}ms`;
      observer.observe(el);
    });
  } else {
    revealEls.forEach(el => el.classList.add('reveal-ready', 'revealed'));
  }

  /* ── 5. HERO PARALLAX ── */
  const hero = document.querySelector('.hero, .menu-hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      hero.style.backgroundPositionY = `calc(50% + ${window.scrollY * 0.3}px)`;
    }, { passive: true });
  }

  /* ── 6. PAGE TRANSITION ── */
  document.body.classList.add('page-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('page-enter-active')));
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto') && !href.startsWith('tel')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => { window.location.href = href; }, 280);
      });
    }
  });

  /* ── 7. CARD 3D TILT (desktop) ── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.special-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ── 8. REVIEW CARD HOVER ── */
  document.querySelectorAll('.review-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = '0 16px 40px rgba(0,0,0,0.10)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
  });

  /* ── 9. BACK TO TOP BUTTON ── */
  const btt = document.createElement('button');
  btt.id = 'back-to-top';
  btt.innerHTML = '↑';
  btt.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btt);
  window.addEventListener('scroll', () => {
    btt.classList.toggle('btt-visible', window.scrollY > 400);
  }, { passive: true });
  btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ── 10. CUSTOM CURSOR (desktop only) ── */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.id = 'dera-cursor';
    cursor.innerHTML = '🎂';
    document.body.appendChild(cursor);
    let mouseX = -100, mouseY = -100, curX = -100, curY = -100;
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    (function animateCursor() {
      curX += (mouseX - curX) * 0.15;
      curY += (mouseY - curY) * 0.15;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
      requestAnimationFrame(animateCursor);
    })();
    document.querySelectorAll('a, button, .special-card, .menu-card, .gallery-item, .insta-card').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
  }

  /* ── 11. CONFETTI (on form success) ── */
  window.deraConfetti = function () {
    const colors = ['#355E3B','#fff','#f5b301','#ff6b6b','#a8d5b5'];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.cssText = `
        left:${Math.random()*100}vw;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-delay:${Math.random()*0.8}s;
        animation-duration:${1.2+Math.random()*1.2}s;
        width:${6+Math.random()*8}px;
        height:${6+Math.random()*8}px;
        border-radius:${Math.random()>0.5?'50%':'2px'};
      `;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  };

  /* ── 12. TOUCH SWIPE for gallery ── */
  const galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid) {
    let startX = 0;
    galleryGrid.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    galleryGrid.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        const btns = [...document.querySelectorAll('.filter-btn')];
        const active = btns.findIndex(b => b.classList.contains('active'));
        const next = diff > 0 ? Math.min(active + 1, btns.length - 1) : Math.max(active - 1, 0);
        if (next !== active) btns[next].click();
      }
    }, { passive: true });
  }

  /* ── 13. SMOOTH SCROLL for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── 14. LAZY LOADING (fallback for older browsers) ── */
  if (!('loading' in HTMLImageElement.prototype)) {
    const imgs = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.src = e.target.dataset.src || e.target.src; io.unobserve(e.target); } });
      });
      imgs.forEach(img => io.observe(img));
    }
  }

  /* ── 15. PWA SERVICE WORKER ── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }

  /* ── 16. CONFETTI on form submit ── */
  document.querySelectorAll('#customOrderForm, #contactForm').forEach(form => {
    form.addEventListener('submit', () => {
      setTimeout(() => { if (typeof window.deraConfetti === 'function') window.deraConfetti(); }, 800);
    });
  });

})();
