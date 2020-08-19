//
// Around Spotify Setting
//

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

//
// Around Clipboard
//

function getClipboard() { // クリップボードを取得する関数
    return new ActiveXObject("htmlfile").parentWindow.clipboardData.getData("text")
}

function setClipboard(text) { // クリップボードにコピーする関数
    return new ActiveXObject("htmlfile").parentWindow.clipboardData.setData("text", text)
}

