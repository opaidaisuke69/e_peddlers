@echo off
title e-Peddlers PHP Backend API (Port 8000)
echo ========================================================
echo   Starting e-Peddlers PHP REST API Server
echo   Port: 8000 (Database: e_peddlers)
echo ========================================================
cd /d "%~dp0"
php -S 0.0.0.0:8000 backend/router.php
pause
