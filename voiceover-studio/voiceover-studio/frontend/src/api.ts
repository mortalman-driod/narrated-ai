export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...init, headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers } }); }
  catch { throw new Error('The local studio is not connected. Start the backend, then try again.'); }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((v: {msg: string}) => v.msg).join('. ') : `The studio could not complete that request (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
