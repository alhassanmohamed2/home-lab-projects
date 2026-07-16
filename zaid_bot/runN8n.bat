@echo off
TITLE n8n Auto-Launcher with Ngrok

echo [1/4] Killing old processes...
taskkill /IM ngrok.exe /F >nul 2>&1

echo [2/4] Starting Ngrok in the background...
:: Starts ngrok on port 5678 in a separate minimized window
start "Ngrok Tunnel" /MIN ngrok http 5678

echo Waiting 5 seconds for Ngrok to generate URL...
timeout /t 5 /nobreak >nul

echo [3/4] Fetching Ngrok URL...
:: Uses PowerShell to ask Ngrok's local API for the public URL
for /f "usebackq tokens=*" %%A in (`powershell -Command "(Invoke-RestMethod http://localhost:4040/api/tunnels).tunnels[0].public_url"`) do (
    set "MY_URL=%%A"
)

:: Check if URL was found
if "%MY_URL%"=="" (
    echo.
    echo [ERROR] Could not find Ngrok URL. Is Ngrok installed and running?
    echo.
    pause
    exit /b
)

echo.
echo ========================================================
echo Tunnel URL Found: %MY_URL%
echo ========================================================
echo.

echo [4/4] Starting n8n with WEBHOOK_URL...
:: Sets the environment variable automatically
set WEBHOOK_URL=%MY_URL%

:: Starts n8n
npx n8n start