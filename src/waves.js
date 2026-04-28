import { createNoise2D } from 'simplex-noise';

export function initWaves(container) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.insertBefore(svg, container.firstChild);

  const noise2D = createNoise2D();

  const mouse = {
    x: -10, y: 0, lx: 0, ly: 0,
    sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false
  };

  let lines = [];
  let paths = [];
  let bounding = container.getBoundingClientRect();
  let rafId;

  function setSize() {
    bounding = container.getBoundingClientRect();
    svg.style.width = bounding.width + 'px';
    svg.style.height = bounding.height + 'px';
  }

  function setLines() {
    paths.forEach(p => p.remove());
    paths = [];
    lines = [];

    const { width, height } = bounding;
    const xGap = 11;
    const yGap = 8;
    const oWidth = width + 200;
    const oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i < totalLines; i++) {
      const points = [];
      for (let j = 0; j < totalPoints; j++) {
        points.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(255,255,255,0.12)');
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
      paths.push(path);
      lines.push(points);
    }
  }

  function movePoints(time) {
    lines.forEach(points => {
      points.forEach(p => {
        const move = noise2D(
          (p.x + time * 0.008) * 0.003,
          (p.y + time * 0.003) * 0.002
        ) * 8;

        p.wave.x = Math.cos(move) * 12;
        p.wave.y = Math.sin(move) * 6;

        const dx = p.x - mouse.sx;
        const dy = p.y - mouse.sy;
        const d = Math.hypot(dx, dy);
        const l = Math.max(175, mouse.vs);

        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035;
        }

        p.cursor.vx += (0 - p.cursor.x) * 0.01;
        p.cursor.vy += (0 - p.cursor.y) * 0.01;
        p.cursor.vx *= 0.95;
        p.cursor.vy *= 0.95;
        p.cursor.x += p.cursor.vx;
        p.cursor.y += p.cursor.vy;
        p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
        p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
      });
    });
  }

  function moved(point, withCursor = true) {
    return {
      x: point.x + point.wave.x + (withCursor ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursor ? point.cursor.y : 0),
    };
  }

  function drawLines() {
    lines.forEach((points, i) => {
      if (!paths[i] || points.length < 2) return;
      const first = moved(points[0], false);
      let d = `M ${first.x} ${first.y}`;
      for (let j = 1; j < points.length; j++) {
        const pt = moved(points[j]);
        d += ` L ${pt.x} ${pt.y}`;
      }
      paths[i].setAttribute('d', d);
    });
  }

  function tick(time) {
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    mouse.v = Math.hypot(dx, dy);
    mouse.vs += (mouse.v - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    movePoints(time);
    drawLines();
    rafId = requestAnimationFrame(tick);
  }

  function onMouseMove(e) {
    mouse.x = e.clientX - bounding.left;
    mouse.y = e.clientY - bounding.top + window.scrollY;
    if (!mouse.set) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.set = true;
    }
  }

  function onResize() {
    setSize();
    setLines();
  }

  setSize();
  setLines();

  let visible = true;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !rafId) rafId = requestAnimationFrame(tick);
    if (!visible && rafId) { cancelAnimationFrame(rafId); rafId = null; }
  });
  observer.observe(container);
  rafId = requestAnimationFrame(tick);

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
  };
}
