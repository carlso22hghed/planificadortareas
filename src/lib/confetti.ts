import confetti from 'canvas-confetti';

export function triggerConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#6366f1', '#22c55e', '#eab308', '#ec4899', '#3b82f6'],
  });
}
