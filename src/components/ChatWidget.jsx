import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Copy,
  Check,
  Trash2,
  X,
  Sparkles,
  Bot,
  User,
  Loader2,
  ChevronDown,
  ArrowDown,
} from 'lucide-react';
import Logo from './Logo';
import { AudioRecorder } from '../utils/audioRecorder';
import { soundFx } from '../utils/soundEffects';

export default function ChatWidget({ isEmbedded = false, onClose }) {
  const [config, setConfig] = useState(null);
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState('bn_to_banglish');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const recorderRef = useRef(null);
  const configRef = useRef(null);

  // Load initial config and active mode
  useEffect(() => {
    async function load() {
      if (window.electronAPI) {
        const conf = await window.electronAPI.getConfig();
        setConfig(conf);
        configRef.current = conf;
        const pList = conf.presets || [];
        setPresets(pList);
        const curMode = conf.active_preset_id || 'bn_to_banglish';
        setActivePresetId(curMode);

        const activeP = pList.find((p) => p.id === curMode) || pList[0];
        // Set initial welcome greeting
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: getWelcomeMessage(activeP),
            modeName: activeP?.name || 'FreeWispr AI',
            modeIcon: activeP?.icon || '✨',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
    load();

    recorderRef.current = new AudioRecorder((level) => {
      setAudioLevel(level);
    });
  }, []);

  // Track scroll position to show/hide "Scroll to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isFarFromBottom);
  };

  // Dedicated container-only scroll to bottom (never scrolls the window or body)
  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Auto-scroll inside the container on new messages or loading changes
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isLoading]);

  const activePreset = presets.find((p) => p.id === activePresetId) || presets[0] || {
    id: 'bn_to_banglish',
    name: 'Bangla to Banglish (Smart Polish)',
    icon: '🔤',
  };

  function getWelcomeMessage(preset) {
    const id = preset?.id || 'bn_to_banglish';
    if (id === 'bn_to_banglish') {
      return 'Hey! Ami FreeWispr AI assistant. Ekhon "Bangla to Banglish" mode active ache. Apni jeikono proshno ba kotha bolun, ami shundor natural Banglish e reply dibo!';
    }
    if (id === 'bn_to_en') {
      return 'Hello! I am your FreeWispr AI Assistant. "Bangla to English" mode is active. Ask me anything or share your thoughts, and I will help in fluent, professional English!';
    }
    if (id === 'smart_polish') {
      return 'হ্যালো! আমি FreeWispr AI অ্যাসিস্ট্যান্ট। "Smart Polish" মোড সক্রিয় আছে। যেকোনো কথা লিখুন বা বলুন, আমি পরিচ্ছন্ন ও শুদ্ধ ভাষায় আপনাকে উত্তর দেব!';
    }
    if (id === 'summary') {
      return 'স্বাগতম! "Executive Summary" মোড সক্রিয় রয়েছে। যেকোনো বড় লেখা বা বিষয় বলুন, আমি পয়েন্ট আকারে সামারি করে দেব!';
    }
    if (id === 'email') {
      return 'Hello! "Professional Email" mode is active. Let me know what you want to communicate, and I will format it into a polished business message!';
    }
    if (id === 'dev_notes') {
      return 'Developer mode active! Ask coding questions, bug fixes, or architecture ideas — I will provide clean markdown, checklists, and code snippets.';
    }
    if (id === 'prompt_engineer') {
      return 'হ্যালো! "Prompt Engineer" মোড সক্রিয় আছে। যেকোনো কাজের বর্ণনা দিন বা বলুন, আমি চমৎকার ও গোছানো AI Prompt তৈরি করে দেব!';
    }
    return `Hello! FreeWispr AI is ready in "${preset?.name || 'Active'}" mode. How can I help you today?`;
  }

  // Handle switching mode inside the chat
  const handleSelectMode = (preset) => {
    setActivePresetId(preset.id);
    setShowModeDropdown(false);
    if (window.electronAPI) {
      window.electronAPI.updateConfig({ active_preset_id: preset.id });
    }
    // Add a small system note in conversation
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        text: getWelcomeMessage(preset),
        modeName: preset.name,
        modeIcon: preset.icon,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Send Chat Message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      if (window.electronAPI) {
        // Format history for LLM (filter out welcome greeting if necessary)
        const chatPayload = newHistory
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({
            role: m.role,
            content: m.text,
          }));

        const res = await window.electronAPI.sendChatMessage(chatPayload, activePresetId);

        if (res.success && res.text) {
          const aiMsg = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: res.text,
            modeName: activePreset.name,
            modeIcon: activePreset.icon,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              text: `⚠️ Error: ${res.error || 'Failed to get AI response. Please verify API Key in Settings.'}`,
              isError: true,
              modeName: 'Error',
              modeIcon: '⚠️',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `⚠️ Request error: ${err.message || 'Connection failed'}`,
          isError: true,
          modeName: 'Error',
          modeIcon: '⚠️',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Enter sends, Shift+Enter new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice recording directly into chat input
  const handleToggleVoice = async () => {
    if (isRecording) {
      // Stop and transcribe
      setIsRecording(false);
      const conf = configRef.current || config;
      const vol = conf?.ui?.sound_effects ? conf?.ui?.sound_volume ?? 0.4 : 0;
      soundFx.playStop(vol);

      const { base64, duration } = await recorderRef.current.stop();
      if (!base64 || duration < 0.4) return;

      setIsLoading(true);
      try {
        const latestConf = await window.electronAPI.getConfig();
        const activePid = latestConf.active_provider || 'omniroute';
        const prov = latestConf.providers?.[activePid] || {};

        const res = await window.electronAPI.processVoicePipeline(base64, activePreset, {
          baseUrl: prov.base_url,
          apiKey: prov.api_key,
          model: prov.model,
          language: prov.language,
          temperature: latestConf.llm?.temperature ?? 0.2,
          maxTokens: 500,
          outputLanguage: latestConf.output_language || 'auto',
        });

        if (res.success && res.finalText) {
          setInputText((prev) => (prev ? `${prev} ${res.finalText}` : res.finalText));
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      } catch (err) {
        console.error('Voice input error:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Start recording
      const conf = configRef.current || config;
      const vol = conf?.ui?.sound_effects ? conf?.ui?.sound_volume ?? 0.4 : 0;
      const success = await recorderRef.current.start(conf?.audio?.input_device_index);
      if (success) {
        soundFx.playStart(vol);
        setIsRecording(true);
      } else {
        soundFx.playError(vol);
      }
    }
  };

  // 1-Click Copy
  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: getWelcomeMessage(activePreset),
        modeName: activePreset.name,
        modeIcon: activePreset.icon,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (window.electronAPI) {
      window.electronAPI.closeChat();
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden select-none ${
        isEmbedded
          ? 'bg-[#0B0C15] border border-violet-500/25 rounded-2xl shadow-xl'
          : 'bg-gradient-to-b from-[#101326] via-[#0B0C16] to-[#07080E] border-2 border-violet-500/40 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.35),0_20px_50px_rgba(0,0,0,0.9)] ring-1 ring-violet-400/20'
      }`}
    >
      {/* 1. TOP HEADER / TITLEBAR */}
      <header
        style={{ WebkitAppRegion: isEmbedded ? 'no-drag' : 'drag' }}
        className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#121528] via-[#0E101E] to-[#121528] border-b border-violet-500/25 select-none"
      >
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1.5">
              FreeWispr AI Chat
            </h2>
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ready
            </span>
          </div>
        </div>

        {/* Mode Selector Dropdown Pill */}
        <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 text-[11px] font-bold border border-violet-500/30 hover:border-violet-400 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
            title="Switch Mode for AI Chat"
          >
            <span>{activePreset?.icon || '✨'}</span>
            <span className="truncate max-w-[125px]">{activePreset?.name || 'Mode'}</span>
            <ChevronDown size={11} className={showModeDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {showModeDropdown && (
            <div className="absolute right-0 mt-2 w-64 py-1.5 rounded-2xl bg-[#121527] border border-violet-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-2xl">
              <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-violet-400/80 tracking-wider border-b border-[#202540]">
                Select AI Chat Mode
              </div>
              <div className="max-h-64 overflow-y-auto py-1 chat-scroll">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectMode(p)}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2 hover:bg-violet-600/20 transition-colors cursor-pointer ${
                      p.id === activePresetId ? 'text-violet-200 font-bold bg-violet-600/15' : 'text-[#CBD5E1]'
                    }`}
                  >
                    <span className="text-sm">{p.icon || '✨'}</span>
                    <span className="truncate">{p.name}</span>
                    {p.id === activePresetId && <Check size={12} className="ml-auto text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-[#8E98B0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 size={13} />
          </button>
          {!isEmbedded && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[#8E98B0] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* 2. MODE INFO BANNER */}
      <div className="shrink-0 px-4 py-1.5 bg-gradient-to-r from-violet-950/30 via-[#101222] to-violet-950/20 border-b border-violet-500/15 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles size={11} className="text-violet-400 shrink-0" />
          <span className="truncate">
            Active Mode:{' '}
            <strong className="text-violet-300 font-semibold">{activePreset?.name}</strong>
          </span>
        </div>
        <span className="text-[10px] text-[#64748B] shrink-0 font-mono px-2 py-0.5 rounded-md bg-[#141728] border border-[#232742]">
          {activePresetId === 'bn_to_banglish' ? 'Replies in Banglish' : activePresetId === 'prompt_engineer' ? 'Structured Prompts' : 'Smart Voice'}
        </span>
      </div>

      {/* 3. MESSAGE LIST CONTAINER (Scrollable Area) */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3.5 chat-scroll relative select-text"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.5)] border border-violet-400/40'
                    : 'bg-[#15182C] text-violet-400 border border-violet-500/25 shadow-sm'
                }`}
              >
                {isUser ? <User size={13} /> : <span className="text-xs">{m.modeIcon || '🤖'}</span>}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed transition-all relative group ${
                  isUser
                    ? 'bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 text-white rounded-tr-none shadow-[0_4px_16px_rgba(124,58,237,0.35)] border border-violet-400/30'
                    : m.isError
                    ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-tl-none shadow-md'
                    : 'bg-[#14172B] border border-violet-500/20 hover:border-violet-500/35 text-[#E2E8F0] rounded-tl-none shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
                }`}
              >
                {/* Header Tag for Assistant messages */}
                {!isUser && (
                  <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-violet-500/15 text-[10px] text-[#8E98B0]">
                    <span className="font-semibold text-violet-300 flex items-center gap-1">
                      <span>{m.modeIcon}</span>
                      <span>{m.modeName}</span>
                    </span>
                    <button
                      onClick={() => handleCopyMessage(m.id, m.text)}
                      className="px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[#8E98B0] hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-white/5"
                      title="Copy Response"
                    >
                      {copiedId === m.id ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                {/* Text Content */}
                <div className="whitespace-pre-wrap select-text break-words font-sans">
                  {m.text}
                </div>

                {/* Timestamp */}
                <div
                  className={`text-[9px] mt-1.5 text-right select-none ${
                    isUser ? 'text-violet-200/70' : 'text-[#64748B]'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Thinking Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#15182C] text-violet-400 border border-violet-500/25 flex items-center justify-center shrink-0">
              <Bot size={13} />
            </div>
            <div className="bg-[#14172B] border border-violet-500/20 text-violet-300 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-sm">
              <Loader2 size={13} className="text-violet-400 animate-spin" />
              <span>FreeWispr is thinking in {activePreset?.name}...</span>
            </div>
          </div>
        )}

        {/* Floating "Scroll to bottom" button */}
        {showScrollBottom && (
          <div className="sticky bottom-1 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/95 hover:bg-violet-500 text-white text-[11px] font-bold shadow-[0_0_20px_rgba(124,58,237,0.6)] border border-violet-400/40 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <ArrowDown size={12} strokeWidth={2.5} />
              <span>Scroll to bottom</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. BOTTOM INPUT BAR */}
      <footer className="shrink-0 p-3 bg-gradient-to-b from-[#0F1120] to-[#0A0C16] border-t border-violet-500/20">
        {/* Voice Wave Animation while recording voice query */}
        {isRecording && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between text-xs text-red-300 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Listening to your voice... Speak now</span>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: `${Math.max(4, Math.min(16, 4 + audioLevel * 12 * Math.sin(Date.now() / 150 + i)))}px`,
                  }}
                  className="w-1 bg-red-400 rounded-full"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 bg-[#12152A] border border-violet-500/25 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:shadow-[0_0_20px_rgba(124,58,237,0.3)] rounded-2xl p-1.5 transition-all shadow-inner">
          {/* Voice Typing Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                : 'text-[#8E98B0] hover:text-violet-300 hover:bg-violet-500/10'
            }`}
            title={isRecording ? 'Stop Voice Input' : 'Voice Input (Click & Speak)'}
          >
            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              activePresetId === 'bn_to_banglish'
                ? 'Ask in Bangla/English... (AI replies in Banglish)'
                : activePresetId === 'prompt_engineer'
                ? 'Describe a task... (AI creates structured prompt)'
                : `Message FreeWispr in ${activePreset?.name}...`
            }
            className="flex-1 max-h-32 bg-transparent text-xs text-white placeholder:text-[#64748B] resize-none outline-none py-1.5 px-1 leading-relaxed"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:hover:from-violet-600 text-white transition-all cursor-pointer shrink-0 shadow-[0_0_14px_rgba(124,58,237,0.4)] active:scale-95"
            title="Send Message (Enter)"
          >
            <Send size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
