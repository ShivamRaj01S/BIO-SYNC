import { processPendingEscalations } from '../services/matchingService.js';

export function startRequestEscalationJob() {
  const intervalMs = Number(process.env.REQUEST_ESCALATION_INTERVAL_MS) || 60_000;

  const timer = setInterval(async () => {
    try {
      await processPendingEscalations();
    } catch (error) {
      console.error('Request escalation job failed:', error.message);
    }
  }, intervalMs);

  timer.unref?.();
  return timer;
}
