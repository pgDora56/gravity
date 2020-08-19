//
// 初期値
//

window.DefinePanel("gravity", { author: "Dora F.", version: "20.08b" });

function consoleWrite(msg) {
    // consoleに出力するときに必ずあたまをつける
    console.log("[gravity] " + msg); 
}

// var rootDirectory = fb.ProfilePath + "user-components\\foo_spider_monkey_panel\\gravity\\" // Panel全体のRootFolder
var rootDirectory = fb.ProfilePath + "user-components\\foo_spider_monkey_panel\\gravityDev\\" // 開発用のRootFolder

consoleWrite("Root Directory: " + rootDirectory);
// imgフォルダまでのパスを指定する
//
var img_path = rootDirectory + "img/"; 

 
// 保存するデータの基準となるパスを指定する
// 既存のフォルダを指定したほうが良い(環境に依る?)
//
var savedata_root_path = rootDirectory + "history/"; 

// =================================================
//
// Property周り
//
//

// 各初期値
//
var minPercent = 10; var maxPercent = 90; // Rantroのスタート位置
var mixIntroRatio = 1; var mixRantroRatio = 1; // Mixの比率
var outroLocation = 15; // Outroのスタート位置

//  Propertyを受け取る
var rantro_percent = window.GetProperty("1. Rantro - StartLocationRange", "10-90");
var get_mix_percent = window.GetProperty("2. Mix Ratio - Intro:Rantro", "1:1");
var get_outro_location = window.GetProperty("3. Outro - StartLocation", "15");

// チェック＆必要に応じてパース
//   Rantroのスタート位置
try{
    var pers = rantro_percent.split('-');
    if(pers.length != 2) throw "Rantro StartLocation's value is invalid";
    minPercent = parseInt(pers[0]);
    maxPercent = parseInt(pers[1]);
}
catch(e){
    consoleWrite(e);
    maxPercent = 90;
    minPercent = 10;
}

//   Mixの比率
try{
    var pers = get_mix_percent.split(':');
    if(pers.length != 2) throw "Mix Ratio's value is invalid";
    mixIntroRatio = parseInt(pers[0]);
    mixRantroRatio = parseInt(pers[1]);
}
catch(e){
    consoleWrite(e);
    mixIntroRatio = mixRantroRatio = 1;
}

//   Outroの開始位置
try{
    outroLocation = parseInt(get_outro_location);
}
catch(e){
    consoleWrite(e);
    outroLocation = 15;
}


// ==========================================
//
// JSONファイル周りの設定
//
// Default Value
//
var display = [{format:"", font:{family: "Meiryo UI", size:10, color:[0,0,0]}}];
var defaultfont = {family: "Meiryo UI", size:10, color:[0,0,0]};
var gravity = "none";
var isSpotify = false;
var have_focus = false;
var mode = 0; // 0 -> Intro, 1 -> Rantro, 2 -> Mix, 3 -> Outro
var spotRecordTime = "";
var judgeFormat = "[%program% - ]%title%[ / %artist%][ - %type%][ - $if2(%work_year%,%date%)]";
var xhr = new ActiveXObject("Microsoft.XMLHTTP"); 
var path = rootDirectory + "setting.json"; // 読み込む外部ファイル
var jsonData = {};
var partsHeight = window.Height;
var totalHeight = 0;
xhr.open("GET", path, true);
xhr.onreadystatechange = function(){
    // ローカルファイル用
    if (xhr.readyState === 4 && xhr.status === 0){
        const settingFile = xhr.responseText; // 外部ファイルの内容
        jsonData = JSON.parse(settingFile);
        defaultfont = jsonData.defaultfont;
        judgeFormat = jsonData.format;
        if(jsonData.gravity != undefined){
            gravity = jsonData.gravity.toLowerCase();
        }
        partsHeight = window.Height / display_num;
    }
};
xhr.send(null);

include(`${fb.ComponentPath}docs\\Flags.js`);
include(`${fb.ComponentPath}docs\\Helpers.js`);
include(`common.js`);

//==============================================

//
// Callback Functions
//

var headerColors = [];
var leftMargin = 15;
function on_paint(gr){
    var display_num = jsonData.display.length;
    headerColors = [RGB(215, 0, 58), RGB(0,123,187), RGB(240,131,0), RGB(195,216,37), RGB(116,50,92)];
    consoleWrite("Panel is repainted. -- Height: " + window.Height + " // Width: " + window.Width + " // Item: " + display_num);

    // ヘッダ部の描画
    //
    var headerH = paintHeader(gr);
    if(gravity == "top") totalHeight = headerH + 5;
    else if(gravity == "bottom") totalHeight = 5;

    // 下塗り
    var hcolor = jsonData.header.color;
    if(have_focus) gr.FillSolidRect(0, headerH, window.Width, window.Height - headerH, RGB((hcolor[0]+255*2)/3,(hcolor[1]+255*2)/3,(hcolor[2]+255*2)/3));

    // アルバムアートワークの描画
    paintArtwork(gr, headerH);

    // 本体の描画
    //
    partsHeight = (window.Height - headerH) / display_num;
    for(var i = 0; i < display_num; i++){
        if(gravity == "top") paintTop(gr, jsonData.display[i], i);
        else if(gravity == "bottom") paintBottom(gr, jsonData.display[display_num - 1 - i], display_num - 1 - i);
        else paintMain(gr, jsonData.display[i], headerH, i);
    }
}

function on_focus(is_focused){
    have_focus = is_focused;
    window.Repaint();
}

function on_playback_new_track(){
    window.Repaint();
    var nowPlayPath = fb.GetNowPlaying().Path;
    isSpotify = nowPlayPath.startsWith("spotify");
    consoleWrite("IsSpotify:" + isSpotify);
    setClipboard(get_tf());
    if(isSpotify){
        spotRecordTime = spotifySettingFileLoad(nowPlayPath, fb.TitleFormat("%tracknumber%").Eval(), "RECORD_TIME");
    }

    switch(mode){
        case 1: // Rantro
            fb.PlaybackTime = getRantroLocation();
            break;
        case 2: // Mix
            fb.PlaybackTime = getMixLocation();
            break;
        case 3: // Outro
            fb.PlaybackTime = fb.PlaybackLength - outroLocation;
            break;
    }
    consoleWrite(fb.PlaybackTime);
}

function on_key_down(vkey) {
    consoleWrite("vkey: " + vkey); // For debug

    if(vkey == 37 || vkey == 72) {
        // Push Left / H
        // Previous
        fb.Prev();
        fb.Pause();
    }
    else if(vkey == 38 || vkey == 75) {
        // Push Up / K
       // Sabi
        fn_gorec();
    }
    else if(vkey == 39 || vkey == 76) {
        // Push Right / L
        // Next
        fb.Next();
        fb.Pause();
    }
    else if(vkey == 40 || vkey == 74) {
        // Push Down / J
        // Play & Pause
        if(fb.IsPlaying){
            fb.Pause();
        }
        else{
            fb.Play();
        }
    }
    else if(vkey == 77) {
        // Mode change
        mode = (mode + 1) % 4;
        consoleWrite(mode);
        window.Repaint();
    }
    else if(48 <= vkey && vkey <= 57){
        // Push Number key
        fn_gorec(vkey-48);
    }
    else if(112 <= vkey && vkey <= 121) {
        var number = vkey - 112;
        fn_rec(number + 1);
    }
    else if(vkey == 222) {
        // Push Caret(^)
        fb.PlaybackTime = 0;
    }
}

function on_main_menu(idx){
    addManyLocation();
}

// =======================================

// 
// Other Functions
//

// 記録箇所に移動する
// @param no 記録の通し番号(int)
//
function fn_gorec(no){
    if(no==undefined) no = 1;
    if(no==0) no = 10;
    no -= 1;
    tarr = rec_to_array();
    try{
        if(tarr != undefined) {
            if(tarr[no] != "-1"){
                fb.PlaybackTime = tarr[no];
                return;
            }
        }
        consoleWrite("Don't set Sabi");
        consoleWrite("Sabi:" + tarr);
    }
    catch{
        consoleWrite("Can't move to Sabi");
        consoleWrite("Sabi:" + tarr);
    }
}

// 現在再生している箇所を記録する
// @param no 記録する通し番号(int)
//
function fn_rec(no){
    if(no == undefined) no = 1;
    no -= 1;
    tarr = rec_to_array();
    if(tarr == undefined) tarr = ["-1","-1","-1","-1","-1","-1","-1","-1","-1","-1"];
    var handle = fb.CreateHandleList();
    var tfo = fb.TitleFormat("%playback_time_seconds%");
    consoleWrite(tfo.Eval());
    if(tarr[no] == tfo.Eval()) tarr[no] = "-1";
    else tarr[no] = tfo.Eval();
    saveData = tarr[0];
    for(i=1; i<10; i++) {
        saveData += "," + tarr[i];
    }

    if(isSpotify){
        spotifySettingFileWrite(fb.GetNowPlaying().Path, fb.TitleFormat("%tracknumber%").Eval(), "RECORD_TIME", saveData);
        spotRecordTime = saveData;
    }
    else{
        var data = fb.GetNowPlaying();
        handle.Add(data);
        handle.UpdateFileInfoFromJSON(
            JSON.stringify({
                'RECORD_TIME' : saveData
            })
        );
    }
    setTimeout(function(){
        window.Repaint();
    }, 1000);
}

// 現在再生中の楽曲の記録箇所をarrayで指定する。
// @return 記録箇所のArray(array<int>)
//
function rec_to_array(){
    var time = (isSpotify) ? spotRecordTime : fb.TitleFormat("%RECORD_TIME%").Eval();
    if(time=="?"){
        return undefined;
    }
    var arr = time.split(",");
    while(arr.length < 10){
        arr.push("-1");
    }
    return arr;
}

include(`paint.js`);

// Mixモード時の開始位置を取得する
// @return 開始位置(float)
function getMixLocation() {
    var r = Math.random() * (mixIntroRatio + mixRantroRatio);
    return (r < mixIntroRatio) ? 0 : getRantroLocation();
}

// Rantroモード時の開始位置を取得する
// @return 開始位置(float)
function getRantroLocation() {
    return fb.PlaybackLength * (minPercent + Math.random() * (maxPercent - minPercent)) / 100;
}

// サブ行のフォント設定を適用させる
// @param main メイン行のフォント設定
// @param sub サブ行で特別に指定されたフォント設定
// @return 適用するフォント設定
function fntToSub(main, sub){
    var newfnt = {};
    var fields = ["family", "size", "style", "color"];
    if(sub == undefined) sub = {};
    if(main == undefined) main = {};
    fields.forEach(field => {
        if(sub[field] != undefined){
            newfnt[field] = JSON.parse(JSON.stringify(sub[field]));
        } else{
            if(main[field] != undefined){
                newfnt[field] = JSON.parse(JSON.stringify(main[field]));
            } else if(defaultfont[field] != undefined){
                newfnt[field] = JSON.parse(JSON.stringify(defaultfont[field]));
            } 

            if(newfnt[field] != undefined){
                if(field == "size") newfnt[field] = Math.floor(newfnt[field] * 3 / 4);
                else if(field == "color"){
                    for(var i = 0; i < 3; i++){
                        newfnt[field][i] = Math.floor((newfnt[field][i]+256)/2);
                    }
                }
            }

        }
    });
    return newfnt;
}

// フォントとフォントサイズからGdiFontを生成する
// @param font フォント名(Array)
// @param size フォントサイズ(int)
// @return GdiFont
//
function fnt(font,size) {
    // 1..Bold 2..Italic(英字のみ？) 4..underline 8..breakline
    // 組み合わせるときは足す
    //
    if(font==undefined) {
        font = defaultfont;
    }
    else{
        if(font.family == undefined){
            font.family = defaultfont.family;
        }
        if(font.size == undefined){
            font.size = defaultfont.size;
        }
    }
    if(size==undefined) {
    }
    var style = 0;
    if(font.style != undefined) {
        var st = font.style.toLowerCase();
        if(~st.indexOf("b")) style += 1;
        if(~st.indexOf("i")) style += 2;
        if(~st.indexOf("u")) style += 4;
        if(~st.indexOf("s")) style += 8;
    }
    return gdi.Font(font.family, font.size, style);
}

// フォントから色を抽出する
// @param font フォント
// @return 色情報(RGB)
function fntclr(font) {
    var clr = RGB(defaultfont.color[0], defaultfont.color[1], defaultfont.color[2]); 
    try{
        clr = RGB(font.color[0], font.color[1], font.color[2]);
    }
    catch{}
    return clr;
}

function addManyLocation() {
    var enter = getClipboard();
    var lines = enter.split('\n');
    var datas = lines.map(x => x.replace("\n", "").replace("\r",""));
    consoleWrite(lines);
    consoleWrite(datas);
    plman.AddLocations(plman.ActivePlaylist, datas);
}

// Title Formattingに従って楽曲情報を取得する
// @param tf TitleFormatting
// @param handle Handle
// @return 楽曲情報(string)
function get_tf(tf, handle){
    if(tf==undefined) tf = judgeFormat;
    if(handle==undefined){
        if (fb.GetNowPlaying()){
            return fb.TitleFormat(tf).Eval();
        }
    }
    else{
        return fb.TitleFormat(tf).EvalWithMetadb(handle);
    }
}
