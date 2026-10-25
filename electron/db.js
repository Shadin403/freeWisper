/**
 * Persistent Storage Manager for FreeWispr Electron App
 * Stored in Windows %APPDATA%/FreeWisprVoiceAssistant/config.json
 * Guarantees API keys and preferences are NEVER lost across restarts or app updates.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const USER_DATA_PATH = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.env.HOME || '.', 'FreeWisprVoiceAssistant');
const CONFIG_PATH = path.join(USER_DATA_PATH, 'config.json');
const HISTORY_PATH = path.join(USER_DATA_PATH, 'history.json');

// Stable internal IDs are kept for backward compatibility, while these
// canonical display names replace stale labels saved by older app builds.
const PROVIDER_DISPLAY_NAMES = {
  omniroute: 'OmniRoute (Router)',
  openrouter: 'OpenRouter AI',
  groq: 'Groq',
  openai: 'OpenAI',
  custom_vps: 'Custom Router',
};

function migrateProviderDisplayNames(providers = {}) {
  return Object.fromEntries(
    Object.entries(providers).map(([id, provider]) => [
      id,
      {
        ...(provider || {}),
        name: PROVIDER_DISPLAY_NAMES[id] || provider?.name || id,
      },
    ])
  );
}

const DEFAULT_PRESETS = [
  {
    id: 'smart_polish',
    name: 'Smart Polish (FreeWispr Style)',
    icon: '✨',
    description: 'Fixes grammar, removes filler words (umm, uhh, মানে, আর কি), organizes into clean sentences while preserving original language & tone.',
    system_prompt:
      "You are an expert voice-typing polisher, just like FreeWispr. You receive a raw spoken transcription (in Bengali, English, or mixed Banglish) and return the same message lightly polished for typing — NEVER translated, NEVER rewritten in another language.\n\nCORE RULE — SAME LANGUAGE IN, SAME LANGUAGE OUT:\n- Spoken in Bengali → answer in the SAME Bengali.\n- Spoken in English → answer in the SAME English.\n- Spoken in mixed Banglish → answer in the SAME natural Banglish, exactly the way the speaker mixed the languages. Do not force full Bengali or full English.\n\nLIGHT POLISH (do not over-edit):\n1. Remove only verbal fillers, stutters, false starts, and repeated words (e.g. 'umm', 'uhh', 'মানে', 'আরে কি', 'ওই যে', 'like', 'you know').\n2. Add natural punctuation, capitalization, and spacing so it reads smoothly.\n3. Fix only obvious grammar slips; KEEP the speaker's own words, tone, and meaning — never add, expand, or invent new content.\n4. Keep technical terms, names, and numbers exactly as spoken.\n5. Keep the response SHORT and equal in length to what was actually said.\n\nOUTPUT RULES:\n- Output ONLY the polished text directly — no preamble (like 'Here is...'), no quotes, no explanations, no markdown unless the speaker asked for it.\n- If the transcription is already clean, return it almost unchanged.",
    user_prompt_template: 'Lightly polish this transcription in the SAME language it was spoken (Bengali → Bengali, English → English, Banglish → natural Banglish):\n\n{transcription}',
  },
  {
    id: 'summary',
    name: 'Executive Summary & Key Points',
    icon: '📝',
    description: 'Extracts key insights and formats as a clean summary with bullet points.',
    system_prompt:
      'You are an executive summary assistant. Structure the spoken transcription into a clean, concise executive summary with short bullet points and action items if applicable.\n\nLANGUAGE RULE: Reply in the SAME language as the speech — Bengali speech → Bengali summary, English speech → English summary, mixed Banglish → natural Banglish. NEVER translate.\n\nOUTPUT RULES: Output ONLY the structured summary — no preamble, no quotes, no closing commentary. Keep it crisp: bullets short, one idea per bullet, action items at the end.',
    user_prompt_template: 'Summarize the following speech clearly and logically in its original language:\n\n{transcription}',
  },
  {
    id: 'bn_to_en',
    name: 'Bangla to English Pro Translation',
    icon: '🌐',
    description: 'Translates spoken Bengali/Banglish speech into fluent, professional English.',
    system_prompt:
      'You are a professional Bengali→English translator and editor. Translate the spoken Bengali or mixed Banglish transcription into natural, fluent, professional English — the way a native business professional would write it.\n\nRULES:\n1. Translate the MEANING, not word-by-word — natural phrasing over literal accuracy.\n2. Match the tone from context: formal for business, casual for friendly speech.\n3. Keep names, numbers, and technical terms accurate.\n4. Remove fillers and repetitions while translating.\n\nOUTPUT RULES: Output ONLY the English translation — no preamble, no quotes, no notes.',
    user_prompt_template: 'Translate the following spoken text into natural, professional English:\n\n{transcription}',
  },
  {
    id: 'bn_to_banglish',
    name: 'Bangla to Banglish (Smart Polish)',
    icon: '🔤',
    description: 'Smart AI-polishes spoken Bengali thoughts and converts them into clean, natural Banglish (English letters).',
    system_prompt:
      'You are an expert voice-typing editor and Bengali-to-Banglish polisher, similar to Wispr Flow. Your task is to take spoken Bengali (or mixed speech), SMART-POLISH the thoughts, and convert them into natural, clean, beautifully structured Banglish (Bengali words written using English/Latin letters) as widely used in modern chatting and messaging.\n\nCORE SMART POLISH & TRANSLITERATION RULES:\n1. SMART POLISH & CLEANUP:\n- Remove verbal fillers, false starts, stuttering, and hesitation sounds (e.g. "umm", "uhh", "মানে", "আর কি", "ওই যে", "তো", "লাইক").\n- Fix broken phrasing, repetitions, and awkward grammar into smooth, fluent, natural conversational flow.\n- Add natural punctuation (., ?!) and capitalize sentence beginnings cleanly.\n2. NATURAL BANGLISH SPELLING:\n- Transliterate Bengali words into modern, natural phonetic Banglish as commonly written by Bengali speakers in messaging/email (e.g. "আমি ভালো আছি, আপনি কেমন আছেন?" -> "Ami bhalo achi, apni kemon achen?", "কালকে মিটিং কয়টায় শুরু হবে?" -> "Kalke meeting koytay shuru hobe?").\n- DO NOT translate Bengali meaning into English words. Keep the original Bengali words, but write them phonetically in English letters.\n3. PRESERVE ENGLISH & TECHNICAL WORDS:\n- Keep any English words, technical terms, programming terms, brand names, and numbers in standard English (e.g. "meeting", "office", "call", "project", "login", "API", "10 minute", "Sunday").\n4. PRESERVE MEANING & TONE:\n- Keep the speaker\'s exact tone, emotion, and intent. Never invent, add, or alter facts.\n5. OUTPUT RULES:\n- Output ONLY the final polished Banglish text directly — no preamble, no quotes, no explanations, no notes.',
    user_prompt_template: 'Smart-polish and convert the following speech into clean, natural Banglish (Bengali written in English letters):\n\n{transcription}',
  },
  {
    id: 'email',
    name: 'Professional Email / Message',
    icon: '✉️',
    description: 'Turns spoken thoughts into a polished email or team message with proper greeting & sign-off.',
    system_prompt:
      'You are a professional communication specialist. Convert spoken thoughts into a well-crafted, polite, professional email or business message.\n\nSTRUCTURE:\n- A short, relevant subject line (only if the message is long enough to need one).\n- A clean greeting, 1–3 tight body paragraphs, and a courteous sign-off.\n\nLANGUAGE RULE: Write the email in the SAME language as the spoken thoughts (Bengali → Bengali email, English → English email, Banglish → natural Banglish). NEVER translate unless the speaker explicitly asks.\n\nOUTPUT RULES: Output ONLY the ready-to-send email text — no preamble, no quotes, no commentary.',
    user_prompt_template: "Format the following spoken thoughts into a professional email/message in the speaker's own language:\n\n{transcription}",
  },
  {
    id: 'dev_notes',
    name: 'Developer & Code Notes',
    icon: '💻',
    description: 'Formats technical thoughts into developer tasks, markdown checkboxes, and code snippets.',
    system_prompt:
      'You are a senior software engineer assistant. Convert spoken developer notes into clean, precise technical notes.\n\nFORMAT:\n- Short bullet points or markdown checklists (- [ ]) for tasks.\n- Bug reports as: what happened → likely cause → suggested fix.\n- Code snippets in proper fenced code blocks with the language tag.\n- Keep technical terms, API names, endpoints, commands, and variable names EXACTLY as spoken.\n\nLANGUAGE RULE: Keep the language of the notes the same as the speech (Bengali notes stay Bengali, with technical terms in English). NEVER translate.\n\nOUTPUT RULES: Output ONLY the formatted technical notes — no preamble, no commentary.',
    user_prompt_template: 'Format the following developer thoughts into clean technical notes:\n\n{transcription}',
  },
  {
    id: 'raw',
    name: 'Raw Speech (Direct Transcription)',
    icon: '🎙️',
    description: 'Inserts exact spoken transcript without any AI modification.',
    system_prompt: '',
    user_prompt_template: '',
  },
  {
    id: 'prompt_engineer',
    name: 'Prompt Engineer (Smart Prompt)',
    icon: '🧠',
    description: 'Transforms spoken task descriptions into structured, professional AI prompts ready for Claude, ChatGPT, Gemini, and coding agents.',
    system_prompt:
      'You are an expert prompt engineer. Your task is to transform a spoken task description into a clear, structured, high-quality AI prompt that another AI assistant can execute effectively.\n\nCORE PRINCIPLES:\n1. PRESERVE INTENT: The generated prompt must faithfully represent what the user wants to accomplish.\n2. STRUCTURE FOR THE TASK: Adapt the prompt structure to the actual task category (coding, writing, research, design, etc.). Do not force a rigid template.\n3. INFER CONTEXT: Understand implied context from the speech (e.g., "Laravel" implies PHP/Laravel project, "Botble" implies Botble CMS).\n4. HANDLE BANGLISH NATURALLY: Mixed Bengali/English speech should be understood semantically, not translated word-by-word.\n5. OUTPUT LANGUAGE CONTROL: The generated prompt must be in the requested output language (Auto/Bengali/English). This controls the prompt language, NOT translation.\n\nPROMPT ELEMENTS (use when relevant to the task):\n- ROLE: Identify the appropriate expertise/professional role for the target AI.\n- CONTEXT: Include project details, environment, architecture, constraints mentioned by the user.\n- OBJECTIVE: Clearly state what the user wants to accomplish.\n- REQUIREMENTS: Break into specific, actionable requirements.\n- WORKFLOW/STEPS: Define a sensible sequence for investigation, planning, implementation, verification when needed.\n- CONSTRAINTS: Preserve user restrictions, security requirements, production safety rules, compatibility needs.\n- EXPECTED OUTPUT: Specify what the target AI should deliver (code, report, document, test results, etc.).\n- VERIFICATION: Include acceptance criteria, testing instructions, or measurable success conditions when relevant.\n- UNCERTAINTY HANDLING: If essential information is missing, instruct the target AI to inspect project context or ask focused clarifying questions. Otherwise, proceed with reasonable, clearly stated assumptions.\n\nQUALITY REQUIREMENTS:\n- Remove speech disfluencies, fillers, repetitions.\n- Convert vague instructions into actionable requirements when meaning is clear.\n- Avoid unnecessary verbosity and redundant instructions.\n- Do not add unrequested features or scope.\n- Preserve explicit preferences and negative constraints.\n- Use headings and bullet points for complex tasks; keep simple tasks concise.\n- Return ONLY the generated prompt — no introduction, explanation, quotes, or postscript.\n- The prompt must be copy-ready for the intended AI assistant.\n- Do not execute the task yourself; generate a prompt that instructs another AI to do it.\n\nTASK CATEGORY ADAPTATION:\n- CODING/DEBUGGING: Emphasize repository inspection, existing architecture understanding, minimal changes, safety, implementation, testing.\n- WRITING/EMAIL: Emphasize audience, tone, purpose, format, required content.\n- RESEARCH: Emphasize evidence, reliable sources, uncertainty, citations.\n- UI/UX DESIGN: Emphasize layout, responsiveness, accessibility, design conventions.\n- GENERAL: Use appropriate structure for the task type.\n\nLANGUAGE HANDLING:\n- AUTO: Infer output language from the spoken task (if mostly Bengali → Bengali prompt, mostly English → English prompt, mixed → English prompt for technical tasks).\n- BENGALI: Generate complete prompt in natural Bengali, keeping standard technical terms in English.\n- ENGLISH: Generate professional English prompt even if input is Bengali/Banglish.',
    user_prompt_template: 'Transform the following spoken task description into a structured, professional AI prompt. The output language should be: {output_language}.\n\nSpoken task: {transcription}',
  },
];

const DEFAULT_PROVIDERS = {
  omniroute: {
    name: 'OmniRoute (Router)',
    base_url: '',
    api_key: '',
    model: '',
    language: 'auto',
  },
  openrouter: {
    name: 'OpenRouter AI',
    base_url: 'https://openrouter.ai/api/v1',
    api_key: '',
    model: 'google/gemini-2.0-flash-exp:free',
    language: 'auto',
  },
  groq: {
    name: 'Groq',
    base_url: 'https://api.groq.com/openai/v1',
    api_key: '',
    model: 'whisper-large-v3',
    language: 'auto',
  },
  openai: {
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    api_key: '',
    model: 'gpt-4o-mini',
    language: 'auto',
  },
  custom_vps: {
    name: 'Custom Router',
    base_url: 'http://your-vps:8000/v1',
    api_key: '',
    model: 'whisper-large-v3',
    language: 'auto',
  },
};

const DEFAULT_CONFIG = {
  active_provider: 'omniroute',
  providers: DEFAULT_PROVIDERS,
  hotkeys: {
    record_toggle: 'F8',
    cancel_recording: 'Escape',
    switch_mode_next: 'Ctrl+Alt+M',
  },
  typing: {
    auto_paste: true,
    typing_delay_ms: 15,
    focus_delay_ms: 80,
  },
  ui: {
    theme: 'dark',
    widget_collapsed: false,
    widget_opacity: 0.95,
    sound_effects: true,
    sound_volume: 0.4,
    autostart_on_boot: true,
    pill_position_x: null,
    pill_position_y: null,
  },
  output_language: 'auto', // 'auto' | 'bn' | 'en'
  presets: DEFAULT_PRESETS,
  active_preset_id: 'smart_polish',
};

class Storage {
  constructor() {
    this.ensureDirectory();
    this.config = this.loadConfig();
    this.history = this.loadHistory();
  }

  ensureDirectory() {
    try {
      if (!fs.existsSync(USER_DATA_PATH)) {
        fs.mkdirSync(USER_DATA_PATH, { recursive: true });
      }
    } catch (e) {
      console.error('Error creating user data directory:', e);
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const providers = migrateProviderDisplayNames({
          ...DEFAULT_PROVIDERS,
          ...(parsed.providers || {}),
        });
        const savedPresets = Array.isArray(parsed.presets) ? parsed.presets : DEFAULT_PRESETS;
        const savedPresetIds = new Set(savedPresets.map((p) => p.id));
        const missingDefaultPresets = DEFAULT_PRESETS.filter((dp) => !savedPresetIds.has(dp.id));
        let presetsUpdated = missingDefaultPresets.length > 0;

        // Upgrade bn_to_banglish if missing or using older prompt without smart polish
        const mergedPresets = savedPresets.map((p) => {
          if (p.id === 'bn_to_banglish' && (!p.system_prompt || !p.system_prompt.includes('SMART-POLISH'))) {
            const def = DEFAULT_PRESETS.find((dp) => dp.id === 'bn_to_banglish');
            if (def) {
              presetsUpdated = true;
              return { ...p, ...def };
            }
          }
          return p;
        });
        if (missingDefaultPresets.length > 0) {
          mergedPresets.push(...missingDefaultPresets);
        }

        const migrated = {
          ...DEFAULT_CONFIG,
          ...parsed,
          providers,
          ui: { ...DEFAULT_CONFIG.ui, ...(parsed.ui || {}) },
          hotkeys: { ...DEFAULT_CONFIG.hotkeys, ...(parsed.hotkeys || {}) },
          presets: mergedPresets,
        };

        // Persist renamed labels or newly added default presets so AppData config is permanently migrated.
        const hadLegacyProviderName = Object.entries(PROVIDER_DISPLAY_NAMES).some(
          ([id, name]) => parsed.providers?.[id]?.name && parsed.providers[id].name !== name
        );
        if (hadLegacyProviderName || presetsUpdated) {
          try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(migrated, null, 2), 'utf-8');
          } catch (writeError) {
            console.warn('Could not persist migration to config.json:', writeError.message);
          }
        }
        return migrated;
      }
    } catch (e) {
      console.error('Failed to load config.json, using defaults:', e);
    }
    const initial = { ...DEFAULT_CONFIG };
    this.saveConfig(initial);
    return initial;
  }

  saveConfig(newConfig = null) {
    if (newConfig) {
      this.config = newConfig;
    }
    try {
      this.ensureDirectory();
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to save config:', e);
      return false;
    }
  }

  getConfig() {
    return this.config;
  }

  updateConfig(partialConfig) {
    this.config = {
      ...this.config,
      ...partialConfig,
      providers: migrateProviderDisplayNames({
        ...(this.config.providers || {}),
        ...(partialConfig.providers || {}),
      }),
      ui: {
        ...(this.config.ui || {}),
        ...(partialConfig.ui || {}),
      },
      hotkeys: {
        ...(this.config.hotkeys || {}),
        ...(partialConfig.hotkeys || {}),
      },
    };
    this.saveConfig();
    return this.config;
  }

  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_PATH)) {
        const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    return [];
  }

  saveHistory() {
    try {
      this.ensureDirectory();
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history.slice(0, 300), null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  addHistoryEntry(entry) {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      ...entry,
    };
    this.history.unshift(newEntry);
    if (this.history.length > 300) {
      this.history = this.history.slice(0, 300);
    }
    this.saveHistory();
    return newEntry;
  }

  getHistory(query = '') {
    if (!query) return this.history;
    const q = query.toLowerCase();
    return this.history.filter(
      (item) =>
        (item.raw_text && item.raw_text.toLowerCase().includes(q)) ||
        (item.refined_text && item.refined_text.toLowerCase().includes(q)) ||
        (item.preset_name && item.preset_name.toLowerCase().includes(q))
    );
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    return true;
  }
}

module.exports = new Storage();
