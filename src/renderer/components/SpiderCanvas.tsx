// SpiderCanvas Component - HTML5 Canvas Spider Animation
import React, { useEffect, useRef, useState } from 'react';
import { zerotweaks } from '../lib/api';

interface SpiderLeg {
  segments: { x: number; y: number }[];
  target: { x: number; y: number };
  phase: number;
  restAngle: number;
}

interface SpiderState {
  mode: 'idle' | 'scan' | 'done' | 'error';
  position: { x: number; y: number };
  legs: SpiderLeg[];
  currentTarget?: { x: number; y: number };
  pulseColor?: string;
  pulseIntensity: number;
}

const LEG_COUNT = 8;
const SEGMENT_COUNT = 2;
const SEGMENT_LENGTH = 35;
const BODY_RADIUS = 20;

export function SpiderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [state, setState] = useState<SpiderState>({
    mode: 'idle',
    position: { x: 0, y: 0 },
    legs: Array.from({ length: LEG_COUNT }, (_, i) => ({
      segments: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
      target: { x: 0, y: 0 },
      phase: i * (Math.PI / 4),
      restAngle: i * (Math.PI / 4),
    })),
    pulseIntensity: 0,
  });

  const [targets, setTargets] = useState<{ x: number; y: number; moduleId: string }[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  // Initialize spider position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height - 100; // Bottom center

    setState(prev => ({
      ...prev,
      position: { x: centerX, y: centerY },
      legs: prev.legs.map((leg, i) => ({
        ...leg,
        segments: [
          { x: centerX + Math.cos(leg.restAngle) * 60, y: centerY + Math.sin(leg.restAngle) * 60 },
          { x: centerX + Math.cos(leg.restAngle) * 120, y: centerY + Math.sin(leg.restAngle) * 120 },
        ],
        target: { x: centerX + Math.cos(leg.restAngle) * 120, y: centerY + Math.sin(leg.restAngle) * 120 },
      })),
    }));
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Idle the simulation + paint while the window is hidden or minimised.
      // The state (position, legs, pulse) is preserved, so the spider simply
      // resumes from where it stopped once the app is visible again.
      if (!document.hidden) {
        updateSpider(dt);
        drawSpider(ctx, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Listen for spider commands from main process
  useEffect(() => {
    const unsubscribe = window.zerotweaks?.spider?.['on:spiderUpdate']?.((newState: Partial<SpiderState>) => {
      setState(prev => ({ ...prev, ...newState }));
    });
    return unsubscribe;
  }, []);

  const updateSpider = (dt: number) => {
    setState(prev => {
      const newState = { ...prev };
      const { position, legs } = prev;

      if (prev.mode === 'scan' && targets.length > 0) {
        const target = targets[currentTargetIndex];
        if (target) {
          // Move towards target
          const dx = target.x - position.x;
          const dy = target.y - position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            const speed = 300; // pixels per second
            newState.position = {
              x: position.x + (dx / dist) * speed * dt,
              y: position.y + (dy / dist) * speed * dt,
            };
          } else {
            // Reached target, pulse and move to next
            newState.pulseIntensity = 1;
            newState.pulseColor = '#60a5fa';
            
            setTimeout(() => {
              setCurrentTargetIndex(i => {
                const next = i + 1;
                if (next >= targets.length) {
                  setState(s => ({ ...s, mode: 'done' }));
                  setTimeout(() => setState(s => ({ ...s, mode: 'idle' })), 1000);
                  return 0;
                }
                return next;
              });
            }, 500);
          }
        }
      } else if (prev.mode === 'idle') {
        // Return to home position
        const homeX = canvasRef.current?.width || 800 / 2;
        const homeY = (canvasRef.current?.height || 600) - 100;
        const dx = homeX - position.x;
        const dy = homeY - position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const speed = 200;
          newState.position = {
            x: position.x + (dx / dist) * speed * dt,
            y: position.y + (dy / dist) * speed * dt,
          };
        }
      }

      // Update legs with inverse kinematics
      newState.legs = legs.map((leg, i) => updateLeg(leg, newState.position, i, dt, prev.mode));

      // Decay pulse
      if (newState.pulseIntensity > 0) {
        newState.pulseIntensity = Math.max(0, newState.pulseIntensity - dt * 3);
      }

      return newState;
    });
  };

  const updateLeg = (leg: SpiderLeg, bodyPos: { x: number; y: number }, index: number, dt: number, mode: SpiderState['mode']): SpiderLeg => {
    // Calculate target position for this leg
    const t = performance.now() / 1000;
    // Reverse cinematic motion: the legs sweep the opposite way of the walk and
    // the stride deepens while the spider is scanning.
    const sweep = mode === 'scan'
      ? Math.sin(t * 2.4 + index * 0.7) * 0.42
      : Math.sin(t * 1.1 + leg.phase) * 0.12;
    const angle = leg.restAngle + sweep;
    const targetDist = (mode === 'scan' ? 86 : 62) + Math.sin(t * 3 + leg.phase) * 4;

    const targetX = bodyPos.x + Math.cos(angle) * targetDist;
    const targetY = bodyPos.y + Math.sin(angle) * targetDist;

    // Inverse kinematics (2-bone)
    const segments = [...leg.segments];
    const dx = targetX - bodyPos.x;
    const dy = targetY - bodyPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxReach = SEGMENT_LENGTH * SEGMENT_COUNT;

    let kneeX: number;
    let kneeY: number;
    let tipX: number;
    let tipY: number;

    if (dist > maxReach) {
      // Stretch - point directly at target
      const scale = maxReach / dist;
      kneeX = bodyPos.x + dx * 0.5 * scale;
      kneeY = bodyPos.y + dy * 0.5 * scale;
      tipX = targetX;
      tipY = targetY;
    } else if (dist > 0.001) {
      // Normal IK using law of cosines
      const kneeAngle = Math.acos(Math.min(dist / maxReach, 1));
      const baseAngle = Math.atan2(dy, dx);

      kneeX = bodyPos.x + Math.cos(baseAngle) * SEGMENT_LENGTH * Math.cos(kneeAngle);
      kneeY = bodyPos.y + Math.sin(baseAngle) * SEGMENT_LENGTH * Math.cos(kneeAngle);
      tipX = targetX;
      tipY = targetY;
    } else {
      kneeX = leg.segments[0].x;
      kneeY = leg.segments[0].y;
      tipX = leg.segments[1].x;
      tipY = leg.segments[1].y;
    }

    // Smooth the joints so the legs flow instead of snapping between frames.
    const smoothing = Math.min(1, dt * 12);
    segments[0] = {
      x: leg.segments[0].x + (kneeX - leg.segments[0].x) * smoothing,
      y: leg.segments[0].y + (kneeY - leg.segments[0].y) * smoothing,
    };
    segments[1] = {
      x: leg.segments[1].x + (tipX - leg.segments[1].x) * smoothing,
      y: leg.segments[1].y + (tipY - leg.segments[1].y) * smoothing,
    };

    return {
      ...leg,
      segments,
      target: { x: targetX, y: targetY },
    };
  };

  const drawSpider = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const dpr = window.devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width / dpr, height / dpr);

    const { position, legs, pulseColor, pulseIntensity, mode } = state;
    const time = performance.now() / 1000;
    const hunting = mode === 'scan' && targets.length > 0;
    const target = hunting ? targets[currentTargetIndex] : undefined;

    // Draw legs
    legs.forEach((leg, i) => {
      // Leg line
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      leg.segments.forEach(seg => ctx.lineTo(seg.x, seg.y));

      // Gradient for leg
      const gradient = ctx.createLinearGradient(position.x, position.y, leg.segments[1].x, leg.segments[1].y);
      gradient.addColorStop(0, '#60a5fa80');
      gradient.addColorStop(1, '#bfdbfe80');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Joint circles
      leg.segments.forEach((seg, j) => {
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, j === 1 ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = j === 1 ? '#bfdbfe' : '#60a5fa';
        ctx.fill();

        // LED glow at foot
        if (j === 1) {
          ctx.shadowColor = '#bfdbfe';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#bfdbfe';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Red laser on the tips: while the spider works it aims at the element it
      // is inspecting.
      if (hunting && target) {
        const tip = leg.segments[1];
        const alpha = 0.28 + Math.sin(time * 6 + i) * 0.12;
        ctx.save();
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -time * 40;
        ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.9)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
      }
    });

    // Draw body
    const bodyGradient = ctx.createRadialGradient(
      position.x, position.y, 0,
      position.x, position.y, BODY_RADIUS
    );
    bodyGradient.addColorStop(0, '#1a1a2e');
    bodyGradient.addColorStop(1, '#0f0f1a');
    
    ctx.beginPath();
    ctx.arc(position.x, position.y, BODY_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    ctx.strokeStyle = '#3b82f640';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw eyes with a pulsing glow
    const eyeOffset = 8;
    const eyeY = position.y - 5;
    const eyeGlow = 8 + Math.sin(time * 3.2) * 4;
    const eyeColor = mode === 'scan' ? '#60a5fa' : '#bfdbfe';

    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(position.x + side * eyeOffset, eyeY, 4, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = eyeGlow;
      ctx.fill();
      ctx.fill();

      // Halo around the eye.
      ctx.beginPath();
      ctx.arc(position.x + side * eyeOffset, eyeY, 7 + Math.sin(time * 3.2 + side) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'scan' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(147, 197, 253, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Pulse effect
    if (pulseIntensity > 0 && pulseColor) {
      ctx.beginPath();
      ctx.arc(position.x, position.y, BODY_RADIUS + 20 * pulseIntensity, 0, Math.PI * 2);
      ctx.strokeStyle = `${pulseColor}${Math.floor(pulseIntensity * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 3 * pulseIntensity;
      ctx.stroke();
    }

    // Mode indicator
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillStyle = '#60a5fa80';
    ctx.textAlign = 'center';
    ctx.fillText(`Mode: ${mode}`, position.x, position.y + BODY_RADIUS + 25);
  };

  const startScan = (moduleTargets: { x: number; y: number; width: number; height: number; moduleId: string }[]) => {
    setTargets(moduleTargets.map(t => ({ x: t.x + t.width / 2, y: t.y + t.height / 2, moduleId: t.moduleId })));
    setCurrentTargetIndex(0);
    setState(prev => ({ ...prev, mode: 'scan' }));
  };

  const idle = () => {
    setState(prev => ({ ...prev, mode: 'idle' }));
  };

  // Expose methods globally for main process
  useEffect(() => {
    // @ts-expect-error -- window.zerotweaks is injected by the preload bridge at runtime
    window.__spiderApi = { startScan, idle };
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return null; // Don't render spider if user prefers reduced motion
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
      style={{ touchAction: 'none' }}
    />
  );
}