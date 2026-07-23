const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

export type CreateSessionResult = {
  sessionToken: string;
  userId: string;
  role: string;
  expiresIn: number;
};

export async function createSession(apiUrl: string, hostToken: string): Promise<CreateSessionResult> {
  const base = apiUrl || API_BASE;
  const res = await fetch(`${base}/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hostToken}`,
    },
    body: JSON.stringify({ token: hostToken }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CreateSessionResult;
}
