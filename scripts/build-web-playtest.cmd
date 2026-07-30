@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-web-playtest.ps1" %*
exit /b %errorlevel%
