import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Msg { from: 'bot' | 'user'; text: string; link?: { label: string; href: string } }
interface Chip { id: string; label: string }
interface Order { type?: string; flavor?: string; scoops?: string; topping?: string }

const FLAVORS = [
  { name: 'Sicilian Pistachio', price: '$4.50', allergens: 'nuts, dairy' },
  { name: 'Electric Wild Berry', price: '$4.00', allergens: 'none — vegan sorbet' },
  { name: 'Dark Cocoa Fudge', price: '$4.50', allergens: 'dairy' },
  { name: 'Madagascar Vanilla Bean', price: '$4.00', allergens: 'dairy' },
];

const WA_NUMBER = '1234567890';
const MAIN_MENU: Chip[] = [
  { id: 'menu:flavors', label: '🍨 Flavors' },
  { id: 'menu:order', label: '🛒 Order' },
  { id: 'menu:diet', label: '🌱 Dietary & allergens' },
  { id: 'menu:info', label: '🕐 Hours & location' },
  { id: 'menu:events', label: '🎂 Parties & events' },
  { id: 'menu:prices', label: '💰 Prices' },
];
const BACK: Chip = { id: 'menu:main', label: '⬅️ Main menu' };

const FLAVOR_CHIPS: Chip[] = FLAVORS.map((f) => ({ id: `flavor:${f.name}`, label: f.name }));
const TOPPINGS = ['Hot fudge', 'Rainbow sprinkles', 'Crushed nuts', 'Fresh berries', 'No toppings'];

const NODES: Record<string, { text: string; chips: Chip[] }> = {
  'menu:main': { text: 'What would you like to know?', chips: MAIN_MENU },
  'menu:flavors': {
    text: 'We serve Artisan Gelato, Vegan Sorbets and Gourmet Sundaes. Tap a flavor for details:',
    chips: [...FLAVOR_CHIPS, { id: 'info:best', label: '🔥 Best sellers' }, BACK],
  },
  'info:best': {
    text: 'Crowd favorites: Sicilian Pistachio ($4.50) and Dark Cocoa Fudge ($4.50). Want something lighter? Electric Wild Berry ($4.00) is our top vegan pick.',
    chips: [{ id: 'order:start', label: '🛍 Build my order' }, { id: 'menu:flavors', label: '🍨 All flavors' }, BACK],
  },
  'menu:prices': {
    text: FLAVORS.map((f) => `${f.name} — ${f.price}/scoop`).join('\n') + '\nSundaes start at $8.50.',
    chips: [{ id: 'order:start', label: '🛍 Build my order' }, { id: 'menu:flavors', label: '🍨 Flavors' }, BACK],
  },
  'menu:diet': {
    text: 'What do you need to avoid?',
    chips: [
      { id: 'diet:vegan', label: '🌱 Vegan / dairy-free' },
      { id: 'diet:nut', label: '🥜 Nut-free' },
      { id: 'diet:all', label: '⚠️ Full allergen list' },
      BACK,
    ],
  },
  'diet:vegan': {
    text: 'Our Vegan Sorbets are 100% dairy-free real fruit — the Electric Wild Berry and Mango Passionfruit are fan favorites.',
    chips: [{ id: 'flavor:Electric Wild Berry', label: 'Electric Wild Berry' }, { id: 'menu:diet', label: '⬅️ Dietary menu' }, BACK],
  },
  'diet:nut': {
    text: 'Nut-free picks: ' + FLAVORS.filter((f) => !/nut/.test(f.allergens)).map((f) => f.name).join(', ') + '. Sicilian Pistachio contains nuts. For severe allergies, message us on WhatsApp before ordering.',
    chips: [{ id: 'menu:diet', label: '⬅️ Dietary menu' }, BACK],
  },
  'diet:all': {
    text: FLAVORS.map((f) => `${f.name}: ${f.allergens}`).join('\n') + '\nHave a severe allergy? Message us on WhatsApp before ordering.',
    chips: [{ id: 'menu:diet', label: '⬅️ Dietary menu' }, BACK],
  },
  'menu:info': {
    text: 'What do you need?',
    chips: [{ id: 'info:hours', label: '🕐 Opening hours' }, { id: 'info:find', label: '📍 Find us' }, { id: 'info:contact', label: '📞 Contact' }, BACK],
  },
  'info:hours': {
    text: "We're scooping Monday–Sunday, 11:00 AM – 11:00 PM, 365 days a year. Holiday pop-ups get announced on our Instagram!",
    chips: [{ id: 'menu:info', label: '⬅️ Back' }, BACK],
  },
  'info:find': {
    text: 'Follow us on Instagram for our latest location and pop-up updates, or message us on WhatsApp at +1 (234) 567-890.',
    chips: [{ id: 'menu:info', label: '⬅️ Back' }, BACK],
  },
  'info:contact': {
    text: 'Reach us on WhatsApp at +1 (234) 567-890 — or just walk in, the waffle smell will guide you.',
    chips: [{ id: 'menu:info', label: '⬅️ Back' }, BACK],
  },
  'menu:events': {
    text: 'Planning something sweet? Pick one:',
    chips: [
      { id: 'events:party', label: '🎉 Birthday / party' },
      { id: 'events:corp', label: '🏢 Corporate / catering' },
      { id: 'events:wedding', label: '💍 Weddings' },
      BACK,
    ],
  },
  'events:party': { text: 'We can do custom party orders. Message us on WhatsApp at +1 (234) 567-890 with your date and guest count.', chips: [{ id: 'menu:events', label: '⬅️ Back' }, BACK] },
  'events:corp': { text: 'Office treats and catering are available. Message us on WhatsApp with your date, headcount and location.', chips: [{ id: 'menu:events', label: '⬅️ Back' }, BACK] },
  'events:wedding': { text: 'Dessert tables and gelato carts for weddings — message us on WhatsApp with your date and guest count for a custom quote.', chips: [{ id: 'menu:events', label: '⬅️ Back' }, BACK] },
  'menu:order': {
    text: 'How would you like to order?',
    chips: [{ id: 'order:start', label: '🛍 Build my order' }, { id: 'order:delivery', label: '🚚 Delivery / pickup' }, BACK],
  },
  'order:delivery': {
    text: 'You can pre-order via WhatsApp at +1 (234) 567-890 — or just walk in, the waffle smell will guide you.',
    chips: [{ id: 'order:start', label: '🛍 Build my order' }, BACK],
  },
};

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

const INITIAL: Msg[] = [
  { from: 'bot', text: 'Hey! I\'m Scoopy — your gelato concierge. Tap an option below or type a question.' },
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);
  const [chips, setChips] = useState<Chip[]>(MAIN_MENU);
  const [order, setOrder] = useState<Order>({});
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const push = (userText: string, bot: Msg, next: Chip[]) => {
    setMsgs((m) => [...m, { from: 'user', text: userText }, bot]);
    setChips(next);
  };

  const pick = (c: Chip) => {
    const [kind, ...rest] = c.id.split(':');
    const val = rest.join(':');

    if (c.id === 'order:start') {
      setOrder({});
      return push(c.label, { from: 'bot', text: 'Great! What would you like it served in?' }, [
        { id: 'otype:Cup', label: '🥣 Cup' },
        { id: 'otype:Waffle cone', label: '🧇 Waffle cone' },
        { id: 'otype:Sundae', label: '🍧 Sundae' },
        BACK,
      ]);
    }
    if (kind === 'otype') {
      setOrder({ type: val });
      return push(c.label, { from: 'bot', text: 'Which flavor?' }, [
        ...FLAVORS.map((f) => ({ id: `oflavor:${f.name}`, label: f.name })),
        { id: 'oflavor:Surprise me', label: '🎲 Surprise me' },
      ]);
    }
    if (kind === 'oflavor') {
      setOrder((o) => ({ ...o, flavor: val }));
      return push(c.label, { from: 'bot', text: 'How many scoops?' }, ['1', '2', '3'].map((n) => ({ id: `oscoops:${n}`, label: `${n} scoop${n === '1' ? '' : 's'}` })));
    }
    if (kind === 'oscoops') {
      setOrder((o) => ({ ...o, scoops: val }));
      return push(c.label, { from: 'bot', text: 'Any toppings?' }, TOPPINGS.map((t) => ({ id: `otop:${t}`, label: t })));
    }
    if (kind === 'otop') {
      const o = { ...order, topping: val };
      setOrder(o);
      const summary = `${o.scoops} scoop${o.scoops === '1' ? '' : 's'} of ${o.flavor} in a ${o.type?.toLowerCase()}, ${val === 'No toppings' ? 'no toppings' : 'topped with ' + val.toLowerCase()}`;
      const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi Velvet Scoop! I\'d like to order: ' + summary + '.')}`;
      return push(
        c.label,
        { from: 'bot', text: `Your order: ${summary}.\nSend it to us on WhatsApp to confirm:`, link: { label: 'Send order on WhatsApp ↗', href } },
        [{ id: 'order:start', label: '🔁 Start over' }, BACK],
      );
    }
    if (kind === 'flavor') {
      const f = FLAVORS.find((x) => x.name === val);
      if (f)
        return push(
          c.label,
          { from: 'bot', text: `${f.name} — ${f.price}/scoop. Allergens: ${f.allergens}.` },
          [{ id: 'order:start', label: '🛍 Build my order' }, { id: 'menu:flavors', label: '🍨 More flavors' }, BACK],
        );
    }
    const node = NODES[c.id];
    if (node) push(c.label, { from: 'bot', text: node.text }, node.chips);
  };

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: answer(q) }]);
    setChips(MAIN_MENU);
    setInput('');
  };

  const clearChat = () => {
    setMsgs(INITIAL);
    setChips(MAIN_MENU);
    setOrder({});
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
            className="glass rounded-3xl w-[340px] max-w-[88vw] overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'var(--cocoa)' }}>
              <div className="w-2.5 h-2.5 rounded-full animate-glow" style={{ background: 'var(--accent)' }} />
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-none">Scoopy</p>
                <p className="text-white/60 text-[11px]">Gelato concierge · online</p>
              </div>
              <button
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear chat"
                className="text-white/70 hover:text-white text-[11px] font-semibold px-2 py-1 rounded-full border border-white/25"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                title="Close"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white text-lg leading-none flex items-center justify-center"
              >
                ✕
              </button>
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
                    {m.link && (
                      <a
                        href={m.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block rounded-full px-3 py-1.5 text-center text-xs font-bold text-white"
                        style={{ background: 'var(--berry)' }}
                      >
                        {m.link.label}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pt-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border-t border-black/5">
              {chips.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pick(c)}
                  className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold"
                  style={{ color: 'var(--cocoa)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="p-3 flex gap-2">
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
