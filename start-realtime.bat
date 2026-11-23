@echo off
title e-Peddlers Realtime Socket.IO Server (Port 3001)
echo ========================================================
echo   Starting e-Peddlers Realtime Socket.IO Server
echo   Port: 3001
echo ========================================================
cd /d "%~dp0realtime"
node server.js
pause
