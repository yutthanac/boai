import React, { useEffect, useRef, useMemo } from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import { audioService } from '../services/audio/audioService';

export interface AiOrbVisualizerProps {
  className?: string;
}

export const AiOrbVisualizer: React.FC<AiOrbVisualizerProps> = ({ className = '' }) => {
  const state = useAssistantStore((s) => s.state);
  const isMuted = useAssistantStore((s) => s.isMuted);
  const startVoiceInteraction = useAssistantStore((s) => s.startVoiceInteraction);
  const interruptSpeaking = useAssistantStore((s) => s.interruptSpeaking);
  const messages = useAssistantStore((s) => s.messages);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const smoothedMicRef = useRef(0);
  const smoothedSpeechRef = useRef(0);

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isIdle = state === 'idle';

  // Subtitle / Spoken caption text below orb
  const displayCaption = useMemo(() => {
    if (isSpeaking) {
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'assistant') return lastMsg.content;
      }
      return 'โนอากำลังพูดคุยกับคุณอยู่ค่ะ...';
    }
    if (isListening) return 'โนอากำลังตั้งใจฟังคุณอยู่ค่ะ... พูดได้เลยนะคะ';
    if (isThinking) return 'โนอากำลังประมวลผลคำตอบ...';

    // Idle: show latest assistant message if available, or greeting
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') return lastMsg.content;
    }
    return 'เรียก "โนอา" หรือคลิกที่ลูกแก้วเพื่อเริ่มพูดคุยได้เลยค่ะ';
  }, [isSpeaking, isListening, isThinking, messages]);

  // Audio-reactive render loop for the horizontal woven soundwave ribbons
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      if (!isRunning) return;

      timeRef.current += isSpeaking ? 0.055 : isListening ? 0.045 : 0.025;
      const t = timeRef.current;

      const rawMicLevel = audioService.getMicrophoneLevel();

      // Smooth microphone amplitude
      const targetMicLevel = isListening ? rawMicLevel / 100 : 0;
      smoothedMicRef.current += (targetMicLevel - smoothedMicRef.current) * 0.22;

      // Smooth speech amplitude during speaking
      if (isSpeaking) {
        const env = Math.sin(t * 3.6) * 0.15 + 0.35;
        smoothedSpeechRef.current += (env - smoothedSpeechRef.current) * 0.2;
      } else {
        smoothedSpeechRef.current += (0 - smoothedSpeechRef.current) * 0.25;
      }

      // Direct DOM update for center 5-bar voice equalizer (Zero React re-renders!)
      const baseHeights = [10, 16, 26, 16, 10];
      for (let i = 0; i < 5; i++) {
        const bar = barRefs.current[i];
        if (!bar) continue;
        let h = baseHeights[i];
        if (isSpeaking) {
          const mult = [12, 18, 24, 18, 12][i];
          const phase = [0.3, 0.8, 1.2, 1.8, 2.3][i];
          h = Math.max(6, Math.min(38, baseHeights[i] + smoothedSpeechRef.current * mult * Math.sin(t * 5.2 + phase)));
        } else if (isListening) {
          const mult = [10, 18, 24, 18, 10][i];
          h = Math.max(6, Math.min(36, baseHeights[i] + smoothedMicRef.current * mult));
        } else {
          const pulse = Math.sin(t * 2.0) * 2;
          h = baseHeights[i] + pulse * (i === 2 ? 1.2 : i === 1 || i === 3 ? 0.8 : 0.5);
        }
        bar.style.height = `${Math.round(h)}px`;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Orb radius boundary so waves emerge cleanly from the orb edges
      const isMobile = width < 640;
      const orbRadius = isMobile ? 96 : 124;
      const centerX = width / 2;

      // 4 woven sinusoidal ribbon wave curves
      const waveConfigs = [
        {
          color: 'rgba(186, 230, 253, 0.75)',
          lineWidth: 1.5,
          freq1: 0.016,
          freq2: 0.038,
          speed: 1.0,
          phase: 0,
          ampScale: 1.0,
        },
        {
          color: 'rgba(125, 211, 252, 0.55)',
          lineWidth: 1.2,
          freq1: 0.022,
          freq2: 0.044,
          speed: -1.2,
          phase: Math.PI * 0.45,
          ampScale: 0.85,
        },
        {
          color: 'rgba(56, 189, 248, 0.40)',
          lineWidth: 1.0,
          freq1: 0.014,
          freq2: 0.032,
          speed: 0.9,
          phase: Math.PI * 0.9,
          ampScale: 0.7,
        },
        {
          color: 'rgba(14, 165, 233, 0.30)',
          lineWidth: 0.9,
          freq1: 0.026,
          freq2: 0.052,
          speed: -1.4,
          phase: Math.PI * 1.35,
          ampScale: 0.6,
        },
      ];

      // Modulation multiplier: when Noah speaks, lines ripple and wave with sound ("เส้นขยับตามเสียง")!
      let voiceActivityMultiplier = 1.0;
      if (isSpeaking) {
        voiceActivityMultiplier = 1.0 + smoothedSpeechRef.current * 2.8;
      } else if (isListening) {
        voiceActivityMultiplier = 1.0 + smoothedMicRef.current * 3.2;
      } else if (isThinking) {
        voiceActivityMultiplier = 1.25;
      }

      // Draw Left Wave Ribbon (x: 0 -> centerX - orbRadius)
      const leftStartX = 0;
      const leftEndX = Math.max(0, centerX - orbRadius + 8);
      const leftLength = leftEndX - leftStartX;

      if (leftLength > 20) {
        waveConfigs.forEach((cfg) => {
          ctx.beginPath();
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = cfg.lineWidth;

          for (let x = leftStartX; x <= leftEndX; x += 3) {
            // Envelope: bell-shaped window so it's 0 at outer screen edge and tapers smoothly at the orb
            const u = (x - leftStartX) / leftLength;
            const envelope = Math.sin(u * Math.PI);

            const baseAmp = (isMobile ? 12 : 20) * cfg.ampScale * voiceActivityMultiplier;
            const yOffset =
              Math.sin(x * cfg.freq1 + t * cfg.speed + cfg.phase) * baseAmp * envelope +
              Math.sin(x * cfg.freq2 - t * cfg.speed * 1.3) * (baseAmp * 0.4) * envelope;

            const y = centerY + yOffset;
            if (x === leftStartX) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });
      }

      // Draw Right Wave Ribbon (x: centerX + orbRadius -> width)
      const rightStartX = Math.min(width, centerX + orbRadius - 8);
      const rightEndX = width;
      const rightLength = rightEndX - rightStartX;

      if (rightLength > 20) {
        waveConfigs.forEach((cfg) => {
          ctx.beginPath();
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = cfg.lineWidth;

          for (let x = rightStartX; x <= rightEndX; x += 3) {
            // Symmetrical envelope
            const u = (x - rightStartX) / rightLength;
            const envelope = Math.sin(u * Math.PI);

            const baseAmp = (isMobile ? 12 : 20) * cfg.ampScale * voiceActivityMultiplier;
            // Mirroring the phase for harmonic symmetry
            const yOffset =
              Math.sin((width - x) * cfg.freq1 + t * cfg.speed + cfg.phase) * baseAmp * envelope +
              Math.sin((width - x) * cfg.freq2 - t * cfg.speed * 1.3) * (baseAmp * 0.4) * envelope;

            const y = centerY + yOffset;
            if (x === rightStartX) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpeaking, isListening, isThinking]);

  // Click on the orb to trigger voice command or barge-in interruption
  const handleOrbClick = () => {
    if (isMuted) return;

    if (isSpeaking) {
      interruptSpeaking();
      return;
    }

    if (isIdle) {
      startVoiceInteraction();
    }
  };



  return (
    <div className={`relative w-full py-8 sm:py-14 select-none overflow-hidden flex flex-col items-center justify-center ${className}`}>
      {/* Background Soft Atmospheric Lighting */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-full h-48 bg-gradient-to-r from-transparent via-cyan-950/[0.08] to-transparent blur-3xl" />
      </div>

      {/* ==================================================================== */}
      {/* FULL-WIDTH BANNER STAGE: CANVAS WAVE RIBBONS + CENTER SCI-FI ORB */}
      {/* ==================================================================== */}
      <div className="relative w-full h-56 sm:h-64 flex items-center justify-center">
        {/* Full-width Responsive Canvas for Smooth Sinusoidal Voice Ribbons */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Central Futuristic Glass Orb Structure (Matching Reference Image Exactly) */}
        <div className="relative flex items-center justify-center z-10">
          {/* Outer Ambient Glow Aura */}
          <div
            className={`absolute -inset-8 rounded-full pointer-events-none blur-3xl transition-all duration-700 ${
              isListening
                ? 'bg-cyan-500/25 scale-110'
                : isSpeaking
                ? 'bg-sky-400/30 scale-115'
                : isThinking
                ? 'bg-indigo-500/20'
                : 'bg-sky-500/15'
            }`}
          />

          {/* Outer Glass Track Ring with Top-Right Glowing Orbital Arc */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center border border-white/[0.09] shadow-[0_0_50px_rgba(0,0,0,0.85)]">
            {/* SVG Top-Right Glowing Arc (As in user reference image) */}
            <svg
              className={`absolute inset-0 w-full h-full pointer-events-none transition-transform duration-700 ${
                isThinking ? 'animate-noar-orbit-ring' : '-rotate-45'
              }`}
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="noar-orbital-arc-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.85" />
                  <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
                <filter id="noar-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#38bdf8" floodOpacity="0.8" />
                </filter>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="49"
                fill="none"
                stroke="url(#noar-orbital-arc-grad)"
                strokeWidth="1.6"
                strokeDasharray="72 236"
                strokeLinecap="round"
                filter="url(#noar-arc-glow)"
              />
            </svg>

            {/* Inner Dark Glass Sphere (Interactive Button) */}
            <button
              type="button"
              onClick={handleOrbClick}
              aria-label={
                isSpeaking
                  ? 'กดเพื่อขัดจังหวะโนอา'
                  : isListening
                  ? 'โนอากำลังตั้งใจฟัง'
                  : 'คลิกที่ลูกแก้วเพื่อเริ่มพูดคุย'
              }
              title={
                isSpeaking
                  ? 'คลิกเพื่อขัดจังหวะโนอา (พูดขัดได้เลยค่ะ)'
                  : isListening
                  ? 'โนอากำลังตั้งใจฟังคุณอยู่ค่ะ...'
                  : 'คลิกเพื่อสั่งการด้วยเสียง'
              }
              className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden flex items-center justify-center border border-white/[0.14] transition-all duration-300 cursor-pointer focus:outline-none ${
                isListening
                  ? 'border-cyan-300/70 shadow-[0_0_35px_rgba(56,189,248,0.4)]'
                  : isSpeaking
                  ? 'border-sky-300/70 shadow-[0_0_35px_rgba(56,189,248,0.45)]'
                  : 'hover:border-white/30 shadow-[0_0_40px_rgba(0,0,0,0.9)]'
              }`}
              style={{
                background:
                  'radial-gradient(circle at 45% 35%, #182234 0%, #0d1524 45%, #050811 80%, #020409 100%)',
                boxShadow:
                  'inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -8px 20px rgba(0, 0, 0, 0.8), 0 16px 40px rgba(0, 0, 0, 0.8)',
              }}
            >
              {/* Soft Top-Left Spherical Specular Light */}
              <div className="absolute top-2 left-6 w-24 h-12 rounded-full rotate-[-25deg] bg-gradient-to-b from-white/20 via-white/05 to-transparent blur-[1px] pointer-events-none" />

              {/* Bottom Electric-Blue Crescent Glow (Signature Look from Image) */}
              <div
                className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-16 sm:h-20 rounded-b-full pointer-events-none transition-all duration-500 ${
                  isSpeaking
                    ? 'opacity-100 scale-105'
                    : isListening
                    ? 'opacity-95'
                    : 'opacity-85'
                }`}
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 100%, rgba(56, 189, 248, 0.95) 0%, rgba(14, 165, 233, 0.6) 35%, rgba(2, 132, 199, 0.2) 65%, transparent 85%)',
                  filter: 'blur(3px)',
                }}
              />
              {/* Bright inner crescent flare line */}
              <div
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-2 rounded-full pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
                  filter: 'blur(1px)',
                }}
              />

              {/* Center 5-Bar Voice Equalizer Icon (Matching Reference Image) */}
              <div className="relative z-20 flex items-center justify-center gap-1.5 pointer-events-none">
                {[10, 16, 26, 16, 10].map((initialHeight, i) => {
                  const isCenter = i === 2;
                  return (
                    <span
                      key={i}
                      ref={(el) => { barRefs.current[i] = el; }}
                      className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${
                        isCenter
                          ? 'bg-white shadow-[0_0_8px_#ffffff]'
                          : 'bg-sky-200/90 shadow-[0_0_5px_rgba(186,230,253,0.5)]'
                      }`}
                      style={{ height: `${initialHeight}px` }}
                    />
                  );
                })}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEAMLESS SUBTITLE CAPTION (คำพูดโนอาคลีนๆ ไร้กรอบและไร้ปุ่ม) */}
      {/* ==================================================================== */}
      <div className="mt-4 max-w-xl px-4 text-center z-10">
        <p className="text-xs sm:text-sm text-slate-300/85 font-normal leading-relaxed tracking-wide">
          {displayCaption}
        </p>
      </div>
    </div>
  );
};
