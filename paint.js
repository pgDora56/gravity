
// デフォルトの形式でパネルのメイン部分の行を描画する
// @param gr GdiGraphics
// @param display 表示する部分の内容
// @param headerH ヘッダの高さ(float)
// @param i 何ブロック目か(int)
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

// 上側へ寄せた状態でパネルのメイン部分を描画する
// @param gr GdiGraphics
// @param display 表示する部分の内容
// @param i 何ブロック目か(int)
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

// 下側へ寄せた状態でパネルのメイン部分を描画する
// @param gr GdiGraphics
// @param display 表示する部分の内容
// @param i 何ブロック目か(int)
function paintBottom(gr, display, i) {
    var prevTotalHeight = totalHeight;

    var mainHeight = gr.MeasureString(fb.TitleFormat(display.format).Eval(), fnt(display.font), leftMargin, 0, window.Width - leftMargin, 10000, 0).Height;
    totalHeight += mainHeight + 1;
    gr.DrawString(fb.TitleFormat(display.format).Eval(), fnt(display.font), fntclr(display.font), leftMargin, window.Height - totalHeight, window.Width - leftMargin, mainHeight+1, 0);

    if(display.subline != undefined){
        var subfnt = fntToSub(display.font, display.subline.font);
        var subclr = RGB(subfnt.color[0],subfnt.color[1],subfnt.color[2]);
        var ms = gr.MeasureString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), leftMargin, 0 , window.Width - leftMargin, 10000, 0);
        totalHeight += ms.Height + 1;
        gr.DrawString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), subclr, leftMargin, window.Height - totalHeight, window.Width - leftMargin, ms.Height+1, 0);
    }
    gr.FillSolidRect(5, window.Height - totalHeight + 4, 3, ms.Height + mainHeight - 8, headerColors[i%5]);
    totalHeight += 15;
}

// ヘッダを描画する
// @param gr GdiGraphics
function paintHeader(gr){
    var tText = makeTopText();
    var headerMeasure = gr.MeasureString(tText, fnt(jsonData.header.font), 0,0,window.Width,10000,0);
    var headerH = headerMeasure.Height + 2;
    var hcolor = jsonData.header.color;
    gr.FillSolidRect(0,0,window.Width,headerMeasure.Height,RGB(hcolor[0], hcolor[1], hcolor[2]));
    gr.DrawString(tText, fnt(jsonData.header.font), fntclr(jsonData.header.font), 0, 0, window.Width, headerH, 0);
    return headerH;
}

function paintArtwork(gr, headerH){
    try{
        var img = utils.GetAlbumArtV2(fb.GetNowPlaying());
        if(img != null){
            var w_per_h = img.Width / img.Height;
            var drawing_height = window.Height - headerH;
            var h = drawing_height * 0.7;
            var w = h * w_per_h;
            var x = window.Width - window.Width * 0.05 - w;
            var y = headerH + drawing_height * 0.05;
            var src_x = 0;
            var src_y = 0;
            var src_w = img.Width;
            var src_h = img.Height;
            var alpha = 150;
            gr.DrawImage(img, x, y, w, h, src_x, src_y, src_w, src_h, 0, alpha);
            img.RotateFlip(6);
            gr.DrawImage(img, x, y+h+5, w, h, src_x, src_y, src_w, src_h, 0, alpha*0.3);
        }
    }
    catch{
        consoleWrite("Album Artwork is not found");
    }
}

// ヘッダに表示する内容を生成する
// @return ヘッダに表示する内容(string)
function makeTopText(){
    // プレイリスト名＆何曲目か/プレイリスト総曲数
    var playing_item_location = plman.GetPlayingItemLocation();
    var topText = plman.GetPlaylistName(playing_item_location.PlaylistIndex); // Playlist Name
    if(fb.IsPlaying) topText += ' [' + (playing_item_location.PlaylistItemIndex + 1) + "/" + plman.PlaylistItemCount(plman.PlayingPlaylist) + ']'; 

    // Rantro, Mix, Outroの場合は記載
    switch(mode){
        case 1: // Rantro
            topText += " // Rantro>>" + minPercent + "%~" + maxPercent + "% ";
            break
        case 2: // Mix
            topText += " // Mix>>I:R(" + minPercent + "%~" + maxPercent + "%)=" + mixIntroRatio + ":" + mixRantroRatio + " ";
            break
        case 3: // Outro
            topText += " // Outro>>" + outroLocation + "sec before the end ";
            break;
    }

    // RECORD_TIMEまわり
    var rec = (isSpotify) ? spotRecordTime : fb.TitleFormat("[%RECORD_TIME%]").Eval();
    if(rec == "") return topText; 
    topText += ' // REC:' + rec.replace(/-1/g, "-");
    return topText;
}
