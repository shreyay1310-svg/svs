@echo off
title Student Data Verification System
cd /d "%~dp0"
echo ===================================================
echo     Student Data Verification System (SVS)
echo ===================================================
echo.
echo Admin Credentials:
echo   User ID  : ADMIN001  (or: admin)
echo   Password : Rahul@8052 (or: admin)
echo.
echo Starting application...
start "" "%~dp0StudentDataVerification.exe"
exit
