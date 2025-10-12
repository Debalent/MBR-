@echo off
echo ========================================
echo MBR Records - WAV File Extractor
echo ========================================
echo.
echo This script will scan your flash drives for WAV files
echo and extract them to the local project folder.
echo.
echo Make sure your flash drive is connected before proceeding.
echo.
pause

cd /d "%~dp0"
echo Starting WAV extraction...
echo.

node extractWavFiles.js

echo.
echo ========================================
echo Extraction completed!
echo Check the 'extracted-audio' folder for your files.
echo ========================================
echo.
pause