// Pint.tsx
import React, { useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PintBeer { id?: string | number; name?: string }
interface PintProps {
  tint?: string | null;
  beer?: PintBeer;
  prefersReduced?: boolean;
  fillLevel?: number;
  animateFill?: boolean;
  animateFromEmpty?: boolean;
}

interface Bubble { id: number; cx: number; startY: number; rise: number; r: number; delay: number; dur: number }

/**
 * Pint
 *
 * Props:
 * - tint: color string used for beer fill (CSS color or hex). If not provided, caller should set CSS variable --beer-color.
 * - beer: optional beer object (used to seed bubble generator via id)
 * - prefersReduced: boolean from parent that indicates app-level reduced-motion preference
 * - fillLevel: number 0..1 controlling fill amount (0 = empty, 1 = full)
 * - animateFill: boolean to animate fill changes when visible
 *
 * Notes:
 * - Fixed visual fill (no per-beer fill logic).
 * - Uses IntersectionObserver to trigger the fill + bubbles when visible.
 * - Respects prefers-reduced-motion.
 */
export default function Pint({
  tint = null,
  beer,
  prefersReduced = false,
  fillLevel = 1,
  animateFill = false,
  animateFromEmpty = false,
}: PintProps = {}): React.ReactElement {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isVisible = true;
  const osReduce = useReducedMotion();
  const reduced = Boolean(prefersReduced || osReduce);
  const safeBeer: PintBeer = beer && typeof beer === 'object' ? beer : {};
  const maskId = useMemo(() => `beer-mask-${Math.random().toString(36).slice(2, 9)}`, []);
  const titleId = useMemo(() => `beer-pint-title-${Math.random().toString(36).slice(2, 9)}`, []);
  const VB_H = 512;
  const FILL_PCT = 0.98;
  const clampedFill = Math.max(0, Math.min(1, fillLevel));
  const rectTargetY = Math.round(VB_H * (1 - FILL_PCT * clampedFill));
  const targetY = rectTargetY;
  const shouldAnimateFill = animateFill && !reduced;
  const initialY = animateFromEmpty ? VB_H : targetY;
  const animatedY = isVisible ? targetY : initialY;

  const bubbles = useMemo<Bubble[]>(() => {
    let t = 1;
    const seedBase = String(safeBeer.id ?? Math.floor(Math.random() * 1e9));
    for (let i = 0; i < seedBase.length; i++) t = (t << 5) - t + seedBase.charCodeAt(i);
    const rnd = () => {
      t = Math.imul(48271, t) | 0;
      return Math.abs(t % 1000) / 1000;
    };
    const out = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const cx = 160 + Math.round(rnd() * 200) + Math.round((rnd() - 0.5) * 40);
      const startY = 420 + Math.round(rnd() * 42);
      const rise = 140 + Math.round(rnd() * 220);
      const r = 2 + Math.round(rnd() * 5);
      const delay = rnd() * 1.2 * (i * 0.08 + 0.2);
      const dur = 1.6 + rnd() * 2.2;
      out.push({ id: i, cx, startY, rise, r, delay, dur });
    }
    return out;
  }, [safeBeer.id]);

  return (
    <svg
      ref={svgRef}
      className="beer-svg"
      width="56"
      height="56"
      viewBox="0 0 512 512"
      role="img"
      aria-hidden={false}
      aria-labelledby={titleId}
      aria-label={safeBeer.name ? `${safeBeer.name} pint illustration` : 'Beer pint illustration'}
    >
      <title id={titleId}>{safeBeer.name ? `${safeBeer.name} pint illustration` : 'Beer pint illustration'}</title>
      <defs>
        <style>{`
          .beer-svg .cls-3 { fill: rgba(255,255,255,0.12); stroke: #000; stroke-width: 10px; }
          .beer-svg .cls-2 { fill: #fff; }
          .beer-svg .cls-1 { fill: var(--beer-color, ${tint ?? '#d8b055'}); }
          .beer-svg .cls-4 { opacity: 0.14; }
          .beer-svg .cls-5 { fill: #17292d; }
        `}</style>
        <mask id={maskId}>
          <rect x="0" y="0" width="512" height="512" fill="black" />
          <path
            d="M172.11,499.2a19.15,19.15,0,0,1-18.79-23.07c10.07-47.81,15.45-121.21-16.09-199.32-19-47-25.82-107.07-20-174.41H394.71c5.86,67.34-1,127.44-20,174.41-31.54,78.12-26.16,151.51-16.09,199.32a19.15,19.15,0,0,1-18.79,23.07Z"
            fill="white"
          />
        </mask>
      </defs>
      <path
        className="cls-3"
        d="M406.33,89.6h0a639.63,639.63,0,0,0-10.18-64.29A32,32,0,0,0,364.82,0H147.17a32,32,0,0,0-31.3,25.31A639.63,639.63,0,0,0,105.69,89.6h0c-6.11,57.1-5.66,129.14,19.71,192,30.44,75.4,25,146.33,15.43,191.89A32,32,0,0,0,172.11,512H339.87a32,32,0,0,0,31.32-38.51c-9.59-45.57-15-116.49,15.43-191.89C423.08,191.28,408.1,81.9,396.12,25.31Z"
      />
      <path
        className="cls-2"
        d="M117.31,102.4A624.69,624.69,0,0,1,128.4,28,19.24,19.24,0,0,1,147.17,12.8H364.82A19.24,19.24,0,0,1,383.59,28a625,625,0,0,1,11.09,74.44Z"
      />
      <g mask={`url(#${maskId})`} aria-hidden={reduced ? 'true' : 'false'}>
        <motion.rect
          x="0"
          width="512"
          height={VB_H}
          initial={{ y: initialY }}
          animate={{ y: animatedY }}
          transition={
            shouldAnimateFill
              ? { type: 'spring', stiffness: 80, damping: 14 }
              : { duration: 0 }
          }
          fill={tint ?? 'var(--beer-color, #d8b055)'}
          style={{ willChange: 'transform' }}
        />
      </g>
      <g className="cls-4">
        <path
          className="cls-5"
          d="M396.12,25.31A32,32,0,0,0,364.82,0h-64a32,32,0,0,1,31.3,25.31c12,56.59,27,166-9.49,256.29-30.44,75.4-25,146.33-15.43,191.89A32,32,0,0,1,275.87,512h64a32,32,0,0,0,31.32-38.51c-9.59-45.57-15-116.49,15.43-191.89C423.08,191.28,408.1,81.9,396.12,25.31Z"
        />
      </g>
      {!reduced && clampedFill > 0 &&
        bubbles.map((b) => (
          <motion.circle
            key={b.id}
            cx={b.cx}
            cy={b.startY}
            r={b.r}
            fill="rgba(255,255,255,0.94)"
            stroke="rgba(0,0,0,0.32)"
            strokeWidth={0.8}
            paintOrder="stroke"
            style={{ willChange: 'transform, opacity' }}
            initial={{ opacity: 0.1, y: 0 }}
            animate={
              isVisible
                ? {
                    y: [0, -b.rise * 0.85, -b.rise * 1.05],
                    opacity: [0, 1, 0],
                  }
                : { opacity: 0, y: 0 }
            }
            transition={
              isVisible
                ? {
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: b.dur,
                    ease: 'linear',
                    delay: b.delay,
                  }
                : { duration: 0 }
            }
          />
        ))}
    </svg>
  );
}
