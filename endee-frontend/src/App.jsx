import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import {
  clearKnowledgeBase,
  fetchHealthStatus,
  ingestFileSource,
  ingestTextSource,
  submitTextQuery,
  submitVoiceQuery,
} from './lib/api';

const TRANSCRIPT_STORAGE_KEY = 'endee_show_voice_transcript';

const SOURCE_TABS = [
  {
    id: 'pdf',
    label: 'PDF',
    title: 'Upload a PDF',
    description: 'Ideal for reports, specs, whitepapers, or long-form documents.',
    accept: '.pdf',
  },
  {
    id: 'text',
    label: 'Text',
    title: 'Paste working notes',
    description: 'Drop in copied text, research snippets, or raw meeting notes.',
    accept: '',
  },
  {
    id: 'image',
    label: 'Image',
    title: 'Upload an image',
    description: 'Best for screenshots, scanned pages, posters, or diagrams.',
    accept: 'image/*',
  },
];

const QUICK_PROMPTS = [
  'Give me the executive summary.',
  'List the most important entities, dates, and numbers.',
  'What actions, decisions, or next steps are mentioned?',
];

const EMPTY_DOCUMENT = {
  loaded: false,
  name: '',
  meta: '',
  sourceType: '',
  summary: '',
  chunks: 0,
  indexedAt: '',
};

const DEFAULT_HEALTH = {
  checking: true,
  backend: { status: 'checking', message: 'Checking API availability.' },
  endee: { status: 'checking', message: 'Checking Endee readiness.' },
  ai: { status: 'checking', message: 'Checking Gemini configuration.' },
};

function readStoredBoolean(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

function formatMessageTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatIndexedAt(date = new Date()) {
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function createMessage(role, text, kind = 'default') {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return {
    id,
    role,
    text,
    kind,
    time: formatMessageTime(),
  };
}

function buildHistory(messages) {
  return messages.slice(-6).map(({ role, text }) => ({ role, text }));
}

function createDocumentState({
  name,
  sourceType,
  chunks,
  summary,
  meta,
}) {
  return {
    loaded: true,
    name,
    sourceType,
    chunks,
    summary,
    meta,
    indexedAt: formatIndexedAt(),
  };
}

function statusLabel(status, hasDocument) {
  switch (status) {
    case 'indexing':
      return 'Indexing your source';
    case 'recording':
      return 'Recording your question';
    case 'processing':
      return 'Searching and drafting an answer';
    case 'ready':
      return 'Ready for the next question';
    default:
      return hasDocument ? 'Ready for the next question' : 'Load a source to begin';
  }
}

function healthSummary(health) {
  if (health.checking) {
    return 'Checking backend, vector store, and model configuration.';
  }

  if (health.backend.status === 'error') {
    return 'Backend offline. Start the FastAPI service before using the app.';
  }

  if (health.endee.status === 'error') {
    return 'Endee is unreachable. Start the local Endee server on port 8080.';
  }

  if (health.ai.status === 'warning') {
    return 'Backend is live, but Gemini is not configured yet.';
  }

  return 'Everything is ready. Upload a source and start asking questions.';
}

function sourceMetaLabel(sourceType) {
  if (sourceType === 'Text') {
    return 'Pasted notes';
  }

  return sourceType;
}

function App() {
  const [showTranscript, setShowTranscript] = useState(() =>
    readStoredBoolean(TRANSCRIPT_STORAGE_KEY, true),
  );
  const [health, setHealth] = useState(DEFAULT_HEALTH);
  const [documentState, setDocumentState] = useState(EMPTY_DOCUMENT);
  const [messages, setMessages] = useState([]);
  const [sourceTab, setSourceTab] = useState('pdf');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSourceSetupOpen, setIsSourceSetupOpen] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [notice, setNotice] = useState(null);

  const fileInputRef = useRef(null);
  const conversationEndRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const messagesRef = useRef(messages);

  const {
    error: recorderError,
    isRecording,
    lastRecording,
    recordingTime,
    clearRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const currentStatus = isRecording ? 'recording' : phase;
  const disableQueries = phase === 'indexing' || phase === 'processing';
  const activeTab = SOURCE_TABS.find((tab) => tab.id === sourceTab) ?? SOURCE_TABS[0];
  const showSourceSetup = !documentState.loaded || isSourceSetupOpen;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(
      TRANSCRIPT_STORAGE_KEY,
      JSON.stringify(showTranscript),
    );
  }, [showTranscript]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const showNotice = useCallback((tone, message) => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    setNotice({ tone, message });
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice(null);
    }, 4200);
  }, []);

  const addMessage = useCallback((role, text, kind = 'default') => {
    startTransition(() => {
      setMessages((previous) => [...previous, createMessage(role, text, kind)]);
    });
  }, []);

  const replaceConversation = useCallback((nextMessages) => {
    startTransition(() => {
      setMessages(nextMessages);
    });
  }, []);

  const refreshHealth = useCallback(
    async ({ silent = false } = {}) => {
      setHealth((previous) => ({ ...previous, checking: true }));

      try {
        const payload = await fetchHealthStatus();
        setHealth({
          checking: false,
          backend: payload.backend,
          endee: payload.endee,
          ai: payload.ai,
        });

        if (!silent && payload.endee.status === 'error') {
          showNotice('error', payload.endee.message);
        }
      } catch (error) {
        setHealth({
          checking: false,
          backend: { status: 'error', message: 'FastAPI is not reachable.' },
          endee: { status: 'error', message: 'Endee status unavailable until the API is back.' },
          ai: { status: 'warning', message: 'Model status unavailable until the API is back.' },
        });

        if (!silent) {
          showNotice('error', error.message);
        }
      }
    },
    [showNotice],
  );

  useEffect(() => {
    void refreshHealth({ silent: true });
  }, [refreshHealth]);

  useEffect(() => {
    if (recorderError) {
      showNotice('error', recorderError);
    }
  }, [recorderError, showNotice]);

  const resetLocalWorkspace = useCallback(() => {
    setDocumentState(EMPTY_DOCUMENT);
    setMessages([]);
    setTextTitle('');
    setTextContent('');
    setQueryInput('');
    setIsSourceSetupOpen(false);
    setPhase('idle');
    clearRecording();
  }, [clearRecording]);

  const beginNewDocumentSession = useCallback(
    ({ name, sourceType, chunks, summary, meta }) => {
      setDocumentState(
        createDocumentState({
          name,
          sourceType,
          chunks,
          summary,
          meta,
        }),
      );
      setPhase('ready');
      setIsSourceSetupOpen(false);

      if (summary) {
        replaceConversation([
          createMessage(
            'assistant',
            summary,
            'summary',
          ),
        ]);
      } else {
        replaceConversation([]);
      }
    },
    [replaceConversation],
  );

  const handleFileUpload = useCallback(
    async (file, tabId = sourceTab) => {
      if (!file) {
        return;
      }

      const lowerName = file.name.toLowerCase();
      if (tabId === 'pdf' && !lowerName.endsWith('.pdf')) {
        showNotice('error', 'Choose a PDF file for the PDF workflow.');
        return;
      }

      if (tabId === 'image' && !file.type.startsWith('image/')) {
        showNotice('error', 'Choose an image file for the image workflow.');
        return;
      }

      setPhase('indexing');

      try {
        const payload = await ingestFileSource(file);
        const chunkCount = payload.chunks_indexed ?? 0;
        const sourceType = tabId === 'pdf' ? 'PDF' : 'Image';

        beginNewDocumentSession({
          name: file.name,
          sourceType,
          chunks: chunkCount,
          summary: payload.summary || '',
          meta: `${chunkCount} chunk${chunkCount === 1 ? '' : 's'} indexed · ${sourceType}`,
        });
        showNotice('success', `${file.name} is ready for questions.`);
        void refreshHealth({ silent: true });
      } catch (error) {
        setPhase(documentState.loaded ? 'ready' : 'idle');
        showNotice('error', error.message);
      }
    },
    [beginNewDocumentSession, documentState.loaded, refreshHealth, showNotice, sourceTab],
  );

  const handleTextIngest = useCallback(async () => {
    const content = textContent.trim();
    const title = textTitle.trim() || 'Pasted notes';

    if (!content) {
      showNotice('error', 'Paste some text before indexing it.');
      return;
    }

    if (content.length < 30) {
      showNotice('error', 'Add a bit more context so retrieval has enough material to work with.');
      return;
    }

    setPhase('indexing');

    try {
      const payload = await ingestTextSource(content);
      const chunkCount = payload.chunks_indexed ?? 0;

      beginNewDocumentSession({
        name: title,
        sourceType: 'Text',
        chunks: chunkCount,
        summary: payload.summary || '',
        meta: `${content.length.toLocaleString()} characters · ${chunkCount} chunk${chunkCount === 1 ? '' : 's'} indexed`,
      });
      showNotice('success', `${title} is ready for questions.`);
      void refreshHealth({ silent: true });
    } catch (error) {
      setPhase(documentState.loaded ? 'ready' : 'idle');
      showNotice('error', error.message);
    }
  }, [
    beginNewDocumentSession,
    documentState.loaded,
    refreshHealth,
    showNotice,
    textContent,
    textTitle,
  ]);

  const handleQuerySubmit = useCallback(
    async (question) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion || !documentState.loaded || disableQueries) {
        return;
      }

      const history = buildHistory(messagesRef.current);
      addMessage('user', trimmedQuestion);
      setQueryInput('');
      setPhase('processing');

      try {
        const payload = await submitTextQuery(trimmedQuestion, history);
        addMessage(
          'assistant',
          payload.response || "I couldn't generate a response for that question.",
        );
      } catch (error) {
        addMessage(
          'assistant',
          `I hit a backend issue while answering that. ${error.message}`,
          'error',
        );
        showNotice('error', error.message);
      } finally {
        setPhase('ready');
      }
    },
    [addMessage, disableQueries, documentState.loaded, showNotice],
  );

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      'Clear the indexed document and conversation so you can start over?',
    );
    if (!confirmed) {
      return;
    }

    try {
      await clearKnowledgeBase();
      showNotice('success', 'Knowledge base cleared. Ready for a fresh source.');
    } catch (error) {
      showNotice(
        'warning',
        `${error.message} The local workspace was cleared, but the backend may still hold the previous vectors.`,
      );
    } finally {
      resetLocalWorkspace();
      void refreshHealth({ silent: true });
    }
  }, [refreshHealth, resetLocalWorkspace, showNotice]);

  useEffect(() => {
    if (!lastRecording || isRecording) {
      return;
    }

    const runVoiceQuery = async () => {
      if (!documentState.loaded) {
        clearRecording();
        return;
      }

      setPhase('processing');

      try {
        const payload = await submitVoiceQuery(lastRecording, buildHistory(messagesRef.current));

        if (showTranscript && payload.transcript) {
          addMessage('user', payload.transcript, 'transcript');
        }

        addMessage(
          'assistant',
          payload.response || "I couldn't generate a response for that voice query.",
        );
      } catch (error) {
        addMessage(
          'assistant',
          `Voice search failed. ${error.message}`,
          'error',
        );
        showNotice('error', error.message);
      } finally {
        clearRecording();
        setPhase('ready');
      }
    };

    void runVoiceQuery();
  }, [
    addMessage,
    clearRecording,
    documentState.loaded,
    isRecording,
    lastRecording,
    showNotice,
    showTranscript,
  ]);

  const handleMicClick = useCallback(() => {
    if (!documentState.loaded || disableQueries) {
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  }, [disableQueries, documentState.loaded, isRecording, startRecording, stopRecording]);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const droppedFile = event.dataTransfer.files?.[0];
      if (!droppedFile) {
        return;
      }

      if (droppedFile.type.startsWith('image/')) {
        setSourceTab('image');
        await handleFileUpload(droppedFile, 'image');
        return;
      }

      if (droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setSourceTab('pdf');
        await handleFileUpload(droppedFile, 'pdf');
        return;
      }

      showNotice('error', 'Drop a PDF or image file to index it.');
    },
    [handleFileUpload, showNotice],
  );

  return (
    <div className="app-shell">
      <div className="backdrop backdrop-aurora" />
      <div className="backdrop backdrop-grid" />

      {notice && (
        <div className={`notice-banner ${notice.tone}`}>
          <span className="notice-label">
            {notice.tone === "success" && "Success"}
            {notice.tone === "warning" && "Heads up"}
            {notice.tone === "error" && "Issue"}
          </span>
          <p>{notice.message}</p>
        </div>
      )}

      <div className="app-frame">
        <aside className="sidebar">
          <header className="sidebar-header">
            <div className="brand-lockup">
              <div className="brand-badge">ER</div>
              <div>
                <p className="eyebrow">Voice RAG Workspace</p>
                <h1>Research Copilot</h1>
              </div>
            </div>
          </header>

          <div className="sidebar-scroll">
            <article className="panel summary-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Workspace</span>
                  <h2>
                    {documentState.loaded
                      ? documentState.name
                      : "No source loaded"}
                  </h2>
                </div>
                <label className="toggle-row">
                  <input
                    checked={showTranscript}
                    onChange={(event) =>
                      setShowTranscript(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Show voice transcript</span>
                </label>
              </div>

              {documentState.loaded ? (
                <>
                  <div className="document-metadata">
                    <span>{sourceMetaLabel(documentState.sourceType)}</span>
                    <span>{documentState.meta}</span>
                    <span>Indexed {documentState.indexedAt}</span>
                  </div>

                  <p className="summary-copy">
                    {documentState.summary ||
                      "No summary was returned for this source."}
                  </p>

                  <div className="prompt-stack">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className="prompt-chip"
                        disabled={disableQueries}
                        onClick={() => void handleQuerySubmit(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="panel-description">
                  Upload a document, text, or image from the conversation area
                  to start.
                </p>
              )}
            </article>
          </div>
        </aside>

        <section className="chat-stage">
          <header className="chat-header">
            <div>
              <p className="section-label">Conversation</p>
              <h2>Ask by typing or using voice</h2>
              <p className="chat-health-note">{healthSummary(health)}</p>
            </div>
            <div className="chat-header-controls">
              {documentState.loaded && (
                <button
                  className="ghost-btn"
                  onClick={() => setIsSourceSetupOpen((open) => !open)}
                  type="button"
                >
                  {showSourceSetup ? "Hide source setup" : "Change source"}
                </button>
              )}
              <button
                className="secondary-btn"
                onClick={() => void refreshHealth()}
                type="button"
              >
                Refresh health
              </button>
              <div className={`status-pill ${currentStatus}`}>
                <button className="secondary-btn" onClick={handleReset}>
                  Clear workspace
                </button>
              </div>
            </div>
          </header>

          <div className="conversation-log">
            {showSourceSetup && (
              <article className="conversation-setup">
                <div className="conversation-setup-header">
                  <div>
                    <span className="section-label">Source setup</span>
                    <h3>{activeTab.title}</h3>
                    <p className="panel-description">{activeTab.description}</p>
                  </div>
                  {documentState.loaded && (
                    <div className="indexed-pill">
                      <span>Current source</span>
                      <strong>{documentState.name}</strong>
                    </div>
                  )}
                </div>

                <div
                  className="tab-row"
                  role="tablist"
                  aria-label="Source type"
                >
                  {SOURCE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${sourceTab === tab.id ? "active" : ""}`}
                      onClick={() => setSourceTab(tab.id)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {sourceTab !== "text" ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept={activeTab.accept}
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0];
                        if (nextFile) {
                          void handleFileUpload(nextFile, sourceTab);
                        }
                        event.target.value = "";
                      }}
                    />

                    <button
                      className={`dropzone ${isDragOver ? "drag-over" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(event) => {
                        void handleDrop(event);
                      }}
                      type="button"
                    >
                      <span className="dropzone-icon" aria-hidden="true">
                        {sourceTab === "pdf" ? "PDF" : "IMG"}
                      </span>
                      <strong>
                        {documentState.loaded
                          ? "Replace the current source"
                          : "Drop a file or click to browse"}
                      </strong>
                      <p>
                        New uploads replace the active knowledge base so answers
                        stay focused.
                      </p>
                    </button>
                  </>
                ) : (
                  <div className="text-ingest">
                    <input
                      className="text-title-input"
                      maxLength="80"
                      onChange={(event) => setTextTitle(event.target.value)}
                      placeholder="Optional title for this source"
                      value={textTitle}
                    />
                    <textarea
                      className="text-source-input"
                      onChange={(event) => setTextContent(event.target.value)}
                      placeholder="Paste the content you want to ask questions about."
                      rows="9"
                      value={textContent}
                    />
                    <div className="text-ingest-footer">
                      <span>
                        {textContent.length.toLocaleString()} characters
                      </span>
                      <button
                        className="primary-btn"
                        disabled={phase === "indexing"}
                        onClick={() => void handleTextIngest()}
                        type="button"
                      >
                        Index text
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )}

            {messages.length === 0 ? (
              documentState.loaded && !showSourceSetup ? (
                <div className="conversation-empty">
                  <h3>Ask your first question.</h3>
                </div>
              ) : null
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-bubble ${message.role} ${message.kind}`}
                >
                  <div className="message-role">
                    {message.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="message-body">
                    <p>{message.text}</p>
                    <span>{message.time}</span>
                  </div>
                </article>
              ))
            )}

            {currentStatus === "processing" && (
              <article className="message-bubble assistant thinking">
                <div className="message-role">Assistant</div>
                <div className="message-body">
                  <div className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>Searching the indexed context...</span>
                </div>
              </article>
            )}

            <div ref={conversationEndRef} />
          </div>

          <div className="composer-area">
            <form
              className="query-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleQuerySubmit(queryInput);
              }}
            >
              <textarea
                className="query-input"
                disabled={!documentState.loaded || disableQueries}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={
                  documentState.loaded
                    ? "Ask for a summary, a fact lookup, extracted actions, or a grounded answer."
                    : "Upload a source above to enable querying."
                }
                rows="3"
                value={queryInput}
              />

              <div className="composer-actions">
                <div className="composer-hint">
                  {currentStatus === "recording"
                    ? `Recording now (${formatDuration(recordingTime)})`
                    : statusLabel(currentStatus, documentState.loaded)}
                </div>

                <div className="composer-buttons">
                  <button
                    className="secondary-btn"
                    disabled={
                      !queryInput.trim() ||
                      !documentState.loaded ||
                      disableQueries
                    }
                    type="submit"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M2 21l21-9L2 3v7l15 2-15 2z"
                      />
                    </svg>
                  </button>

                  <button
                    className={`mic-btn ${currentStatus}`}
                    disabled={!documentState.loaded || disableQueries}
                    onClick={handleMicClick}
                    type="button"
                  >
                    <span className="mic-signal" aria-hidden="true" />
                    <span>
                      {isRecording ? "Stop recording" : "Ask with voice"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
