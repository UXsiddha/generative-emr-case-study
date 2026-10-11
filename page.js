/* =========================================================================
   page.js: Generative EMR. The motion system is kit.js; this file wires the
   moments only this story has: the opening record stepping through a
   consultation, hand-filling collapsing into one spoken sentence, the
   layer lighting in order, the final product's story, and the
   demonstration on the real prescription screen.
   ========================================================================= */
(function () {
  'use strict';
  var K = window.KIT, $ = K.$, $$ = K.$$, reduced = K.reduced;

  /* the dictation used everywhere on this page: clinically plausible, illustrative */
  var UTTERANCE = '“Temperature 100.4, pulse 96, BP 128 by 84, SpO2 98. Dry cough and sore throat for three days. Start Dolo 650, one tablet twice a day after food, for five days.”';

  /* 01 -> 02: the record steps through a consultation beside its list */
  var shots = $$('#hero-frame .swap img'), rows = $$('#built-asks li');
  if (shots.length && rows.length) K.autoplay($('#top'), rows.length, function (i) {
    rows.forEach(function (li, k) { li.classList.toggle('is-now', k === i); });
    shots.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
  }, 3600);

  /* C: the line runs between the first and last remaining dots */
  var actC = $('.act-c');
  K.draw(actC, function (p, still) {
    if (still) { actC.classList.add('is-after'); return; }
    var ol = $('.c-steps', actC), dots = $$('.c-steps li i', actC);
    var r = ol.getBoundingClientRect(), a = dots[0].getBoundingClientRect(), b = dots[dots.length - 1].getBoundingClientRect();
    ol.style.setProperty('--ll', (a.left + a.width / 2 - r.left) + 'px');
    ol.style.setProperty('--lr', (r.right - b.left - b.width / 2) + 'px');
    actC.classList.toggle('is-after', p > 0.6);
  });

  /* C: once the fields have become one sentence, the sentence is spoken into the bar */
  var typed = $('#c-typed');
  if (typed) {
    if (reduced) typed.textContent = UTTERANCE;
    else {
      var started = false;
      var speak = function () {
        var i = 0;
        typed.textContent = '';
        (function type() {
          typed.textContent = UTTERANCE.slice(0, ++i);
          if (i < UTTERANCE.length) setTimeout(type, 28);
          else setTimeout(speak, 3200);
        })();
      };
      var kick = function () {
        if (started || !actC.classList.contains('is-after')) return;
        started = true; window.removeEventListener('scroll', kick); speak();
      };
      window.addEventListener('scroll', kick, { passive: true });
      new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting) kick(); }, { threshold: 0.6 }).observe($('.c-say'));
    }
  }

  /* E: each part of the layer lights, then the line to the next one fills */
  var sysLis = $$('#sys li');
  K.draw($('.act-e'), function (p, still) {
    var k = (still ? 1 : p) * (sysLis.length + 0.4);
    sysLis.forEach(function (li, i) {
      li.classList.toggle('is-on', k >= i + 0.25);
      li.style.setProperty('--f', K.clamp(k - i - 0.45).toFixed(3));
    });
  });

  /* the demonstration, on the real prescription screen. It plays whenever it
     comes into view and holds the filled record; reduced motion gets the
     filled record at once. The markup ships filled, so it reads without
     script. */
  (function () {
    var FILLS = [
      { id: 'temp', value: '100.4' }, { id: 'pulse', value: '96' }, { id: 'bp', value: '128/84' }, { id: 'spo2', value: '98' },
      { id: 'cc', html: '<span class="emr-chip">Dry cough &middot; 3 days</span><span class="emr-chip">Sore throat &middot; 3 days</span>' },
      { id: 'drug', value: 'Dolo 650 (Paracetamol 650 mg)' }, { id: 'qty', value: '10 tab' }, { id: 'freq', value: '1-0-1' },
      { id: 'duration', value: '5 days' }, { id: 'timing', value: 'After food' }
    ];
    var demo = $('#demo'), said = $('#said'), replied = $('#replied');
    if (!demo || !said || !replied || reduced) return;
    var timers = [];
    var at = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var field = function (id) { return demo.querySelector('[data-field="' + id + '"]'); };
    function fill(f) {
      var el = field(f.id); if (!el) return;
      el.classList.add('filled');
      var v = el.querySelector('.val');
      if (f.html) v.innerHTML = f.html; else v.textContent = f.value;
    }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      demo.classList.remove('is-review');
      said.textContent = ''; said.hidden = true; said.classList.remove('caret');
      replied.hidden = true;
      FILLS.forEach(function (f) {
        var el = field(f.id); if (!el) return;
        el.classList.remove('filled');
        el.querySelector('.val').textContent = el.getAttribute('data-empty') || '';
      });
    }
    var steps = $$('#proto-steps li');
    var stepTo = function (k) { steps.forEach(function (li, n) { li.classList.toggle('is-now', n === k); li.classList.toggle('is-lit', n <= k); }); };
    function play() {
      reset();
      stepTo(0);
      said.hidden = false; said.classList.add('caret');
      var i = 0;
      (function type() {
        if (i <= UTTERANCE.length) { said.textContent = UTTERANCE.slice(0, i++); at(type, 22); return; }
        said.classList.remove('caret');
        at(function () { stepTo(1); }, 300);
        FILLS.forEach(function (f, n) { at(function () { fill(f); }, 500 + n * 180); });
        var after = 500 + FILLS.length * 180;
        at(function () { replied.hidden = false; stepTo(2); }, after + 300);
        at(function () { stepTo(3); demo.classList.add('is-review'); }, after + 2200);
      })();
    }
    var shown = false;
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      if (e.isIntersecting && !shown) { shown = true; play(); }
      else if (!e.isIntersecting && shown && e.boundingClientRect.top > 0) { shown = false; }
    }, { threshold: 0.35 }).observe(demo);
  })();

  K.story($('#flow-story'));
  K.start();
})();
