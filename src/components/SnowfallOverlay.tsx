import React from 'react';

interface Flake {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
  isGold: boolean;
}

const FLAKES: Flake[] = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 4.7 + (i % 3) * 2.1) % 98}%`,
  size: 5 + (i % 4) * 2.5,
  duration: `${11 + (i % 6) * 2.4}s`,
  delay: `${-(i * 1.3)}s`,
  opacity: 0.3 + (i % 4) * 0.14,
  isGold: i % 5 === 0,
}));

export const SnowfallOverlay: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {FLAKES.map((flake) => (
        <span
          key={flake.id}
          className="animate-snowfall absolute top-0 rounded-full"
          style={{
            left: flake.left,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDuration: flake.duration,
            animationDelay: flake.delay,
            backgroundColor: flake.isGold
              ? `rgba(217, 119, 6, ${flake.opacity * 0.65})`
              : `rgba(255, 255, 255, ${flake.opacity + 0.25})`,
            boxShadow: flake.isGold
              ? '0 0 6px rgba(217, 119, 6, 0.25)'
              : '0 0 5px rgba(226, 214, 192, 0.7)',
          }}
        />
      ))}
    </div>
  );
};
