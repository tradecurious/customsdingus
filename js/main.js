/* customsdingus — main.js (there is no build step, obviously) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- $40 trillion counter ---------------- */
  function startCounter(el) {
    var target = Number(el.getAttribute('data-target')) || 0;
    var duration = 2600; // ms
    var start = null;

    if (reduceMotion) {
      el.textContent = '$' + target.toLocaleString('en-US');
      return;
    }

    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      // ease-out-expo: starts fast, lands hard
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      var value = Math.floor(target * eased);
      el.textContent = '$' + value.toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
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
})();
