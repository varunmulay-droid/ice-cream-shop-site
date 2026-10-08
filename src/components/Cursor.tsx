import { useEffect, useRef, useState } from 'react';

/**
 * Premium creamery cursor: a berry "drip" dot with a lagging waffle ring.
 * - Springs behind the pointer with buttery lerp
 * - Expands into a labelled scoop over interactive elements (data-cursor="label")
 * - Melts away on touch devices
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setVisible(true);

    const pos = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let scale = 1;
    let targetScale = 1;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const target = (e.target as HTMLElement).closest?.('[data-cursor], a, button') as HTMLElement | null;
      if (target) {
        setLabel(target.getAttribute('data-cursor') || '');
        targetScale = target.hasAttribute('data-cursor') ? 3.4 : 2.2;
      } else {
        setLabel('');
        targetScale = 1;
      }
    };

    const loop = () => {
      ring.x += (pos.x - ring.x) * 0.16;
      ring.y += (pos.y - ring.y) * 0.16;
      scale += (targetScale - scale) * 0.14;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%,-50%) scale(${scale})`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Berry drip dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[100] pointer-events-none w-2.5 h-2.5 rounded-full"
        style={{ background: 'var(--berry)', boxShadow: '0 0 12px var(--berry)' }}
      />
      {/* Lagging waffle ring with optional label */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[99] pointer-events-none flex items-center justify-center w-10 h-10 rounded-full border transition-colors duration-300"
        style={{
          borderColor: label ? 'transparent' : 'var(--cocoa)',
          background: label ? 'var(--accent)' : 'rgba(255,107,139,0.08)',
          backdropFilter: label ? 'none' : 'blur(2px)',
        }}
      >
        {label && (
          <span
            className="text-white font-extrabold uppercase"
            style={{ fontSize: '4px', letterSpacing: '0.08em' }}
          >
            {label}
          </span>
        )}
      </div>
    </>
  );
}
