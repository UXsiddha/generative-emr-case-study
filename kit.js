/* =========================================================================
   kit.js: the case-study motion system, taken from the WorkPerks chatbot
   case study (its story.js) and kept identical in every project folder.
   GSAP ScrollTrigger drives every scroll-linked moment: the reading bar,
   statements rising out of a mask, rows settling, count-ups, screens
   opening out of a crop, the lit loop, the pinned sequences and the
   sticky story. Reduced motion gets none of it; narrow screens keep the
   reveals and show each pinned sequence in its end state (.no-pin).

   A page registers its own moments, then calls KIT.start():
     KIT.draw(el, fn)     fn(p) runs as a [data-pin] section scrubs 0 -> 1
     KIT.story(el, fn)    fn(i) runs when step i of a .story holds the middle
   ========================================================================= */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 900px)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var root = document.documentElement;
  var draws = [], stories = [], modeHooks = [];

  /* Every demo plays itself: show(i) for each step in turn, looping, and
     only while it is on screen. Reduced motion gets the first step, still.
     Given a ctl element, a Pause / Play button is added to it. */
  function autoplay(el, count, show, ms, ctl) {
    if (reduced) { show(0); return; }
    var i = -1, t = null, seen = false, stopped = false;
    var wait = function () { return typeof ms === 'function' ? ms(i) : ms; };
    var tick = function () { i = (i + 1) % count; show(i); t = setTimeout(tick, wait()); };
    var halt = function () { clearTimeout(t); t = null; };
    var run = function () { if (seen && !stopped && !t) { if (i < 0) tick(); else t = setTimeout(tick, wait()); } };
    new IntersectionObserver(function (es) {
      seen = es[es.length - 1].isIntersecting;
      if (seen) run(); else halt();
    }, { threshold: 0.25 }).observe(el);
    if (!ctl) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ap-toggle'; btn.textContent = 'Pause screens';
    btn.addEventListener('click', function () {
      stopped = !stopped;
      btn.textContent = stopped ? 'Play screens' : 'Pause screens';
      if (stopped) halt(); else run();
    });
    ctl.appendChild(btn);
  }

  /* numbers: Indian grouping where asked, decimals where the figure has them */
  function fmt(v, n) {
    var d = Number(n.getAttribute('data-decimals')) || 0;
    var loc = n.getAttribute('data-locale');
    return loc ? v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d }) : v.toFixed(d);
  }

  var noPin = false, noGsap = false;
  function setMode() {
    noPin = narrow.matches || reduced || noGsap;
    root.classList.toggle('no-pin', noPin);
    draws.forEach(function (d) { d.fn(noPin ? 1 : 0, noPin); });
    modeHooks.forEach(function (f) { f(noPin); });
  }

  /* the sticky story: each step shows its own media */
  function storyShow(st, i) {
    if (st.cur === i) return;
    st.cur = i;
    st.steps.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
    st.media.forEach(function (m, k) { m.classList.toggle('is-on', k === Number(st.steps[i].getAttribute('data-show') || i)); });
    if (st.fn) st.fn(i);
  }

  var stTimer = null;
  function initScroll() {
    if (!window.gsap || !window.ScrollTrigger) return false;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    var bar = $('.bar-progress i');
    var mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 901px)' }, function (ctx) {
      var c = ctx.conditions;
      if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
      if (!c.motion) { $$('.loop li').forEach(function (li) { li.classList.add('is-lit'); }); return; }

      /* a statement rises out of a mask, once */
      $$('.rv').forEach(function (el) {
        gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)', y: '0.35em' },
          { clipPath: 'inset(-20% 0% -30% 0%)', y: 0, duration: 1.1, ease: 'expo.out',
            scrollTrigger: { trigger: el.parentElement, start: 'top 85%', once: true } });
      });

      /* rows and columns rise into place, a beat apart */
      [['.figs', 'div'], ['.facts', 'div'], ['.metrics', '.m-row'], ['.disc', 'li'], ['.who', 'div'],
        ['.screens', '.scr'], ['[data-rise]', ':scope > *']].forEach(function (g) {
        $$(g[0]).forEach(function (box) {
          var kids = $$(g[1], box);
          if (!kids.length) return;
          gsap.from(kids, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
            scrollTrigger: { trigger: box, start: 'top 85%', once: true } });
        });
      });

      /* a loop lights one step at a time */
      $$('.loop').forEach(function (loop) {
        var lis = $$('li', loop);
        ST.create({ trigger: loop, start: 'top 80%', once: true, onEnter: function () {
          lis.forEach(function (li, i) { setTimeout(function () { li.classList.add('is-lit'); }, i * 180); });
        } });
      });

      /* real screens open out of a crop and drift at slightly different speeds */
      $$('.screens').forEach(function (box) {
        $$('.scr img', box).forEach(function (img, i) {
          var r = getComputedStyle(img).borderRadius || '0px';
          gsap.fromTo(img, { clipPath: 'inset(16% 10% 16% 10% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', ease: 'none',
            scrollTrigger: { trigger: box, start: 'top 90%', end: 'top 35%', scrub: 0.5 } });
          /* the figure drifts, not the image, so a caption stays with its screen */
          if (c.wide && !box.hasAttribute('data-still')) gsap.to(img.closest('.scr'), { y: [-10, -28, -16, -22][i % 4], ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });

      /* a wide figure opens from a crop as it arrives */
      $$('.open').forEach(function (fig) {
        var img = $('img', fig) || fig;
        gsap.fromTo(img, { clipPath: 'inset(8% 6% 8% 6% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none',
          scrollTrigger: { trigger: fig, start: 'top 92%', end: 'top 40%', scrub: 0.5 } });
      });

      /* diagram lines draw themselves as the figure scrolls in; markers follow */
      $$('[data-trace]').forEach(function (fig) {
        var paths = $$('[pathLength="1"]', fig);
        if (paths.length) gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', stagger: 0.04,
          scrollTrigger: { trigger: fig, start: 'top 82%', end: 'top 30%', scrub: 0.6 } });
        var late = $$('.dots, .peak', fig);
        if (late.length) gsap.fromTo(late, { opacity: 0 }, { opacity: 1, duration: 0.6,
          scrollTrigger: { trigger: fig, start: 'top 35%', once: true } });
      });

      /* a long screen scrolls inside its frame as the page passes it */
      $$('.scrollshot').forEach(function (f) {
        var img = $('img', f);
        f.classList.add('is-driven');
        gsap.fromTo(img, { y: 0 }, { y: function () { return -Math.max(0, img.offsetHeight - f.clientHeight); }, ease: 'none',
          scrollTrigger: { trigger: f, start: 'top 70%', end: 'bottom 30%', scrub: 0.6, invalidateOnRefresh: true } });
      });

      /* count-ups, once each */
      $$('[data-count]').forEach(function (n) {
        var to = Number(n.getAttribute('data-count')), o = { v: 0 };
        /* screen readers and find-in-page get the real figure, never the count */
        var real = document.createElement('span');
        real.className = 'vh'; real.textContent = fmt(to, n);
        n.parentNode.insertBefore(real, n); n.setAttribute('aria-hidden', 'true');
        n.textContent = fmt(0, n);
        gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: function () { n.textContent = fmt(o.v, n); },
          onComplete: function () { n.textContent = fmt(to, n); },
          scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
      });

      if (!c.wide) return;

      /* the opening stage: as it leaves, its visual recedes */
      var aVis = $('.act-a .a-phone > *');
      if (aVis) gsap.to(aVis, { scale: 0.88, opacity: 0.3, y: -50, ease: 'none',
        scrollTrigger: { trigger: '.act-a', start: 'bottom bottom', end: 'bottom 20%', scrub: true } });

      /* the pinned sequences: --p scrubbed from 0 to 1 over the first `data-span` of the scroll */
      $$('[data-pin]').forEach(function (el) {
        var span = Number(el.getAttribute('data-span')) || 1, state = { p: 0 };
        var mine = draws.filter(function (d) { return d.el === el; });
        gsap.to(state, { p: 1, ease: 'none',
          onUpdate: function () { el.style.setProperty('--p', state.p.toFixed(4)); mine.forEach(function (d) { d.fn(state.p, false); }); },
          scrollTrigger: { trigger: el, start: 'top top', scrub: 0.6, invalidateOnRefresh: true,
            end: function () { return '+=' + Math.max(1, (el.offsetHeight - window.innerHeight) * span); } } });
      });

      /* the story: a step plays once it has held the middle of the screen briefly */
      stories.forEach(function (st) {
        st.steps.forEach(function (li, i) {
          ST.create({ trigger: li, start: 'top 58%', end: 'bottom 42%',
            onToggle: function (self) {
              if (!self.isActive) return;
              clearTimeout(stTimer);
              stTimer = setTimeout(function () { storyShow(st, i); }, 150);
            } });
        });
      });
    });
    window.addEventListener('load', function () { ST.refresh(); });
    return true;
  }

  /* below 1080px the chapter links fold into a Chapters menu under the bar:
     Escape or a chosen chapter closes it, and focus goes back to the button */
  function chapterMenu() {
    var bar = $('.bar'), nav = $('.bar-nav'), cta = $('.bar .btn');
    if (!bar || !nav) return;
    nav.id = nav.id || 'chapters';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bar-menu'; btn.textContent = 'Chapters';
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', nav.id);
    bar.insertBefore(btn, cta || null);
    var set = function (open, refocus) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (!open && refocus) btn.focus();
    };
    btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) set(false, true);
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !bar.contains(e.target)) set(false);
    });
  }

  window.KIT = {
    $: $, $$: $$, clamp: clamp, reduced: reduced, autoplay: autoplay,
    draw: function (el, fn) { if (el) draws.push({ el: el, fn: fn }); },
    mode: function (fn) { modeHooks.push(fn); },
    story: function (el, fn) {
      if (!el) return;
      var st = { el: el, fn: fn, cur: -1, steps: $$('.story-steps > li', el), media: $$('.story-media > *', el) };
      /* each step carries a copy of its own screen, shown when the story is
         not pinned (narrow, reduced motion), so nothing has to cycle */
      if (st.media.length) st.steps.forEach(function (li, i) {
        var m = st.media[Number(li.getAttribute('data-show') || i)];
        if (!m) return;
        var c = m.cloneNode(true);
        c.classList.remove('is-on'); c.classList.add('st-media');
        li.appendChild(c);
      });
      stories.push(st);
    },
    start: function () {
      chapterMenu();
      setMode();
      if (narrow.addEventListener) narrow.addEventListener('change', setMode);
      var gsapOn = initScroll();
      /* without GSAP nothing drives the pinned layout, so fall back to the unpinned one */
      if (!gsapOn) { noGsap = true; setMode(); }
      stories.forEach(function (st) { storyShow(st, 0); });
    }
  };
})();
