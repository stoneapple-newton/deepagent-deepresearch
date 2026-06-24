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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    const error: ApiError = {
      status: response.status,
      message: text || `HTTP ${response.status} error`,
    };
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
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export interface SessionSSEHandlers {
  onPhase?: (phase: string) => void;
  onLog?: (log: { agent: string; phase: string; message: string; timestamp?: string }) => void;
  onProgress?: (progress: number) => void;
  onBudget?: (payload: { llm_calls_used: number; max_llm_calls: number }) => void;
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
