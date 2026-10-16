import { defaultAdapter } from './default'
import { opencodeAdapter } from './opencode'
import { registerAdapter } from './registry'

registerAdapter(defaultAdapter)
registerAdapter(opencodeAdapter)

export { DEFAULT_ADAPTER_ID, defaultAdapter } from './default'
export {
  OPENCODE_ADAPTER_ID,
  matchOpenCodeBaseUrl,
  opencodeAdapter,
} from './opencode'
export {
  getAdapter,
  isKnownAdapterId,
  listAdapters,
  listAdaptersPublic,
  normalizeAdapterId,
  registerAdapter,
  resolveAdapter,
} from './registry'
export { aggregateOpenAiChatStream } from './streamAggregate'
export type {
  AdapterPublic,
  FinalizeChatResponseResult,
  PrepareChatBodyResult,
  ProviderAdapter,
  ResolveAdapterInput,
} from './types'
