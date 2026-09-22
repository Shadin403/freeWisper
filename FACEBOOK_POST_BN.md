# FreeWispr Facebook Launch Post

🚀 **বাংলায় ভয়েস টাইপিং এখন আরও সহজ — পরিচয় করিয়ে দিচ্ছি FreeWispr!**

অনেক দিন ধরে এমন একটি Windows সফটওয়্যার বানাতে চেয়েছিলাম, যেখানে কিবোর্ডে দীর্ঘ লেখা টাইপ না করেও শুধু কথা বলে দ্রুত বাংলা, ইংরেজি বা বাংলিশ লেখা যায়। সেই চিন্তা থেকেই তৈরি করেছি **FreeWispr — একটি ফ্রি ও ওপেন-সোর্স AI Voice Typing Assistant for Windows।**

FreeWispr ব্যবহার করতে প্রথমে যেকোনো জায়গার একটি text box-এ ক্লিক করুন, তারপর **F8** চাপুন এবং স্বাভাবিকভাবে কথা বলুন। বলা শেষ হলে আবার **F8** চাপুন। FreeWispr আপনার কথা text-এ রূপান্তর করে হালকাভাবে গুছিয়ে সেই active text box-এই paste করে দেবে।

✨ **FreeWispr কী কী করতে পারে?**

✅ বাংলায় বললে বাংলাতেই সুন্দরভাবে লিখে দেয়
✅ ইংরেজিতে বললে ইংরেজিতেই রাখে
✅ বাংলা-ইংরেজি মিশিয়ে বললে natural Banglish বজায় রাখে
✅ “মানে”, “আর কি”, “উম”, “আ…”–এর মতো filler word ও অপ্রয়োজনীয় repetition সরিয়ে দেয়
✅ punctuation, spacing এবং ছোটখাটো grammar ঠিক করে
✅ Chrome, Facebook, Messenger, Word, Notepad, VS Code, Slackসহ প্রায় যেকোনো active input field-এ সরাসরি paste করে
✅ Smart Polish, Raw Transcription, Summary, Professional Email, Bengali-to-English Translation এবং Developer Notes mode আছে
✅ ছোট floating widget এবং global **F8** shortcut আছে
✅ Windows চালু হলে automatically start করতে পারে
✅ নিজের পছন্দের OpenRouter, OpenAI, Groq, OmniRoute বা Custom Router ব্যবহার করা যায়
✅ সম্পূর্ণ ফ্রি ও ওপেন সোর্স — শুধু নির্বাচিত AI provider-এর API usage policy/pricing প্রযোজ্য

বিশেষ করে যারা নিয়মিত বাংলায় Facebook post, message, email, document বা developer note লেখেন—তাদের জন্য এটি খুবই কাজে আসবে। টাইপিং ধীর হলেও সমস্যা নেই; নিজের ভাষায় স্বাভাবিকভাবে বললেই হবে।

## 🛠️ প্রথমবার সেটআপ করার সহজ নিয়ম

**ধাপ ১:** FreeWispr-এর latest release download করে ZIP file extract করুন।

**ধাপ ২:** Extract করা folder-এর ভেতর থেকে **FreeWispr Voice Assistant.exe** চালু করুন। Windows SmartScreen দেখালে শুধু official GitHub repository থেকে download করেছেন নিশ্চিত হয়ে **More info → Run anyway** নির্বাচন করতে পারেন।

**ধাপ ৩:** OpenRouter-এ account তৈরি করুন:
👉 https://openrouter.ai/

**ধাপ ৪:** OpenRouter-এর API Keys page থেকে একটি নতুন API key তৈরি করুন:
👉 https://openrouter.ai/settings/keys

⚠️ API key কারও সঙ্গে share করবেন না এবং Facebook post/comment-এ কখনো প্রকাশ করবেন না।

**ধাপ ৫:** FreeWispr Control Center খুলে **OpenRouter AI** profile নির্বাচন করুন। এরপর লিখুন:

- **Base URL:** `https://openrouter.ai/api/v1`
- **API Key:** OpenRouter থেকে তৈরি করা আপনার key
- **Model:** `google/gemini-2.5-flash`
- **Language:** `auto`

এরপর **Save All Settings** চাপুন। চাইলে আগে **Fetch Models from Server** দিয়ে model list load করে Gemini 2.5 Flash নির্বাচন করতে পারেন।

**ধাপ ৬:** Facebook, Messenger, Word বা অন্য যেকোনো app-এর text box-এ ক্লিক করুন → **F8** চাপুন → কথা বলুন → আবার **F8** চাপুন। কয়েক মুহূর্তের মধ্যেই লেখা সেখানে paste হয়ে যাবে।

💡 **ভালো ফল পাওয়ার টিপস**

- microphone-এর কাছে পরিষ্কারভাবে কথা বলুন
- খুব দ্রুত না বলে স্বাভাবিক গতিতে বলুন
- বাংলা, English বা Banglish—যেভাবে স্বাচ্ছন্দ্য সেভাবেই বলুন
- লেখাটি একদম অপরিবর্তিত চাইলে **Raw Speech** mode ব্যবহার করুন
- হালকা সুন্দরভাবে গুছিয়ে নিতে **Smart Polish** mode ব্যবহার করুন

📥 **Download FreeWispr:**
[এখানে আপনার GitHub Release link দিন]

💻 **Source Code:**
[এখানে আপনার GitHub Repository link দিন]

FreeWispr এখনো নতুন একটি project। ব্যবহার করে কোনো bug পেলে বা নতুন feature দরকার হলে GitHub-এ issue করুন অথবা আমাকে জানান। আপনাদের feedback পেলে সফটওয়্যারটি আরও ভালো করতে পারব।

ভালো লাগলে post-টি share করে অন্য বাংলা ভাষাভাষী Windows user-দের কাছেও পৌঁছে দিতে পারেন। ❤️

#FreeWispr #VoiceTyping #BanglaTyping #BanglaVoiceTyping #AI #OpenSource #WindowsSoftware #Productivity #MadeInBangladesh
