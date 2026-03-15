import { useRef, useState, useEffect } from "react";

const UploadZone = ({ onUploadComplete }) => {
  const [activeTab, setActiveTab] = useState("pdf");
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgressText, setUploadProgressText] = useState("Processing...");
  const [chunkBadge, setChunkBadge] = useState("");
  const [docInfo, setDocInfo] = useState({ name: "", meta: "" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");

  const fileInputRef = useRef(null);
  const sourceKnobRef = useRef(null);
  const togglePdfRef = useRef(null);
  const toggleTextRef = useRef(null);
  const toggleImageRef = useRef(null);

  useEffect(() => {
    let activeBtn = togglePdfRef.current;
    if (activeTab === "text") activeBtn = toggleTextRef.current;
    if (activeTab === "image") activeBtn = toggleImageRef.current;

    if (activeBtn && sourceKnobRef.current) {
      sourceKnobRef.current.style.width = `${activeBtn.offsetWidth}px`;
      sourceKnobRef.current.style.transform = `translateX(${activeBtn.offsetLeft - 3}px)`;
    }
  }, [activeTab]);

  const simulateProcessing = async (
    chunks,
    fileOrText,
    metaBuilder,
    type,
    displayName,
  ) => {
    setUploadState("progress");
    setChunkBadge(`Indexing...`);
    setUploadProgressText("Processing on Backend...");

    try {
      let response;
      let data;

      if (type === "text") {
        response = await fetch("http://localhost:8000/ingest/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: fileOrText }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", fileOrText);
        response = await fetch("http://localhost:8000/ingest/file", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      data = await response.json();
      const actualChunks = data.chunks_indexed || chunks;

      setChunkBadge(`${actualChunks} chunks`);
      setDocInfo({
        name:
          displayName || (type === "text" ? "Pasted Text" : fileOrText.name),
        meta: metaBuilder(actualChunks),
      });
      setUploadState("loaded");
      if (onUploadComplete) onUploadComplete(true, data.summary);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(
        "Backend connection failed! Is the FastAPI server running on port 8000?",
      );
      setUploadState("idle");
      if (onUploadComplete) onUploadComplete(false, null);
    }
  };

  const handleFileUpload = (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a PDF file.");
      return;
    }
    const estimatedChunks = Math.max(1, Math.ceil(file.size / 15000));
    simulateProcessing(
      estimatedChunks,
      file,
      (chunks) => `PDF · ${chunks} chunks indexed`,
      "file",
    );
  };

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please choose an Image file.");
      return;
    }
    const estimatedChunks = Math.max(1, Math.ceil(file.size / 25000));
    simulateProcessing(
      estimatedChunks,
      file,
      () => `${(file.size / 1024).toFixed(1)} KB · Image indexed`,
      "file",
    );
  };

  const handleTextIngest = () => {
    const content = textContent.trim();
    const title = textTitle.trim() || "Pasted Text";

    if (!content) {
      alert("Please paste some text first.");
      return;
    }
    if (content.length < 50) {
      alert("Text is too short (minimum 50 characters).");
      return;
    }

    const estimatedChunks = Math.max(1, Math.ceil(content.length / 350));
    simulateProcessing(
      estimatedChunks,
      content,
      (chunks) =>
        `${content.length.toLocaleString()} chars · ${chunks} chunks indexed`,
      "text",
      title,
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setActiveTab("image");
        handleImageUpload(file);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        setActiveTab("pdf");
        handleFileUpload(file);
      } else {
        alert("Please drop a PDF or Image file.");
      }
    }
  };

  return (
    <section
      className={`upload-zone ${uploadState === "loaded" ? "loaded" : ""} ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept={activeTab === "image" ? "image/*" : ".pdf"}
        hidden
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            if (activeTab === "image") handleImageUpload(file);
            else handleFileUpload(file);
          }
          e.target.value = "";
        }}
      />

      {uploadState !== "loaded" && (
        <div className="source-toggle">
          <button
            ref={togglePdfRef}
            className={`source-opt ${activeTab === "pdf" ? "active" : ""}`}
            onClick={() => setActiveTab("pdf")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </button>
          <button
            ref={toggleTextRef}
            className={`source-opt ${activeTab === "text" ? "active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="13" y1="18" x2="3" y2="18" />
            </svg>
            Text
          </button>
          <button
            ref={toggleImageRef}
            className={`source-opt ${activeTab === "image" ? "active" : ""}`}
            onClick={() => setActiveTab("image")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Image
          </button>
          <span className="source-knob" ref={sourceKnobRef}></span>
        </div>
      )}

      {uploadState === "idle" && activeTab === "pdf" && (
        <div className="upload-idle">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <div className="upload-idle-text">
            <span className="upload-title">Drop a PDF or click to upload</span>
            <span className="upload-sub">
              Your document will be indexed for voice queries
            </span>
          </div>
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose PDF
          </button>
        </div>
      )}

      {uploadState === "idle" && activeTab === "image" && (
        <div className="upload-idle">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <div className="upload-idle-text">
            <span className="upload-title">
              Drop an Image or click to upload
            </span>
            <span className="upload-sub">
              Your image will be analyzed for voice queries
            </span>
          </div>
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>
        </div>
      )}

      {uploadState === "idle" && activeTab === "text" && (
        <div className="upload-text-idle">
          <input
            type="text"
            className="text-title-input"
            placeholder="Title (optional)"
            maxLength="80"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <textarea
            className="text-content-area"
            placeholder="Paste your text here — notes, articles, transcripts, anything you want to ask questions about…"
            rows="6"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          ></textarea>
          <div className="text-char-row">
            <span className="text-char-count">
              {textContent.length.toLocaleString()} character
              {textContent.length !== 1 ? "s" : ""}
            </span>
            <button className="upload-btn" onClick={handleTextIngest}>
              Index Text
            </button>
          </div>
        </div>
      )}

      {uploadState === "progress" && (
        <div className="upload-progress">
          <div className="spinner"></div>
          <div className="progress-info">
            <span>{uploadProgressText}</span>
            <span className="chunk-badge">{chunkBadge}</span>
          </div>
        </div>
      )}

      {uploadState === "loaded" && (
        <div className="upload-loaded">
          <div className="doc-icon">
            {activeTab === "image" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ) : activeTab === "text" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="17" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="13" y1="18" x2="3" y2="18" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
          </div>
          <div className="doc-info">
            <span className="doc-name">{docInfo.name}</span>
            <span className="doc-meta">{docInfo.meta}</span>
          </div>
          <button
            className="doc-replace-btn"
            title="Upload different source"
            onClick={() => {
              setUploadState("idle");
              if (onUploadComplete) onUploadComplete(false);
              if (activeTab === "pdf") fileInputRef.current?.click();
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Replace
          </button>
        </div>
      )}
    </section>
  );
};

export default UploadZone;
