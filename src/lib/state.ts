// Shared mutable scroll progress (0 → 1 across the whole page),
// updated by GSAP ScrollTrigger, consumed inside the R3F frame loop.
export const scrollState = {
  progress: 0,
  velocity: 0,
};

export type FlavorId = 'strawberry' | 'pistachio' | 'cacao' | 'mango';

export interface Flavor {
  id: FlavorId;
  name: string;
  tag: string;
  accent: string;
  light: string;
  rim: string;
  desc: string;
  price: string;
}

export const FLAVORS: Flavor[] = [
  {
    id: 'strawberry',
    name: 'Wild Strawberry',
    tag: 'Electric Berry',
    accent: '#FF6B8B',
    light: '#ffd9e0',
    rim: '#FF3366',
    desc: 'Sun-ripened berries folded into velvet cream with a balsamic kiss.',
    price: '$4.00 / scoop',
  },
  {
    id: 'pistachio',
    name: 'Sicilian Pistachio',
    tag: 'Mint Sundae',
    accent: '#A8E6CF',
    light: '#e2f7ec',
    rim: '#5fbf94',
    desc: 'Slow-roasted Bronte pistachios, stone-ground into liquid gold.',
    price: '$4.50 / scoop',
  },
  {
    id: 'cacao',
    name: 'Dark Cacao Fudge',
    tag: 'Deep Chocolate',
    accent: '#8a5a33',
    light: '#f3e2cf',
    rim: '#5C3A21',
    desc: '72% single-origin Ecuadorian cacao with molten fudge ribbons.',
    price: '$4.50 / scoop',
  },
  {
    id: 'mango',
    name: 'Mango Passionfruit',
    tag: 'Sunshine Sorbet',
    accent: '#FFB347',
    light: '#ffe9c7',
    rim: '#ff8c42',
    desc: 'Alphonso mango and passionfruit — 100% dairy-free sunshine.',
    price: '$4.00 / scoop',
  },
];

// Mutable theme consumed by the 3D scene each frame
export const themeState = {
  accent: FLAVORS[0].accent,
  light: FLAVORS[0].light,
  rim: FLAVORS[0].rim,
};
