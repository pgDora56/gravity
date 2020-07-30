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

    // 本体の描画
    //
    partsHeight = (window.Height - headerH) / display_num;
    for(var i = 0; i < display_num; i++){
        display = jsonData.display[i];
        if(gravity == "top") paintTop(gr, display, i);
        else paintMain(gr, display, headerH, i);
    }
}


function on_playback_new_track(){
    window.Repaint();
    var nowPlayPath = fb.GetNowPlaying().Path;
    isSpotify = nowPlayPath.startsWith("spotify");
    consoleWrite("IsSpotify:" + isSpotify);
    if(isSpotify){
        spotRecordTime = spotifySettingFileLoad(nowPlayPath, fb.TitleFormat("%tracknumber%").Eval(), "RECORD_TIME");
    }
}

function on_key_down(vkey) {
    // consoleWrite("vkey: " + vkey); // For debug

    if(vkey == 65 && expertKeyOperation || vkey == 37) {
        // Push Left or Push A (ExpertKeyOperation Mode)
        // Previous
        fb.Prev();
        fb.Pause();
    }
    else if(vkey == 87 && expertKeyOperation || vkey == 38) {
        // Push Up or Push W (ExpertKeyOperation Mode)
       // Sabi
        fn_gorec();
    }
    else if(vkey == 68 && expertKeyOperation || vkey == 39) {
        // Push Right or Push D (ExpertKeyOperation Mode)
        // Next
        fb.Next();
        fb.Pause();
    }
    else if(vkey == 83 && expertKeyOperation || vkey == 40) {
        // Push Down or Push S (ExpertKeyOperation Mode)
        // Play & Pause
        if(fb.IsPlaying){
            fb.Pause();
        }
        else{
            fb.Play();
        }
    }
    else if(48 <= vkey && vkey <= 57){
        // Push Number key
        fn_gorec(number);
    }
    else if(112 <= vkey && vkey <= 121) {
        var number = vkey - 112;
        fn_rec(number + 1);
    }
}

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

    var data = fb.GetNowPlaying();
    handle.Add(data);
    handle.UpdateFileInfoFromJSON(
        JSON.stringify({
            'RECORD_TIME' : saveData
        })
    );
    setTimeout(function(){
        window.Repaint();
    }, 1000);
}

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

function paintMain(gr, display, headerH, i) {
    var sublineHeight = 0;
    if(display.subline != undefined){
        var subfnt = fntToSub(display.font, display.subline.font);
        var subclr = RGB(subfnt.color[0],subfnt.color[1],subfnt.color[2]);
        var ms = gr.MeasureString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), leftMargin, headerH + partsHeight * i, window.Width - leftMargin, 10000, 0);
        gr.DrawString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), subclr, leftMargin, headerH + partsHeight * i, window.Width - leftMargin, ms.Height+1, 0);
        sublineHeight = ms.Height;
    }
    var mainHeight = gr.MeasureString(fb.TitleFormat(display.format).Eval(), fnt(display.font), leftMargin, headerH + partsHeight * i + sublineHeight, window.Width - leftMargin, partsHeight - sublineHeight, 0).Height;
    gr.DrawString(fb.TitleFormat(display.format).Eval(), fnt(display.font), fntclr(display.font), leftMargin, headerH + partsHeight * i + sublineHeight, window.Width - leftMargin, mainHeight+1, 0);
    gr.FillSolidRect(5, headerH + partsHeight * i + 4, 3, sublineHeight + mainHeight - 8, headerColors[i%5]);
}

function paintTop(gr, display, i) {
    var prevTotalHeight = totalHeight;
    if(display.subline != undefined){
        var subfnt = fntToSub(display.font, display.subline.font);
        var subclr = RGB(subfnt.color[0],subfnt.color[1],subfnt.color[2]);
        var ms = gr.MeasureString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), leftMargin, totalHeight, window.Width - leftMargin, 10000, 0);
        gr.DrawString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), subclr, leftMargin, totalHeight, window.Width - leftMargin, ms.Height+1, 0);
        totalHeight += ms.Height + 1;
    }
    var mainHeight = gr.MeasureString(fb.TitleFormat(display.format).Eval(), fnt(display.font), leftMargin, totalHeight, window.Width - leftMargin, 10000, 0).Height;
    gr.DrawString(fb.TitleFormat(display.format).Eval(), fnt(display.font), fntclr(display.font), leftMargin, totalHeight, window.Width - leftMargin, mainHeight+1, 0);
    gr.FillSolidRect(5, prevTotalHeight + 4, 3, ms.Height + mainHeight - 8, headerColors[i%5]);
    totalHeight += mainHeight + 15;
}

function paintHeader(gr){
    var tText = makeTopText();
    var headerMeasure = gr.MeasureString(tText, fnt(jsonData.header.font), 0,0,window.Width,10000,0);
    var headerH = headerMeasure.Height + 2;
    var hcolor = jsonData.header.color;
    gr.FillSolidRect(0,0,window.Width,headerMeasure.Height,RGB(hcolor[0], hcolor[1], hcolor[2]));
    gr.DrawString(tText, fnt(jsonData.header.font), fntclr(jsonData.header.font), 0, 0, window.Width, headerH, 0);
    return headerH;
}

function makeTopText(){
    var playing_item_location = plman.GetPlayingItemLocation();
    var topText = plman.GetPlaylistName(playing_item_location.PlaylistIndex); // Playlist Name
    if(fb.IsPlaying) topText += ' [' + (playing_item_location.PlaylistItemIndex + 1) + "/" + plman.PlaylistItemCount(plman.PlayingPlaylist) + ']'; // 何曲目か/プレイリスト総曲数
    var rec = (isSpotify) ? spotRecordTime : fb.TitleFormat("[%RECORD_TIME%]").Eval();
    if(rec == "") return topText; 
    topText += ' // REC:' + rec.replace(/-1/g, "-");
    return topText;
}

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

function fnt(font,size) {
    // 1..Bold 2..Italic(英字のみ？) 4..underline 8..breakline
    // 組み合わせるときは足す
    //
    if(font==undefined) {
        font = defaultfont;
    }
    else{
        if(font.family == undefined){
            font.family = jsonData.defaultfont.family;
        }
        if(font.size == undefined){
            font.size = jsonData.defaultfont.size;
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

function fntclr(font) {
    var clr = RGB(defaultfont.color[0], defaultfont.color[1], defaultfont.color[2]); 
    try{
        clr = RGB(font.color[0], font.color[1], font.color[2]);
    }
    catch{}
    return clr;
}

function spotifySettingFileWrite(loc, track, idx, content) {
    var filename = rootDirectory + "spotify\\" + loc.slice(8).replace(":", "-") + "-" + track + ".txt";
    var rewriteLine = idx + "|" + content;
    try{
        old = utils.ReadTextFile(filename);
        params = old.split('\n');
        rewrite = false;
        for(i=0; i<params.length; i++){
            if(params[i].startsWith(idx + "|")){
                consoleWrite(filename + ": " + params[i] + "->" + content);
                params[i] = rewriteLine;
                rewrite = true;
                break;
            }
        }
        if(!rewrite){
            params.push(rewriteLine);
        }
    }
    catch{
        consoleWrite("New spotSetting: " + filename);
        params = [rewriteLine];
    }
    finally{
        utils.WriteTextFile(filename, params.join("\n"));
        consoleWrite("spotSetting write:" + filename );
    }
}

function spotifySettingFileLoad(loc, track, idx){
    try{
        var filename = rootDirectory + "spotify\\" + loc.slice(8).replace(":", "-") + "-" + track + ".txt";
        old = utils.ReadTextFile(filename);
        params = old.split('\n');
        rewrite = false;
        for(i=0; i<params.length; i++){
            if(params[i].startsWith(idx + "|")){
                param = params[i].replace("\n", "").replace("\r","").split("|");
                return param[1];
            }
        }
    }
    catch{
        consoleWrite("Spotify Setting File isn't found");
    }
    return "";
}

