@echo off
SET folder=%USERPROFILE%\gravity_panel
SET urlhead=https://github.com/pgDora56/gravity/raw/master/
if not exist folder (
    mkdir %folder% 
)
bitsadmin /TRANSFER grdl %urlhead%panel.js %folder%\panel.js
bitsadmin /TRANSFER grdl %urlhead%paint.js %folder%\paint.js
bitsadmin /TRANSFER grdl %urlhead%common.js %folder%\common.js
bitsadmin /TRANSFER grdl %urlhead%LICENSE %folder%\LICENSE
echo;
echo include("%folder:\=/%/panel.js");
echo 初めてのインストールの場合は，SpiderMonkeyPanelを右クリック→Configureに上記の1行を設定してください（既存のコードはすべて削除してください）． 
echo;
echo Enterで終了します．
pause>nul