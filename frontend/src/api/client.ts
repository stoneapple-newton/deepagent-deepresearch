const DEFAULT_BASE_URL = '/api';
const BACKEND_URL_KEY = 'deepagent_backend_url';

function getBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE_URL;
  return localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BASE_URL;
}

export interface ApiError {
  status: number;
  message: string;
}

async function requestWithRetry<T>(method: string, path: string, body?: unknown, attempt = 1): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new Error('Network error — unable to reach the server. Is it running?');
  }

  if (!response.ok) {
    const status = response.status;
    const text = await response.text().catch(() => 'Unknown error');

    // Retry 5xx once after 1s
    if (status >= 500 && status < 600 && attempt === 1) {
      await new Promise((r) => setTimeout(r, 1000));
      return requestWithRetry<T>(method, path, body, attempt + 1);
    }

    let message: string;
    if (status === 400) message = `Bad request: ${text}`;
    else if (status === 401) message = 'Unauthorized — please check your API credentials.';
    else if (status === 403) message = 'Forbidden — you do not have permission.';
    else if (status === 404) message = 'Not found — the requested resource does not exist.';
    else if (status === 409) message = `Conflict: ${text}`;
    else if (status === 422) message = `Validation error: ${text}`;
    else if (status === 429) message = 'Too many requests — please slow down.';
    else if (status >= 500) message = `Server error (${status}): ${text}`;
    else message = `HTTP ${status} error: ${text}`;

    const error: ApiError = { status, message };
    console.error(`API ${method} ${path} failed:`, error);
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();
  return data as T;
}

export const api = {
  get: <T>(path: string) => requestWithRetry<T>('GET', path),
  post: <T>(path: string, body?: unknown) => requestWithRetry<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => requestWithRetry<T>('PUT', path, body),
  delete: <T>(path: string) => requestWithRetry<T>('DELETE', path),
};

export interface SessionSSEHandlers {
  onPhase?: (phase: string) => void;
  onLog?: (log: { agent: string; phase: string; message: string; timestamp?: string }) => void;
  onProgress?: (progress: number) => void;
  onBudget?: (payload: {
    kind: 'llm' | 'search' | 'subagent';
    llm_calls_used: number;
    max_llm_calls: number;
    search_calls_used: number;
    max_search_calls: number;
    subagent_calls_used: number;
    max_subagent_calls: number;
  }) => void;
  onSteering?: (payload: { instruction: unknown }) => void;
  onCompleted?: (payload: { report?: string; report_summary?: string; source_count?: number; word_count?: number; duration?: number }) => void;
  onError?: (message: string) => void;
}

export function subscribeToSession(sessionId: string, handlers: SessionSSEHandlers): () => void {
  const base = getBaseUrl();
  const url = `${base}/sessions/${sessionId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('phase', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onPhase?.(data.phase ?? data);
    } catch (err) {
      handlers.onPhase?.(event.data);
    }
  });

  eventSource.addEventListener('log', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onLog?.(data);
    } catch (err) {
      handlers.onLog?.({ agent: 'system', phase: 'unknown', message: event.data });
    }
  });

  eventSource.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data);
      const value = typeof data.progress === 'number' ? data.progress : Number(data);
      handlers.onProgress?.(value);
    } catch (err) {
      handlers.onProgress?.(Number(event.data) || 0);
    }
  });

  eventSource.addEventListener('completed', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onCompleted?.(data);
    } catch (err) {
      handlers.onCompleted?.({});
    }
  });

  eventSource.addEventListener('budget', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onBudget?.(data);
    } catch (err) {
      // Ignore malformed budget events.
    }
  });

  eventSource.addEventListener('steering', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onSteering?.(data);
    } catch (err) {
      // Ignore malformed steering events.
    }
  });

  eventSource.addEventListener('error', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data || '{}');
      handlers.onError?.(data.message ?? data.detail ?? 'Session stream error');
    } catch (err) {
      handlers.onError?.('Session stream error');
    }
  });

  eventSource.onerror = () => {
    if (eventSource.readyState !== EventSource.CLOSED) {
      handlers.onError?.('Session stream connection error');
    }
  };

  return () => {
    eventSource.close();
  };
}
