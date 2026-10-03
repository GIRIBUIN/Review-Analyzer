@echo off
cd /d "%~dp0"
set PYTHONUTF8=1

echo [Review Analyzer] Starting Flask server...
echo Open http://127.0.0.1:5000 in Chrome.
echo Press Ctrl+C to stop the server.
echo.

".venv\Scripts\python.exe" run.py

echo.
echo The server has stopped. Review the error above if this was unexpected.
pause
