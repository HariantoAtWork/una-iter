export type ProviderKeyMethod = 'roundabout'

export type ProviderKeyPublic = {
  id: string
  hint: string
  valid: boolean | null
  createdAt: string
}

export type ProviderModelPublic = {
  id: string
  modelId: string
  enabled: boolean
  source: 'manual' | 'fetched'
  lastTestOk: boolean | null
  testedAt: string | null
  createdAt: string
}

export type ProviderPublic = {
  id: string
  name: string
  slug: string
  baseUrl: string
  keyMethod: ProviderKeyMethod
  keyCount: number
  validKeyCount: number
  modelCount: number
  enabledModelCount: number
  keys: ProviderKeyPublic[]
}

export type ModelStatusFilter = 'all' | 'enabled' | 'disabled'

export const PROVIDER_KEY_METHOD_OPTIONS: Array<{
  label: string
  value: ProviderKeyMethod
  description: string
}> = [
  {
    label: 'Roundabout',
    value: 'roundabout',
    description: 'When a key is exhausted, it moves to the end of the list.',
  },
]

export function providerKeyMethodLabel(method: ProviderKeyMethod | undefined) {
  return PROVIDER_KEY_METHOD_OPTIONS.find(option => option.value === method)?.label
    || 'Roundabout'
}
