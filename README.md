# FreeWispr — Windows Voice Typing & AI Assistant

FreeWispr is a free, open-source voice-typing assistant for Windows. Press a global hotkey, speak naturally, and FreeWispr transcribes, lightly polishes, and pastes the result directly into the active text field.

It is built with Electron, React, Vite, Tailwind CSS, and Node.js.

## Features

- **Global voice typing:** Press `F8` from almost any Windows application to start or stop recording.
- **Direct auto-paste:** The processed text is pasted into the active input field in Chrome, Microsoft Word, VS Code, Notepad, Slack, and other applications.
- **Same-language Smart Polish:** Bengali remains Bengali, English remains English, and mixed Banglish remains natural Banglish. The assistant removes filler words and obvious repetitions without changing your meaning or writing style.
- **Multiple AI and speech providers:** Use OmniRoute, OpenRouter, Groq, OpenAI, or your own compatible router endpoint.
- **Gemini multimodal single-pass mode:** Compatible multimodal models can transcribe and polish audio in one request for lower latency.
- **Reusable writing modes:** Smart Polish, Executive Summary, Bengali-to-English Translation, Professional Email, Developer Notes, and Raw Transcription.
- **Floating widget:** A compact, draggable, always-on-top microphone control with recording status and audio visualization.
- **Persistent settings:** Provider settings, prompts, keyboard shortcuts, and UI preferences are saved between sessions.
- **Windows auto-start:** FreeWispr can launch automatically after you sign in to Windows.
- **Silence protection:** Empty or silent recordings are filtered to reduce accidental or hallucinated text.
- **Sound controls:** Recording cues can be enabled, muted, or adjusted from the Control Center.

## Supported Provider Profiles

- **OmniRoute (Router)** — supports compatible Gemini multimodal models and OpenAI-compatible APIs.
- **OpenRouter AI** — supports available text and multimodal models exposed by OpenRouter.
- **Groq** — suitable for fast Whisper transcription models.
- **OpenAI** — supports compatible OpenAI speech and language models.
- **Custom Router** — connect any compatible custom endpoint or self-hosted router.

Provider availability, model support, pricing, and rate limits depend on the provider you choose.

## System Requirements

- Windows 10 or Windows 11, 64-bit
- Node.js 18 or later (only required when running or building from source)
- A working microphone
- An API key for the provider you plan to use
- Internet access for cloud transcription or AI processing

## Quick Start from Source

1. Clone or download this repository.
2. Open the project folder.
3. Double-click `install.bat` to install dependencies, generate icons, and build the React interface.
4. Double-click `run.bat` to launch FreeWispr.
5. Open the FreeWispr Control Center, choose a provider, enter your API key and model, and save the settings.
6. Click any text field, press `F8`, speak, and press `F8` again to process and paste your text.

You can also run the project from a terminal:

```bash
npm install
npm run build
npm start
```

## Build the Windows Setup Installer

Double-click `build_exe.bat`, or run it from Command Prompt:

```bat
build_exe.bat
```

The assisted NSIS installer is created at:

```text
dist-electron\FreeWispr-Setup-<version>-x64.exe
```

The installer provides a normal Windows setup wizard, per-user or per-machine installation, an optional installation folder, desktop and Start Menu shortcuts, uninstall support, and an option to run FreeWispr after installation.

The build process performs the following steps:

1. Stops any currently running FreeWispr or development Electron process.
2. Generates a multi-resolution FreeWispr Windows icon.
3. Builds the React interface.
4. Packages the Electron application and assisted NSIS Setup without requiring symbolic-link privileges.
5. Applies the FreeWispr icon and version metadata to the packaged application executable using a pure-JavaScript resource editor.
6. Opens Windows Explorer with the Setup file selected so it can be uploaded to GitHub Releases.

## Publishing Updates

Publish each new version as a GitHub Release in `Shadin403/freeWisper`. The in-app updater first checks the release tagged `FreeWispr`, then falls back to the repository's latest published release.

Attach the generated installer using a filename that contains both `FreeWispr` and `Setup`, for example:

```text
FreeWispr-Setup-1.2.0-x64.exe
```

For reliable version comparison, include a semantic version such as `1.2.0` in the release title, tag, or release notes. Increase the `version` field in `package.json` before every new build.

## Windows Auto-Start

Auto-start is enabled by default. You can control it in the **Shortcuts & Mic** section of the FreeWispr Control Center.

You can also manage it manually:

- Run `enable_startup.bat` to start FreeWispr automatically after Windows sign-in.
- Run `disable_startup.bat` to remove it from Windows Startup.

## Default Keyboard Shortcuts

| Action | Default shortcut |
| --- | --- |
| Start or stop voice typing | `F8` |
| Cancel recording | `Esc` |
| Switch to the next AI mode | `Ctrl + Alt + M` |

The voice-typing shortcut can be changed from the Control Center.

## Configuration and Data

FreeWispr stores runtime configuration in the current user's application-data directory:

```text
%APPDATA%\FreeWisprVoiceAssistant\config.json
```

Transcription history is stored in the same application-data directory. Repository configuration files do not contain production API keys. Enter your own keys through the Control Center after launching the application.

Do not commit real API keys, access tokens, or private endpoint credentials to GitHub. If a key is ever exposed publicly, revoke and replace it through the provider immediately.

## Smart Polish Behavior

Smart Polish is intentionally light-touch. It is designed to:

- remove fillers, stutters, false starts, and accidental repetition;
- add natural punctuation, spacing, and capitalization;
- correct only obvious grammar mistakes;
- preserve technical terms, names, numbers, tone, and meaning;
- avoid translating unless a translation mode is selected;
- return only the final text, without commentary or a preamble.

## Troubleshooting

### The application shows the Electron name or icon

Close the old application, unpin the old taskbar item, rebuild with `build_exe.bat`, launch the new `FreeWispr Voice Assistant.exe`, and pin the new icon. Windows may cache old taskbar shortcuts, so signing out or restarting Windows can also help.

### The build reports a winCodeSign symbolic-link error

Use the current `build_exe.bat`. It disables Electron Builder's privilege-dependent executable editing and applies the FreeWispr icon and metadata afterward with `scripts/brand-windows-exe.js`.

### Text is not pasted

Make sure the target text field is active before pressing `F8`. Some elevated applications may reject simulated paste events from a non-elevated application; run both applications at the same privilege level.

### The microphone does not work

Check Windows **Settings → Privacy & security → Microphone** and allow microphone access for desktop applications. Also verify the selected input device in the FreeWispr Control Center.

### FreeWispr does not start with Windows

Run `enable_startup.bat` once, or enable **Start FreeWispr automatically when Windows starts** in the Control Center. You can inspect the Windows Startup folder by pressing `Win + R` and entering `shell:startup`.

## Privacy

FreeWispr records audio only while voice typing is active. Depending on the selected provider, recorded audio or transcribed text may be sent to that provider for processing. Review your provider's privacy policy and data-retention terms before using sensitive information.

## Development Scripts

```bash
npm run dev      # Start the Vite development server
npm run app      # Start Vite and Electron together
npm run build    # Build the React interface
npm start        # Run Electron using the existing frontend build
npm run dist     # Build and package the Windows application
```

## Technology Stack

- Electron
- React 18
- Vite
- Tailwind CSS
- Node.js
- Axios
- OpenAI-compatible speech and chat APIs

## License

FreeWispr is available under the [MIT License](LICENSE).

Copyright © 2026 Shadin Sarkar.
