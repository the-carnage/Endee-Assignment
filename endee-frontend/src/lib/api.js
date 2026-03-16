export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
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
