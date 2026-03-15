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
      simulateBackendResponse();
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

  const simulateBackendResponse = () => {
    setAppStatus('processing');
    
    setTimeout(() => {
      if (subtitlesEnabled) {
        addMessage('user', 'What are the main topics discussed in this document?');
      }

      setTimeout(() => {
        if (subtitlesEnabled) {
          addMessage('ai', 'Based on the provided context, the main topics are React component architecture, state management strategies, and integrating native web APIs like MediaRecorder seamlessly into a user interface.');
        }
        
        setAppStatus('speaking');
        
        setTimeout(() => {
          setAppStatus('ready');
        }, 4000);
      }, 1500);
    }, 1000);
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
          onUploadComplete={(isSuccess) => {
            setDocLoaded(isSuccess);
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
