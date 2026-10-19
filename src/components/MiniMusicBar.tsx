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
  const musicTrack = useAssistantStore((s) => s.musicTrack);
  const musicVolume = useAssistantStore((s) => s.musicVolume);
  const isMusicMuted = useAssistantStore((s) => s.isMusicMuted);
  const musicPlaylist = useAssistantStore((s) => s.musicPlaylist);
  const currentPlaylistIndex = useAssistantStore((s) => s.currentPlaylistIndex);
  const toggleMusicPlayPause = useAssistantStore((s) => s.toggleMusicPlayPause);
  const stopMusic = useAssistantStore((s) => s.stopMusic);
  const setMusicVolume = useAssistantStore((s) => s.setMusicVolume);
  const setMusicMuted = useAssistantStore((s) => s.setMusicMuted);
  const skipNextMusic = useAssistantStore((s) => s.skipNextMusic);
  const playPlaylistItem = useAssistantStore((s) => s.playPlaylistItem);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const [showVideoDrawer, setShowVideoDrawer] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  // Load YouTube IFrame API script once if not present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Universal YouTube Command Sender (YT.Player native API + PostMessage Dual-Channel)
  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    // 1. Native YT.Player instance if initialized
    if (ytPlayerRef.current) {
      try {
        if (func === 'pauseVideo' && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        } else if (func === 'playVideo' && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        } else if (func === 'mute' && typeof ytPlayerRef.current.mute === 'function') {
          ytPlayerRef.current.mute();
        } else if (func === 'unMute' && typeof ytPlayerRef.current.unMute === 'function') {
          ytPlayerRef.current.unMute();
        } else if (func === 'setVolume' && typeof ytPlayerRef.current.setVolume === 'function') {
          ytPlayerRef.current.setVolume(args[0]);
        } else if (func === 'stopVideo' && typeof ytPlayerRef.current.stopVideo === 'function') {
          ytPlayerRef.current.stopVideo();
        }
      } catch (e) {
        console.warn('[MiniMusicBar] YT.Player call warning:', e);
      }
    }

    // 2. Direct postMessage fallback (100% reliable across iframe states)
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (_) {}
    }
  };

  // Attach YT.Player when iframe is rendered or reloaded
  const initYouTubePlayer = () => {
    if (typeof window === 'undefined' || !(window as any).YT?.Player || !iframeRef.current) return;
    try {
      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              // Sync volume on player ready
              const vol = isMusicMuted ? 0 : Math.round(musicVolume * 100);
              if (isMusicMuted) {
                ytPlayerRef.current?.mute?.();
              } else {
                ytPlayerRef.current?.unMute?.();
                ytPlayerRef.current?.setVolume?.(vol);
              }
              if (musicTrack?.isPlaying) {
                ytPlayerRef.current?.playVideo?.();
              } else {
                ytPlayerRef.current?.pauseVideo?.();
              }
            },
          },
        });
      }
    } catch (_) {}
  };

  // Sync volume and mute across BOTH HTML5 Audio and YouTube Iframe (Dual-Channel 100% Effective)
  useEffect(() => {
    const volPercent = Math.round(musicVolume * 100);

    // Channel 1: HTML5 Audio
    if (audioRef.current) {
      audioRef.current.muted = isMusicMuted;
      audioRef.current.volume = isMusicMuted ? 0 : musicVolume;
    }

    // Channel 2: YouTube Player
    if (isMusicMuted) {
      sendYouTubeCommand('mute');
      sendYouTubeCommand('setVolume', [0]);
    } else {
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [volPercent]);
    }
  }, [musicVolume, isMusicMuted]);

  // Sync play/pause state across BOTH HTML5 audio and YouTube iframe
  useEffect(() => {
    if (!musicTrack) return;

    if (musicTrack.isPlaying) {
      if (musicTrack.audioStreamUrl && audioRef.current) {
        audioRef.current.play().catch((e) => {
          console.warn('[MiniMusicBar] Audio autoplay prevented:', e);
          setPlaybackError(true);
        });
      }
      sendYouTubeCommand('playVideo');
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      sendYouTubeCommand('pauseVideo');
    }
  }, [musicTrack?.isPlaying, musicTrack?.audioStreamUrl]);

  // Handle direct control events (stop, pause, play) with instant synchronous dual-action
  useEffect(() => {
    const handleMusicAction = (e: CustomEvent) => {
      const action = e.detail?.action;
      if (action === 'stop') {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        sendYouTubeCommand('stopVideo');
        sendYouTubeCommand('pauseVideo');
      } else if (action === 'pause') {
        if (audioRef.current) audioRef.current.pause();
        sendYouTubeCommand('pauseVideo');
      } else if (action === 'play') {
        if (audioRef.current && musicTrack?.audioStreamUrl) {
          audioRef.current.play().catch(() => {});
        }
        sendYouTubeCommand('playVideo');
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
              : 'fixed -top-[9999px] -left-[9999px] w-80 h-44 opacity-0 pointer-events-none'
          }
        >
          <div className="w-full max-w-[480px] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl relative bg-black">
            <iframe
              id="boai-youtube-iframe"
              ref={iframeRef}
              src={musicTrack.embedUrl}
              title={musicTrack.title}
              onLoad={initYouTubePlayer}
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


