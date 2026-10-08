import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Msg { from: 'bot' | 'user'; text: string }

const FLAVORS = [
  { name: 'Sicilian Pistachio', price: '$4.50', allergens: 'nuts, dairy' },
  { name: 'Electric Wild Berry', price: '$4.00', allergens: 'none — vegan sorbet' },
  { name: 'Dark Cocoa Fudge', price: '$4.50', allergens: 'dairy' },
  { name: 'Madagascar Vanilla Bean', price: '$4.00', allergens: 'dairy' },
];

function answer(q: string): string {
  const s = q.toLowerCase();
  if (/(hour|open|close|time|when|schedule)/.test(s))
    return "We're scooping Monday–Sunday, 11:00 AM – 11:00 PM, 365 days a year. Holiday pop-ups get announced on our Instagram!";
  if (/(vegan|sorbet|dairy.?free)/.test(s))
    return 'Our Vegan Sorbets are 100% dairy-free real fruit — the Electric Wild Berry and Mango Passionfruit are fan favorites.';
  if (/(price|cost|how much)/.test(s))
    return FLAVORS.map((f) => `${f.name} — ${f.price}/scoop`).join('\n') + '\nSundaes start at $8.50.';
  if (/(allerg|nut|gluten)/.test(s))
    return FLAVORS.map((f) => `${f.name}: ${f.allergens}`).join('\n');
  if (/(pistachio)/.test(s)) return 'Sicilian Pistachio — $4.50/scoop. Slow-roasted Bronte pistachios, stone-ground. Contains nuts & dairy.';
  if (/(berry|strawberry)/.test(s)) return 'Electric Wild Berry — $4.00/scoop, a vegan sorbet with sun-ripened berries. Zero allergens.';
  if (/(chocol|cocoa|fudge)/.test(s)) return 'Dark Cocoa Fudge — $4.50/scoop. 72% Ecuadorian cacao with molten fudge ribbons. Contains dairy.';
  if (/(vanilla)/.test(s)) return 'Madagascar Vanilla Bean — $4.00/scoop, made with real vanilla pod seeds. Contains dairy.';
  if (/(flavo|menu|what do you have|sundae|gelato)/.test(s))
    return 'We serve Artisan Gelato, Vegan Sorbets and Gourmet Sundaes. Right now: ' + FLAVORS.map((f) => f.name).join(', ') + '.';
  if (/(order|buy|whatsapp|contact|delivery)/.test(s))
    return 'You can pre-order via WhatsApp at +1 (234) 567-890 — or just walk in, the waffle smell will guide you.';
  if (/(hi|hello|hey)/.test(s)) return 'Hey! Welcome to Velvet Scoop. Ask me about flavors, prices, allergens or opening hours.';
  return "I'm still learning! Try asking about our flavors, prices, allergens, opening hours, or ordering on WhatsApp.";
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: 'Hey! I\'m Scoopy — your gelato concierge. Ask about flavors, prices, allergens or hours.' },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: answer(q) }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="glass rounded-3xl w-[320px] max-w-[85vw] overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'var(--cocoa)' }}>
              <div className="w-2.5 h-2.5 rounded-full animate-glow" style={{ background: 'var(--accent)' }} />
              <div>
                <p className="text-white font-bold text-sm leading-none">Scoopy</p>
                <p className="text-white/60 text-[11px]">Gelato concierge · online</p>
              </div>
            </div>
            <div ref={listRef} className="h-64 overflow-y-auto p-4 space-y-2.5">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="px-3.5 py-2 rounded-2xl max-w-[80%] text-[13px] leading-snug whitespace-pre-line"
                    style={
                      m.from === 'user'
                        ? { background: 'var(--berry)', color: '#fff', borderBottomRightRadius: 4 }
                        : { background: '#fff', color: 'var(--cocoa)', borderBottomLeftRadius: 4 }
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2 border-t border-black/5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about flavors, hours..."
                className="flex-1 bg-white/80 rounded-full px-4 py-2 text-sm outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: 'var(--accent)' }}
              />
              <button
                onClick={send}
                data-cursor="Send"
                className="w-9 h-9 rounded-full text-white font-bold shrink-0"
                style={{ background: 'var(--cocoa)' }}
              >
                ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        data-cursor="Chat"
        className="w-14 h-14 rounded-full text-2xl glass animate-glow flex items-center justify-center"
      >
        🍦
      </motion.button>
    </div>
  );
}
