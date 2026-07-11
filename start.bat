@echo off
cd /d "%~dp0"

if not exist node_modules (
    echo Brak node_modules - instaluje zaleznosci...
    call npm install
)

echo Uruchamiam portfolio na http://localhost:4200 ...
start "" http://localhost:4200
call npm start
pause
