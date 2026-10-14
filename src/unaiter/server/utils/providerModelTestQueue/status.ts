import {
  getProviderModelTestQueueSnapshot,
  latestJobForProvider,
  statusFromJob,
  type ProviderModelTestStatus,
} from './state'

export function getProviderModelTestStatus(providerId: string): ProviderModelTestStatus {
  return statusFromJob(providerId, latestJobForProvider(providerId))
}

export { getProviderModelTestQueueSnapshot }
