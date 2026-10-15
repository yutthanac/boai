import React, { useEffect, useRef, useState } from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import {
  Play,
  Pause,
  SkipForward,
  ExternalLink,
  X,
  Music,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  ChevronUp,
  ChevronDown,
  ListMusic,
} from 'lucide-react';

export const MiniMusicBar: React.FC = () => {
  const {
    musicTrack,
    musicVolume,
    isMusicMuted,
    musicPlaylist,
    currentPlaylistIndex,
    toggleMusicPlayPause,
    stopMusic,
    setMusicVolume,
    setMusicMuted,
    skipNextMusic,
    playPlaylistItem,
  } = useAssistantStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [showVideoDrawer, setShowVideoDrawer] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  // Sync audio element volume with store state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMusicMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMusicMuted]);

  // Sync play/pause state with HTML5 audio and YouTube iframe
  useEffect(() => {
    if (!musicTrack) return;

    if (musicTrack.audioStreamUrl && audioRef.current) {
      if (musicTrack.isPlaying) {
        audioRef.current.play().catch((e) => {
          console.warn('[MiniMusicBar] Audio autoplay prevented:', e);
          setPlaybackError(true);
        });
      } else {
        audioRef.current.pause();
      }
    }

    // YouTube iframe postMessage control
    if (iframeRef.current?.contentWindow) {
      try {
        const command = musicTrack.isPlaying ? 'playVideo' : 'pauseVideo';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args: '' }),
          '*'
        );
      } catch (_) {}
    }
  }, [musicTrack?.isPlaying, musicTrack?.audioStreamUrl]);

  // Handle direct control events (stop, pause, play)
  useEffect(() => {
    const handleMusicAction = (e: CustomEvent) => {
      const action = e.detail?.action;
      if (action === 'stop') {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      } else if (action === 'pause') {
        if (audioRef.current) audioRef.current.pause();
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
              '*'
            );
          } catch (_) {}
        }
      } else if (action === 'play') {
        if (audioRef.current && musicTrack?.audioStreamUrl) {
          audioRef.current.play().catch(() => {});
        }
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
              '*'
            );
          } catch (_) {}
        }
      }
    };

    window.addEventListener('boai-music-action', handleMusicAction as EventListener);
    return () => window.removeEventListener('boai-music-action', handleMusicAction as EventListener);
  }, [musicTrack?.audioStreamUrl]);

  if (!musicTrack) return null;

  const handleOpenExternal = () => {
    if (musicTrack.url) {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(musicTrack.url);
      } else {
        window.open(musicTrack.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleDismiss = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    stopMusic();
  };

  const toggleMute = () => {
    setMusicMuted(!isMusicMuted);
  };

  const isStream = musicTrack.playbackMode === 'stream' || !!musicTrack.audioStreamUrl;

  return (
    <div className="relative z-30">
      {/* Real HTML5 Audio Streaming Element (100% Audible Sound) */}
      {musicTrack.audioStreamUrl && (
        <audio
          ref={audioRef}
          src={musicTrack.audioStreamUrl}
          autoPlay={musicTrack.isPlaying}
          loop
          onError={() => setPlaybackError(true)}
          onPlaying={() => setPlaybackError(false)}
        />
      )}

      {/* Expandable Playlist Queue Drawer */}
      {showPlaylistDrawer && (
        <div className="w-full bg-[#0a0f1d] border-t border-white/10 px-4 py-3 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-100 text-xs">
                  รายการเพลงในลิสต์ (Playlist Queue)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                  {musicPlaylist.length} เพลง
                </span>
              </div>
              <button
                onClick={() => setShowPlaylistDrawer(false)}
                className="text-slate-400 hover:text-white text-xs transition-colors"
              >
                ปิดลิสต์
              </button>
            </div>

            {/* Song Items List */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {musicPlaylist.map((item, idx) => {
                const isCurrent =
                  idx === currentPlaylistIndex ||
                  musicTrack.title.toLowerCase().includes(item.title.toLowerCase()) ||
                  (item.videoId && item.videoId === musicTrack.videoId);

                return (
                  <div
                    key={item.id}
                    onClick={() => playPlaylistItem(idx)}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-6 text-center text-[11px] font-mono text-slate-500">
                        {isCurrent && musicTrack.isPlaying ? (
                          <div className="flex items-end justify-center gap-[2px] h-3">
                            <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-2.5" />
                            <span className="w-0.5 bg-cyan-300 rounded-full animate-pulse h-3" />
                            <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-2" />
                          </div>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-medium truncate ${isCurrent ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {item.title}
                        </span>
                        {item.artist && (
                          <span className="text-[10px] text-slate-400 truncate">
                            {item.artist}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          item.playbackMode === 'stream'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.playbackMode === 'stream' ? 'LIVE' : 'YT'}
                      </span>
                      <button
                        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-100 transition-colors"
                        title="เล่นเพลงนี้ทันที"
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent YouTube Iframe (Keeps playing without suspension when drawer is collapsed) */}
      {musicTrack.embedUrl && !musicTrack.audioStreamUrl && (
        <div
          className={
            showVideoDrawer
              ? 'w-full bg-[#080d16] border-t border-white/10 px-4 py-2 flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-200'
              : 'fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none'
          }
        >
          <div className="w-full max-w-[480px] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl relative bg-black">
            <iframe
              ref={iframeRef}
              src={musicTrack.embedUrl}
              title={musicTrack.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
          {showVideoDrawer && (
            <div className="w-full max-w-[480px] flex justify-between items-center mt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Music className="w-3 h-3 text-red-400" />
                กำลังเล่นผ่าน YouTube Player
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenExternal}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  title="หากวิดีโอนี้ติดลิขสิทธิ์ฝัง เปิดฟังบน YouTube Music ได้ทันที"
                >
                  <ExternalLink className="w-3 h-3" />
                  เปิดบน YT Music
                </button>
                <button
                  onClick={() => setShowVideoDrawer(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ย่อหน้าต่างวิดีโอ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Bottom Music Control Bar */}
      <div className="h-12 w-full bg-[#0C111C]/95 backdrop-blur-md border-t border-white/10 px-4 flex items-center justify-between text-xs select-none shadow-lg">
        {/* Track Info & Animated Equalizer */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Animated Icon Box */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500/20 to-red-600/30 border border-red-500/30 flex items-center justify-center relative flex-shrink-0">
            {musicTrack.isPlaying ? (
              <div className="flex items-end gap-[2px] h-3.5">
                <span className="w-1 bg-red-400 rounded-full animate-pulse h-3" />
                <span className="w-1 bg-rose-400 rounded-full animate-pulse h-4" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse h-2.5" />
              </div>
            ) : (
              <Music className="w-4 h-4 text-red-400" />
            )}
          </div>

          {/* Title & Platform Tag */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-100 truncate max-w-[200px] md:max-w-[340px]">
                {musicTrack.title}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] border font-semibold tracking-wide flex items-center gap-1 ${
                  isStream
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}
              >
                {isStream ? <Radio className="w-2.5 h-2.5 animate-pulse" /> : null}
                {isStream ? 'LIVE STREAM' : 'YT MUSIC'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              {playbackError ? (
                <span className="text-amber-400">คลิกปุ่มเล่นเพื่อเปิดเสียง</span>
              ) : musicTrack.isPlaying ? (
                <span className="text-emerald-400">กำลังเล่นเสียงเพลง... ({Math.round(musicVolume * 100)}%)</span>
              ) : (
                'หยุดชั่วคราว (พักเพลง)'
              )}
            </span>
          </div>
        </div>

        {/* Volume & Media Playback Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors"
              title={isMusicMuted ? 'เปิดเสียง' : 'ปิดเสียง (Mute)'}
            >
              {isMusicMuted || musicVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMusicMuted ? 0 : musicVolume}
              onChange={(e) => {
                setMusicVolume(parseFloat(e.target.value));
                if (isMusicMuted) setMusicMuted(false);
              }}
              className="w-16 h-1 accent-cyan-400 bg-slate-700 rounded-lg cursor-pointer"
              title={`ความดังเสียง: ${Math.round(musicVolume * 100)}%`}
            />
            <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>

          {/* Playlist Drawer Button */}
          <button
            onClick={() => {
              setShowPlaylistDrawer(!showPlaylistDrawer);
              if (showVideoDrawer) setShowVideoDrawer(false);
            }}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              showPlaylistDrawer
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white'
            }`}
            title={showPlaylistDrawer ? 'ปิดลิสต์เพลง' : 'เปิดรายการเพลงในลิสต์ (Playlist)'}
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Video Preview Button */}
          {musicTrack.embedUrl && (
            <button
              onClick={() => {
                setShowVideoDrawer(!showVideoDrawer);
                if (showPlaylistDrawer) setShowPlaylistDrawer(false);
              }}
              className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                showVideoDrawer
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
              title={showVideoDrawer ? 'ซ่อนจอวิดีโอ' : 'แสดงจอวิดีโอ YouTube'}
            >
              <Tv className="w-3.5 h-3.5" />
              {showVideoDrawer ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          )}

          {/* Play / Pause Button */}
          <button
            onClick={toggleMusicPlayPause}
            className="p-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-colors shadow-sm"
            title={musicTrack.isPlaying ? 'หยุดชั่วคราว (พอส)' : 'เล่นต่อ'}
          >
            {musicTrack.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip / Next Track */}
          <button
            onClick={skipNextMusic}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="เพลงถัดไปในลิสต์"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Remote Open in PC Browser */}
          <button
            onClick={handleOpenExternal}
            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-[11px] font-medium transition-all flex items-center gap-1.5 ml-1 shadow-sm"
            title="Remote สั่งเปิดฟังเต็มระบบบนเบราว์เซอร์เครื่องของคุณ (YouTube Music)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-mono text-[10px]">Remote ในเครื่อง</span>
          </button>

          {/* Close Bar / Stop Music */}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            title="ปิดเพลง (Stop)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};


