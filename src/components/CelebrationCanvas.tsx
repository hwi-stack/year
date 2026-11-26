import React, { useEffect, useRef } from 'react';

interface CelebrationCanvasProps {
  /** Incrementing counter that triggers a new festive burst */
  triggerKey: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  color: string;
  shape: 'ribbon' | 'star' | 'circle';
  opacity: number;
  life: number;
  maxLife: number;
}

const FESTIVE_COLORS = [
  '#D97706', // Warm Holiday Gold
  '#F59E0B', // Bright Amber Gold
  '#B91C1C', // Christmas Holly Red
  '#DC2626', // Festive Crimson
  '#166534', // Evergreen Pine
  '#15803D', // Spruce Green
  '#FDE68A', // Champagne Sparkle
];

export const CelebrationCanvas: React.FC<CelebrationCanvasProps> = ({
  triggerKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (triggerKey <= 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const w = canvas.width;
    const h = canvas.height;

    // Spawn bursts from left, center-top, and right for stage celebration feel
    const origins = [
      { x: w * 0.22, y: h * 0.35 },
      { x: w * 0.5, y: h * 0.24 },
      { x: w * 0.78, y: h * 0.35 },
    ];

    const newParticles: Particle[] = [];
    origins.forEach((origin, originIdx) => {
      const count = originIdx === 1 ? 56 : 42;
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
        const speed = 3.5 + Math.random() * 8.5;
        const shapes: Particle['shape'][] = ['ribbon', 'star', 'circle'];
        newParticles.push({
          x: origin.x + (Math.random() - 0.5) * 40,
          y: origin.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 5 + Math.random() * 6.5,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.18,
          color:
            FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
          shape: shapes[i % shapes.length],
          opacity: 1,
          life: 0,
          maxLife: 130 + Math.random() * 75,
        });
      }
    });

    particlesRef.current = [...particlesRef.current, ...newParticles];

    const drawStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerRadius: number
    ) => {
      const spikes = 4;
      const innerRadius = outerRadius * 0.42;
      context.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life += 1;
        if (p.life >= p.maxLife) return false;

        p.vy += 0.16; // gentle gravity
        p.vx *= 0.992; // air drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        const fadeRatio = p.life / p.maxLife;
        p.opacity = fadeRatio > 0.72 ? (1 - fadeRatio) / 0.28 : 1;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'ribbon') {
          ctx.fillRect(-p.size * 0.65, -p.size * 0.3, p.size * 1.3, p.size * 0.6);
        } else if (p.shape === 'star') {
          drawStar(ctx, 0, 0, p.size * 0.8);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      if (particlesRef.current.length > 0) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = null;
      }
    };

    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [triggerKey]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none"
      aria-hidden="true"
    />
  );
};
