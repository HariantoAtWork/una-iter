export function apiErrorMessage(err: unknown) {
  return (err as { data?: { statusMessage?: string }, statusMessage?: string })
    ?.data
    ?.statusMessage
    || (err as { statusMessage?: string })?.statusMessage
    || 'Something went wrong'
}
