import { startDonorAvailabilityJob } from './donorAvailabilityJob.js';
import { startRequestEscalationJob } from './requestEscalationJob.js';

let started = false;

export function startBackgroundWorkers() {
  if (started) {
    return;
  }

  started = true;
  startRequestEscalationJob();
  startDonorAvailabilityJob();
}
