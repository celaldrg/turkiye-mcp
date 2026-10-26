const USER_AGENT = "turkiye-mcp (+https://github.com/celaldrg/turkiye-mcp)";

export class HttpError extends Error {
  constructor(public status: number, public url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

/** Fetch with a timeout and a descriptive User-Agent. Returns the raw Response. */
export async function httpGet(url: string, timeoutMs = 15000, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await httpGetOnce(url, timeoutMs);
    } catch (err) {
      const retryable = !(err instanceof HttpError) || err.status >= 500 || err.status === 429;
      if (!retryable || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

async function httpGetOnce(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new HttpError(res.status, url);
    return res;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if ((err as Error).name === "AbortError") throw new Error(`Request timed out after ${timeoutMs} ms: ${url}`);
    throw new Error(`Request failed for ${url}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(url: string, timeoutMs?: number): Promise<T> {
  const res = await httpGet(url, timeoutMs);
  return (await res.json()) as T;
}

/** Fetch text, decoding with the given encoding (e.g. windows-1254 for legacy Turkish pages). */
export async function getText(url: string, encoding = "utf-8", timeoutMs?: number): Promise<string> {
  const res = await httpGet(url, timeoutMs);
  const buf = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(buf);
}
