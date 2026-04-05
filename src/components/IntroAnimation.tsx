'use client';

import { useState, useEffect, useRef } from 'react';

export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'boot' | 'title' | 'subtitle' | 'flare' | 'fadeout'>('boot');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/sounds/boot-up.mp3');
    audioRef.current = audio;
    audio.play().catch(() => {});

    const t1 = setTimeout(() => setPhase('title'), 500);
    const t2 = setTimeout(() => setPhase('subtitle'), 2000);
    const t3 = setTimeout(() => setPhase('flare'), 3500);
    const t4 = setTimeout(() => {
      setPhase('fadeout');
      setTimeout(onComplete, 1000);
    }, 4000);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      audio.pause();
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (audioRef.current) audioRef.current.pause();
    onComplete();
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-1000 ${phase === 'fadeout' ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#0a1628', willChange: 'opacity' }}
    >
      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ willChange: 'transform' }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
            animation: phase === 'boot' ? 'scanMove 0.08s linear infinite' : 'none',
            opacity: phase === 'boot' ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        />
        {/* CRT flicker */}
        {phase === 'boot' && (
          <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,212,170,0.03)' }} />
        )}
      </div>

      {/* Title */}
      <div className="relative">
        <h1
          className={`text-5xl md:text-7xl font-bold tracking-[0.3em] uppercase transition-all duration-700 ${
            phase === 'boot' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{
            color: '#00d4aa',
            textShadow: '0 0 40px rgba(0,212,170,0.5), 0 0 80px rgba(0,212,170,0.2)',
            willChange: 'transform, opacity',
          }}
        >
          COMMAND CENTER
        </h1>

        {/* Lens flare sweep */}
        {(phase === 'title' || phase === 'subtitle') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-200px',
                width: '200px',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3), rgba(255,255,255,0.6), rgba(0,212,170,0.3), transparent)',
                animation: 'lensFlare 1.5s ease-in-out forwards',
                willChange: 'transform',
              }}
            />
          </div>
        )}
      </div>

      {/* Subtitle — typewriter */}
      <div className="mt-6 h-8 flex items-center justify-center">
        {(phase === 'subtitle' || phase === 'flare' || phase === 'fadeout') && (
          <p
            className="text-lg md:text-xl tracking-[0.2em] uppercase overflow-hidden whitespace-nowrap border-r-2 border-white/60"
            style={{
              color: 'rgba(255,255,255,0.8)',
              animation: 'typing 1.2s steps(22) forwards, blinkCaret 0.5s step-end 3',
              width: '0',
              willChange: 'width',
            }}
          >
            COMMAND CENTER ONLINE
          </p>
        )}
      </div>

      {/* All systems operational */}
      <div className="mt-4 h-6 flex items-center justify-center">
        {(phase === 'flare' || phase === 'fadeout') && (
          <p
            className="text-sm tracking-[0.15em] uppercase animate-fadeIn"
            style={{ color: '#10b981' }}
          >
            ALL SYSTEMS OPERATIONAL
          </p>
        )}
      </div>

      {/* Solar flare */}
      {phase === 'flare' && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 0,
            height: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8), rgba(0,212,170,0.4), transparent)',
            animation: 'solarFlare 0.6s ease-out forwards',
            willChange: 'width, height, opacity',
          }}
        />
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-8 text-white/20 text-sm hover:text-white/60 transition-colors"
      >
        Skip ▸
      </button>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes scanMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        @keyframes lensFlare {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 400px)); }
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 22ch; }
        }
        @keyframes blinkCaret {
          50% { border-color: transparent; }
        }
        @keyframes solarFlare {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 200vw; height: 200vh; opacity: 0; }
        }
        @keyframes fadeInAnim {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeInAnim 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
