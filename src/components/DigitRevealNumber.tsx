import React, { useEffect, useState } from 'react';
import { formatTicketNumber } from '../utils/raffleEngine';

interface DigitRevealNumberProps {
  ticketNumber: number | null;
  maxNumber: number;
  /** Number of digits currently revealed from right to left (0 = spinning all, 1 = ones, 2 = tens, 3 = hundreds...) */
  revealedCount: number;
  size?: 'lg' | 'md';
  isRevealing?: boolean;
  justFinished?: boolean;
}

export const DigitRevealNumber: React.FC<DigitRevealNumberProps> = ({
  ticketNumber,
  maxNumber,
  revealedCount,
  size = 'md',
  isRevealing = false,
  justFinished = false,
}) => {
  const formatted =
    ticketNumber !== null
      ? formatTicketNumber(ticketNumber, maxNumber)
      : formatTicketNumber(0, maxNumber).replace(/0/g, '·');

  const digits = formatted.split('');
  const totalDigits = digits.length;
  const allRevealed = ticketNumber !== null && revealedCount >= totalDigits;

  const [spinSeed, setSpinSeed] = useState(0);

  // Rapidly roll unrevealed digits while reveal animation is active
  useEffect(() => {
    if (!isRevealing || ticketNumber === null) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setSpinSeed((prev) => (prev + 1) % 100);
    }, 65);

    return () => window.clearInterval(interval);
  }, [isRevealing, ticketNumber]);

  const boxSizeClass =
    size === 'lg'
      ? 'w-13 h-16 sm:w-15 sm:h-18 text-4xl sm:text-5xl rounded-xl'
      : 'w-11 h-14 sm:w-12 sm:h-15 text-3xl sm:text-4xl rounded-xl';

  return (
    <div
      className="flex items-center justify-center gap-2 select-none"
      aria-label={
        ticketNumber !== null && allRevealed
          ? `당첨 번호 ${formatted}번`
          : '추첨 번호 공개 중'
      }
    >
      {digits.map((digit, index) => {
        // Right-to-left reveal: rightmost index is (totalDigits - 1) -> positionFromRight = 1
        const positionFromRight = totalDigits - index;
        const isDigitVisible =
          ticketNumber !== null && revealedCount >= positionFromRight;

        // Next digit to lock in gets subtle highlight
        const isNextToReveal =
          isRevealing &&
          ticketNumber !== null &&
          revealedCount + 1 === positionFromRight;

        // Calculate rolling number while spinning
        const rollingDigit = ((spinSeed + index * 3 + (ticketNumber ?? 0)) % 10);

        return (
          <div
            key={`${index}-${positionFromRight}`}
            className={`relative overflow-hidden flex items-center justify-center font-display-num font-extrabold tracking-tight transition-all duration-300 ${boxSizeClass} ${
              isDigitVisible
                ? allRevealed
                  ? `bg-[#FFFDF8] text-[#B91C1C] border-2 border-[#D97706] shadow-sm animate-digit-pop ${
                      justFinished ? 'ring-2 ring-[#FDE68A]' : ''
                    }`
                  : 'bg-white text-[#1F1B16] border-2 border-[#D97706]/85 shadow-sm animate-digit-pop'
                : isRevealing && ticketNumber !== null
                  ? isNextToReveal
                    ? 'bg-[#FEF3C7]/90 text-[#B45309] border-2 border-[#D97706]/70 shadow-inner'
                    : 'bg-[#FAF3E3] text-[#9A8465] border border-[#DFD1B8]'
                  : 'bg-[#F5EFE2] text-[#A89B86] border border-[#E4D9C5]'
            }`}
          >
            {isDigitVisible ? (
              <span>{digit}</span>
            ) : isRevealing && ticketNumber !== null ? (
              <span className="opacity-85 scale-95 transition-transform duration-75">
                {rollingDigit}
              </span>
            ) : (
              <span className="text-xl sm:text-2xl opacity-50">·</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
