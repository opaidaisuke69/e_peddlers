@echo off
title e-Peddlers Web Portal (Port 5173)
echo ========================================================
echo   Starting e-Peddlers React Web Application
echo   Port: 5173
echo ========================================================
cd /d "%~dp0web"
npm run dev
pause
