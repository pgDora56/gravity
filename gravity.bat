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
echo ���߂ẴC���X�g�[���̏ꍇ�́CSpiderMonkeyPanel���E�N���b�N��Configure�ɏ�L��1�s��ݒ肵�Ă��������i�����̃R�[�h�͂��ׂč폜���Ă��������j�D 
echo;
echo Enter�ŏI�����܂��D
pause>nul