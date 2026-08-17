const CSS_NAMED_COLORS = {
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff',
  aquamarine: '#7fffd4', azure: '#f0ffff', beige: '#f5f5dc',
  bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd',
  blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a',
  burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00',
  chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc', crimson: '#dc143c', cyan: '#00ffff',
  darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9', darkgreen: '#006400', darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f',
  darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000',
  darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1',
  darkviolet: '#9400d3', deeppink: '#ff1493', deepskyblue: '#00bfff',
  dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff',
  firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22',
  fuchsia: '#ff00ff', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff',
  gold: '#ffd700', goldenrod: '#daa520', gray: '#808080', green: '#008000',
  greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0',
  hotpink: '#ff69b4', indianred: '#cd5c5c', indigo: '#4b0082',
  ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa',
  lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd',
  lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3', lightgreen: '#90ee90',
  lightgrey: '#d3d3d3', lightpink: '#ffb6c1', lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899',
  lightslategrey: '#778899', lightsteelblue: '#b0c4de', lightyellow: '#ffffe0',
  lime: '#00ff00', limegreen: '#32cd32', linen: '#faf0e6', magenta: '#ff00ff',
  maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd',
  mediumorchid: '#ba55d3', mediumpurple: '#9370db', mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc', mediumvioletred: '#c71585',
  midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5', navajowhite: '#ffdead', navy: '#000080',
  oldlace: '#fdf5e6', olive: '#808000', olivedrab: '#6b8e23',
  orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6',
  palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee',
  palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9',
  peru: '#cd853f', pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6',
  purple: '#800080', rebeccapurple: '#663399', red: '#ff0000',
  rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513',
  salmon: '#fa8072', sandybrown: '#f4a460', seagreen: '#2e8b57',
  seashell: '#fff5ee', sienna: '#a0522d', silver: '#c0c0c0',
  skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090',
  slategrey: '#708090', snow: '#fffafa', springgreen: '#00ff7f',
  steelblue: '#4682b4', tan: '#d2b48c', teal: '#008080', thistle: '#d8bfd8',
  tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3',
  white: '#ffffff', whitesmoke: '#f5f5f5', yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

// Multi-word phrases → CSS color name
const COLOR_PHRASES = {
  'baby blue': 'lightblue',
  'ocean blue': 'steelblue',
  'electric blue': 'dodgerblue',
  'cobalt blue': 'royalblue',
  'navy blue': 'navy',
  'powder blue': 'powderblue',
  'ice blue': 'aliceblue',
  'robin egg': 'lightblue',
  'carolina blue': 'cornflowerblue',
  'forest green': 'forestgreen',
  'grass green': 'limegreen',
  'olive green': 'olivedrab',
  'hunter green': 'darkgreen',
  'sage green': 'darkseagreen',
  'neon green': 'limegreen',
  'lime green': 'limegreen',
  'sea green': 'seagreen',
  'mint green': 'mediumaquamarine',
  'hot pink': 'hotpink',
  'baby pink': 'lightpink',
  'rose gold': 'rosybrown',
  'hot red': 'crimson',
  'blood red': 'darkred',
  'wine red': 'darkred',
  'brick red': 'firebrick',
  'burnt orange': 'darkorange',
  'sky blue': 'skyblue',
  'deep blue': 'darkblue',
  'royal blue': 'royalblue',
  'royal purple': 'rebeccapurple',
  'light purple': 'mediumpurple',
  'dark purple': 'indigo',
  'deep purple': 'indigo',
  'midnight blue': 'midnightblue',
  'golden yellow': 'gold',
  'sandy brown': 'sandybrown',
  'dark brown': 'saddlebrown',
  'light brown': 'peru',
  'rose pink': 'palevioletred',
};

// Single keywords → CSS color name
const SINGLE_WORD_ALIASES = {
  ocean: 'steelblue',
  sky: 'skyblue',
  grass: 'limegreen',
  forest: 'forestgreen',
  sea: 'seagreen',
  rose: 'palevioletred',
  blush: 'pink',
  midnight: 'midnightblue',
  lilac: 'plum',
  peach: 'peachpuff',
  cream: 'cornsilk',
  coffee: 'saddlebrown',
  wine: 'darkred',
  blood: 'darkred',
  rust: 'sienna',
  mustard: 'goldenrod',
  mint: 'mediumaquamarine',
  slate: 'slategray',
  charcoal: 'darkslategray',
  obsidian: 'darkslategray',
  sapphire: 'royalblue',
  emerald: 'seagreen',
  amber: 'goldenrod',
  topaz: 'gold',
  ruby: 'crimson',
  bronze: 'peru',
  copper: 'chocolate',
  jade: 'seagreen',
  onyx: 'black',
  scarlet: 'crimson',
  vermillion: 'orangered',
  cerulean: 'cornflowerblue',
  periwinkle: 'cornflowerblue',
  mauve: 'palevioletred',
  maroon: 'maroon',
  burgundy: 'darkred',
  champagne: 'wheat',
  taupe: 'rosybrown',
  ecru: 'cornsilk',
  cobalt: 'royalblue',
  teal: 'teal',
  aqua: 'aqua',
  fuchsia: 'fuchsia',
  magenta: 'magenta',
  electric: 'dodgerblue',
  neon: 'limegreen',
  golden: 'gold',
  sandy: 'sandybrown',
};

const DEFAULT_HEX = '#6366f1';

function normalize(str) {
  return str.toLowerCase().replace(/[\s\-_]+/g, '');
}

function expandShortHex(hex) {
  return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findClosest(normalized) {
  const threshold = Math.min(3, Math.floor(normalized.length / 4));
  let best = null, bestDist = Infinity;
  for (const name of Object.keys(CSS_NAMED_COLORS)) {
    const dist = levenshtein(normalized, name);
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

function resolveColor(input) {
  if (!input || typeof input !== 'string') return DEFAULT_HEX;

  const raw = input.trim().toLowerCase();
  if (!raw) return DEFAULT_HEX;

  // 1. Direct hex
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) return expandShortHex(raw);

  // 2. Exact CSS named color (spaces/hyphens stripped)
  const normalized = normalize(raw);
  if (CSS_NAMED_COLORS[normalized]) return CSS_NAMED_COLORS[normalized];

  // 3. Multi-word phrase alias
  if (COLOR_PHRASES[raw]) return CSS_NAMED_COLORS[COLOR_PHRASES[raw]] ?? DEFAULT_HEX;

  // 4. Single-word alias on each token
  const words = raw.split(/\s+/);
  for (const word of words) {
    const alias = SINGLE_WORD_ALIASES[word];
    if (alias) return CSS_NAMED_COLORS[alias] ?? DEFAULT_HEX;
  }

  // 5. Each token as a CSS color name
  for (const word of words) {
    if (word.length >= 3) {
      const normWord = normalize(word);
      if (CSS_NAMED_COLORS[normWord]) return CSS_NAMED_COLORS[normWord];
    }
  }

  // 6. Fuzzy match on full normalized string
  const fuzzy = findClosest(normalized);
  if (fuzzy) return CSS_NAMED_COLORS[fuzzy];

  // 7. Fuzzy match on each token individually
  for (const word of words) {
    if (word.length >= 4) {
      const fuzzyWord = findClosest(normalize(word));
      if (fuzzyWord) return CSS_NAMED_COLORS[fuzzyWord];
    }
  }

  return DEFAULT_HEX;
}

module.exports = { resolveColor };
