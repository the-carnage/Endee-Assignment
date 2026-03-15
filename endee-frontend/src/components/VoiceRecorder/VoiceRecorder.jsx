import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import './VoiceRecorder.css';

const VoiceRecorder = () => {
  const {
    isRecording,
    audioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecorder();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder-container">
      <h3>Voice Recorder</h3>
      
      <div className="recorder-controls">
        {!isRecording ? (
          <button 
            className="record-btn start" 
            onClick={startRecording}
            disabled={!!audioUrl}
          >
            Start Recording
          </button>
        ) : (
          <button className="record-btn stop" onClick={stopRecording}>
            Stop Recording
          </button>
        )}
        
        {audioUrl && (
          <button className="record-btn clear" onClick={clearRecording}>
            Clear
          </button>
        )}
      </div>

      <div className="status-display">
        {isRecording && (
          <div className="recording-indicator">
            <span className="dot"></span>
            Recording... {formatTime(recordingTime)}
          </div>
        )}
        
        {audioUrl && !isRecording && (
          <div className="audio-preview">
            <audio src={audioUrl} controls />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
