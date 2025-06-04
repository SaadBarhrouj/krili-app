@echo off
chcp 65001>nul
setlocal enabledelayedexpansion

:: Configuration
set "WORKSPACE_DIR=%cd%"
set "TEMP_FILE=%temp%\krill_code_%date:~-4,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%.txt"
set "FILE_LIST=%temp%\krill_files_%random%.txt"

echo [INFO] Recherche des fichiers dans le projet KRILL...
echo [INFO] Workspace: %WORKSPACE_DIR%

:: Trouver les fichiers (avec exclusion des dossiers standards)
dir /s /b *.java *.xml *.fxml *.properties *.ts *.html *.scss *.css *.json 2>nul ^
    | findstr /v /i "\\target\\" ^
    | findstr /v /i "\\.git\\" ^
    | findstr /v /i "\\.idea\\" ^
    | findstr /v /i "\\node_modules\\" ^
    | findstr /v /i "\\dist\\" ^
    > "%FILE_LIST%"

:: Compter les fichiers
set /a FILE_COUNT=0
for /f %%i in ('type "%FILE_LIST%" ^| find /c /v ""') do set /a FILE_COUNT=%%i

if %FILE_COUNT% equ 0 (
    echo [ERREUR] Aucun fichier trouve
    del "%FILE_LIST%" 2>nul
    exit /b 1
)

echo [INFO] Fichiers trouves: %FILE_COUNT%
echo. > "%TEMP_FILE%"

for /f "usebackq delims=" %%f in ("%FILE_LIST%") do (
    echo. >> "%TEMP_FILE%"
    echo // ================================= >> "%TEMP_FILE%"
    set "rel_path=%%f"
    set "rel_path=!rel_path:%WORKSPACE_DIR%\=!"
    echo // FICHIER: !rel_path! >> "%TEMP_FILE%"
    echo // ================================= >> "%TEMP_FILE%"
    echo. >> "%TEMP_FILE%"
    type "%%f" >> "%TEMP_FILE%"
)

:: Copier dans le presse-papiers
powershell -command "Get-Content '%TEMP_FILE%' | clip"

echo [SUCCES] %FILE_COUNT% fichiers copies dans le presse-papiers
echo [INFO] Types de fichiers inclus:
echo        - *.java (fichiers sources Java)
echo        - *.xml (fichiers de configuration)
echo        - *.ts (fichiers TypeScript Angular)
echo        - *.html (templates Angular)
::echo        - *.scss/.css (styles)
echo        - *.json (configuration)

:: Nettoyage
del "%TEMP_FILE%" "%FILE_LIST%" 2>nul
endlocal