import React from 'react';

interface AudioLevelMeterProps {
  level: number; // 0 to 100
  threshold?: number; // Wake word threshold (0-100)
  label?: string;
  isTesting?: boolean;
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = React.memo(({
  level,
  threshold = 75,
  label = 'ระดับเสียงไมค์สด (Microphone Level)',
  isTesting = false,
}) => {
  // Normalize level
  const clamped = Math.max(0, Math.min(100, level));

  const getMeterColor = (val: number) => {
    if (val > 85) return 'bg-rose-500';
    if (val > 60) return 'bg-amber-400';
    if (val > 30) return 'bg-cyan-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {isTesting && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              กำลังวัดสัญญาณ
            </span>
          )}
          <span className="font-mono text-slate-400">{clamped}%</span>
        </div>
      </div>

      {/* Meter Bar Container */}
      <div className="relative h-3 w-full bg-slate-900/90 rounded-full border border-white/10 overflow-hidden p-0.5">
        {/* Dynamic Level Fill */}
        <div
          className={`h-full rounded-full transition-all duration-75 ${getMeterColor(clamped)} shadow-[0_0_12px_rgba(0,240,255,0.4)]`}
          style={{ width: `${clamped}%` }}
        />

        {/* Wake Word Threshold Marker */}
        {threshold && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            style={{ left: `${threshold}%` }}
            title={`เกณฑ์ตรวจจับ Wake Word: ${threshold}%`}
          />
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
        <span>-60 dB (เงียบ)</span>
        <span>เกณฑ์คำเรียก: {threshold}%</span>
        <span>0 dB (ดังสุด)</span>
      </div>
    </div>
  );
});
