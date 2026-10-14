type Body = {
  /** Cancel a specific job; defaults to this provider's active job. */
  jobId?: number
}

/** Cancel a queued or running model test job. Already-tested models keep their results. */
export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Provider id is required' })
  }

  const body = (await readBody<Body>(event).catch(() => null)) || {}
  if (typeof body.jobId === 'number') {
    return cancelProviderModelTestJob(body.jobId)
  }
  return cancelProviderModelTest(id)
})
