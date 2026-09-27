/* customsdingus — main.js (there is no build step, obviously) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmtDollars(v) { return '$' + Math.floor(v).toLocaleString('en-US'); }

  /* ---------------- $40 trillion counter ---------------- */
  // counts up from zero, then wobbles up and down a few trillion forever
  function startCounter(el) {
    var target = Number(el.getAttribute('data-target')) || 0;
    var duration = 2600; // ms
    var start = null;

    if (reduceMotion) {
      el.textContent = fmtDollars(target);
      return;
    }

    function wave(t) {
      return 2.4e12 * Math.sin(t * 0.9)
           + 1.1e12 * Math.sin(t * 2.3 + 1.7)
           + 0.5e12 * Math.sin(t * 5.7 + 0.4)
           + 0.05e12 * Math.sin(t * 23);
    }

    function tick(ts) {
      if (start === null) start = ts;
      var elapsed = ts - start;
      var value;
      if (elapsed < duration) {
        var p = elapsed / duration;
        value = target * (1 - Math.pow(2, -10 * p)); // ease-out-expo
      } else {
        var t = (elapsed - duration) / 1000;
        value = target + wave(t) * Math.min(1, t / 1.5);
      }
      el.textContent = fmtDollars(value);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counter = document.getElementById('duty-counter');
  if (counter) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            startCounter(counter);
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(counter);
    } else {
      startCounter(counter);
    }
  }

  /* ---------------- credit consumption manifold ---------------- */
  var canvas = document.getElementById('credit-surface');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var N = 26;           // grid resolution
    var t = 0;            // time
    var W = 900, H = 520; // logical size

    function fit() {
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      W = Math.max(320, rect.width);
      H = Math.round(W * 0.58);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // the "manifold". do not ask.
    function f(x, y) {
      return 0.45 * Math.sin(2.2 * x + t) * Math.cos(1.8 * y - t * 0.7)
           + 0.25 * x * y
           + 0.12 * Math.sin(6 * x + 2 * t) * Math.cos(5 * y);
    }

    // crude isometric-ish projection with a slow spin
    function project(x, y, z, ang) {
      var c = Math.cos(ang), s = Math.sin(ang);
      var X = x * c - y * s;
      var Y = x * s + y * c;
      var scale = Math.min(W, H) * 0.34;
      return {
        x: W / 2 + X * scale,
        y: H / 2 + 40 + (Y * 0.45 - z * 0.75) * scale
      };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var ang = t * 0.35;

      // axes
      var o = project(-1.15, -1.15, -0.75, ang);
      var ax = project(1.15, -1.15, -0.75, ang);
      var ay = project(-1.15, 1.15, -0.75, ang);
      var az = project(-1.15, -1.15, 0.85, ang);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#141414';
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ax.x, ax.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ay.x, ay.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(az.x, az.y); ctx.stroke();
      ctx.fillStyle = '#141414';
      ctx.font = 'italic 16px "Instrument Serif", Georgia, serif';
      ctx.fillText('ξ', ax.x + 6, ax.y + 4);
      ctx.fillText('η', ay.x + 6, ay.y + 4);
      ctx.fillText('credits', az.x + 8, Math.max(az.y, 14) + 4);

      // surface
      var pts = [];
      for (var i = 0; i <= N; i++) {
        pts[i] = [];
        for (var j = 0; j <= N; j++) {
          var x = (i / N) * 2 - 1;
          var y = (j / N) * 2 - 1;
          pts[i][j] = project(x, y, f(x, y), ang);
        }
      }

      ctx.lineWidth = 1.2;
      for (var a = 0; a <= N; a++) {
        ctx.strokeStyle = a % 5 === 0 ? '#ff3d8a' : 'rgba(20,20,20,.55)';
        ctx.beginPath();
        for (var b = 0; b <= N; b++) {
          var p = pts[a][b];
          if (b === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        ctx.strokeStyle = a % 5 === 0 ? '#2b4cff' : 'rgba(20,20,20,.35)';
        ctx.beginPath();
        for (var c2 = 0; c2 <= N; c2++) {
          var q = pts[c2][a];
          if (c2 === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }

      // a single, confidently placed data point
      var dp = project(0.3, -0.2, f(0.3, -0.2) + 0.02, ang);
      ctx.fillStyle = '#ff5c1a';
      ctx.beginPath(); ctx.arc(dp.x, dp.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '12px "Space Mono", monospace';
      ctx.fillStyle = '#141414';
      ctx.fillText('you (probably)', dp.x + 9, dp.y - 6);
    }

    function loop() {
      t += 0.012;
      draw();
      requestAnimationFrame(loop);
    }

    fit();
    window.addEventListener('resize', function () { fit(); draw(); });
    if (reduceMotion) { draw(); } else { loop(); }
  }

  /* ---------------- the globe ---------------- */
  // 1° land/water bitmap (360x180, row-major from the north pole, 1 bit per cell),
  // rasterised from Natural Earth 110m land polygons.
  var LAND_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADf//8AAf///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB///+D//////3+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////5////////wAAAAADgAABAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAA///8B///////+AAAAB//wAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAADzH3/x////////8AAAAA/gAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAcAAAAP+AP///////+AAAAAPAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAD4DAc+f+AP///////4AAAAAAAAAAAAADwAAAAH/8AAAAAAAAAAAAAAAAAAAAAH/wc3/4AAAf/////8AAAAAAAAAAAAD4AAAB////AAAB/AAAAAAAAAAAAAAAAAQAAQ/wAAAH/////8AAAAAAAAAAAAeAAAAH///wAAAAAAAAAAAAAAAAAAAAP8AIc+I3gAAD/////4AAAAAAAAAAAA4AAAH/////8HgAEAAAAAAAAAAAAAAAfv+4+w/4wAAB/////gAAAAAAAAAAADwAHgH///////4APgAAAAAgAAAAAAAAef/4O4//8AAB/////wAAAAAAAAAAADwAfP////////4+//gAAAAAAAf/AAAAAP/+A8f//4AA////+gAAAAAAA/AAAAAAfv/////////////8AAAAAB///+H//H//neD4f+AB3////AAAAAAAf/oAAAAgfv/////////////8QP4P///////////////////////////////8AAAP/+4AYYAAAAAAAAAAAAAAAAAD///////////////////////////////wAAABzAAAAYAAAAAAAAAAAAAAAAAAH//////////////////////////////gAACBwAAAAgAAAAAAAAAAAAAAAAAwP//////////////////////////////ADgB8AAAAAAAAAAAAAAAAAAAAAAAAgHf///////////zw7/gAP/gAAP4AAAD/4/+f//////////////////////+AAA///////////+DAA/gAH/gAAAAAAAH/z/////////////////////////+AAH///////////8AwAOAAD+AAAAAAAA//H/////////////////////////+AAP///////////wAA/AAAB+AAAAAAAB/+H//////////////////////nP+AAAH//z////////wAA/wAAAOAAAAAAAB//D/////////////////////+A/4AAAA/7AD///////gAA/4QAAAAAAAAAAB//Af///////////////////+cBgAAAAADwAA///////4AA/94AAAAAAAAAQA5+A///////////////////4AAHAAAAAADMAAD//////4AAf/8AAAAAAAAA8AA+C///////////////////wAAfgAAAAAMAAAB///////wAf/8AAAAAAAAA4AM8H///////////////////AAA/gAAAABgAAAA///////8A///AAAAAAAAAcANwH//////////////////8AAA/AAAAAAAAAAAf///////x///4AAAAAAAHOAED///////////////////8AAA+AAAAAAAAAABH///////x///8AAAAAAAHPA//////////////////////6AA8AAAAAAAAAAAD///////x///8AAAAAAAGfj//////////////////////+AAwAAAAAAAAAAAD///////9///8AAAAAAAAfj//////////////////////6AAAAAAAAAAAAAAD///////////MAAAAAAAAYf//////////////////////7AAAAAAAAAAAAAABv////////+AOAAAAAAAAA///////////////////////zAAAAAAAAAAAAAAAX////////7gfgAAAAAAAP///////////////////////yAAAAAAAAAAAAAAAP/////////gSgAAAAAAAH///////////////////////iAAAAAAAAAAAAAAAP/////////wAAAAAAAAAD/////uP/x//////////////CAAAAAAAAAAAAAAAP/////////+AAAAAAAAAB/////Hf/B/////////////+AAAAAAAAAAAAAAAAP////////8wAAAAAAAAAB//H/+AP+H/////////////8CAAAAAAAAAAAAAAAP////////wAAAAAAAAAD//jj/8AD/H/////////////4HgAAAAAAAAAAAAAAP////////gAAAAAAAAAH/4Bw/8AB/D////////////+APAAAAAAAAAAAAAAAP////////gAAAAAAAAAH/wA8f8PB/g////////////8AIAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/AMHfP///x///////////v4AMAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/AMCOP///h//////////+BwAMAAAAAAAAAAAAAAAH///////4AAAAAAAAAAH/AAAHH///g//////////8BwAIAAAAAAAAAAAAAAAH///////wAAAAAAAAAAH+AAYGH///g//////////+w4A4AAAAAAAAAAAAAAAD///////wAAAAAAAAAAAgP+AABM//////////////g4D4AAAAAAAAAAAAAAAB///////wAAAAAAAAAAAj/+AAAA//////////////A4fwAAAAAAAAAAAAAAAA///////gAAAAAAAAAAB//8AAAA//////////////AB+AAAAAAAAAAAAAAAAAP/////+AAAAAAAAAAAD//+AAAB//////////////gDQAAAAAAAAAAAAAAAAAH/////8AAAAAAAAAAAH///4GAB//////////////gDAAAAAAAAAAAAAAAAAAG/////4AAAAAAAAAAAP///8Pwj//////////////wCAAAAAAAAAAAAAAAAAACf////4AAAAAAAAAAAP/////////////////////gAAAAAAAAAAAAAAAAAAABP//hAYAAAAAAAAAAAP/////////P///////////wAAAAAAAAAAAAAAAAAAAAv//AAYAAAAAAAAAAAf/////////H///////////wAAAAAAAAAAAAAAAAAAAB3/+AAcAAAAAAAAAAB///////8//j///////////gAAAAAAAAAAAAAAAAAAAAT/+AAMAAAAAAAAAAD///////8//wH//////////AAAAAAAAAAAAAAAAAAAAAJ/+AAEAAAAAAAAAAH///////8f/0R/////////+AAAAAAAAAAAAAAAAAAAAAI/8AAAAAAAAAAAAAH///////+f/84Af///////+QAAAAAAAAAAAAAAAAAAAAAf8AAAAAAAAAAAAAP////////H//+AP///////4gAAAAAAAAAAAAAAAAAAAAAP8AAuAAAAAAAAAAP////////H///AH///v///AgAAAAAAAAAAAAAAAAAAAAAH+AIBgAAAAAAAAAf////////n//+AD//4P//YAAAAAAAAAAAAAAAAAAAAAAAP+A4AYAAAAAAAAAf////////j//8AAf/4H/+AAAAAAAAAAAAAAAAgAAAAAAAH/BwABwAAAAAAAAP////////h//8AAf/gH/8YAAAAAAAAAAAAAAAAAAAAAAAD/nwAh5AAAAAAAAP////////x//4AAf/AD/8QAAAAAAAAAAAAAAAAAAAAAAAAf/wAAAAAAAAAAAP////////4//gAAf+AD/+AAwAAAAAAAAAAAAAAAAAAAAAAH/wAAAAAAAAAAAf////////4f+AAAf8ADf/AAwAAAAAAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAf////////8f8AAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAf////////+fgAAAPwAAP/gAQAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAf/////////eAAAAHwAAP/gAMAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAf/////////gAAAAHwAAM/gAAAAAAAAAAAAAAAAAAAAAAAAAADABIAAAAAAAAP/////////gYAAADwAAEfgAJAAAAAAAAAAAAAAAAAAAAAAAADgH/KAAAAAAAH//////////4AAADwAAAPAAEAAAAAAAAAAAAAAAAAAAAAAAAAgPf+AAAAAAAD//////////4AAADgAAIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAd///AAAAAAAB//////////wAAABIAAMAAADAAAAAAAAAAAAAAAAAAAAAAAAAE///gAAAAAAB//////////wAAAAMAAGAAALAAAAAAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAf/////////gAAAAIAADAAMDAAAAAAAAAAAAAAAAAAAAAAAAAAf///gAAAAAAP/B///////gAAAAAAADgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAf///wAAAAAACAAv//////AAAAAAAAxgA8AAAAAAAAAAAAAAAAAAAAAAAAAAAf///4AAAAAAAAAH/////+AAAAAAAAZgB4AAAAAAAAAAAAAAAAAAAAAAAAAAA////4AAAAAAAAAD/////8AAAAAAAAMwH8AAAAAAAAAAAAAAAAAAAAAAAAAAB////8AAAAAAAAAH/////4AAAAAAAAHQf8AAAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAH/////gAAAAAAAAHgf88IAAAAAAAAAAAAAAAAAAAAAAAAD////+AAAAAAAAAH/////AAAAAAAAADwf4AAgAAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAH/////AAAAAAAAABwP5wBwAAAAAAAAAAAAAAAAAAAAAAAD/////8AAAAAAAAD////8AAAAAAAAAB4PxwAz4AAAAAAAAAAAAAAAAAAAAAAD//////4AAAAAAAB////8AAAAAAAAAA8AxQAf/AAAAAAAAAAAAAAAAAAAAAAH//////8AAAAAAAA////4AAAAAAAAAAcAAIAD/gAAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAAMAAAAA/xwAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAADAAAAA/4BAAAAAAAAAAAAAAAAAAAAD///////gAAAAAAAf///4AAAAAAAAAAB+AAAA/4AAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///4AAAAAAAAAAAAmgAAOMAAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///8AAAAAAAAAAAAACAAAHAAAAAAAAAAAAAAAAAAAAAA///////AAAAAAAAP///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////+AAAAAAAAP///8AAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAAf///+AAAAAAAAAAAAAAB+CAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAAf///+AwAAAAAAAAAAAAD8DAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAA////+AwAAAAAAAAAAAAz8DgAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAA////8BwAAAAAAAAAAAD/8DgAAAAAAAAAAAAAAAAAAAAAAB/////4AAAAAAAA////8PwAAAAAAAAAAAH//HwAAAAAAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////wPgAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAA////APgAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAAf///4AAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAD////+AAIAAAAAAAAAAAAAAAAAAAAP////gAAAAAAAAP//+AfAAAAAAAAAAAf////+AAEAAAAAAAAAAAAAAAAAAAAP////AAAAAAAAAP///AfAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAP///4AAAAAAAAAP//+APAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAf///gAAAAAAAAAH//+AOAAAAAAAAAAA//////wAAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAD//wAAAAAAAAAAAAAf/////8AAAAAAAAAAAAAAAAAAAAAAf//8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///4AAAAAAAAAAA//AAAAAAAAAAAAAAP/////4AAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAAAAA/+AAAAAAAAAAAAAAP/AP//wAAAAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAA/4AAAAAAAAAAAAAAf8AG//gAAAAAAAAAAAAAAAAAAAAAA///AAAAAAAAAAAAYAAAAAAAAAAAAAAAOAAF//gAAAAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/gAABAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAgAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAQAAAAAAAAAAAAAAAAAB//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADYAAAAcAAAAAAAAAAAAAAAAAB/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAADQAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAHAAAAAAAAAAAAAAAAAAB/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAOAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH4AAAAAAB4HgEj8AAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAA//CAAD//////////wAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAA////4Af///////////AAAAAAAAAAAAAAAAAAAAAAAz4AAAAAAAAAAAAAAAH3////8B/////////////4AAAAAAAAAAAAAAAAAAAAA78AAAAAAAAAAB8/8///////wf//////////////AAAAAAAAAAAAAAAAAAAAD9+AAAAAAAAZ////////////w////////////////wAAAAAAAAAAAAAAeAAAAD+AAAAAAAA//////////////////////////////4AAAAAAAAAACAAB///HB/+AAAAAAAP//////////////////////////////gAAAAAAAAP///gAf/////8AAAAAAAP/////////////////////////////8AAAAAAAD/////////////gAAAAAAB//////////////////////////////wAAAAAAAH////////////wAAAAAAP///////////////////////////////wAAAAAD/////////////8AAAAAAD////////////////////////////////wAAAABh/////////////AAAAB8A/////////////////////////////////8AAAAAwAf///////////gAAAH+AQ///////////////////////////////+AAAAAAAAH///////////+AbA/gAA///////////////////////////////8AAAAAAAf//////////////AAAAf////////////////////////////////+AAAAAAAH///////////////B////////////////////////////////////wAAAAAAH/////////////////////////////////////////////////////gAG/AAA/////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  var globe = document.getElementById('globe');
  if (globe && globe.getContext && typeof atob === 'function') {
    var gctx = globe.getContext('2d');
    var land = atob(LAND_B64);

    function isLand(lat, lon) {
      var x = Math.floor(lon + 180), y = Math.floor(90 - lat);
      if (x < 0) x = 0; if (x > 359) x = 359;
      if (y < 0) y = 0; if (y > 179) y = 179;
      var i = y * 360 + x;
      return (land.charCodeAt(i >> 3) & (128 >> (i & 7))) !== 0;
    }

    // evenly spread points over the sphere, keep the ones that land on land.
    // frame: x = right (east), y = up (north), z = towards the viewer.
    var dots = [];
    var COUNT = 14000, golden = Math.PI * (3 - Math.sqrt(5));
    for (var k = 0; k < COUNT; k++) {
      var py = 1 - (k / (COUNT - 1)) * 2;
      var pr = Math.sqrt(1 - py * py);
      var th = golden * k;
      var px = Math.cos(th) * pr, pz = Math.sin(th) * pr;
      var lat = Math.asin(py) * 180 / Math.PI;
      var lon = Math.atan2(px, pz) * 180 / Math.PI;
      if (isLand(lat, lon)) dots.push(px, py, pz);
    }

    // graticule: meridians and parallels every 30°
    var lines = [];
    var m, d, la, lo, ln;
    for (m = 0; m < 12; m++) {
      ln = [];
      for (d = -90; d <= 90; d += 3) {
        la = d * Math.PI / 180; lo = m * 30 * Math.PI / 180;
        ln.push(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
      }
      lines.push(ln);
    }
    for (m = -60; m <= 60; m += 30) {
      ln = [];
      for (d = 0; d <= 360; d += 3) {
        la = m * Math.PI / 180; lo = d * Math.PI / 180;
        ln.push(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
      }
      lines.push(ln);
    }

    var size = 400, R0 = 150, cx = 200, cy = 200;
    var yawAuto = 0, yawOff = 0, pitch = 0.25;
    var targetYawOff = 0, targetPitch = 0.25;
    var visible = true, last = null, elapsed = 0;

    // --- the wobble: an underdamped spring chasing random targets, plus twitches
    var wob = { x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0, tx: 0, ty: 0, ts: 1, next: 0 };
    var spin = { rate: 0.25, target: 0.25, next: 0 };
    var pitchNoise = 0, pitchNoiseTarget = 0, pitchNext = 0;

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function wobble(dt) {
      elapsed += dt;
      if (elapsed > wob.next) {                     // pick somewhere new to lurch towards
        wob.tx = rnd(-0.09, 0.09); wob.ty = rnd(-0.09, 0.09); wob.ts = rnd(0.86, 1.14);
        wob.next = elapsed + rnd(0.35, 1.5);
        if (Math.random() < 0.35) { wob.vx += rnd(-0.6, 0.6); wob.vy += rnd(-0.6, 0.6); wob.vs += rnd(-0.8, 0.8); } // twitch
      }
      var k = 34, c = 3.2;                          // stiff-ish, lightly damped: overshoots and jiggles
      wob.vx += ((wob.tx - wob.x) * k - wob.vx * c) * dt;
      wob.vy += ((wob.ty - wob.y) * k - wob.vy * c) * dt;
      wob.vs += ((wob.ts - wob.s) * k - wob.vs * c) * dt;
      wob.x += wob.vx * dt; wob.y += wob.vy * dt; wob.s += wob.vs * dt;
      // a constant nervous tremor on top
      wob.x += Math.sin(elapsed * 23.1) * 0.0012 + Math.sin(elapsed * 7.7) * 0.002;
      wob.y += Math.cos(elapsed * 19.3) * 0.0012 + Math.sin(elapsed * 5.1) * 0.002;
      if (wob.s < 0.8) wob.s = 0.8; if (wob.s > 1.2) wob.s = 1.2;

      if (elapsed > spin.next) {                    // the spin speeds up, slows down, sometimes reverses
        spin.target = Math.random() < 0.25 ? rnd(-0.6, -0.1) : rnd(0.1, 0.9);
        spin.next = elapsed + rnd(0.8, 3);
      }
      spin.rate += (spin.target - spin.rate) * Math.min(1, dt * 2.5);
      yawAuto += spin.rate * dt;

      if (elapsed > pitchNext) { pitchNoiseTarget = rnd(-0.35, 0.35); pitchNext = elapsed + rnd(0.6, 2.2); }
      pitchNoise += (pitchNoiseTarget - pitchNoise) * Math.min(1, dt * 3);
    }

    // --- the flies: jittery little paths in and out around the ball (local units of R)
    var FLIES = 16, TRAIL = 22, flies = [];
    for (var f = 0; f < FLIES; f++) {
      var dir = [rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)];
      var len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
      var rad = rnd(1.15, 1.45);
      var fx = dir[0] / len * rad, fy = dir[1] / len * rad, fz = dir[2] / len * rad;
      var trail = [];
      for (var q = 0; q < TRAIL; q++) trail.push(fx, fy, fz);
      flies.push({ x: fx, y: fy, z: fz, vx: 0, vy: 0, vz: 0, trail: trail, dart: rnd(0, 1) });
    }

    function buzz(dt) {
      for (var i = 0; i < flies.length; i++) {
        var fl = flies[i];
        var J = 55;                                   // jitter
        var ax = rnd(-J, J), ay = rnd(-J, J), az = rnd(-J, J);
        var r = Math.sqrt(fl.x * fl.x + fl.y * fl.y + fl.z * fl.z) || 1e-6;
        var pull = (r - 1.28) * 28;                   // hover about the ball
        ax -= pull * fl.x / r; ay -= pull * fl.y / r; az -= pull * fl.z / r;
        if (r < 1.04) { var sh = 90 * (1.04 - r) / r; ax += sh * fl.x; ay += sh * fl.y; az += sh * fl.z; } // don't fly into it
        fl.dart -= dt;
        if (fl.dart < 0) {                            // sudden dart somewhere
          fl.vx += rnd(-3.5, 3.5); fl.vy += rnd(-3.5, 3.5); fl.vz += rnd(-3.5, 3.5);
          fl.dart = rnd(0.25, 1.1);
        }
        fl.vx = (fl.vx + ax * dt) * (1 - 2.6 * dt);
        fl.vy = (fl.vy + ay * dt) * (1 - 2.6 * dt);
        fl.vz = (fl.vz + az * dt) * (1 - 2.6 * dt);
        var sp = Math.sqrt(fl.vx * fl.vx + fl.vy * fl.vy + fl.vz * fl.vz);
        if (sp > 4.5) { fl.vx *= 4.5 / sp; fl.vy *= 4.5 / sp; fl.vz *= 4.5 / sp; }
        fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.z += fl.vz * dt;
        fl.trail.push(fl.x, fl.y, fl.z);
        if (fl.trail.length > TRAIL * 3) fl.trail.splice(0, 3);
      }
    }

    function fitGlobe() {
      var dpr = window.devicePixelRatio || 1;
      var rect = globe.getBoundingClientRect();
      size = Math.max(160, Math.round(rect.width));
      globe.width = Math.round(size * dpr);
      globe.height = Math.round(size * dpr);
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = size / 2; cy = size / 2; R0 = size * 0.33;
    }

    // rotate a unit vector by yaw (about y) then pitch (about x); returns [x, y, z]
    var cyaw = 1, syaw = 0, cpit = 1, spit = 0;
    function rot(x, y, z, out) {
      var x1 = x * cyaw + z * syaw;
      var z1 = -x * syaw + z * cyaw;
      out[0] = x1;
      out[1] = y * cpit - z1 * spit;
      out[2] = y * spit + z1 * cpit;
      return out;
    }

    var tmp = [0, 0, 0], tmp2 = [0, 0, 0];
    var buckets = [[], [], [], [], [], []];

    // a fly segment is hidden when it's behind the ball and inside its outline
    function hidden(x, y, z) { return z < 0 && (x * x + y * y) < 1; }

    function drawGlobe() {
      var yaw = yawAuto + yawOff;
      cyaw = Math.cos(yaw); syaw = Math.sin(yaw);
      var pt = pitch + pitchNoise;
      cpit = Math.cos(pt); spit = Math.sin(pt);
      var gx = cx + wob.x * size, gy = cy + wob.y * size, R = R0 * wob.s;

      gctx.clearRect(0, 0, size, size);

      // flies behind the ball first
      drawFlies(gx, gy, R, true);

      // the ball
      var grad = gctx.createRadialGradient(gx - R * 0.4, gy - R * 0.4, R * 0.1, gx, gy, R * 1.05);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#e4ddcd');
      gctx.fillStyle = grad;
      gctx.beginPath(); gctx.arc(gx, gy, R, 0, Math.PI * 2); gctx.fill();

      // graticule (front half only)
      gctx.lineWidth = 1;
      gctx.strokeStyle = 'rgba(20,20,20,.16)';
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        gctx.beginPath();
        var pen = false;
        for (var i = 0; i < line.length; i += 3) {
          rot(line[i], line[i + 1], line[i + 2], tmp);
          if (tmp[2] > 0.02) {
            var sx = gx + tmp[0] * R, sy = gy - tmp[1] * R;
            if (pen) gctx.lineTo(sx, sy); else gctx.moveTo(sx, sy);
            pen = true;
          } else {
            pen = false;
          }
        }
        gctx.stroke();
      }

      // land dots, bucketed by depth so each bucket is one fill
      for (var b = 0; b < buckets.length; b++) buckets[b].length = 0;
      for (var j = 0; j < dots.length; j += 3) {
        rot(dots[j], dots[j + 1], dots[j + 2], tmp2);
        if (tmp2[2] <= 0) continue;
        var bi = Math.min(buckets.length - 1, Math.floor(tmp2[2] * buckets.length));
        buckets[bi].push(gx + tmp2[0] * R, gy - tmp2[1] * R);
      }
      var base = R / 95;
      for (b = 0; b < buckets.length; b++) {
        var pts = buckets[b];
        if (!pts.length) continue;
        var depth = (b + 0.5) / buckets.length;
        var rad = base * (0.55 + 0.55 * depth);
        gctx.fillStyle = 'rgba(20,20,20,' + (0.28 + 0.72 * depth).toFixed(2) + ')';
        gctx.beginPath();
        for (var q = 0; q < pts.length; q += 2) {
          gctx.moveTo(pts[q] + rad, pts[q + 1]);
          gctx.arc(pts[q], pts[q + 1], rad, 0, Math.PI * 2);
        }
        gctx.fill();
      }

      // outline
      gctx.lineWidth = 3;
      gctx.strokeStyle = '#141414';
      gctx.beginPath(); gctx.arc(gx, gy, R, 0, Math.PI * 2); gctx.stroke();

      // flies in front
      drawFlies(gx, gy, R, false);
    }

    function drawFlies(gx, gy, R, behind) {
      gctx.lineCap = 'round';
      for (var i = 0; i < flies.length; i++) {
        var tr = flies[i].trail, n = tr.length / 3;
        for (var s = 1; s < n; s++) {
          var x0 = tr[(s - 1) * 3], y0 = tr[(s - 1) * 3 + 1], z0 = tr[(s - 1) * 3 + 2];
          var x1 = tr[s * 3], y1 = tr[s * 3 + 1], z1 = tr[s * 3 + 2];
          var back = hidden(x0, y0, z0) || hidden(x1, y1, z1);
          var isBehind = (z0 + z1) < 0;
          if (back) continue;                       // occluded by the ball
          if (isBehind !== behind) continue;        // draw behind-ones before the ball, front-ones after
          var a = (s / n);                          // fades along the trail
          gctx.strokeStyle = 'rgba(20,20,20,' + (0.12 + 0.75 * a * a).toFixed(2) + ')';
          gctx.lineWidth = 0.6 + 1.1 * a;
          gctx.beginPath();
          gctx.moveTo(gx + x0 * R, gy - y0 * R);
          gctx.lineTo(gx + x1 * R, gy - y1 * R);
          gctx.stroke();
        }
        // the fly itself
        var fl = flies[i];
        if (!hidden(fl.x, fl.y, fl.z) && ((fl.z < 0) === behind)) {
          gctx.fillStyle = '#141414';
          gctx.beginPath(); gctx.arc(gx + fl.x * R, gy - fl.y * R, 2.2, 0, Math.PI * 2); gctx.fill();
        }
      }
    }

    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!reduceMotion) { wobble(dt); buzz(dt); }
      yawOff += (targetYawOff - yawOff) * 0.06;
      pitch += (targetPitch - pitch) * 0.06;
      if (visible) drawGlobe();
      requestAnimationFrame(frame);
    }

    // it also turns with the cursor
    function aim(clientX, clientY) {
      var nx = clientX / window.innerWidth - 0.5;   // -0.5 .. 0.5
      var ny = clientY / window.innerHeight - 0.5;
      targetYawOff = nx * 2.6;
      targetPitch = 0.25 - ny * 1.4;
      if (targetPitch > 1.2) targetPitch = 1.2;
      if (targetPitch < -1.2) targetPitch = -1.2;
    }
    window.addEventListener('mousemove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
    globe.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) aim(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible = e.isIntersecting; });
      }).observe(globe);
    }

    fitGlobe();
    window.addEventListener('resize', function () { fitGlobe(); drawGlobe(); });
    drawGlobe();
    requestAnimationFrame(frame);
  }
})();
