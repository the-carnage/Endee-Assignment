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
  const [appStatus, setAppStatus] = useState('idle'); // 'idle' | 'ready' | 'recording' | 'processing' | 'speaking'
  const [messages, setMessages] = useState([]);
  
  const audioPlayerRef = useRef(null);
  
  const {
    isRecording,
    audioUrl,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  // Sync our hook's recording state to the app's visual state
  useEffect(() => {
    if (isRecording) {
      setAppStatus('recording');
    }
  }, [isRecording]);

  // Handle when recording completes (audioUrl is available)
  useEffect(() => {
    if (audioUrl && !isRecording && appStatus === 'recording') {
      simulateBackendResponse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, isRecording]);

  const handleMicClick = () => {
    if (!docLoaded) return;
    
    if (appStatus === 'ready' || appStatus === 'idle') {
      startRecording();
    } else if (appStatus === 'recording') {
      stopRecording(); // This sets appStatus to 'recording' until audioUrl updates, then triggers simulation
    }
  };

  const addMessage = (role, text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role, text, time }]);
  };

  const simulateBackendResponse = () => {
    setAppStatus('processing');
    
    setTimeout(() => {
      // Mock transcript and AI response
      if (subtitlesEnabled) {
        addMessage('user', 'What are the main topics discussed in this document?');
      }

      setTimeout(() => {
        if (subtitlesEnabled) {
          addMessage('ai', 'Based on the provided context, the main topics are React component architecture, state management strategies, and integrating native web APIs like MediaRecorder seamlessly into a user interface.');
        }
        
        setAppStatus('speaking');
        
        // Mock audio playback duration
        setTimeout(() => {
          setAppStatus('ready');
          
          // Note: In a real app we'd play the `audioPlayerRef.current.src` returning from backend.
          // For now, if we wanted to hear our own recorded voice we could play `audioUrl`:
          // if (audioPlayerRef.current) {
          //   audioPlayerRef.current.src = audioUrl;
          //   audioPlayerRef.current.play();
          // }

        }, 4000); // 4 seconds of speaking
      }, 1500); // 1.5s thinking time
    }, 1000); // 1s upload time
  };

  return (
    <div className="voice-rag-root">
      {/* Background orbs */}
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
