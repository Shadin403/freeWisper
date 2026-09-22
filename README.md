# 🎙️ FreeWispr - Windows Voice Assistant & AI Typist

> **Free, Ultra-Fast, Open-Source Voice Typing & AI Assistant for Windows.**
> Built with **Electron + React + Vite + TailwindCSS + Node.js**!

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue.svg)]()
[![Electron](https://img.shields.io/badge/Electron-33.x-47848F.svg)]()
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)]()

---

## 🌟 প্রধান বৈশিষ্ট্যসমূহ (Key Features)

1. **⚛️ React + TailwindCSS প্রিমিয়াম UI:**
   - ড্র্যাগেবল আল্ট্রা-মডার্ন ফ্লোটিং পিল ক্যাপসুল (Collapsible Mini/Full Widget)।
   - ড্যান্সিং রিয়েল-টাইম সাউন্ডওয়েভ (Audio Waveform Animation) ও টাইমার।
   - গ্লাস মরফিজম ও ডার্ক থিম কন্ট্রোল সেন্টার ড্যাশবোর্ড।

2. **✨ স্মার্ট পলিশ (Smart Polish - Same Language In, Same Language Out):**
   - আপনি বাংলায় বললে বাংলায় সুন্দরভাবে সাজিয়ে দেবে, ইংলিশে বললে ইংলিশে রাখবে, বাংলিশ বললে সেভাবেই ন্যাচারাল বাংলিশ রাখবে।
   - ফিলার শব্দ (যেমন: "মানে", "আর কি", "umm", "uhh") স্বয়ংক্রিয়ভাবে মুছে ফেলে নির্ভুল বিরামচিহ্ন সহ টেক্সট সাজায়।

3. **💾 পার্মানেন্ট স্টোরেজ (Never Lose Settings / API Keys):**
   - উইন্ডোজের `%APPDATA%/FreeWisprVoiceAssistant/config.json` ডিরেক্টরিতে সব প্রোভাইডারের API Key, Model এবং সেটিংস স্থায়ীভাবে সেভ থাকে। পিসি রিস্টার্ট দিলেও আর কখনো নতুন করে বসাতে হবে না।

4. **⚡ মাল্টি-প্রোভাইডার প্রোফাইল সাপোর্ট:**
   - **OmniRoute (VPS / Gemini Multimodal Single-Pass)**
   - **OpenRouter AI (Gemini / Llama 3 / DeepSeek)**
   - **Groq (Ultra-fast Whisper)**
   - **OpenAI Official**
   - **Custom VPS Endpoint**
   - প্রতিটি প্রোভাইডারের জন্য আলাদা আলাদা **API Key ও Model** স্বয়ংক্রিয়ভাবে মনে রাখে।

5. **🔍 ইনস্ট্যান্ট মডেল সার্চ ও অটো-ডিটেকশন:**
   - **`🔄 Fetch Models from Server`** বাটনে ক্লিক করে সার্ভার থেকে সব মডেল লোড করে **`🔍 Search`** বক্সে রিয়েল-টাইমে ফিল্টার করা যায়।

6. **🎯 অ্যাক্টিভ উইন্ডো অটো-পেস্ট (Auto-Paste Engine):**
   - যে সফটওয়্যারেই কাজ করুন না কেন (Chrome, VS Code, Word, Notepad, Slack ইত্যাদি), কথা শেষ হওয়া মাত্রই সরাসরি সেখানে টেক্সট পেস্ট হয়ে যাবে।

7. **🔇 সাইলেন্স ফিল্টার ও সাউন্ড ভলিউম কন্ট্রোল:**
   - সাউন্ড ইফেক্ট ০% থেকে ১০০% পর্যন্ত ভলিউম অ্যাডজাস্ট ও মিউট করার সুবিধা।
   - কথা না বললে কোনো গারবেজ বা হ্যালুসিনেটেড মেসেজ পেস্ট হবে না।

---

## 🚀 ইনস্টলেশন ও রান করার নিয়ম (Installation & Quick Start)

### ১. ইনস্টল করা (First Time Setup):
ফোল্ডারে থাকা **`install.bat`** ফাইলটিতে ডাবল ক্লিক করুন। (এটি স্বয়ংক্রিয়ভাবে ডিপেন্ডেন্সি ইনস্টল করে আইকন জেনারেট ও রিঅ্যাক্ট প্রজেক্ট বিল্ড করে নেবে)।

### ২. অ্যাপ চালু করা:
- **`run.bat`** ডাবল ক্লিক করুন। অথবা সাইলেন্ট রান করার জন্য **`Start_FreeWispr.vbs`** এ ক্লিক করুন।

### ৩. Windows চালু হলে অটোমেটিক চালু করা:
- **`enable_startup.bat`** একবার ডাবল ক্লিক করুন। এরপর প্রতিবার Windows-এ সাইন ইন করলে FreeWispr নিজে থেকে চালু হবে।
- বন্ধ করতে **`disable_startup.bat`** চালান।
- FreeWispr Control Center-এর **Shortcuts & Mic** ট্যাব থেকেও Auto-Start চালু/বন্ধ করা যায়।

### ৪. একক .EXE ফাইল তৈরি করা:
- **`build_exe.bat`** ডাবল ক্লিক করুন। এটি `dist-electron/win-unpacked/FreeWispr Voice Assistant.exe` তৈরি করবে, Windows Auto-Start চালু করবে এবং অটোমেটিক লঞ্চ করবে।

---

## ⌨️ কিবোর্ড শর্টকাট (Hotkeys)
- **ভয়েস টাইপিং টগল:** `F8` (সেটিংস থেকে যেকোনো কিবোর্ড শর্টকাটে পরিবর্তনযোগ্য)
- **ক্যান্সেল রেকর্ডিং:** `Esc`
- **এআই মোড পরিবর্তন:** `Ctrl + Alt + M` (অথবা উইজেটে ক্লিক করে)

---

## 📜 License
MIT License - Copyright (c) 2026 Shawon Sarkar.
