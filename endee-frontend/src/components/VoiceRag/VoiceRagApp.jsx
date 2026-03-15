import React, { useState, useRef, useEffect } from 'react';
import AppHeader from './AppHeader';
import UploadZone from './UploadZone';
import ConversationArea from './ConversationArea';
import MicFooter from './MicFooter';
import './VoiceRag.css';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

const VoiceRagApp = () => {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [docLoaded, setDocLoaded] = useState(false);
  const [appStatus, setAppStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [docSummary, setDocSummary] = useState('');
  
  const audioPlayerRef = useRef(null);
  
  const {
    isRecording,
    audioUrl,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  useEffect(() => {
    if (isRecording) {
      setAppStatus('recording');
    }
  }, [isRecording]);

  useEffect(() => {
    if (audioUrl && !isRecording && appStatus === 'recording') {
      processAudioRecording(audioUrl);
    }
  }, [audioUrl, isRecording]);

  const handleMicClick = () => {
    if (!docLoaded) return;
    
    if (appStatus === 'ready' || appStatus === 'idle') {
      startRecording();
    } else if (appStatus === 'recording') {
      stopRecording();
    }
  };

  const addMessage = (role, text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role, text, time }]);
  };

  const processAudioRecording = async (url) => {
    setAppStatus('processing');
    
    try {
      // Convert the object URL back to a blob to send to the server
      const response = await fetch(url);
      const audioBlob = await response.blob();
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const apiRes = await fetch('http://localhost:8000/query/voice', {
        method: 'POST',
        body: formData
      });
      
      if (!apiRes.ok) {
        throw new Error(`Server returned ${apiRes.status}`);
      }
      
      const data = await apiRes.json();
      
      if (subtitlesEnabled && data.transcript) {
        addMessage('user', data.transcript);
      }
      
      if (subtitlesEnabled && data.response) {
        addMessage('ai', data.response);
      }
      
      // We don't have real TTS generation yet, so we just return to ready
      setAppStatus('ready');
      
    } catch (error) {
      console.error("Speech processing error:", error);
      if (subtitlesEnabled) {
        addMessage('ai', "Sorry, I had trouble connecting to the backend server to process your voice.");
      }
      setAppStatus('ready');
    }
  };

  return (
    <div className="voice-rag-root">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="app-wrapper">
        <AppHeader 
          subtitlesEnabled={subtitlesEnabled} 
          setSubtitlesEnabled={setSubtitlesEnabled} 
        />
        
        <UploadZone 
          onUploadComplete={(isSuccess, summary) => {
            setDocLoaded(isSuccess);
            if (isSuccess && summary) {
               setDocSummary(summary);
               if (subtitlesEnabled) {
                 addMessage('ai', `Document loaded successfully! Here is a quick summary:\n\n${summary}`);
               }
            }
            if (isSuccess && appStatus === 'idle') setAppStatus('ready');
          }} 
        />
        
        <ConversationArea 
          messages={messages} 
          isThinking={appStatus === 'processing'} 
        />
        
        <MicFooter 
          status={appStatus} 
          docLoaded={docLoaded} 
          onMicClick={handleMicClick} 
        />
      </div>

      <audio ref={audioPlayerRef} style={{ display: 'none' }}></audio>
    </div>
  );
};

export default VoiceRagApp;
