//
// 初期値
//

window.DefinePanel("gravity", { author: "Dora F.", version: "24.03" });

function consoleWrite(msg) {
    if (true) console.log("[gravity] " + msg);
}

var rootDirectory = "C:\\Users\\" + fb.ProfilePath.split("\\")[2] + "\\gravity_panel\\";
consoleWrite("Root Directory: " + rootDirectory);

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
var ultimateAutoStop = 30; // Ultimate-modeのとき何分で止めるか
var ultimateCountdown = 30; // Ultimate-modeのとき1曲流すか
var ultimateDisplay = 5; // Ultimate-modeのとき何秒曲情報を表示するか
var is_adaptive = false; // Adaptive-modeであるかどうか
var adaptive_list_numbers = []; // Adaptive-modeのリスト番号を記録
var adaptive_playlist = []; // Adaptive-modeの実際のプレイリストを記録
var adaptive_up_down = [3, -3]; // ランクが上がるためのpt/下がるpt
var adaptive_now = [0, 0]; // 現在のランク/pt
var adaptive_this_q_result = 0; // 再生中の曲の正誤を記録しておく(1:o, -1:x)

//  Propertyを受け取る
var autoCopy = window.GetProperty("0. Autocopy - Enable", false);
var rantro_percent = window.GetProperty("1. Rantro - StartLocationRange", "10-90");
var get_mix_percent = window.GetProperty("2. Mix Ratio - Intro:Rantro", "1:1");
var get_outro_location = window.GetProperty("3. Outro - StartLocation", "15");
var is_ultimate = window.GetProperty("4.1. Ultimate mode - Enable", false);
var get_ultimate_auto_stop = window.GetProperty("4.2. Ultimate mode - Auto stop(min)", "30");
var ultimate_timeover_stop = window.GetProperty("4.3. Ultimate mode - Stop after timeover", false);
var ultimate_countdown = window.GetProperty("4.4. Ultimate mode - Count down(sec)", "20");
var ultimate_display = window.GetProperty("4.5. Ultimate mode - Display time(sec)", "5");
var difficulty_balancing = window.GetProperty("4.6. Ultimate mode - Difficulty Balancing - Enable", false);
var all_memorize = window.GetProperty("5. All memorize - Enable", false);
var adaptive_lists = window.GetProperty("6. Adaptive mode - Lists", "");
var adaptive_rank_up = window.GetProperty("6.1. Adaptive mode - Rank up count", "3");
var adaptive_rank_down = window.GetProperty("6.2. Adaptive mode - Rank down count", "-3");
var adaptive_order_random = window.GetProperty("6.3. Adaptive mode - Order randomize", false); // Adaptive-modeのリスト順をランダムにする
var adaptive_loop = window.GetProperty("6.4. Adaptive mode - Loop", false); // Adaptive-modeのリスト順をランダムにする

// チェック＆必要に応じてパース
// Rantroのスタート位置
try {
    var pers = rantro_percent.split('-');
    if (pers.length != 2) throw "Rantro StartLocation's value is invalid";
    minPercent = parseInt(pers[0]);
    maxPercent = parseInt(pers[1]);
}
catch (e) {
    consoleWrite(e);
    maxPercent = 90;
    minPercent = 10;
}

//   Mixの比率
try {
    var pers = get_mix_percent.split(':');
    if (pers.length != 2) throw "Mix Ratio's value is invalid";
    mixIntroRatio = parseInt(pers[0]);
    mixRantroRatio = parseInt(pers[1]);
}
catch (e) {
    consoleWrite(e);
    mixIntroRatio = mixRantroRatio = 1;
}

//   Outroの開始位置
try {
    outroLocation = parseInt(get_outro_location);
}
catch (e) {
    consoleWrite(e);
    outroLocation = 15;
}

//   Ultimate-modeオートストップ
try {
    ultimateAutoStop = parseInt(get_ultimate_auto_stop);
    if (ultimateAutoStop < 0) ultimateAutoStop = 30;
}
catch (e) {
    consoleWrite(e);
    ultimateAutoStop = 30;
}

try {
    ultimateCountdown = parseInt(ultimate_countdown);
    if (ultimateCountdown <= 0) ultimateCountdown = 20;
} catch (e) {
    consoleWrite(e);
    ultimateCountdown = 20;
}

try {
    ultimateDisplay = parseInt(ultimate_display);
    if (ultimateDisplay <= 0) ultimateDisplay = 5;
} catch (e) {
    consoleWrite(e);
    ultimateDisplay = 5;
}


// Adaptive-mode setting
try {
    let lists = adaptive_lists.split(",");
    if (lists.length < 2) {
        is_adaptive = false;
    } else {
        is_adaptive = true;
        adaptive_list_numbers = [];
        for (let i = 0; i < lists.length; i++) {
            let l_no = plman.FindPlaylist(lists[i]);
            if (l_no == -1) {
                console.log(`Adaptive-mode: ${lists[i]} is not found`)
                is_adaptive = false;
                break;
            }
            adaptive_list_numbers.push(l_no);
        }
        console.log(adaptive_list_numbers);
        if (is_adaptive) {
            let down = parseInt(adaptive_rank_down);
            let up = parseInt(adaptive_rank_up);
            if (up <= 0 || down >= 0) {
                // upとdownが不適
                is_adaptive = false;
            }
            adaptive_up_down = [up, down];
        }
        adaptive_now = [0, 0];
    }
    console.log("Adaptive:", is_adaptive);
} catch (e) {
    consoleWrite(e);
    is_adaptive = false;
    adaptive_list_numbers = [];
    adaptive_up_down = [];
    adaptive_now = [0, 0];
}


// ==========================================
//
// JSONファイル周りの設定
//
// Default Value
//
var display = [{ format: "", font: { family: "Meiryo UI", size: 10, color: [0, 0, 0] } }];
var defaultfont = { family: "Meiryo UI", size: 10, color: [0, 0, 0] };
var isSpotify = false;
var have_focus = false;
var mode = 0; // 0 -> Intro, 1 -> Rantro, 2 -> Mix, 3 -> Outro
var spotRecordTime = "";
var judgeFormat = "[%program% - ]%title%[ / %artist%][ - %type%][ - $if2(%work_year%,%date%)]";
var xhr = new ActiveXObject("Microsoft.XMLHTTP");
var path = rootDirectory + "setting.json"; // 読み込む外部ファイル
var jsonData = {};
var partsHeight = window.Height;
var display_num = 1;
var balancing_total = 0;
xhr.open("GET", path, true);
xhr.onreadystatechange = function () {
    // ローカルファイル用
    if (xhr.readyState === 4 && xhr.status === 0) {
        const settingFile = xhr.responseText; // 外部ファイルの内容
        jsonData = JSON.parse(settingFile);
        defaultfont = jsonData.defaultfont;
        judgeFormat = jsonData.format;
        display_num = jsonData.display.length;
        partsHeight = window.Height / display_num;
        // console.log(jsonData);
        if ("balancing" in jsonData) {
            for (let key in jsonData["balancing"]) {
                balancing_total += jsonData["balancing"][key];
            }
            // console.log("Balancing Total:", balancing_total);
        }
    }
};
xhr.send(null);

include(`${fb.ComponentPath}docs\\Flags.js`);
include(`${fb.ComponentPath}docs\\Helpers.js`);
include(`common.js`);
include(`paint.js`);
var paint = new Paint();

//==============================================

//
// Callback Functions
//

var start_position = 0; // ultimate-mode用
var remain = 417; // ultimate-mode用
var ultimate_timer = ultimateAutoStop * 60; // ultimate-mode用
var message_window = "";
function on_paint(gr) {
    display_num = jsonData.display.length;
    paint = new Paint();

    // ヘッダ部の描画
    //
    paint.header(gr, have_focus);

    // MessageWindowの調整
    if (message_window != "") {
        // message_windowがあればそちらを描画してReturn
        paint.message(gr, message_window);
        if (remain > 0) return;
    }

    // アルバムアートワークの描画
    //
    paint.artwork(gr);

    // 本体の描画
    //
    partsHeight = (window.Height - paint.headerH) / display_num;
    for (var i = 0; i < display_num; i++) {
        paint.main(gr, jsonData.display[i], i);
    }

    // ランプの描画
    // paint.lamp(gr,100,100,50,50,[196,0,0]);
}

var clk_count = 0;
function on_focus(is_focused) {
    if (!is_focused) clk_count = 0;
    have_focus = is_focused;
    window.Repaint();
}

function on_playback_edited(handle) {
    window.Repaint();
}

// function on_mouse_lbtn_down(x,y,mask){
//     clk_count += 1;
//     if(clk_count < 2) return;
//     console.log("Call lbtn_down:" + have_focus + clk_count);

// }

function on_mouse_lbtn_dblclk(x, y, mask) {
    const MEMOFILE = rootDirectory + "memorizer.txt"
    let _context = fb.CreateContextMenuManager();
    let _basemenu = window.CreatePopupMenu();
    let _child = window.CreatePopupMenu();

    // start index at 1, NOT 0
    _basemenu.AppendMenuItem(MF_STRING, 6, 'View memo');
    _basemenu.AppendMenuItem(MF_STRING, 7, 'Delete memo');
    _basemenu.AppendMenuSeparator();
    _basemenu.AppendMenuItem(MF_STRING, 2, 'Output the contents of the active playlist');
    _basemenu.AppendMenuItem(MF_STRING, 3, 'Copy the contents of the active playlist');
    _basemenu.AppendMenuSeparator();
    _basemenu.AppendMenuItem(MF_STRING, 4, 'Go to SABI');
    _basemenu.AppendMenuItem(MF_STRING, 5, 'Save the current time as SABI');
    _basemenu.AppendMenuSeparator();
    // _basemenu.AppendMenuItem(MF_STRING, 8, 'Create filter list from active playlist');
    _basemenu.AppendMenuItem(MF_STRING, 9, 'Cook playlist');
    if (fb.GetNowPlaying()) {
        _basemenu.AppendMenuSeparator();
        _child.AppendTo(_basemenu, MF_STRING, 'Now Playing');
    }

    _context.InitNowPlaying();
    _context.BuildMenu(_child, 99);

    const idx = _basemenu.TrackPopupMenu(x, y);

    switch (idx) {
        case 0: //user dismissed menu by clicking elsewhere. that's why you can't use 0 when building menu items
            break;
        case 1:
            addManyLocation();
            break;
        case 2:
            fb.ShowPopupMessage(get_active_all_tf());
            break;
        case 3:
            setClipboard(get_active_all_tf());
            break;
        case 4:
            fn_gorec();
            break
        case 5:
            fn_rec();
            break;
        case 6:
            let memodata = "No memo data"
            if (utils.FileExists(MEMOFILE)) {
                let filedata = utils.ReadTextFile(MEMOFILE);
                if (filedata != "") {
                    memodata = filedata;
                }
            }
            fb.ShowPopupMessage(memodata);
            break;
        case 7:
            if (!utils.FileExists(MEMOFILE)) {
                fb.ShowPopupMessage("No memo data");
                return;
            }
            if (utils.ReadTextFile(MEMOFILE) == "") {
                fb.ShowPopupMessage("No memo data");
                return;
            }
            try {
                let isok = utils.InputBox(0, "If you agree to delete the memo, enter `OK` in the text box below to continue.", "Delete memo", "", true);
                if (isok != "OK") {
                    return;
                }
                utils.WriteTextFile(MEMOFILE, "");
                consoleWrite("Delection of memo completed");
            } catch (e) {
                // Do nothing
            }
            break;
        // case 8:
        //     let ipt = utils.InputBox(0, "Enter filter rule json.", "Spider Monkey Panel", "");
        //     try {
        //         let handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
        //         let sepRule = JSON.parse(ipt);
        //         createFilterList(handle_list, sepRule);
        //     }
        //     catch (e) {
        //         fb.ShowPopupMessage("An error has occurred:" + e, "FilterListCreator");
        //         break;
        //     }
        //     break;
        case 9:
            // Cook playlist with cook json file
            let ipt = utils.InputBox(0, "Enter cooking json", "Playlist Cooker", "");
            try {
                let recipe = JSON.parse(ipt);
                playlistCooker(recipe);
            } catch (e) {
                fb.ShowPopupMessage("An error has occurred:" + e, "Playlist Cooker");
                break;
            }
        default:
            _context.ExecuteByID(idx - 99);
            break;
    }
}

function on_playback_time(time) {
    // 再生時に毎秒呼ばれる
    if (!is_ultimate) return; // Ultimate-modeでなければearly return
    if (remain <= -1 * ultimateDisplay) {
        if (ultimate_timer <= 0) {
            // 時間が来てたら何もしない
            return;
        }
        if (difficulty_balancing && balancing_total > 0) {
            // Difficulty Balancing
            let tot = 0;
            let r = Math.floor(Math.random() * balancing_total);
            // console.log("Balancing Rand", r)
            for (let query in jsonData["balancing"]) {
                tot += jsonData["balancing"][query];
                if (tot > r) {
                    let active_hl = plman.GetPlaylistItems(plman.PlayingPlaylist);
                    let hl = fb.GetQueryItems(active_hl, query);
                    let nextsong = Math.floor(Math.random() * hl.Count);
                    // console.log(nextsong, hl[nextsong]);
                    plman.AddItemToPlaybackQueue(hl[nextsong]);
                    break;
                }
            }
        }
        fb.Next();
    }
    if (ultimateAutoStop == 0) ultimate_timer++;
    else ultimate_timer--;
    calc_ultimate_remain(time);
    if (remain == 0) {
        fn_gorec();
        start_position = fb.PlaybackTime - ultimateCountdown;
    } else if (remain == 1 && ultimate_timeover_stop) {
        fb.Pause();
        return;
    }
}

function on_playback_new_track(handle) {
    if (is_adaptive) {
        adaptive_now[1] += adaptive_this_q_result;
        adaptive_this_q_result = 0;
        if (adaptive_now[0] == 0 && adaptive_now[1] < 0) {
            // 最低ランクで負の値にはいかない
            adaptive_now[1] = 0;
        }

        if (adaptive_up_down[0] <= adaptive_now[1]) {
            // ランクアップポイントを超えている
            if (adaptive_now[0] < adaptive_list_numbers.length - 1) {
                // 上がれるランクが有る
                adaptive_playlist_change(adaptive_now[0] + 1);
                return;
            } else if (adaptive_loop) {
                // 次のリストたちを追加
                adaptive_playlist_add();
                adaptive_playlist_change(adaptive_now[0] + 1);
                return;
            }
        }
        else if (adaptive_up_down[1] >= adaptive_now[1]) {
            // ランクダウンポイントを下回っている
            if (adaptive_now[0] > 0) {
                adaptive_playlist_change(adaptive_now[0] - 1);
                return;
            }
        }
    }
    consoleWrite(get_tf("%play_count%", handle))  // 再生数少ないのから再生する機能をつけるときよう
    window.Repaint();
    var nowPlayPath = fb.GetNowPlaying().Path;
    isSpotify = nowPlayPath.startsWith("spotify");
    consoleWrite("IsSpotify:" + isSpotify);
    if (autoCopy) {
        let tf = get_tf();
        setClipboard(tf);
    }
    if (all_memorize) {
        add_memorize_nowplaying();
    }
    if (isSpotify) {
        spotRecordTime = spotifySettingFileLoad(nowPlayPath, fb.TitleFormat("%tracknumber%").Eval(), "RECORD_TIME");
    }

    switch (mode) {
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

    if (is_ultimate) {
        start_position = fb.PlaybackTime;
        calc_ultimate_remain(fb.PlaybackTime);
    }
}

function on_playback_starting(cmd, is_paused) {
    consoleWrite("Starting:" + cmd)
}

function on_key_down(vkey) {
    consoleWrite("vkey: " + vkey); // For debug

    if (vkey == 37 || vkey == 72) {
        // Push Left / H
        // Previous
        fb.Prev();
        fb.Pause();
    }
    else if (vkey == 38 || vkey == 75) {
        // Push Up / K
        // Sabi
        fn_gorec();
    }
    else if (vkey == 39 || vkey == 76) {
        // Push Right / L
        // Next
        fb.Next();
        fb.Pause();
    }
    else if (vkey == 40 || vkey == 74) {
        // Push Down / J
        // Play & Pause
        if (fb.IsPlaying) {
            fb.Pause();
        }
        else {
            fb.Play();
        }
    }
    else if (vkey == 32 || vkey == 68) {
        // Push Space / D
        // Ultimate-mode - Show songdata
        fn_gorec();
        start_position = fb.PlaybackTime - ultimateCountdown;
    }
    else if (vkey == 81) {
        // Push Q
        // Adaptive-mode correct
        if (!is_adaptive) return;
        adaptive_this_q_result = 1;
        window.Repaint();
    }
    else if (vkey == 87) {
        // Push W
        // Adaptive-mode wrong
        if (!is_adaptive) return;
        adaptive_this_q_result = -1;
        window.Repaint();
    }
    else if (vkey == 69) {
        // Push E
        // Adaptive-mode reset 
        if (!is_adaptive) return;
        adaptive_this_q_result = 0;
        window.Repaint();
    }
    else if (vkey == 82) {
        // Push R
        // 出題中の楽曲をメモする
        add_memorize_nowplaying();
    }
    else if (vkey == 27) {
        // Push ESC
        // ultimate_timeをリセットさせる
        ultimate_timer = ultimateAutoStop * 60; // ultimate-mode用
        if (is_adaptive) {
            adaptive_playlist = [];
            adaptive_playlist_add();
            adaptive_playlist_change(0);
            adaptive_this_q_result = 0;
        }
        fb.Next();
        window.Repaint();
    }
    else if (vkey == 77) {
        // Push M
        // Mode change
        mode = (mode + 1) % 4;
        consoleWrite(mode);
        window.Repaint();
    }
    else if (48 <= vkey && vkey <= 57) {
        // Push Number key
        fn_gorec(vkey - 48);
    }
    else if (112 <= vkey && vkey <= 121) {
        var number = vkey - 112;
        fn_rec(number + 1);
    }
    else if (vkey == 222) {
        // Push Caret(^)
        fb.PlaybackTime = 0;
    }
}

function on_main_menu(idx) {
    switch (idx) {
        case 1:
            setClipboard(get_active_all_tf());
            break;
        default:
            addManyLocation();
            break;
    }
}

// =======================================

// 
// Other Functions
//

// ultimate modeの残り時間を計算
// @param time 現在の時間
//
function calc_ultimate_remain(time) {
    remain = Math.floor(ultimateCountdown - (time - start_position));
    if (remain <= -2 && 5 + remain < ultimate_timer) message_window = (remain + 5);
    else if (remain <= 0) message_window = "";
    else message_window = remain;

    window.Repaint();
}

// 記録箇所に移動する
// @param no 記録の通し番号(int)
//
function fn_gorec(no) {
    if (no == undefined) no = 1;
    if (no == 0) no = 10;
    no -= 1;
    tarr = rec_to_array();
    try {
        if (tarr != undefined) {
            if (tarr[no] != "-1") {
                fb.PlaybackTime = tarr[no];
                return;
            }
        }
        consoleWrite("Don't set Sabi");
        consoleWrite("Sabi:" + tarr);
    }
    catch {
        consoleWrite("Can't move to Sabi");
        consoleWrite("Sabi:" + tarr);
    }
}

// 現在再生している箇所を記録する
// @param no 記録する通し番号(int)
//
function fn_rec(no) {
    if (no == undefined) no = 1;
    no -= 1;
    tarr = rec_to_array();
    if (tarr == undefined) tarr = ["-1", "-1", "-1", "-1", "-1", "-1", "-1", "-1", "-1", "-1"];
    var handle = fb.CreateHandleList();
    var tfo = fb.TitleFormat("%playback_time_seconds%");
    consoleWrite(tfo.Eval());
    if (tarr[no] == tfo.Eval()) tarr[no] = "-1";
    else tarr[no] = tfo.Eval();
    saveData = tarr[0];
    for (i = 1; i < 10; i++) {
        saveData += "," + tarr[i];
    }

    if (isSpotify) {
        spotifySettingFileWrite(fb.GetNowPlaying().Path, fb.TitleFormat("%tracknumber%").Eval(), "RECORD_TIME", saveData);
        spotRecordTime = saveData;
    }
    else {
        var data = fb.GetNowPlaying();
        handle.Add(data);
        handle.UpdateFileInfoFromJSON(
            JSON.stringify({
                'RECORD_TIME': saveData
            })
        );
    }
    setTimeout(function () {
        window.Repaint();
    }, 1000);
}

// 現在再生中の楽曲の記録箇所をarrayで指定する。
// @return 記録箇所のArray(array<int>)
//
function rec_to_array() {
    var time = (isSpotify) ? spotRecordTime : fb.TitleFormat("%RECORD_TIME%").Eval();
    if (time == "?") {
        return undefined;
    }
    var arr = time.split(",");
    while (arr.length < 10) {
        arr.push("-1");
    }
    return arr;
}


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
function fntToSub(main, sub) {
    var newfnt = {};
    var fields = ["family", "size", "style", "color"];
    if (sub == undefined) sub = {};
    if (main == undefined) main = {};
    fields.forEach(field => {
        if (sub[field] != undefined) {
            newfnt[field] = JSON.parse(JSON.stringify(sub[field]));
        } else {
            if (main[field] != undefined) {
                newfnt[field] = JSON.parse(JSON.stringify(main[field]));
            } else if (defaultfont[field] != undefined) {
                newfnt[field] = JSON.parse(JSON.stringify(defaultfont[field]));
            }

            if (newfnt[field] != undefined) {
                if (field == "size") newfnt[field] = Math.floor(newfnt[field] * 3 / 4);
                else if (field == "color") {
                    for (var i = 0; i < 3; i++) {
                        newfnt[field][i] = Math.floor((newfnt[field][i] + 256) / 2);
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
function fnt(font, size) {
    // 1..Bold 2..Italic(英字のみ？) 4..underline 8..breakline
    // 組み合わせるときは足す
    //
    if (font == undefined) {
        font = defaultfont;
    }
    else {
        if (font.family == undefined) {
            font.family = defaultfont.family;
        }
        if (font.size == undefined) {
            font.size = defaultfont.size;
        }
    }
    if (size == undefined) {
    }
    var style = 0;
    if (font.style != undefined) {
        var st = font.style.toLowerCase();
        if (~st.indexOf("b")) style += 1;
        if (~st.indexOf("i")) style += 2;
        if (~st.indexOf("u")) style += 4;
        if (~st.indexOf("s")) style += 8;
    }
    return gdi.Font(font.family, font.size, style);
}

// フォントから色を抽出する
// @param font フォント
// @return 色情報(RGB)
function fntclr(font) {
    var clr = RGB(defaultfont.color[0], defaultfont.color[1], defaultfont.color[2]);
    try {
        clr = RGB(font.color[0], font.color[1], font.color[2]);
    }
    catch { }
    return clr;
}

function addManyLocation() {
    var enter = getClipboard();
    var lines = enter.split('\n');
    var datas = lines.map(x => x.replace("\n", "").replace("\r", ""));
    consoleWrite(lines);
    consoleWrite(datas);
    plman.AddLocations(plman.ActivePlaylist, datas);
}

// Title Formattingに従って楽曲情報を取得する
// @param tf TitleFormatting
// @param handle Handle
// @return 楽曲情報(string)
function get_tf(tf, handle) {
    if (tf == undefined) tf = judgeFormat;
    if (handle == undefined) {
        if (fb.GetNowPlaying()) {
            return fb.TitleFormat(tf).Eval();
        }
    }
    else {
        return fb.TitleFormat(tf).EvalWithMetadb(handle);
    }
}

function get_active_all_tf(tf) {
    let handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
    return get_multiple_tf(undefined, handle_list);
}

function get_multiple_tf(tf, handles) {
    var outputs = "";
    for (let i = 0; i < handles.Count; i++) {
        if (outputs != "") {
            outputs += "\n";
        }
        outputs += get_tf(tf, handles[i]);
    }
    return outputs;
}

function add_memorize_nowplaying() {
    const MEMOFILE = rootDirectory + "memorizer.txt"
    var nowplayingData = get_tf()
    if (nowplayingData == undefined) return;
    var memodata = "";
    if (utils.FileExists(MEMOFILE)) {
        filedata = utils.ReadTextFile(MEMOFILE);
        if (filedata.startsWith(nowplayingData)) {
            // 重複登録をブロック
            return;
        }
        if (filedata != "") {
            memodata = "\n" + filedata;
        }
    }
    utils.WriteTextFile(MEMOFILE, nowplayingData + memodata);
    consoleWrite("Add to memo: " + nowplayingData);
}


function adaptive_playlist_change(change_to) {
    adaptive_now = [change_to, 0]
    change_playlist(adaptive_playlist[change_to]);
}

function adaptive_playlist_add() {
    let newlist = [];
    let list_count = adaptive_list_numbers.length;

    for (let i = 0; i < list_count; i++) {
        newlist.push(adaptive_list_numbers[i])
    }
    if (adaptive_order_random) {
        for (let i = 0; i < list_count; i++) {
            let rand = Math.floor(Math.random() * list_count);
            let tmp = newlist[i];
            newlist[i] = newlist[rand];
            newlist[rand] = tmp;
        }
    }
    console.log("Before playlist", adaptive_playlist);
    adaptive_playlist = adaptive_playlist.concat(newlist);
    console.log("Add playlist", adaptive_playlist);
}

function change_playlist(playlistnumber) {
    plman.PlayingPlaylist = playlistnumber;
    fb.Random();
}


function createFilterList(handleList, ruleObject) {
    console.log(handleList, ruleObject);
    for (let i = 0; i < ruleObject.length; i++) {
        // ルールごとに作成
        let created_playlist_index = plman.CreatePlaylist(plman.PlaylistCount, ruleObject[i]["listname"]);
        let picklist = new FbMetadbHandleList();
        for (let j = 0; j < handleList.Count; j++) {
            // handleList[j]の楽曲について各フィルタに当てはまるかチェック
            let fulfill = true;
            for (const [key, value] of Object.entries(ruleObject[i])) {
                if (key == "listname") continue;
                switch (key.slice(-1)) {
                    case "*":
                        // 前方一致検索
                        let thisField = key.slice(0, -1);
                        console.log(thisField, handleList[j]);
                        console.log(fb.TitleFormat(`%${thisField}%`).EvalWithMetadb(handleList[j]));
                        if (!fb.TitleFormat(`%${thisField}%`).EvalWithMetadb(handleList[j]).startsWith(value)) {
                            fulfill = false;
                        }
                        break;
                    case "-":
                        // 数値範囲検索
                        let field = key.slice(0, -1);
                        let fValue = fb.TitleFormat(`%${field}%`).EvalWithMetadb(handleList[j]);
                        try {
                            let vals = value.split("-");
                            if (parseInt(vals[0]) > parseInt(fValue) || parseInt(fValue) > parseInt(vals[1])) {
                                fulfill = false;
                            }
                        } catch (e) {
                            console.log(`Create filter list error:${e} / key: ${key} / value: ${value}`);
                            fulfill = false;
                        }
                        break;
                }
                console.log(key, value);
                if (!fulfill) break;
            }
            if (fulfill) {
                picklist.Add(handleList[j]);
            }
        }
        plman.InsertPlaylistItems(created_playlist_index, 0, picklist);
    }
}

function playlistCooker(cookingJson) {
    for (let plidx = 0; plidx < cookingJson.length; plidx++) {
        let recipe = cookingJson[plidx];
        let handleList = cookingPlaylist(recipe["recipe"]);
        console.log("[Cooker]", recipe["name"], ":", handleList.Count, "songs");
        plman.InsertPlaylistItems(
            plman.CreatePlaylist(plman.PlaylistCount, recipe["name"]),
            0,
            handleList
        )
    }
}

function cookingPlaylist(recipe) {
    let list = new FbMetadbHandleList();
    for (const [query, g] of Object.entries(recipe)) {
        let hl = fb.GetQueryItems(fb.GetLibraryItems(), query);
        console.log("[Cooker]", hl.Count, "songs from", query);
        for (let i = 0; i < g; i++) {
            list.AddRange(hl);
        }
    }
    return list;
}