
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Mic, MicOff, X, Headphones, StopCircle, Loader2 } from './Icons';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';

interface LiveVoiceModeProps {
  onClose: () => void;
  onPlanGenerated: (goal: string, constraints: string) => void;
  language: Language;
}

// --- Audio Utilities ---

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose, onPlanGenerated, language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [micActive, setMicActive] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Audio Playback
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        if (!process.env.API_KEY) throw new Error("Missing API Key");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Initialize Audio Contexts
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        audioContextRef.current = inputAudioContext;
        outputAudioContextRef.current = outputAudioContext;
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);

        // Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Connect Live Session
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (!mounted) return;
              setStatus('listening');
              
              // Setup Mic Stream
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (!micActive) return; // Mute logic
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!mounted) return;

              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                setStatus('speaking');
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputAudioContext,
                  24000,
                  1
                );
                
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                      setStatus('listening');
                  }
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              if (message.serverContent?.interrupted) {
                 for (const src of sourcesRef.current) {
                     src.stop();
                 }
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 setStatus('listening');
              }
              
              // Handle Function Calls (if you add tool usage later)
            },
            onclose: () => {
              console.log("Session closed");
            },
            onerror: (err) => {
              console.error("Session error:", err);
              setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
            },
            systemInstruction: `
               You are PlanFlow AI, a friendly and energetic productivity coach.
               Your goal is to help the user brainstorm and define a goal.
               
               1. Ask clarifying questions if the goal is vague.
               2. Once the goal is clear (has outcome + timeline/frequency), confirm it.
               3. Keep responses short and conversational.
               
               IMPORTANT: If the user says "Create plan" or "Generate plan" or confirms they are ready, 
               say "Great! Generating your plan now." and stop talking.
            `
          }
        });
        
        sessionPromiseRef.current = sessionPromise;

      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };

    startSession();

    return () => {
      mounted = false;
      // Clean up audio contexts and tracks
      audioContextRef.current?.close();
      outputAudioContextRef.current?.close();
      // We can't explicitly close the session object easily without storing the resolved promise result
      // but breaking the component unmounts the listeners.
    };
  }, []);

  const toggleMic = () => {
    setMicActive(!micActive);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 text-white/80">
        <div className="flex items-center gap-2">
           <Headphones className="w-5 h-5" />
           <span className="font-semibold tracking-wide text-sm">{t.voice_live_mode}</span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
           <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Visualizer / Status */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
         
         {/* Orbit Animation */}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className={`w-64 h-64 border border-${themeColor}-500/30 rounded-full animate-[spin_10s_linear_infinite]`}></div>
            <div className="w-48 h-48 border border-purple-500/30 rounded-full absolute animate-[spin_15s_linear_infinite_reverse]"></div>
         </div>

         <div className="relative z-10 flex flex-col items-center space-y-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_40px_rgba(var(--color-shadow),0.5)] ${
                status === 'speaking' ? `bg-${themeColor}-500 scale-110 shadow-${themeColor}-500/50` : 
                status === 'listening' ? 'bg-white scale-100' : 'bg-red-500'
            }`}>
               {status === 'connecting' ? (
                   <Loader2 className="w-8 h-8 text-white animate-spin" />
               ) : status === 'speaking' ? (
                   <div className="flex gap-1 h-8 items-center">
                      <div className="w-1.5 bg-white rounded-full animate-[bounce_1s_infinite] h-4"></div>
                      <div className="w-1.5 bg-white rounded-full animate-[bounce_1.2s_infinite] h-8"></div>
                      <div className="w-1.5 bg-white rounded-full animate-[bounce_0.8s_infinite] h-6"></div>
                      <div className="w-1.5 bg-white rounded-full animate-[bounce_1.1s_infinite] h-5"></div>
                   </div>
               ) : (
                   <Mic className={`w-8 h-8 text-${themeColor}-900`} />
               )}
            </div>

            <div className="text-center space-y-2 max-w-xs">
                <h3 className="text-2xl font-bold text-white">
                    {status === 'connecting' ? t.voice_connecting : 
                     status === 'listening' ? t.voice_listening : 
                     status === 'speaking' ? 'PlanFlow AI' : t.voice_failed}
                </h3>
                <p className="text-slate-400 text-sm">
                    {status === 'error' 
                        ? "Please check your microphone permissions." 
                        : t.voice_intro}
                </p>
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="p-8 pb-12 flex justify-center gap-6">
         <button 
           onClick={toggleMic}
           className={`p-6 rounded-full transition-all ${
               micActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
           }`}
         >
            {micActive ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
         </button>

         <button 
            onClick={onClose}
            className="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/50 transition-all active:scale-95"
         >
            <StopCircle className="w-8 h-8" />
         </button>
      </div>

    </div>
  );
};
