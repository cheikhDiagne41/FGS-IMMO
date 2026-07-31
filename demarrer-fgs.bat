@echo off
title FGS_IMMO - serveur local
cd /d "%~dp0"

echo ==========================================
echo    FGS_IMMO - demarrage du site en local
echo ==========================================
echo.
echo Le site va s'ouvrir dans votre navigateur.
echo.
echo   Adresse  : http://localhost:5173
echo   Admin    : admin@fgsimmo.sn / Password123
echo.
echo IMPORTANT : laissez cette fenetre OUVERTE
echo tant que vous utilisez le site.
echo Pour arreter le site, fermez cette fenetre.
echo.
echo ==========================================
echo.

REM Ouvre le navigateur une fois le serveur pret
start "" /b cmd /c "timeout /t 12 /nobreak >nul && start http://localhost:5173"

REM Lance l'API et l'interface web ensemble
call npm run dev

echo.
echo Le serveur s'est arrete.
pause
