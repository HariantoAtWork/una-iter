export async function validateOpenAiCompatibleKey(
  baseUrl: string,
  apiKey: string,
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12_000),
    })
    return response.ok
  }
  catch {
    return false
  }
}
