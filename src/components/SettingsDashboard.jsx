import React, { useState, useEffect } from 'react';
import {
  Mic,
  Cpu,
  Sparkles,
  Keyboard,
  History as HistoryIcon,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Save,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  Plus,
  Compass,
  Zap,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Download,
  Info,
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { AudioRecorder } from '../utils/audioRecorder';

import Logo from './Logo';

export default function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState('provider'); // 'provider' | 'presets' | 'shortcuts' | 'history' | 'about'
  const [config, setConfig] = useState(null);
  const [activeProviderId, setActiveProviderId] = useState('omniroute');

  // Provider Form State
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [language, setLanguage] = useState('auto');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(1500);

  // Model Discovery & Search Filter
  const [serverModels, setServerModels] = useState([]);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);

  // Live Test States
  const [testSTTStatus, setTestSTTStatus] = useState(null);
  const [testAIStatus, setTestAIStatus] = useState(null);

  // Presets Tab State
  const [presetsList, setPresetsList] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetForm, setPresetForm] = useState({
    id: '',
    name: '',
    icon: '✨',
    system_prompt: '',
    user_prompt_template: '{transcription}',
  });

  // Shortcuts & Audio Tab State
  const [hotkey, setHotkey] = useState('F8');
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedMicIndex, setSelectedMicIndex] = useState(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(40);
  const [autoPaste, setAutoPaste] = useState(true);
  const [autostartOnBoot, setAutostartOnBoot] = useState(true);

  // History Tab State
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Global Status Banner
  const [statusBanner, setStatusBanner] = useState(null);

  // Load config on mount
  useEffect(() => {
    async function load() {
      if (window.electronAPI) {
        const conf = await window.electronAPI.getConfig();
        setConfig(conf);

        const currentPid = conf.active_provider || 'omniroute';
        setActiveProviderId(currentPid);
        loadProviderIntoForm(currentPid, conf);

        setPresetsList(conf.presets || []);
        if (conf.presets && conf.presets.length > 0) {
          const p = conf.presets[0];
          setSelectedPresetId(p.id);
          setPresetForm(p);
        }

        setHotkey(conf.hotkeys?.record_toggle || 'F8');
        setSoundEffectsEnabled(conf.ui?.sound_effects ?? true);
        setSoundVolume(Math.round((conf.ui?.sound_volume ?? 0.4) * 100));
        setAutoPaste(conf.typing?.auto_paste ?? true);
        setAutostartOnBoot(conf.ui?.autostart_on_boot ?? true);
        setSelectedMicIndex(conf.audio?.input_device_index ?? null);

        // Load Audio Devices
        const devs = await AudioRecorder.getAudioDevices();
        setAudioDevices(devs);

        // Load History
        const hist = await window.electronAPI.getHistory();
        setHistoryEntries(hist);
        if (hist.length > 0) setSelectedHistoryItem(hist[0]);
      }
    }
    load();
  }, []);

  const loadProviderIntoForm = (pid, conf = config) => {
    const prov = conf?.providers?.[pid] || {};
    setBaseUrl(prov.base_url || '');
    setApiKey(prov.api_key || '');
    setSelectedModel(prov.model || 'antigravity/gemini-3.5-flash-low');
    setLanguage(prov.language || 'auto');
    setTemperature(conf?.llm?.temperature ?? 0.3);
    setMaxTokens(conf?.llm?.max_tokens ?? 1500);
    setServerModels([]);
    setModelSearchQuery('');
  };

  const handleSwitchProvider = (newPid) => {
    saveCurrentProviderBuffer(activeProviderId);
    setActiveProviderId(newPid);
    loadProviderIntoForm(newPid);
    showBanner(`Loaded profile: ${newPid.toUpperCase()}`, 'info');
  };

  const saveCurrentProviderBuffer = (pid) => {
    if (!config) return;
    const updated = {
      ...config,
      providers: {
        ...config.providers,
        [pid]: {
          name: pid.toUpperCase(),
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model: selectedModel.trim(),
          language: language.trim() || 'auto',
        },
      },
    };
    setConfig(updated);
    return updated;
  };

  // Fetch Models from server
  const handleFetchModels = async () => {
    if (!baseUrl) {
      setTestSTTStatus({ success: false, msg: 'Base URL is required' });
      return;
    }
    setFetchingModels(true);
    setTestSTTStatus({ loading: true, msg: 'Filtering & discovering Voice/STT models from server...' });

    const res = await window.electronAPI.fetchModels(baseUrl.trim(), apiKey.trim());
    setFetchingModels(false);

    if (res.success && res.models.length > 0) {
      setServerModels(res.models);
      if (!res.models.includes(selectedModel)) {
        setSelectedModel(res.models[0]);
      }
      setTestSTTStatus({ success: true, msg: `✅ Found ${res.models.length} Voice/STT Capable Models!` });
    } else {
      setTestSTTStatus({ success: false, msg: res.error || 'Failed to retrieve audio models' });
    }
  };

  // Test STT
  const handleTestSTT = async () => {
    setTestAIStatus(null);
    setTestSTTStatus({ loading: true, msg: 'Testing Voice STT endpoint...' });
    const res = await window.electronAPI.testSTT({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: selectedModel.trim(),
      language,
    });
    setTestSTTStatus(res);
  };

  // Test AI
  const handleTestAI = async () => {
    setTestSTTStatus(null);
    setTestAIStatus({ loading: true, msg: 'Contacting AI Refiner...' });
    const res = await window.electronAPI.refineText(
      'FreeWispr test voice input.',
      { id: 'test', system_prompt: "Reply with 'Connected OK'." },
      {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: selectedModel.trim(),
        temperature: 0.1,
      }
    );
    if (res.success) {
      setTestAIStatus({ success: true, msg: `AI Connected! (Response: "${res.text.slice(0, 30)}")` });
    } else {
      setTestAIStatus({ success: false, msg: res.error || 'AI Connection failed' });
    }
  };

  // Preset Selection
  const handleSelectPreset = (p) => {
    saveCurrentPresetBuffer();
    setSelectedPresetId(p.id);
    setPresetForm(p);
  };

  const saveCurrentPresetBuffer = () => {
    if (!selectedPresetId) return;
    setPresetsList((prev) =>
      prev.map((p) => (p.id === selectedPresetId ? { ...p, ...presetForm } : p))
    );
  };

  const handleAddNewPreset = () => {
    saveCurrentPresetBuffer();
    const newId = `custom_${Date.now()}`;
    const newP = {
      id: newId,
      name: 'Custom AI Mode',
      icon: '⚡',
      system_prompt: 'You are a helpful voice typing assistant. Clean and organize the speech directly.',
      user_prompt_template: 'Format this speech:\n\n{transcription}',
    };
    setPresetsList((prev) => [...prev, newP]);
    setSelectedPresetId(newId);
    setPresetForm(newP);
  };

  const handleDeletePreset = (id) => {
    if (presetsList.length <= 1) {
      alert('You must keep at least one preset mode.');
      return;
    }
    const filtered = presetsList.filter((p) => p.id !== id);
    setPresetsList(filtered);
    setSelectedPresetId(filtered[0].id);
    setPresetForm(filtered[0]);
  };

  // Hotkey Recorder
  const handleToggleHotkeyRecording = () => {
    if (isRecordingHotkey) {
      setIsRecordingHotkey(false);
      window.removeEventListener('keydown', handleKeyDown);
    } else {
      setIsRecordingHotkey(true);
      window.addEventListener('keydown', handleKeyDown);
    }
  };

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const key = e.key.toUpperCase();
    const modifiers = [];
    if (e.ctrlKey && key !== 'CONTROL') modifiers.push('Ctrl');
    if (e.altKey && key !== 'ALT') modifiers.push('Alt');
    if (e.shiftKey && key !== 'SHIFT') modifiers.push('Shift');

    const cleanKey = key === ' ' ? 'Space' : key;
    const finalKey = [...modifiers, cleanKey].join('+');

    setHotkey(finalKey);
    setIsRecordingHotkey(false);
    window.removeEventListener('keydown', handleKeyDown);
  };

  // Sound Test
  const handleTestSound = () => {
    soundFx.playStart(soundVolume / 100);
  };

  // Toggle Windows auto-start immediately (no need to press Save)
  const handleAutostartChange = async (enabled) => {
    setAutostartOnBoot(enabled);
    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateConfig({
          ui: {
            ...(config?.ui || {}),
            autostart_on_boot: enabled,
          },
        });
        setConfig(updated);
      }
      showBanner(
        enabled
          ? '✅ FreeWispr will start automatically with Windows.'
          : 'FreeWispr Windows auto-start has been disabled.',
        enabled ? 'success' : 'info'
      );
    } catch (e) {
      setAutostartOnBoot(!enabled);
      showBanner(`Auto-start update failed: ${e.message}`, 'error');
    }
  };

  // Save All Settings
  const handleSaveAll = async () => {
    try {
      saveCurrentPresetBuffer();

      const updatedProviders = {
        ...(config?.providers || {}),
        [activeProviderId]: {
          name: activeProviderId.toUpperCase(),
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model: selectedModel.trim(),
          language: language.trim() || 'auto',
        },
      };

      const finalConfig = {
        ...config,
        active_provider: activeProviderId,
        providers: updatedProviders,
        presets: presetsList,
        active_preset_id: config?.active_preset_id || 'smart_polish',
        hotkeys: {
          ...config?.hotkeys,
          record_toggle: hotkey,
        },
        ui: {
          ...config?.ui,
          sound_effects: soundEffectsEnabled,
          sound_volume: soundVolume / 100,
          autostart_on_boot: autostartOnBoot,
        },
        typing: {
          ...config?.typing,
          auto_paste: autoPaste,
        },
        audio: {
          ...config?.audio,
          input_device_index: selectedMicIndex,
        },
      };

      if (window.electronAPI) {
        await window.electronAPI.saveConfig(finalConfig);
        setConfig(finalConfig);
      }

      showBanner('✅ All Settings & API Keys Saved Permanently!', 'success');
    } catch (e) {
      showBanner(`Error saving settings: ${e.message}`, 'error');
    }
  };

  const showBanner = (msg, type = 'success') => {
    setStatusBanner({ msg, type });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const filteredModels = (serverModels.length > 0 ? serverModels : [selectedModel]).filter((m) =>
    m.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0C13] text-[#F8FAFC] select-none overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#1E2235] bg-[#0E101A]">
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              FreeWispr Control Center
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                v1.1.0
              </span>
            </h1>
            <p className="text-[11px] text-[#8E98B0]">Multi-Provider AI Voice Engine & Dictation Profiles</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.electronAPI && window.electronAPI.centerWidget()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#232740] text-violet-300 text-xs font-semibold border border-[#282C44] transition-colors"
          >
            <Compass size={13} />
            Center Floating Widget
          </button>
        </div>
      </header>

      {/* 2. NAVIGATION TABS */}
      <nav className="flex items-center px-6 gap-2 border-b border-[#1E2235] bg-[#0E101A]/60">
        {[
          { id: 'provider', label: 'AI & Voice Provider', icon: Cpu },
          { id: 'presets', label: 'Prompts & Modes', icon: Sparkles },
          { id: 'shortcuts', label: 'Shortcuts & Mic', icon: Keyboard },
          { id: 'history', label: 'History & Logs', icon: HistoryIcon },
          { id: 'about', label: 'Updates & About', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-violet-500 text-white bg-violet-500/10'
                  : 'border-transparent text-[#8E98B0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-violet-400' : ''} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 3. TAB CONTENT AREA */}
      <main className="flex-1 p-6 overflow-y-auto bg-[#0B0C13]">
        {/* ==================== TAB 1: AI & VOICE PROVIDER ==================== */}
        {activeTab === 'provider' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Provider Switcher Chips */}
            <div className="p-3.5 rounded-2xl bg-[#131522] border border-[#25283D]">
              <label className="text-xs font-bold text-[#E2E8F0] block mb-2.5">Active Provider Profile:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'omniroute', label: '⚡ OmniRoute (VPS)', icon: Zap },
                  { id: 'openrouter', label: '🌐 OpenRouter AI', icon: Globe },
                  { id: 'groq', label: '🚀 Groq (Whisper)', icon: Radio },
                  { id: 'openai', label: '🟢 OpenAI Official', icon: Cpu },
                  { id: 'custom_vps', label: '🖥️ Custom VPS', icon: Cpu },
                ].map((p) => {
                  const isSelected = activeProviderId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchProvider(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-[0_0_16px_rgba(124,58,237,0.4)] border border-violet-400'
                          : 'bg-[#1C1F33] text-[#CBD5E1] hover:bg-[#252A45] border border-[#2B2E48]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Credentials */}
            <div className="p-4.5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#E2E8F0] block mb-1">API Base URL (Endpoint):</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://omniroute.shadin.info/v1"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#E2E8F0] block mb-1">
                  API Key (Secret for {activeProviderId.toUpperCase()}):
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pr-10 pl-3.5 py-2 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 text-[#8E98B0] hover:text-white transition-colors"
                    title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Model Selector & Live Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#E2E8F0]">Selected AI Model:</label>
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#22253D] hover:bg-[#2F3456] text-violet-300 text-[11px] font-bold border border-violet-500/30 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={fetchingModels ? 'animate-spin' : ''} />
                    {fetchingModels ? 'Fetching...' : '🔄 Fetch Models from Server'}
                  </button>
                </div>

                {/* Model Search Box */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-[#8E98B0]" />
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="🔍 Search or filter model name..."
                    className="w-full pl-8 pr-3.5 py-1.5 rounded-xl bg-[#161828] border border-[#2A2E47] text-white text-xs font-mono placeholder:text-[#64748B] focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Model Dropdown */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono focus:outline-none focus:border-violet-500"
                >
                  {filteredModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language & Temperature */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#E2E8F0] block mb-1">Language (auto/bn/en):</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-1.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#E2E8F0] block mb-1">Temperature ({temperature}):</label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 h-2 bg-[#1A1D2F] rounded-lg cursor-pointer mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Test Action Box */}
            <div className="p-3.5 rounded-2xl bg-[#131522] border border-[#25283D] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleTestSTT}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                >
                  🔍 Test Voice STT
                </button>
                <button
                  onClick={handleTestAI}
                  className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                >
                  ⚡ Test AI Refiner
                </button>
              </div>

              {/* Status Pill */}
              {(testSTTStatus || testAIStatus) && (
                <div className="text-xs font-medium truncate max-w-sm">
                  {testSTTStatus && (
                    <span className={testSTTStatus.loading ? 'text-amber-400 animate-pulse' : testSTTStatus.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {testSTTStatus.msg}
                    </span>
                  )}
                  {testAIStatus && !testSTTStatus && (
                    <span className={testAIStatus.loading ? 'text-amber-400 animate-pulse' : testAIStatus.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {testAIStatus.msg}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PROMPTS & MODES ==================== */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto h-[480px]">
            {/* Mode List */}
            <div className="p-3.5 rounded-2xl bg-[#131522] border border-[#25283D] flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-[#E2E8F0] block mb-2.5">Available Modes:</label>
                <div className="space-y-1.5 overflow-y-auto max-h-[360px] pr-1">
                  {presetsList.map((p) => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white font-bold border border-violet-400 shadow-md'
                            : 'bg-[#1A1D2F] text-[#CBD5E1] hover:bg-[#252840]'
                        }`}
                      >
                        <span className="truncate">
                          {p.icon || '✨'} {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2.5 border-t border-[#25283D]">
                <button
                  onClick={handleAddNewPreset}
                  className="flex-1 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Add Mode
                </button>
                <button
                  onClick={() => handleDeletePreset(selectedPresetId)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Mode Editor */}
            <div className="col-span-2 p-4 rounded-2xl bg-[#131522] border border-[#25283D] flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={presetForm.icon}
                  onChange={(e) => setPresetForm({ ...presetForm, icon: e.target.value })}
                  placeholder="✨"
                  className="w-11 text-center py-1.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-sm"
                />
                <input
                  type="text"
                  value={presetForm.name}
                  onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                  placeholder="Mode Name"
                  className="flex-1 px-3.5 py-1.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-bold"
                />
              </div>

              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-xs font-bold text-[#E2E8F0]">System Prompt (Formatting & Rules):</label>
                <textarea
                  value={presetForm.system_prompt}
                  onChange={(e) => setPresetForm({ ...presetForm, system_prompt: e.target.value })}
                  className="flex-1 w-full p-2.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono resize-none focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#E2E8F0]">User Prompt Template ({`{transcription}`}):</label>
                <input
                  type="text"
                  value={presetForm.user_prompt_template}
                  onChange={(e) => setPresetForm({ ...presetForm, user_prompt_template: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: SHORTCUTS & AUDIO ==================== */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Global Shortcut */}
            <div className="p-4.5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-2.5">
              <label className="text-xs font-bold text-[#E2E8F0] block">Global Voice Typing Shortcut:</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={hotkey}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-sm font-mono font-bold"
                />
                <button
                  onClick={handleToggleHotkeyRecording}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isRecordingHotkey
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-[#252840] hover:bg-[#34385C] text-violet-300 border border-violet-500/30'
                  }`}
                >
                  {isRecordingHotkey ? '⌨️ Press keys now...' : '🔴 Record Shortcut'}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1.5">
                <span className="text-[11px] text-[#8E98B0]">Quick presets:</span>
                {['F8', 'Ctrl+Alt+Space', 'Alt+Space', 'Ctrl+Shift+V'].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setHotkey(sc)}
                    className="px-2 py-0.5 rounded-md bg-[#1A1D2F] hover:bg-[#252840] text-[10px] font-mono font-bold text-[#CBD5E1] border border-[#2D314A]"
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Selector */}
            <div className="p-4.5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-1.5">
              <label className="text-xs font-bold text-[#E2E8F0] block">Microphone Audio Input Device:</label>
              <select
                value={selectedMicIndex || ''}
                onChange={(e) => setSelectedMicIndex(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#1A1D2F] border border-[#323754] text-white text-xs font-mono"
              >
                <option value="">Default System Microphone</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Feedback & Volume Slider */}
            <div className="p-4.5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#E2E8F0]">
                  <input
                    type="checkbox"
                    checked={soundEffectsEnabled}
                    onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
                    className="rounded bg-[#1A1D2F] border-[#323754] text-violet-600 focus:ring-0"
                  />
                  Enable audio cues when recording starts and stops
                </label>

                <button
                  onClick={handleTestSound}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#202338] hover:bg-[#2D3252] text-violet-300 text-xs font-semibold border border-violet-500/20"
                >
                  <Volume2 size={13} /> Test Sound
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#8E98B0]">
                  <span className="flex items-center gap-1">
                    {soundVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    Chime Volume: {soundVolume === 0 ? 'Muted / Off' : `${soundVolume}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-[#1A1D2F] rounded-lg cursor-pointer"
                />
              </div>

              {/* Auto Paste Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#E2E8F0] pt-2 border-t border-[#25283D]">
                <input
                  type="checkbox"
                  checked={autoPaste}
                  onChange={(e) => setAutoPaste(e.target.checked)}
                  className="rounded bg-[#1A1D2F] border-[#323754] text-violet-600 focus:ring-0"
                />
                Automatically paste polished text into active input field
              </label>

              {/* Windows Auto-Start Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#E2E8F0] pt-2 border-t border-[#25283D]">
                <input
                  type="checkbox"
                  checked={autostartOnBoot}
                  onChange={(e) => handleAutostartChange(e.target.checked)}
                  className="rounded bg-[#1A1D2F] border-[#323754] text-violet-600 focus:ring-0"
                />
                Start FreeWispr automatically when Windows starts
              </label>
              <p className="text-[10px] text-[#8E98B0] pl-5 -mt-2">
                FreeWispr will run quietly in the system tray after you sign in to Windows.
              </p>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: HISTORY ==================== */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto h-[480px]">
            {/* History List */}
            <div className="p-3.5 rounded-2xl bg-[#131522] border border-[#25283D] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-[#8E98B0]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#1A1D2F] border border-[#323754] text-xs text-white placeholder:text-[#64748B]"
                  />
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[360px] pr-1">
                  {historyEntries
                    .filter(
                      (h) =>
                        (h.refined_text && h.refined_text.toLowerCase().includes(historySearch.toLowerCase())) ||
                        (h.raw_text && h.raw_text.toLowerCase().includes(historySearch.toLowerCase()))
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedHistoryItem(item)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all ${
                          selectedHistoryItem?.id === item.id
                            ? 'bg-violet-600 text-white font-bold'
                            : 'bg-[#1A1D2F] text-[#CBD5E1] hover:bg-[#252840]'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-violet-300 opacity-80 mb-0.5">
                          <span>{item.preset_name || 'Speech'}</span>
                          <span>{item.timestamp?.split(' ')[1] || ''}</span>
                        </div>
                        <p className="truncate text-xs">{item.refined_text || item.raw_text}</p>
                      </button>
                    ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  if (confirm('Clear all voice history?')) {
                    await window.electronAPI.clearHistory();
                    setHistoryEntries([]);
                    setSelectedHistoryItem(null);
                  }
                }}
                className="w-full py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold transition-colors"
              >
                Clear History
              </button>
            </div>

            {/* History Details */}
            <div className="col-span-2 p-4 rounded-2xl bg-[#131522] border border-[#25283D] flex flex-col justify-between space-y-3">
              {selectedHistoryItem ? (
                <>
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Refined AI Output:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedHistoryItem.refined_text || '');
                          showBanner('Copied to clipboard!', 'success');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </label>
                    <div className="p-3 rounded-xl bg-[#1A1D2F] border border-[#323754] text-xs font-mono text-[#F1F5F9] max-h-44 overflow-y-auto">
                      {selectedHistoryItem.refined_text}
                    </div>

                    <label className="text-xs font-bold text-[#8E98B0] block pt-1.5">Raw Spoken Transcription:</label>
                    <div className="p-2.5 rounded-xl bg-[#161828] border border-[#2A2E47] text-xs text-[#94A3B8] max-h-24 overflow-y-auto font-mono">
                      {selectedHistoryItem.raw_text}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#64748B] flex justify-between border-t border-[#25283D] pt-2.5">
                    <span>Recorded: {selectedHistoryItem.timestamp}</span>
                    <span>Duration: {selectedHistoryItem.duration_seconds}s</span>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
                  Select a recording from the left to view transcript details
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 5: UPDATES & ABOUT ==================== */}
        {activeTab === 'about' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">FreeWispr Voice Assistant</h3>
                  <p className="text-xs text-[#8E98B0]">Version 1.1.0 (Electron + React Edition)</p>
                </div>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                উইন্ডোজের জন্য আধুনিক FreeWispr ভয়েস টাইপিং ও এআই সামারাইজার। এটি যেকোনো সক্রিয় অ্যাপে সরাসরি টেক্সট
                পেস্ট করে দিতে পারে এবং OmniRoute, OpenRouter, Groq ও OpenAI এর সাথে সংযুক্ত হতে পারে।
              </p>
            </div>

            {/* Updates Section */}
            <div className="p-5 rounded-2xl bg-[#131522] border border-[#25283D] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Check size={14} className="text-emerald-400" />
                  Your software is running the latest Electron + React Build (v1.1.0)
                </h4>
                <p className="text-[11px] text-[#8E98B0] mt-0.5">
                  ভবিষ্যতে কোনো নতুন রিলিজ বা আপডেট আসলে এখানে স্বয়ংক্রিয়ভাবে নোটিফিকেশন আসবে।
                </p>
              </div>

              <button
                onClick={async () => {
                  showBanner('Checking for updates...', 'info');
                  if (window.electronAPI) {
                    const info = await window.electronAPI.checkForUpdates();
                    showBanner(`✅ App is up to date! (v${info.latestVersion})`, 'success');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1F33] hover:bg-[#282D4A] text-xs font-bold text-violet-300 border border-[#2B2E48] transition-colors"
              >
                <RefreshCw size={12} /> Check for Updates
              </button>
            </div>

            {/* What's New in v1.1.0 */}
            <div className="p-5 rounded-2xl bg-[#131522] border border-[#25283D] space-y-2.5">
              <h4 className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                <Sparkles size={13} /> What's New in Version 1.1.0:
              </h4>
              <ul className="text-[11px] text-[#94A3B8] space-y-1.5 pl-4 list-disc">
                <li><span className="text-[#E2E8F0] font-semibold">F8 Double-Press Toggle:</span> ১ম বার F8 চাপলে স্টার্ট ও ২য় বার চাপলে ফিনিশ ও অটো-পেস্ট।</li>
                <li><span className="text-[#E2E8F0] font-semibold">Volume Control & Mute:</span> সাউন্ড ভলিউম ০% থেকে ১০০% নিয়ন্ত্রণের সুবিধা।</li>
                <li><span className="text-[#E2E8F0] font-semibold">Permanent SQLite DB:</span> পিসি রিস্টার্টেও API Key ও সেটিংস ১০০% সেভ থাকবে।</li>
                <li><span className="text-[#E2E8F0] font-semibold">Live Model Search:</span> সার্ভার মডেল ফিল্টারের জন্য রিয়েল-টাইম সার্চবার।</li>
                <li><span className="text-[#E2E8F0] font-semibold">API Key Eye Toggle:</span> পাসওয়ার্ডের মতো কি দেখার এবং লুকানোর সুবিধা।</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* 4. FOOTER STATUS & SAVE */}
      <footer className="flex items-center justify-between px-6 py-3.5 border-t border-[#1E2235] bg-[#0E101A]">
        <div>
          {statusBanner && (
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                statusBanner.type === 'success' ? 'text-emerald-400' : 'text-violet-400'
              }`}
            >
              <Check size={14} /> {statusBanner.msg}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.electronAPI && window.electronAPI.closeSettings()}
            className="px-4 py-2 rounded-xl bg-[#1A1D2F] hover:bg-[#252840] text-xs font-bold text-[#CBD5E1] transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-[0_0_16px_rgba(124,58,237,0.4)] transition-all active:scale-95"
          >
            <Save size={14} /> Save All Settings
          </button>
        </div>
      </footer>
    </div>
  );
}
