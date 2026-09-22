import React, { useState, useEffect, useRef } from 'react';
import { Mic, Settings, ChevronLeft, ChevronRight, Check, X, Loader2, AlertCircle, GripVertical } from 'lucide-react';
import { AudioRecorder } from '../utils/audioRecorder';
import { soundFx } from '../utils/soundEffects';

export default function FloatingWidget() {
  const [config, setConfig] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [state, setState] = useState('idle'); // 'idle' | 'recording' | 'transcribing' | 'refining' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Use refs to prevent React stale closure bugs in IPC hotkey events
  const stateRef = useRef(state);
  stateRef.current = state;

  const configRef = useRef(config);
  configRef.current = config;

  const recorderRef = useRef(null);
  const timerRef = useRef(null);

  // Load initial configuration
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        const conf = await window.electronAPI.getConfig();
        setConfig(conf);
        configRef.current = conf;
        setIsCollapsed(Boolean(conf.ui?.widget_collapsed));
      }
    }
    init();

    // Listen for global hotkey trigger with live ref state
    if (window.electronAPI) {
      const unsubToggle = window.electronAPI.onToggleRecord(() => {
        handleToggleRecording();
      });
      const unsubCycle = window.electronAPI.onCycleMode(() => {
        cycleNextPreset();
      });
      return () => {
        unsubToggle();
        unsubCycle();
      };
    }
  }, []);

  // Update window size when state or collapse changes
  useEffect(() => {
    if (!window.electronAPI) return;
    let w = isCollapsed ? 116 : 288;
    if (state === 'recording') w = 296;
    else if (state === 'transcribing' || state === 'refining') w = 256;
    else if (state === 'success') w = 236;
    else if (state === 'error') w = 266;

    window.electronAPI.setWidgetSize(w, 48);
  }, [isCollapsed, state]);

  // Recording Timer
  useEffect(() => {
    if (state === 'recording') {
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Audio level receiver
  useEffect(() => {
    recorderRef.current = new AudioRecorder((level) => {
      setAudioLevel(level);
    });
  }, []);

  // Toggle Collapse
  const handleToggleCollapse = (e) => {
    e.stopPropagation();
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (window.electronAPI) {
      window.electronAPI.updateConfig({
        ui: { ...configRef.current?.ui, widget_collapsed: next },
      });
    }
  };

  // Cycle Preset
  const cycleNextPreset = async () => {
    const curConf = configRef.current;
    if (!curConf || !curConf.presets) return;
    const presets = curConf.presets;
    const currentId = curConf.active_preset_id || 'smart_polish';
    const currIdx = presets.findIndex((p) => p.id === currentId);
    const nextPreset = presets[(currIdx + 1) % presets.length];

    if (window.electronAPI) {
      const updated = await window.electronAPI.updateConfig({
        active_preset_id: nextPreset.id,
      });
      setConfig(updated);
      configRef.current = updated;
    }
  };

  // Start Recording
  const startRecording = async () => {
    if (stateRef.current !== 'idle') return;

    let curConf = configRef.current;
    if (window.electronAPI) {
      curConf = await window.electronAPI.getConfig();
      setConfig(curConf);
      configRef.current = curConf;
    }

    const vol = curConf?.ui?.sound_effects ? curConf?.ui?.sound_volume ?? 0.4 : 0;
    const success = await recorderRef.current.start(curConf?.audio?.input_device_index);

    if (success) {
      soundFx.playStart(vol);
      setState('recording');
      stateRef.current = 'recording';
    } else {
      soundFx.playError(vol);
      showError('Mic access failed');
    }
  };

  // Cancel Recording
  const cancelRecording = (e) => {
    if (e) e.stopPropagation();
    recorderRef.current.cancel();
    const curConf = configRef.current;
    const vol = curConf?.ui?.sound_effects ? curConf?.ui?.sound_volume ?? 0.4 : 0;
    soundFx.playStop(vol);
    setState('idle');
    stateRef.current = 'idle';
  };

  // Finish Recording and Process Pipeline
  const finishRecording = async (e) => {
    if (e) e.stopPropagation();
    if (stateRef.current !== 'recording') return;

    const curConf = configRef.current;
    const vol = curConf?.ui?.sound_effects ? curConf?.ui?.sound_volume ?? 0.4 : 0;
    soundFx.playStop(vol);

    setState('transcribing');
    stateRef.current = 'transcribing';

    const { base64, duration } = await recorderRef.current.stop();

    if (!base64 || duration < 0.4) {
      setState('idle');
      stateRef.current = 'idle';
      return;
    }

    try {
      const latestConfig = (window.electronAPI ? await window.electronAPI.getConfig() : curConf) || curConf;
      const activeProviderId = latestConfig.active_provider || 'omniroute';
      const providerConfig = latestConfig.providers?.[activeProviderId] || {};
      const activePreset = latestConfig.presets?.find((p) => p.id === latestConfig.active_preset_id) || latestConfig.presets?.[0];

      // Ultra-Fast Turbo Pipeline
      const res = await window.electronAPI.processVoicePipeline(base64, activePreset, {
        baseUrl: providerConfig.base_url,
        apiKey: providerConfig.api_key,
        model: providerConfig.model,
        language: providerConfig.language,
        temperature: latestConfig.llm?.temperature ?? 0.2,
        maxTokens: latestConfig.llm?.max_tokens ?? 600,
      });

      if (!res.success || !res.finalText) {
        if (!res.finalText && !res.error) {
          // Silent recording with no words
          setState('idle');
          stateRef.current = 'idle';
          return;
        }
        showError(res.error || 'Processing failed');
        return;
      }

      const finalText = res.finalText;
      const rawText = res.rawText || finalText;

      // Immediate Auto-Paste into active input box
      if (finalText) {
        await window.electronAPI.autoPaste(finalText);
      }

      // Save to History asynchronously
      window.electronAPI.addHistory({
        raw_text: rawText,
        refined_text: finalText,
        preset_id: activePreset?.id,
        preset_name: activePreset?.name,
        duration_seconds: duration,
        pasted: true,
      });

      // Success state
      const preview = finalText.length > 14 ? finalText.slice(0, 13) + '..' : finalText;
      setStatusMessage(`Pasted: ${preview}`);
      setState('success');
      stateRef.current = 'success';
      setTimeout(() => {
        setState('idle');
        stateRef.current = 'idle';
      }, 1600);
    } catch (err) {
      showError(err.message || 'Processing error');
    }
  };

  const handleToggleRecording = () => {
    if (stateRef.current === 'idle') {
      startRecording();
    } else if (stateRef.current === 'recording') {
      finishRecording();
    }
  };

  const showError = (msg) => {
    const curConf = configRef.current;
    const vol = curConf?.ui?.sound_effects ? curConf?.ui?.sound_volume ?? 0.4 : 0;
    soundFx.playError(vol);
    setStatusMessage(msg.length > 22 ? msg.slice(0, 20) + '..' : msg);
    setState('error');
    stateRef.current = 'error';
    setTimeout(() => {
      setState('idle');
      stateRef.current = 'idle';
    }, 4000);
  };

  const activePreset = config?.presets?.find((p) => p.id === config.active_preset_id) || config?.presets?.[0];
  const hotkeyLabel = config?.hotkeys?.record_toggle || 'F8';

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{ WebkitAppRegion: 'drag' }}
      className={`h-[44px] w-full flex items-center justify-between px-2 rounded-full border transition-all duration-300 shadow-2xl backdrop-blur-xl cursor-grab active:cursor-grabbing ${
        state === 'recording'
          ? 'bg-[#150D17]/95 border-red-500/80 ring-1 ring-red-500/40'
          : state === 'transcribing' || state === 'refining'
          ? 'bg-[#131122]/95 border-violet-500/80 ring-1 ring-violet-500/40'
          : state === 'success'
          ? 'bg-[#0D1815]/95 border-emerald-500/80 ring-1 ring-emerald-500/40'
          : state === 'error'
          ? 'bg-[#180D11]/95 border-rose-500/80 ring-1 ring-rose-500/40'
          : 'bg-[#11131F]/95 border-[#2B2E48]/80 hover:border-[#3D4266]'
      }`}
    >
      {/* 1. RECORDING STATE VIEW */}
      {state === 'recording' && (
        <div className="flex items-center justify-between w-full">
          {/* Timer & Pulsing Dot */}
          <div className="flex items-center gap-1.5 pl-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-white">{formatTimer(elapsedSec)}</span>
          </div>

          {/* Dancing Audio Waveform */}
          <div className="flex items-center gap-1 px-3">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const h = Math.max(4, Math.min(22, 4 + audioLevel * 18 * Math.sin(Date.now() / 150 + i)));
              return (
                <div
                  key={i}
                  style={{ height: `${h}px` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    i % 2 === 0 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]'
                  }`}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              style={{ WebkitAppRegion: 'no-drag' }}
              onClick={cancelRecording}
              className="p-1.5 rounded-full bg-rose-950/80 text-rose-300 hover:bg-rose-900 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            <button
              style={{ WebkitAppRegion: 'no-drag' }}
              onClick={finishRecording}
              className="p-1.5 rounded-full bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer"
              title="Done & Paste"
            >
              <Check size={13} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* 2. PROCESSING STATE VIEW */}
      {(state === 'transcribing' || state === 'refining') && (
        <div className="flex items-center justify-center w-full gap-2 px-2">
          <Loader2 size={15} className="text-violet-400 animate-spin" />
          <span className="text-xs font-semibold text-white tracking-wide">
            {state === 'transcribing' ? 'Transcribing audio...' : 'Refining with AI...'}
          </span>
        </div>
      )}

      {/* 3. SUCCESS VIEW */}
      {state === 'success' && (
        <div className="flex items-center justify-center w-full gap-2 px-2 text-emerald-400">
          <Check size={15} strokeWidth={3} />
          <span className="text-xs font-bold truncate max-w-[170px]">{statusMessage}</span>
        </div>
      )}

      {/* 4. ERROR VIEW */}
      {state === 'error' && (
        <div className="flex items-center justify-between w-full px-1 text-rose-400">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle size={14} />
            <span className="text-xs font-bold truncate max-w-[180px]">{statusMessage}</span>
          </div>
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={() => { setState('idle'); stateRef.current = 'idle'; }}
            className="p-1 hover:text-white cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 5. IDLE STATE: MINI VIEW */}
      {state === 'idle' && isCollapsed && (
        <div className="flex items-center justify-between w-full">
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={startRecording}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-all shadow-[0_0_14px_rgba(124,58,237,0.5)] border border-violet-400/30 cursor-pointer"
          >
            <Mic size={13} strokeWidth={2.5} />
            <span className="text-[10px] font-mono font-bold tracking-wider">{hotkeyLabel}</span>
          </button>

          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={handleToggleCollapse}
            className="p-1 text-[#8E98B0] hover:text-white transition-colors cursor-pointer"
            title="Expand"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* 6. IDLE STATE: EXPANDED VIEW */}
      {state === 'idle' && !isCollapsed && (
        <div className="flex items-center justify-between w-full gap-1">
          {/* Drag Handle Grip */}
          <div className="text-[#4E5474] hover:text-violet-400 px-0.5 flex items-center cursor-grab active:cursor-grabbing">
            <GripVertical size={13} strokeWidth={2.5} />
          </div>

          {/* Mic Trigger */}
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={startRecording}
            className="p-2 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-all shadow-[0_0_14px_rgba(124,58,237,0.5)] border border-violet-400/30 active:scale-95 flex items-center justify-center cursor-pointer"
            title="Start Voice Typing"
          >
            <Mic size={14} strokeWidth={2.5} />
          </button>

          {/* Active Mode Pill */}
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={cycleNextPreset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1F33] hover:bg-[#282D4A] text-violet-300 text-[11px] font-bold transition-colors truncate max-w-[125px] cursor-pointer"
            title="Click to Switch Mode"
          >
            <span>{activePreset?.icon || '✨'}</span>
            <span className="truncate">{activePreset?.name || 'Smart Polish'}</span>
          </button>

          {/* Hotkey Badge */}
          <span className="text-[10px] font-mono font-bold text-[#8E98B0] bg-[#161828] px-2 py-0.5 rounded-md border border-[#282C44]">
            {hotkeyLabel}
          </span>

          {/* Settings */}
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={() => window.electronAPI && window.electronAPI.openSettings()}
            className="p-1.5 text-[#8E98B0] hover:text-white transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            title="Settings & Prompts"
          >
            <Settings size={14} />
          </button>

          {/* Collapse Button */}
          <button
            style={{ WebkitAppRegion: 'no-drag' }}
            onClick={handleToggleCollapse}
            className="p-1 text-[#8E98B0] hover:text-white transition-colors cursor-pointer"
            title="Collapse to Mini"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
