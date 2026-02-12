// Map of subject names to meaningful colors (HSL-based tailwind classes)
const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  'Matemáticas': { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  'Matemáticas Aplicadas': { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  'Matemáticas Académicas': { bg: 'bg-blue-600/20', text: 'text-blue-800 dark:text-blue-200' },
  'Cálculo': { bg: 'bg-blue-400/20', text: 'text-blue-700 dark:text-blue-300' },
  'Álgebra Lineal': { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  'Estadística': { bg: 'bg-blue-300/20', text: 'text-blue-700 dark:text-blue-300' },
  'Lengua': { bg: 'bg-red-500/20', text: 'text-red-700 dark:text-red-300' },
  'Inglés': { bg: 'bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300' },
  'Francés': { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
  'Alemán': { bg: 'bg-yellow-600/20', text: 'text-yellow-700 dark:text-yellow-300' },
  'Italiano': { bg: 'bg-green-600/20', text: 'text-green-700 dark:text-green-300' },
  'Portugués': { bg: 'bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300' },
  'Chino': { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300' },
  'Ciencias Naturales': { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-300' },
  'Biología': { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-300' },
  'Física': { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
  'Química': { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  'Ciencias Sociales': { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
  'Historia': { bg: 'bg-amber-600/20', text: 'text-amber-700 dark:text-amber-300' },
  'Geografía': { bg: 'bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300' },
  'Educación Física': { bg: 'bg-lime-500/20', text: 'text-lime-700 dark:text-lime-300' },
  'Música': { bg: 'bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300' },
  'Arte': { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  'Dibujo': { bg: 'bg-fuchsia-400/20', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  'Tecnología': { bg: 'bg-slate-500/20', text: 'text-slate-700 dark:text-slate-300' },
  'Informática': { bg: 'bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300' },
  'Programación': { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
  'Filosofía': { bg: 'bg-stone-500/20', text: 'text-stone-700 dark:text-stone-300' },
  'Ética': { bg: 'bg-stone-400/20', text: 'text-stone-700 dark:text-stone-300' },
  'Religión': { bg: 'bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-300' },
  'Economía': { bg: 'bg-emerald-600/20', text: 'text-emerald-700 dark:text-emerald-300' },
  'Latín': { bg: 'bg-amber-400/20', text: 'text-amber-700 dark:text-amber-300' },
  'Griego': { bg: 'bg-cyan-600/20', text: 'text-cyan-700 dark:text-cyan-300' },
  'Derecho': { bg: 'bg-gray-600/20', text: 'text-gray-700 dark:text-gray-300' },
  'Medicina': { bg: 'bg-red-600/20', text: 'text-red-700 dark:text-red-300' },
  'Ingeniería': { bg: 'bg-zinc-500/20', text: 'text-zinc-700 dark:text-zinc-300' },
  'Arquitectura': { bg: 'bg-orange-600/20', text: 'text-orange-700 dark:text-orange-300' },
  'Psicología': { bg: 'bg-violet-400/20', text: 'text-violet-700 dark:text-violet-300' },
};

// Generate a deterministic color for subjects not in the map
function hashColor(str: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-red-500/20', text: 'text-red-700 dark:text-red-300' },
    { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
    { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-300' },
    { bg: 'bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
    { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300' },
    { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300' },
    { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export function getSubjectColor(subject: string): { bg: string; text: string } {
  return SUBJECT_COLOR_MAP[subject] || hashColor(subject);
}
