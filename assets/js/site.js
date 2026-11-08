/* El Koubasy — shared script (Arabic + English), used by every page.
   Interface strings come from the page language; everything else is language-neutral.
   Homepage-only features (opening animation, hero video, pinned Product Lines, logo strip)
   run only when their markup is on the page. */
(() => {
  window.ekReady = true;  /* the <head> flag keeps .reveal content hidden only while this script is running */
  /* Opened from disk (file://), a folder link shows a file list, so point folder links at their index.html.
     A web server (and WordPress) serves the folder address directly; there this does nothing. */
  if (location.protocol === 'file:') document.querySelectorAll('a[href]').forEach(a => {
    const [, path, rest] = a.getAttribute('href').match(/^([^?#]*)(.*)$/);
    if (path && !/^[a-z]+:/i.test(path) && path.endsWith('/')) a.setAttribute('href', path + 'index.html' + rest);
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* interface strings, by page language */
  const STRINGS = {
    en: { menuOpen: 'Open menu', menuClose: 'Close menu', videoPlay: 'Play background video', videoPause: 'Pause background video' },
    ar: { menuOpen: 'افتح القائمة', menuClose: 'أغلق القائمة', videoPlay: 'تشغيل الفيديو', videoPause: 'إيقاف الفيديو مؤقتًا' }
  };
  const t = STRINGS[root.lang] || STRINGS.en;
  /* menus become visible a few frames after they open; focus their first link once it can take focus */
  const focusWhenShown = (el, tries = 30) => { el.focus({preventScroll: true}); if (document.activeElement !== el && tries) requestAnimationFrame(() => focusWhenShown(el, tries - 1)); };

  /* smooth scroll (Lenis, if it loaded) */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.18 });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#') { e.preventDefault(); return; }
    const target = document.querySelector(id);
    if (!target || !lenis) return;  /* without smooth scroll the browser handles the jump natively */
    e.preventDefault();
    /* keep native anchor behaviour: the address shows the fragment and focus lands on the target */
    if (location.hash !== id) history.pushState(null, '', id);
    const focusTarget = () => {
      if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
    };
    lenis.scrollTo(target, { offset: id === '#top' ? -200 : id === '#main' ? 0 : -72, duration: 0.7, onComplete: focusTarget });
  });

  /* header state + scroll progress. The header is transparent only over a full-bleed photo hero. */
  const nav = document.getElementById('nav');
  const bar = document.querySelector('.progress');
  const overHero = !!document.querySelector('.hero-frame');
  const menuOpenNow = () => document.body.classList.contains('menu-open');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 10);
    nav.classList.toggle('on-hero', overHero && y < 40);
    if (Math.abs(y - lastY) > 4) {
      const down = y > lastY && y > 420 && !menuOpenNow() && !nav.matches(':hover, :focus-within');
      nav.classList.toggle('hide', down);
      root.classList.toggle('nav-hidden', down);
      lastY = y;
    }
    if (bar) {
      const h = root.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    }
  };
  addEventListener('scroll', onScroll, {passive: true}); onScroll();
  /* a keyboard user tabbing into a hidden header brings it back */
  nav.addEventListener('focusin', () => { nav.classList.remove('hide'); root.classList.remove('nav-hidden'); });

  document.querySelectorAll('[data-year]').forEach(n => n.textContent = new Date().getFullYear());

  /* mobile menu */
  const menuBtn = document.querySelector('.menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const behindMenu = [document.getElementById('main'), document.querySelector('.footer'), document.querySelector('.nav-inner > .brand'), document.querySelector('.nav-actions')];
  let menuOpen = false;
  const setMenu = (open, restoreFocus = true) => {
    if (open === menuOpen) return;
    menuOpen = open;
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? t.menuClose : t.menuOpen);
    behindMenu.forEach(el => el && (el.inert = open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) focusWhenShown(mobileMenu.querySelector('a'));
    else if (restoreFocus && mobileMenu.contains(document.activeElement)) menuBtn.focus({preventScroll: true});
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false, false)));
  addEventListener('keydown', e => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key === 'Tab') { /* keep focus inside the open menu (button + menu items) */
      const f = [menuBtn, ...mobileMenu.querySelectorAll('a, button')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  matchMedia('(min-width: 1201px)').addEventListener('change', e => { if (e.matches) setMenu(false, false); });

  /* Our Products menu: the preview follows the hovered Product Line; links open their pages */
  const megaWrap = document.querySelector('.has-mega');
  if (megaWrap) {
    const items = [...megaWrap.querySelectorAll('.mega-list a')];
    const imgs = [...megaWrap.querySelectorAll('.mega-preview img')];
    const cap = megaWrap.querySelector('figcaption');
    /* preview photos load when the menu first opens, not with every page */
    const loadPreviews = () => imgs.forEach(im => { if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } });
    megaWrap.addEventListener('mouseenter', loadPreviews, {once: true});
    megaWrap.addEventListener('focusin', loadPreviews, {once: true});
    items.forEach(a => {
      const show = () => {
        items.forEach(x => x.classList.toggle('on', x === a));
        imgs.forEach(im => im.classList.toggle('on', im.dataset.img === a.dataset.img));
        cap.textContent = a.textContent.trim();
      };
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
    });
    const trigger = megaWrap.querySelector(':scope > a');
    const setExp = v => trigger.setAttribute('aria-expanded', v);
    const closeMega = () => { megaWrap.classList.add('force-close'); setExp(false); };
    megaWrap.addEventListener('mouseenter', () => { megaWrap.classList.remove('force-close'); setExp(true); });
    megaWrap.addEventListener('mouseleave', () => { megaWrap.classList.remove('force-close'); if (!megaWrap.contains(document.activeElement)) setExp(false); });
    megaWrap.addEventListener('focusin', () => { if (!megaWrap.classList.contains('force-close')) setExp(true); });
    megaWrap.addEventListener('focusout', e => { if (!megaWrap.contains(e.relatedTarget)) { megaWrap.classList.remove('force-close'); setExp(false); } });
    megaWrap.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeMega(); trigger.focus(); }
      if (e.key === 'ArrowDown' && document.activeElement === trigger) { e.preventDefault(); megaWrap.classList.remove('force-close'); setExp(true); focusWhenShown(items[0]); }
    });
  }

  /* reveal on scroll */
  const rev = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); } });
  }, {threshold: 0, rootMargin: '0px 0px 80px 0px'});  /* start just before a block enters the screen */
  document.querySelectorAll('.reveal, .curtain, .tiles').forEach(el => rev.observe(el));

  /* count-up for stats */
  const countUp = el => {
    const target = +el.dataset.count;
    if (reduce) { el.textContent = String(target); return; }
    const dur = 1400, t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const cells = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(countUp);
      cells.unobserve(en.target);
    });
  }, {threshold: .4});
  document.querySelectorAll('.spec-cell').forEach(c => cells.observe(c));

  /* logo strips: duplicate logos for a seamless loop */
  document.querySelectorAll('.marquee-track').forEach(track => {
    for (let k = 0; k < 2; k++) [...track.children].forEach(n => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
  });

  /* homepage Product Lines: one at a time with its own light tint.
     On wide, tall screens the section pins and scrolling moves to the next line;
     elsewhere the lines stack and the tint follows the one in view. */
  const ps = document.getElementById('products');
  if (ps && ps.querySelector('.pi-slide')) {
    const psSlides = [...ps.querySelectorAll('.pi-slide')];
    const psDots = [...ps.querySelectorAll('.pi-dot')];
    const psPats = [...ps.querySelectorAll('.pi-pat')];
    const PN = psSlides.length;
    ps.style.setProperty('--pi-count', PN);
    const pinQuery = matchMedia('(min-width: 1180px) and (min-height: 620px)');
    let psActive = 0, pinned = false;
    const openProduct = i => {
      if (i === psActive) return;
      psActive = i;
      ps.dataset.c = i;
      psSlides.forEach((sl, k) => { sl.classList.toggle('on', k === i); if (pinned) sl.inert = k !== i; });
      psPats.forEach((p, k) => p.classList.toggle('on', k === i));
      psDots.forEach((d, k) => {
        d.classList.toggle('done', k < i);
        k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current');
        if (k !== i) d.style.removeProperty('--fill');
      });
    };
    const psRange = () => ({top: ps.getBoundingClientRect().top + scrollY, len: ps.offsetHeight - innerHeight});
    const psUpdate = () => {
      if (!pinned) return;
      const {top, len} = psRange();
      const seg = Math.min(Math.max((scrollY - top) / len, 0), 1) * PN;
      const i = Math.min(PN - 1, Math.floor(seg));
      openProduct(i);
      psDots[i].style.setProperty('--fill', Math.min(seg - i, 1).toFixed(3));
    };
    /* stacked: the tint follows the line crossing the middle of the screen */
    const psSeen = new IntersectionObserver(es => es.forEach(e => {
      if (!pinned && e.isIntersecting) openProduct(psSlides.indexOf(e.target));
    }), {rootMargin: '-45% 0px -45% 0px'});
    psSlides.forEach(sl => psSeen.observe(sl));
    const psMode = () => {
      pinned = pinQuery.matches && !reduce;
      ps.classList.toggle('pi-pinned', pinned);
      /* pinned photos sit clipped on screen, so lazy loading would leave the next one blank mid-wipe; decode ahead too */
      if (pinned) ps.querySelectorAll('.pi-shot img').forEach(im => { im.loading = 'eager'; im.decode && im.decode().catch(() => {}); });
      psSlides.forEach((sl, k) => { sl.inert = pinned && k !== psActive; });
      if (!pinned) psDots.forEach(d => d.style.removeProperty('--fill'));
      psUpdate();
    };
    const goProduct = i => {
      let y;
      if (pinned) { const {top, len} = psRange(); y = top + len * (i + .5) / PN; }
      else y = psSlides[i].getBoundingClientRect().top + scrollY - 110;
      const hops = pinned ? Math.abs(i - psActive) : 1;
      lenis ? lenis.scrollTo(y, {duration: Math.min(.35 + hops * .08, .6)}) : scrollTo({top: y, behavior: reduce ? 'auto' : 'smooth'});
    };
    psDots.forEach((d, i) => d.addEventListener('click', () => goProduct(i)));
    addEventListener('scroll', psUpdate, {passive: true});
    addEventListener('resize', psUpdate);
    pinQuery.addEventListener('change', psMode);
    psMode();
  }

  /* hero background video — the photo stays as poster/fallback */
  const hv = document.querySelector('.hero-video');
  const hvBtn = document.querySelector('.video-toggle');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (hv && hvBtn && !reduce && !saveData) {
    hv.dataset.sources.split(',').forEach(pair => {
      const [src, type] = pair.split('|');
      if (type === 'video/webm' && !hv.canPlayType('video/webm')) return;
      const el = document.createElement('source'); el.src = src; el.type = type; hv.appendChild(el);
    });
    let userPaused = false, heroInView = true;
    hv.addEventListener('playing', () => { hv.classList.add('playing'); hvBtn.hidden = false; });
    hv.querySelectorAll('source').forEach(src => src.addEventListener('error', () => {
      if ([...hv.querySelectorAll('source')].every(x => x === src || x.dataset.failed)) hv.remove();
      src.dataset.failed = '1';
    }));
    const sync = () => {
      if (!hv.isConnected) return;
      const run = !userPaused && heroInView && document.visibilityState === 'visible';
      if (run) hv.play().catch(() => {}); else hv.pause();
      hvBtn.classList.toggle('paused', userPaused);
      hvBtn.setAttribute('aria-label', userPaused ? t.videoPlay : t.videoPause);
    };
    hvBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    new IntersectionObserver(([en]) => { heroInView = en.isIntersecting; sync(); }).observe(document.querySelector('.hero-frame'));
    document.addEventListener('visibilitychange', sync);
    const startVideo = () => { hv.load(); sync(); };
    const afterEntry = () => ('requestIdleCallback' in window ? requestIdleCallback(startVideo, {timeout: 1500}) : setTimeout(startVideo, 300));
    if (root.classList.contains('is-loading')) {
      const mo = new MutationObserver(() => { if (!root.classList.contains('is-loading')) { mo.disconnect(); afterEntry(); } });
      mo.observe(root, {attributes: true, attributeFilter: ['class']});
    } else afterEntry();
  } else if (hv) {
    hv.remove();
  }

  /* word-split headlines (inline tags like <em> are kept) */
  const splitWords = el => {
    let i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/([ \n\t]+)/).forEach(part => {
        if (!part) return;
        if (/^[ \n\t]+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
        const w = document.createElement('span'), inner = document.createElement('span');
        w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        inner.textContent = part; inner.style.setProperty('--i', i++);
        w.appendChild(inner); frag.appendChild(w);
      });
      n.replaceWith(frag);
    });
    walk(el);
  };
  const heroTitle = document.getElementById('hero-title');
  if (!reduce) {
    document.querySelectorAll('.split').forEach(splitWords);
    root.classList.add('js-split');
    document.querySelectorAll('.split').forEach(h => { if (h !== heroTitle) rev.observe(h); });
  }

  /* entry sequence: preloader -> split doors -> hero cascade (homepage only) */
  const pre = document.querySelector('.preloader');
  const startHero = () => heroTitle && heroTitle.classList.add('in');
  if (pre && root.classList.contains('is-loading')) {
    const plRing = pre.querySelector('.pl-ring');
    const heroImg = document.querySelector('.hero-bg img');
    let loaded = 0, shown = 0, left = false;
    const t0 = performance.now();
    const imgReady = !heroImg || heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.addEventListener('load', r, {once: true}); heroImg.addEventListener('error', r, {once: true}); });
    imgReady.then(() => loaded++);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => loaded++);
    const leave = () => {
      if (left) return; left = true;
      pre.classList.add('leaving');
      root.classList.remove('is-loading');
      setTimeout(startHero, 100);
      setTimeout(() => pre.classList.remove('leaving'), 650);
    };
    const step = now => {
      if (left) return;
      const time = Math.min((now - t0) / 300, 1), goal = loaded / 2;
      const target = Math.min(Math.max(goal, time * .85), time);
      shown += (target - shown) * .14;
      plRing.style.setProperty('--off', (1 - shown).toFixed(4));
      if (goal === 1 && shown > .992) { plRing.style.setProperty('--off', '0'); setTimeout(leave, 80); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(leave, 600); /* cap the entry sequence (~1.1s with the exit) */
  } else {
    root.classList.remove('is-loading');
    startHero();
  }

  const rtl = getComputedStyle(root).direction === 'rtl';
  /* scroll a horizontal strip so an item is in view, without moving the page vertically */
  const revealInStrip = (strip, item) => {
    const s = strip.getBoundingClientRect(), r = item.getBoundingClientRect();
    if (r.left < s.left) strip.scrollBy({left: r.left - s.left - 16, behavior: reduce ? 'auto' : 'smooth'});
    else if (r.right > s.right) strip.scrollBy({left: r.right - s.right + 16, behavior: reduce ? 'auto' : 'smooth'});
  };

  /* tabs (process steps): click, or arrow keys in the reading direction, Home and End */
  document.querySelectorAll('[data-tabs]').forEach(box => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach(x => {
        const on = x === tab;
        x.setAttribute('aria-selected', on);
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      revealInStrip(tab.parentElement, tab);
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', e => {
        const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
        let j = null;
        if (e.key === fwd) j = (i + 1) % tabs.length;
        else if (e.key === back) j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault(); select(tabs[j], true);
      });
    });
  });

  /* a link to a tab panel (e.g. industries/#beverage) opens that tab */
  const openFromHash = () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }  /* a malformed hash (e.g. #%) must not stop the rest of the script */
    const panel = id && document.getElementById(id);
    if (!panel || panel.getAttribute('role') !== 'tabpanel') return;
    const tab = document.querySelector(`[role="tab"][aria-controls="${id}"]`);
    if (tab) { tab.click(); tab.closest('[data-tabs]').scrollIntoView({block: 'start'}); scrollBy(0, -96); }
  };
  openFromHash();
  addEventListener('hashchange', openFromHash);

  /* in-page section nav (Capabilities): marks the section in view and keeps its link visible */
  const secNav = document.querySelector('.sec-nav');
  if (secNav) {
    const navLinks = [...secNav.querySelectorAll('a[href^="#"]')];
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const seen = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.removeAttribute('aria-current'));
      const a = byId.get(e.target.id);
      if (a) { a.setAttribute('aria-current', 'true'); revealInStrip(a.closest('ul'), a); }
    }), {rootMargin: '-40% 0px -55% 0px'});
    byId.forEach((a, id) => { const sec = document.getElementById(id); if (sec) seen.observe(sec); });
  }

  /* card rails: previous/next scroll by one card; buttons hide when everything fits */
  document.querySelectorAll('.rail-wrap').forEach(wrap => {
    const rail = wrap.querySelector('.rail');
    const [prev, next] = wrap.querySelectorAll('.rail-btn');
    const step = () => { const c = rail.children[0]; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 0) : rail.clientWidth; };
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const pos = Math.abs(rail.scrollLeft);  /* rtl scrollLeft runs negative */
      wrap.classList.toggle('scrollable', max > 2);
      prev.disabled = pos < 2;
      next.disabled = pos > max - 2;
    };
    [prev, next].forEach(b => b.addEventListener('click', () => {
      rail.scrollBy({left: +b.dataset.dir * step() * (rtl ? -1 : 1), behavior: reduce ? 'auto' : 'smooth'});
    }));
    rail.addEventListener('scroll', sync, {passive: true});
    addEventListener('resize', sync);
    sync();
  });

  /* catalogue: a Brand block's switch (250 ml / 1 L, tub / box) shows that pack on every card in the block */
  document.querySelectorAll('.cat-block[data-variants]').forEach(block => {
    const btns = [...block.querySelectorAll('.seg button')];
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      block.querySelectorAll('.pc-img img[data-v]').forEach(im => { im.hidden = im.dataset.v !== b.dataset.v; });
    }));
  });

  /* FAQ: one answer open at a time (native in current browsers via <details name>; this covers older ones) */
  document.querySelectorAll('details[name]').forEach(d => d.addEventListener('toggle', () => {
    if (!d.open) return;
    document.querySelectorAll(`details[name="${d.getAttribute('name')}"]`).forEach(o => { if (o !== d) o.open = false; });
  }));

  /* supply chain timeline: the orange line fills to 60% of the screen height, and each ring it passes turns solid orange */
  const tl = document.querySelector('.tl');
  if (tl) {
    const steps = [...tl.querySelectorAll('.tl-step')];
    const rings = steps.map(s => s.querySelector('.tl-ring'));
    const mid = r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; };
    const fit = () => {
      const box = tl.getBoundingClientRect();
      tl.style.setProperty('--line-top', `${mid(rings[0]) - box.top}px`);
      tl.style.setProperty('--line-bottom', `${box.bottom - mid(rings[rings.length - 1])}px`);
    };
    const tick = () => {
      const y0 = mid(rings[0]), y1 = mid(rings[rings.length - 1]), at = innerHeight * .6;
      tl.style.setProperty('--p', reduce ? 1 : Math.max(0, Math.min(1, (at - y0) / (y1 - y0))).toFixed(4));
      rings.forEach((r, i) => steps[i].classList.toggle('lit', reduce || mid(r) <= at));
    };
    fit(); tick();
    addEventListener('resize', () => { fit(); tick(); });
    addEventListener('scroll', tick, { passive: true });
  }

  /* parallax (transform only, clamped so edges never show) */
  const px = [...document.querySelectorAll('[data-parallax]')];
  if (!reduce && px.length) {
    const heroBg = document.querySelector('.hero-bg');
    const tick = () => {
      const vh = innerHeight;
      px.forEach(el => {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -50 || box.top > vh + 50) return;
        const speed = +el.dataset.parallax;
        let y;
        if (el === heroBg) {
          y = Math.min(scrollY * speed, el.offsetHeight * .1);
        } else {
          const room = box.height * ((parseFloat(el.style.scale) || 1) - 1) / 2;
          y = Math.max(-room, Math.min(room, -(box.top + box.height / 2 - vh / 2) * speed));
        }
        el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();

/* Product Line V2 enquiry form: every quote, sample or spec link fills the form in the footer band (product and request type) */
(function () {
  var f = document.querySelector('.enq-form'); if (!f) return;
  f.addEventListener('submit', function (e) { e.preventDefault(); });  // placeholder until the Odoo form is embedded (HANDOFF.md)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#enquiry"]'); if (!a) return;
    var p = a.getAttribute('data-product'), t = a.getAttribute('data-type') || 'quote';
    if (p && f.product) f.product.value = p;
    var r = f.querySelector('input[name=type][value="' + t + '"]'); if (r) r.checked = true;
    setTimeout(function () { if (f.volume) f.volume.focus({ preventScroll: true }); }, 700);
  });
})();
