import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import Scene from '@/components/Scene';
import Cursor from '@/components/Cursor';
import Chatbot from '@/components/Chatbot';
import { FLAVORS, scrollState, themeState, type Flavor } from '@/lib/state';

gsap.registerPlugin(ScrollTrigger);

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [flavor, setFlavor] = useState<Flavor>(FLAVORS[0]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Lenis inertia scroll + GSAP ScrollTrigger progress → shared 3D state
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: rootRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollState.progress = self.progress;
        scrollState.velocity = self.getVelocity() / 1000;
      },
    });
    return () => {
      st.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // Theme swap → CSS vars + mutable 3D theme
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', flavor.accent);
    themeState.accent = flavor.accent;
    themeState.light = flavor.light;
    themeState.rim = flavor.rim;
  }, [flavor]);

  return (
    <div ref={rootRef} className="grain relative" style={{ background: 'var(--cream)' }}>
      <Cursor />
      <Scene />
      <Chatbot />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-5">
        <span className="font-display italic font-black text-xl tracking-tight">Velvet&nbsp;Scoop<span style={{ color: 'var(--berry)' }}>.</span></span>
        <div className="hidden md:flex gap-8 text-[13px] font-semibold uppercase tracking-widest">
          <a href="#craft" data-cursor="Craft" className="hover:opacity-60 transition-opacity">Craft</a>
          <a href="#flavors" data-cursor="Taste" className="hover:opacity-60 transition-opacity">Flavors</a>
          <a href="#visit" data-cursor="Visit" className="hover:opacity-60 transition-opacity">Visit</a>
        </div>
        <a
          href="#visit"
          data-cursor="Order"
          className="text-white text-[13px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-transform hover:scale-105"
          style={{ background: 'var(--cocoa)' }}
        >
          Pre-order
        </a>
      </nav>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center px-6 pointer-events-none">
        <Reveal>
          <span className="glass inline-block px-5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-[0.3em] pointer-events-auto" data-cursor="Est. 2025">
            Artisan Creamery · Small Batch
          </span>
        </Reveal>
        <Reveal delay={0.15}>
          <h1 className="font-display font-black leading-[0.9] mt-8" style={{ fontSize: 'clamp(3.5rem, 12vw, 10rem)' }}>
            <span className="text-gradient">Melt</span> Into<br />
            <em className="text-outline">The Moment</em>
          </h1>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mt-8 max-w-md text-base md:text-lg opacity-70 font-medium">
            Hand-churned gelato floating in a dreamy WebGL creamery. Scroll slow — the scoops follow you.
          </p>
        </Reveal>
        <Reveal delay={0.45} className="pointer-events-auto">
          <a
            href="#flavors"
            data-cursor="Taste"
            className="mt-10 inline-flex items-center gap-3 text-white font-bold px-9 py-4 rounded-full text-sm uppercase tracking-widest animate-glow transition-transform hover:scale-105"
            style={{ background: 'var(--berry)' }}
          >
            Taste the menu <span>↓</span>
          </a>
        </Reveal>
        <div className="absolute bottom-8 text-[11px] uppercase tracking-[0.35em] opacity-50 animate-bounce">Scroll · Scroll · Scroll</div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 overflow-hidden py-5 border-y border-black/10" style={{ background: 'var(--cocoa)' }}>
        <div className="animate-marquee whitespace-nowrap flex gap-10 w-max">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10 text-white/90 font-display italic text-xl">
              {['100% Grass-Fed Dairy', '✦', 'Madagascar Vanilla', '✦', 'Vegan Sorbets', '✦', 'Stone-Ground Pistachio', '✦', 'Churned Fresh Daily', '✦'].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CRAFT */}
      <section id="craft" className="relative z-10 min-h-screen flex items-center px-6 md:px-16 py-32">
        <div className="max-w-xl space-y-6">
          <Reveal>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.35em]" style={{ color: 'var(--berry)' }}>The Craft</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-black text-5xl md:text-7xl leading-[0.95]">Slow churned.<br /><em className="text-gradient">Fast gone.</em></h2>
          </Reveal>
          {[
            { t: 'Grass-Fed Dairy', d: 'Single-herd Jersey milk, pasteurized low & slow for a silkier base.' },
            { t: 'Organic Madagascar Vanilla', d: 'Whole pods steeped 48 hours — you can see the seeds in every scoop.' },
            { t: 'Zero Shortcuts', d: 'No gums, no artificial anything. Just cream, fruit, nuts and patience.' },
          ].map((c, i) => (
            <Reveal key={c.t} delay={0.15 + i * 0.12}>
              <div className="glass rounded-3xl p-6 transition-transform hover:-translate-y-1" data-cursor="Yum">
                <p className="font-display italic font-bold text-2xl">{c.t}</p>
                <p className="mt-2 text-sm opacity-70 leading-relaxed">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FLAVORS */}
      <section id="flavors" className="relative z-10 min-h-screen px-6 md:px-16 py-32 flex flex-col justify-center">
        <Reveal>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.35em]" style={{ color: 'var(--berry)' }}>Pick Your Obsession</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-[0.95] mt-4">Four moods.<br /><em className="text-gradient">One cone.</em></h2>
        </Reveal>
        <p className="mt-6 max-w-md text-sm opacity-60 font-medium">Tap a flavor — watch the whole scene re-light itself around your pick.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12 max-w-6xl">
          {FLAVORS.map((f, i) => (
            <Reveal key={f.id} delay={0.1 + i * 0.1}>
              <button
                onClick={() => setFlavor(f)}
                data-cursor="Taste"
                className="glass rounded-[2rem] p-6 text-left w-full transition-all duration-500 hover:-translate-y-2"
                style={flavor.id === f.id ? { outline: `2px solid ${f.accent}`, boxShadow: `0 24px 60px -20px ${f.accent}` } : undefined}
              >
                <div className="w-12 h-12 rounded-2xl mb-5 transition-transform hover:rotate-12" style={{ background: f.accent, boxShadow: `0 10px 30px -8px ${f.accent}` }} />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] opacity-50">{f.tag}</p>
                <p className="font-display italic font-bold text-2xl mt-1 leading-tight">{f.name}</p>
                <p className="text-[13px] opacity-70 mt-3 leading-relaxed">{f.desc}</p>
                <p className="mt-4 text-sm font-extrabold" style={{ color: f.accent }}>{f.price}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VISIT */}
      <section id="visit" className="relative z-10 min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-32">
        <Reveal>
          <h2 className="font-display font-black leading-[0.9]" style={{ fontSize: 'clamp(3rem, 9vw, 7.5rem)' }}>
            Come get<br /><em className="text-gradient">a scoop.</em>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="glass rounded-3xl px-10 py-8 mt-12 space-y-2">
            <p className="font-bold">Open every day · 11:00 AM – 11:00 PM</p>
            <p className="text-sm opacity-70">365 days a year — holiday pop-ups on Instagram</p>
            <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" data-cursor="Say hi" className="inline-block mt-4 text-white font-bold px-8 py-3.5 rounded-full text-sm uppercase tracking-widest transition-transform hover:scale-105" style={{ background: 'var(--cocoa)' }}>
              WhatsApp +1 (234) 567-890
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-black/10 px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] uppercase tracking-widest opacity-60">
        <span className="font-display italic normal-case text-base font-bold opacity-100">Velvet Scoop.</span>
        <span>Churned with love · Render blueprint included</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
