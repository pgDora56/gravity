@echo off
chcp 932 >nul
SET folder=%USERPROFILE%\gravity_panel
SET urlhead=https://github.com/pgDora56/gravity/raw/master/
if not exist "%folder%" (
    mkdir "%folder%"
)
curl -L -o "%folder%\panel.js" "%urlhead%panel.js"
curl -L -o "%folder%\paint.js" "%urlhead%paint.js"
curl -L -o "%folder%\common.js" "%urlhead%common.js"
curl -L -o "%folder%\LICENSE" "%urlhead%LICENSE"
if not exist "%folder%\setting.json" (
    curl -L -o "%folder%\setting.json" "https://labo.417dr.com/resource/gravity/setting.json"
)
if not exist "%folder%\spotify" (
    mkdir "%folder%\spotify"
)
echo;
echo include("%folder:\=/%/panel.js");
echo 初めてのインストールの場合は，SpiderMonkeyPanelを右クリック→Configureに上記の1行を設定してください（既存のコードはすべて削除してください）．
echo;
echo Enterで終了します．
pause>nul
