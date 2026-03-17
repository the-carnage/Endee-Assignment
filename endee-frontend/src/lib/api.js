const ENV_API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const LOCAL_API_PORTS = ['8010', '8000'];
const API_HEALTH_TIMEOUT_MS = 1800;

let resolvedApiUrlPromise;

function localApiCandidates() {
  if (typeof window === 'undefined') {
    return [];
  }

  const host = window.location.hostname || 'localhost';
  return LOCAL_API_PORTS.map((port) => `http://${host}:${port}`);
}

function createTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

async function looksLikeAssignmentBackend(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: createTimeoutSignal(API_HEALTH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      payload.backend &&
      payload.endee &&
      payload.ai,
    );
  } catch {
    return false;
  }
}

async function resolveApiUrl() {
  if (ENV_API_URL) {
    return ENV_API_URL;
  }

  if (!resolvedApiUrlPromise) {
    resolvedApiUrlPromise = (async () => {
      const candidates = localApiCandidates();

      for (const candidate of candidates) {
        if (await looksLikeAssignmentBackend(candidate)) {
          return candidate;
        }
      }

      return candidates[0] || 'http://localhost:8010';
    })();
  }

  return resolvedApiUrlPromise;
}

export const API_URL = ENV_API_URL || 'auto-detect';

async function request(path, options = {}) {
  const baseUrl = await resolveApiUrl();
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';

  let payload;
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      (typeof payload === 'string' ? payload : '') ||
      `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export function fetchHealthStatus() {
  return request('/health');
}

export function ingestFileSource(file) {
  const formData = new FormData();
  formData.append('file', file);

  return request('/ingest/file', {
    method: 'POST',
    body: formData,
  });
}

export function ingestTextSource(text) {
  return request('/ingest/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
}

export function submitTextQuery(text, history) {
  return request('/query/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, history }),
  });
}

export function submitVoiceQuery(recording, history) {
  const formData = new FormData();
  formData.append(
    'audio',
    recording.blob,
    `recording.${recording.extension || 'webm'}`,
  );
  formData.append('history', JSON.stringify(history));

  return request('/query/voice', {
    method: 'POST',
    body: formData,
  });
}

export function clearKnowledgeBase() {
  return request('/clear', {
    method: 'POST',
  });
}
