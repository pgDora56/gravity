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
var display = ["%title%"];
var judgeFormat = "[%program% - ]%title%[ / %artist%][ - %type%][ - $if2(%work_year%,%date%)]";
var xhr = new ActiveXObject("Microsoft.XMLHTTP"); 
var path = rootDirectory + "setting.json"; // 読み込む外部ファイル

xhr.open("GET", path, true);
xhr.onreadystatechange = function(){
    // ローカルファイル用
    if (xhr.readyState === 4 && xhr.status === 0){
        const settingFile = xhr.responseText; // 外部ファイルの内容
        const jsonData = JSON.parse(settingFile);
        display = jsonData.display;
        judgeFormat = jsonData.format;
        consoleWrite(display1);
        consoleWrite("Name: " + jsonData.user.name[0]);
    }
};
xhr.send(null);


include(`${fb.ComponentPath}docs\\Flags.js`);
include(`${fb.ComponentPath}docs\\Helpers.js`);

//==============================================

//
// システム系
//

function on_paint(gr){

}

