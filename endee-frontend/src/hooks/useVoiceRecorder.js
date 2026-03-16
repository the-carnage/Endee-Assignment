import { useCallback, useEffect, useRef, useState } from 'react';

const SUPPORTED_TYPES = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'mp4' },
];

function getRecorderFormat() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return { mimeType: '', extension: 'webm' };
  }

  return (
    SUPPORTED_TYPES.find((option) => window.MediaRecorder.isTypeSupported(option.mimeType)) ??
    { mimeType: '', extension: 'webm' }
  );
}

function formatRecorderError(error) {
  if (error?.name === 'NotAllowedError') {
    return 'Microphone access is blocked. Allow microphone permission and try again.';
  }

  if (error?.name === 'NotFoundError') {
    return 'No microphone was detected on this device.';
  }

  return 'Unable to start recording right now.';
}

export function useVoiceRecorder() {
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecording, setLastRecording] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const formatRef = useRef(getRecorderFormat());

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const clearRecording = useCallback(() => {
    setLastRecording(null);
    setRecordingTime(0);
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      setError('This browser does not support audio recording.');
      return;
    }

    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nextFormat = getRecorderFormat();
      const recorder = nextFormat.mimeType
        ? new window.MediaRecorder(stream, { mimeType: nextFormat.mimeType })
        : new window.MediaRecorder(stream);

      formatRef.current = nextFormat;
      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType =
          recorder.mimeType || formatRef.current.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        setLastRecording({
          blob,
          mimeType,
          extension: formatRef.current.extension,
        });

        cleanup();
        setIsRecording(false);
      };

      recorder.start();
      setLastRecording(null);
      setRecordingTime(0);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((seconds) => seconds + 1);
      }, 1000);
    } catch (errorValue) {
      cleanup();
      setIsRecording(false);
      setError(formatRecorderError(errorValue));
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  return {
    error,
    isRecording,
    lastRecording,
    recordingTime,
    clearRecording,
    startRecording,
    stopRecording,
  };
}
