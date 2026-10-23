// Cinematic visual effects for the Modern Media Hub look:
//   - reactive particle field on a canvas (particles connect when the cursor is near)
//   - neon ripple waves produced on click
//   - giant titles with a typographic watermark
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * True when the user keeps the cinematic effects on. It defaults to on and
 * overrides the operating system "reduce motion" preference, because the user
 * explicitly asked for the visual effects; the switch in Ajustes turns them off.
 */
function useCinematicEffects(): boolean {
  const enabled = useSettingsStore(state => state.cinematicEffects ?? true);
  return enabled;
}

// ---------------------------------------------------------------------------
// Particle field
// ---------------------------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: 'blue' | 'white';
  alpha: number;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabled = useCinematicEffects();
  const cursor = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let particles: Particle[] = [];
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    // Pre-render the glowing dot for each colour once. Drawing a radial
    // gradient sprite with drawImage is far cheaper than the previous
    // per-particle `ctx.shadowBlur` (which triggered a Gaussian blur pass on
    // every single dot, every frame).
    const SPRITE_SIZE = 32;
    const makeSprite = (rgb: string) => {
      const s = document.createElement('canvas');
      s.width = SPRITE_SIZE;
      s.height = SPRITE_SIZE;
      const sctx = s.getContext('2d');
      if (!sctx) return s;
      const r = SPRITE_SIZE / 2;
      const g = sctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, `rgba(${rgb}, 1)`);
      g.addColorStop(0.35, `rgba(${rgb}, 0.85)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      return s;
    };
    const sprites = {
      blue: makeSprite('59, 130, 246'),
      white: makeSprite('219, 234, 254'),
    };

    const seed = () => {
      const count = Math.min(90, Math.round((window.innerWidth * window.innerHeight) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.6 + 0.7,
        hue: Math.random() > 0.62 ? 'white' : 'blue',
        alpha: Math.random() * 0.4 + 0.16,
      }));
    };

    const draw = () => {
      // Skip the whole frame while the window is hidden/minimised: rAF is
      // throttled by the browser anyway, but this avoids any wasted paint and
      // lets the loop idle at ~0 cost until the app is visible again.
      if (!document.hidden) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        const px = cursor.current.x;
        const py = cursor.current.y;

        for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
        }

        const color = p.hue === 'white' ? '219, 234, 254' : '59, 130, 246';

        // Connections to close neighbours.
        for (const other of particles) {
          if (other === p) continue;
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 15000) {
            const alpha = (1 - Math.sqrt(distSq) / 122) * 0.16;
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        // Connection to the cursor.
        if (cursor.current.active) {
          const dx = p.x - px;
          const dy = p.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 190) {
            const alpha = (1 - dist / 190) * 0.55;
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }

        // Draw the pre-rendered glow sprite (same look as the old shadowBlur,
        // but a single drawImage instead of a Gaussian blur pass per dot).
        const sprite = p.hue === 'white' ? sprites.white : sprites.blue;
        const drawSize = p.radius * 9;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize);
        ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onMove = (event: MouseEvent) => {
      cursor.current = { x: event.clientX, y: event.clientY, active: true };
    };
    const onLeave = () => {
      cursor.current.active = false;
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Ripple
// ---------------------------------------------------------------------------
interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Produces a neon shock wave on every click inside the returned container.
 * The waves are rendered over the card and removed when the animation ends.
 */
export function useRipple<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);
  const enabled = useCinematicEffects();

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !enabled) return;

    const onClick = (event: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Big enough to cover the card from the click point.
      const size = Math.max(rect.width, rect.height) * 2.4;
      const id = ++counter.current;

      setRipples(prev => [...prev, { id, x, y, size }]);
      window.setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 950);
    };

    node.addEventListener('click', onClick);
    return () => node.removeEventListener('click', onClick);
  }, [enabled]);

  const ripplesLayer = ripples.map(ripple => (
    <span
      key={ripple.id}
      className="ripple-wave"
      style={{
        left: ripple.x,
        top: ripple.y,
        width: ripple.size,
        height: ripple.size,
      }}
    />
  ));

  return { containerRef, ripplesLayer };
}

// ---------------------------------------------------------------------------
// Global ripple on every action button
// ---------------------------------------------------------------------------
/**
 * Injects a neon shock wave on any button of the app, wherever it lives.
 * The wave is a child of the button, so it is clipped by its own shape.
 */
export function GlobalRipple() {
  const enabled = useCinematicEffects();

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        'button, [role="button"], a.btn'
      ) as HTMLElement | null;
      if (!target) return;
      if (target.querySelector('.ripple-wave')) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.left = `${event.clientX - rect.left}px`;
      wave.style.top = `${event.clientY - rect.top}px`;
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;

      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
        target.style.overflow = 'hidden';
      }
      target.appendChild(wave);
      window.setTimeout(() => wave.remove(), 950);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);

  return null;
}

// ---------------------------------------------------------------------------
// Watermark title
// ---------------------------------------------------------------------------
export function WatermarkTitle({
  children,
  watermark,
  className,
}: {
  children: React.ReactNode;
  watermark?: string;
  className?: string;
}) {
  return (
    <span className={cn('watermark-title', className)} data-watermark={watermark}>
      {children}
    </span>
  );
}
