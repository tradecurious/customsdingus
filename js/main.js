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

    var size = 400, R = 170, cx = 200, cy = 200;
    var yawAuto = 0, yawOff = 0, pitch = 0.25;
    var targetYawOff = 0, targetPitch = 0.25;
    var visible = true, last = null;

    function fitGlobe() {
      var dpr = window.devicePixelRatio || 1;
      var rect = globe.getBoundingClientRect();
      size = Math.max(160, Math.round(rect.width));
      globe.width = Math.round(size * dpr);
      globe.height = Math.round(size * dpr);
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = size / 2; cy = size / 2; R = size * 0.46;
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

    function drawGlobe() {
      var yaw = yawAuto + yawOff;
      cyaw = Math.cos(yaw); syaw = Math.sin(yaw);
      cpit = Math.cos(pitch); spit = Math.sin(pitch);

      gctx.clearRect(0, 0, size, size);

      // the ball
      var grad = gctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#e4ddcd');
      gctx.fillStyle = grad;
      gctx.beginPath(); gctx.arc(cx, cy, R, 0, Math.PI * 2); gctx.fill();

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
            var sx = cx + tmp[0] * R, sy = cy - tmp[1] * R;
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
        buckets[bi].push(cx + tmp2[0] * R, cy - tmp2[1] * R);
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
      gctx.beginPath(); gctx.arc(cx, cy, R, 0, Math.PI * 2); gctx.stroke();
    }

    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!reduceMotion) yawAuto += dt * 0.25;
      yawOff += (targetYawOff - yawOff) * 0.06;
      pitch += (targetPitch - pitch) * 0.06;
      if (visible) drawGlobe();
      requestAnimationFrame(frame);
    }

    // it turns with the cursor
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
