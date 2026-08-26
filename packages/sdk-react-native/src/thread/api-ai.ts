function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function callSummarise(
  apiUrl: string,
  threadId: string,
  token?: string,
): Promise<string[] | null> {
  try {
    const res = await fetch(`${apiUrl}/threads/${threadId}/ai/summarise`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: { keyPoints?: string[] } };
    const points = data.summary?.keyPoints;
    return Array.isArray(points) && points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

export async function callSuggest(
  apiUrl: string,
  threadId: string,
  token?: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/threads/${threadId}/ai/suggest`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestion?: { suggestion?: string } };
    return data.suggestion?.suggestion ?? null;
  } catch {
    return null;
  }
}
