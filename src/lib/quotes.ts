const QUOTES = [
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' },
  { text: 'No dejes para mañana lo que puedes hacer hoy.', author: 'Benjamin Franklin' },
  { text: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn' },
  { text: 'El único modo de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs' },
  { text: 'Cada experto fue alguna vez un principiante.', author: 'Helen Hayes' },
  { text: 'La motivación te pone en marcha, el hábito te mantiene.', author: 'Jim Ryun' },
  { text: 'El conocimiento es poder.', author: 'Francis Bacon' },
  { text: 'Nunca es tarde para ser lo que podrías haber sido.', author: 'George Eliot' },
  { text: 'El secreto de salir adelante es empezar.', author: 'Mark Twain' },
  { text: 'Estudia no para saber más, sino para saber mejor.', author: 'Séneca' },
  { text: 'La educación es el arma más poderosa para cambiar el mundo.', author: 'Nelson Mandela' },
  { text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali' },
  { text: 'El futuro pertenece a quienes creen en la belleza de sus sueños.', author: 'Eleanor Roosevelt' },
  { text: 'Cree que puedes y ya estás a medio camino.', author: 'Theodore Roosevelt' },
  { text: 'La persistencia puede transformar el fracaso en un logro extraordinario.', author: 'Matt Biondi' },
  { text: 'Lo que no te desafía, no te cambia.', author: 'Fred DeVito' },
  { text: 'Un poco de progreso cada día suma grandes resultados.', author: 'Satya Nani' },
  { text: 'Tu única limitación eres tú mismo.', author: 'Anónimo' },
  { text: 'Haz hoy lo que otros no quieren, mañana vivirás como otros no pueden.', author: 'Jerry Rice' },
  { text: 'El aprendizaje nunca agota la mente.', author: 'Leonardo da Vinci' },
];

export function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
