import { resetBusyDonorsAfterWaitingPeriod } from '../services/reliabilityService.js';
import { refreshPendingRequestsForDonors } from '../services/reactiveMatchingService.js';

export function startDonorAvailabilityJob() {
  const intervalMs = Number(process.env.DONOR_AVAILABILITY_JOB_INTERVAL_MS) || 60 * 60 * 1000;

  const timer = setInterval(async () => {
    try {
      const donorIds = await resetBusyDonorsAfterWaitingPeriod();
      if (donorIds.length) {
        await refreshPendingRequestsForDonors(donorIds);
      }
    } catch (error) {
      console.error('Donor availability reset job failed:', error.message);
    }
  }, intervalMs);

  timer.unref?.();
  return timer;
}
