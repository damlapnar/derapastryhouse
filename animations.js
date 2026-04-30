/* ============================================================
   D'era House — animations.js
   Scroll fade-in · Navbar scroll · Hero parallax · Page transitions
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. NAVBAR: shrink + shadow on scroll ── */
  const nav = document.querySelector('.nav-container');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 40) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ── 2. SCROLL REVEAL (Intersection Observer) ── */
  const revealEls = document.querySelectorAll(
    '.special-card, .review-card, .about-page section, ' +
    '.location-box, .map-embed, .contact-info, .contact-form, ' +
    '.coming-soon-wrap, .footer-section, .specials h2, ' +
    '.reviews-title, .reviews-subtitle, .product-card'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el, i) => {
      el.classList.add('reveal-ready');
      // stagger cards in the same grid
      const parent = el.parentElement;
      const siblings = parent ? [...parent.children].filter(c => c.classList.contains(el.classList[0])) : [];
      const idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = `${idx * 80}ms`;
      observer.observe(el);
    });
  } else {
    // Fallback: just show everything
    revealEls.forEach(el => el.classList.add('reveal-ready', 'revealed'));
  }

  /* ── 3. HERO PARALLAX (subtle) ── */
  const hero = document.querySelector('.hero');
  if (hero) {
    const parallax = () => {
      const scrolled = window.scrollY;
      hero.style.backgroundPositionY = `calc(50% + ${scrolled * 0.3}px)`;
    };
    window.addEventListener('scroll', parallax, { passive: true });
  }

  /* ── 4. PAGE TRANSITION (fade out on navigate) ── */
  document.body.classList.add('page-enter');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('page-enter-active');
    });
  });

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    // Only internal same-origin links, not anchors or external
    if (
      href &&
      !href.startsWith('http') &&
      !href.startsWith('#') &&
      !href.startsWith('mailto') &&
      !href.startsWith('tel') &&
      !href.startsWith('javascript')
    ) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => { window.location.href = href; }, 280);
      });
    }
  });

  /* ── 5. SPECIALS CARDS: tilt on hover (desktop only) ── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.special-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s ease';
        setTimeout(() => { card.style.transition = ''; }, 400);
      });
    });
  }

  /* ── 6. REVIEW CARDS: subtle lift ── */
  document.querySelectorAll('.review-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 16px 40px rgba(0,0,0,0.10)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  /* ── 7. NAV LINK UNDERLINE SLIDE ── */
  document.querySelectorAll('.nav-container nav ul li a').forEach(link => {
    link.classList.add('nav-link-anim');
  });

})();
