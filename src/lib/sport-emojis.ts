// Map of sport keywords to relevant emojis
const SPORT_KEYWORD_EMOJIS: Record<string, string> = {
  rugby: '🏉',
  béisbol: '⚾',
  baseball: '⚾',
  cricket: '🏏',
  hockey: '🏑',
  bádminton: '🏸',
  badminton: '🏸',
  boxeo: '🥊',
  boxing: '🥊',
  esgrima: '🤺',
  fencing: '🤺',
  esquí: '⛷️',
  ski: '⛷️',
  snowboard: '🏂',
  surf: '🏄',
  ciclismo: '🚴',
  cycling: '🚴',
  atletismo: '🏃',
  running: '🏃',
  correr: '🏃',
  lucha: '🤼',
  wrestling: '🤼',
  judo: '🥋',
  karate: '🥋',
  taekwondo: '🥋',
  artes: '🥋',
  martial: '🥋',
  escalada: '🧗',
  climbing: '🧗',
  remo: '🚣',
  rowing: '🚣',
  kayak: '🛶',
  canoa: '🛶',
  tiro: '🎯',
  archery: '🏹',
  arco: '🏹',
  billar: '🎱',
  pool: '🎱',
  bolos: '🎳',
  bowling: '🎳',
  skateboard: '🛹',
  skate: '🛹',
  patinaje: '⛸️',
  skating: '⛸️',
  polo: '🏇',
  waterpolo: '🤽',
  handball: '🤾',
  balonmano: '🤾',
  lacrosse: '🥍',
  softball: '🥎',
  frisbee: '🥏',
  ultimate: '🥏',
  ajedrez: '♟️',
  chess: '♟️',
  dardos: '🎯',
  darts: '🎯',
  halterofilia: '🏋️',
  gym: '🏋️',
  gimnasia: '🤸',
  gymnastics: '🤸',
  vela: '⛵',
  sailing: '⛵',
  triatlón: '🏊',
  crossfit: '💪',
  fitness: '💪',
  yoga: '🧘',
  pilates: '🧘',
  balón: '⚽',
  pelota: '⚽',
  'fútbol sala': '⚽',
  futsal: '⚽',
};

export function getSportEmoji(sportName: string): string {
  const lower = sportName.toLowerCase().trim();
  
  // Check exact or partial matches
  for (const [keyword, emoji] of Object.entries(SPORT_KEYWORD_EMOJIS)) {
    if (lower.includes(keyword) || keyword.includes(lower)) {
      return emoji;
    }
  }
  
  // Default sport emoji
  return '🏅';
}
