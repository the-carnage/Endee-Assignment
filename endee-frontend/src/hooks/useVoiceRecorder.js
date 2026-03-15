import { useState, useRef, useCallback } from "react";

const getMimeAndExt = () => {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    return { mimeType: "audio/webm;codecs=opus", ext: "webm" };
  if (MediaRecorder.isTypeSupported("audio/webm"))
    return { mimeType: "audio/webm", ext: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4"))
    return { mimeType: "audio/mp4", ext: "mp4" };
  return { mimeType: "", ext: "webm" };
};

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioExt, setAudioExt] = useState("webm");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerInterval = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const { mimeType, ext } = getMimeAndExt();
      setAudioExt(ext);

      mediaRecorder.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const actualMime =
          mediaRecorder.current?.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks.current, { type: actualMime });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerInterval.current);
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioUrl(null);
    setRecordingTime(0);
  }, []);

  return {
    isRecording,
    audioUrl,
    audioExt,
    recordingTime,
    startRecording,
    stopRecording,
    clearRecording,
  };
};
