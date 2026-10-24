@echo off
REM Headless smoke run for the packaged build: walks every route and exercises
REM tweak detect/apply/verify over IPC. Launch this elevated (it needs admin).
set ZT_SMOKE=1
set ZT_SMOKE_ROUTES=1
set ZT_SMOKE_APPLY=1
set VITE_APP_VERSION=1.0.0-alpha.1
cd /d C:\Users\PcVIP\dist\win-unpacked
ZeroTweaks.exe %*
