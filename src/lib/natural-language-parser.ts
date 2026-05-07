// Parse natural language task input like "mañana 18:00 pagar alquiler"
// Returns parsed task data or null if can't parse

interface ParsedTask {
  name: string;
  due_date?: string;
  due_time?: string;
}

const DAYS_ES: Record<string, number> = {
  lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
};

export function parseNaturalLanguage(input: string): ParsedTask | null {
  if (!input.trim()) return null;
  
  let text = input.trim();
  let due_date: string | undefined;
  let due_time: string | undefined;
  
  const today = new Date();
  
  // Match time patterns: 18:00, 5pm, 5:30pm, a las 18:00
  const timePatterns = [
    /(?:a las?\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /(?:a las?\s+)?(\d{1,2})\s*(am|pm)/i,
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2]?.length === 2 && !match[2].match(/[ap]/i) ? parseInt(match[2]) : 0;
      const ampm = match[3] || match[2];
      if (ampm && /pm/i.test(ampm) && hours < 12) hours += 12;
      if (ampm && /am/i.test(ampm) && hours === 12) hours = 0;
      due_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(match[0], ' ').trim();
    }
  }
  
  // Match date patterns
  const datePatterns: [RegExp, (m: RegExpMatchArray) => Date | null][] = [
    [/\bhoy\b/i, () => today],
    [/\bmañana\b/i, () => { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }],
    [/\bpasado\s*mañana\b/i, () => { const d = new Date(today); d.setDate(d.getDate() + 2); return d; }],
    [/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i, (m) => {
      const target = DAYS_ES[m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? DAYS_ES[m[1].toLowerCase()];
      if (target === undefined) return null;
      const d = new Date(today);
      const diff = (target - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d;
    }],
    [/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
      const day = parseInt(m[1]);
      const month = parseInt(m[2]) - 1;
      const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : today.getFullYear();
      return new Date(year, month, day);
    }],
    [/\ben\s+(\d{1,2})\s+(d[ií]as?|horas?)\b/i, (m) => {
      const n = parseInt(m[1]);
      const d = new Date(today);
      if (/hora/i.test(m[2])) {
        d.setHours(d.getHours() + n);
        due_time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else {
        d.setDate(d.getDate() + n);
      }
      return d;
    }],
  ];
  
  for (const [pattern, resolver] of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = resolver(match);
      if (date) {
        due_date = date.toISOString().split('T')[0];
        text = text.replace(match[0], ' ').trim();
        break;
      }
    }
  }
  
  // Clean up remaining text as task name
  const name = text.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  
  return { name, due_date, due_time };
}
