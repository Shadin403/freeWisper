' FreeWispr Voice Assistant - Silent 1-Click Launcher
' Launches the standalone .exe without opening any black terminal/command prompt window

Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

exePath = strPath & "\dist-electron\win-unpacked\FreeWispr Voice Assistant.exe"

Set fso = CreateObject("Scripting.FileSystemObject")
If fso.FileExists(exePath) Then
    WshShell.Run """" & exePath & """", 1, False
Else
    WshShell.Run "cmd /c npm start", 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
