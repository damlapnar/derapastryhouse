/* ============================================================
   D'era House — animations.js
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. LOADING SCREEN ── */
  const loader = document.createElement('div');
  loader.id = 'dera-loader';
  loader.innerHTML = `
    <div class="loader-inner">
      <div class="loader-icon">🎂</div>
      <div class="loader-brand">D'ERA</div>
      <div class="loader-dots"><span></span><span></span><span></span></div>
    </div>`;
  document.body.prepend(loader);

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('loader-hidden');
      setTimeout(() => loader.remove(), 500);
    }, 700);
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

  /* ── 3. NAVBAR: active page highlight + shrink on scroll ── */
  const nav = document.querySelector('.nav-container');
  if (nav) {
    // Shrink on scroll
    const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-container nav ul li a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('nav-active');
      }
      link.classList.add('nav-link-anim');
    });
  }

  /* ── 4. SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll(
    '.special-card, .review-card, .about-page section, .value-card, ' +
    '.location-box, .map-embed, .contact-info-box, .contact-form-box, ' +
    '.coming-soon-wrap, .footer-section, .specials h2, .why-item, ' +
    '.reviews-title, .reviews-subtitle, .menu-card, .gallery-item, ' +
    '.menu-category h2, .custom-order-banner, .menu-order-cta'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach((el, i) => {
      el.classList.add('reveal-ready');
      const siblings = [...(el.parentElement?.children || [])].filter(c => c.tagName === el.tagName);
      const idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = `${Math.min(idx * 80, 320)}ms`;
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
    if (href && !href.startsWith('http') && !href.startsWith('#') &&
        !href.startsWith('mailto') && !href.startsWith('tel') && !href.startsWith('javascript')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => { window.location.href = href; }, 280);
      });
    }
  });

  /* ── 7. CARD HOVER EFFECTS ── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.special-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  document.querySelectorAll('.review-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = '0 16px 40px rgba(0,0,0,0.10)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
  });

})();
