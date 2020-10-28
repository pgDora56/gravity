const paint = {

    // デフォルトの形式(上寄せ)でパネルのメイン部分の行を描画する
    // @param gr GdiGraphics
    // @param display 表示する部分の内容
    // @param headerH ヘッダの高さ(float)
    // @param i 何ブロック目か(int)
    main : function (gr, display, headerH, i) {
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
    },

    // ヘッダを描画する
    // @param gr GdiGraphics
    header:function(gr, focus){
        var tText = paint.makeTopText();
        var headerMeasure = gr.MeasureString(tText, fnt(jsonData.header.font), 0,0,window.Width,10000,0);
        var headerH = headerMeasure.Height + 2;
        if(headerH < 3) headerH = gr.MeasureString("Shiina", fnt(jsonData.header.font), 0,0,window.Width,10000,0).Height + 2;
        var hcolor = jsonData.header.color;
        backcolor = RGB(hcolor[0], hcolor[1], hcolor[2]);
        if(!focus) backcolor = RGB(Math.round((hcolor[0]+255*2)/3),Math.round((hcolor[1]+255*2)/3),Math.round((hcolor[2]+255*2)/3));
        gr.FillSolidRect(0,0,window.Width,headerH-2,backcolor);
        gr.DrawString(tText, fnt(jsonData.header.font), fntclr(jsonData.header.font), 0, 0, window.Width, headerH, 0);
        return headerH;
    },

    // アートワークを描画する
    // @param gr GdiGraphics
    // @param headerH ヘッダの高さ
    artwork:function(gr, headerH){
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
    },

    // ヘッダに表示する内容を生成する
    // @return ヘッダに表示する内容(string)
    makeTopText:function (){
        // プレイリスト名＆何曲目か/プレイリスト総曲数
        if(is_ultimate){
            // Ultimate-modeのときは残り時間を表示
            if(ultimate_timer <= 0) return "Additional time";
            let min = Math.floor(ultimate_timer / 60);
            let sec = ultimate_timer % 60;
            return "Remain -> " + min + ":" + ((sec < 10) ? "0" : "") + sec;
        }

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
    },

    // 任意のメッセージを中央に表示するパネルを出現させる
    // Ultimate-modeで主に使用
    // @param gr GdiGraphics
    // @param msg 表示する文字列(string)
    message:function(gr, msg) {
        var messageMeasure = gr.MeasureString(msg, fnt(jsonData.ultimate.font), 0,0,window.Width,10000,0);
        let w = messageMeasure.Width * 2;
        let h = messageMeasure.Height * 2;
        if(w<h) w = h;
        let left = window.Width / 2 - w / 2;
        let up = window.Height / 2 - h / 2;

        gr.FillEllipse(left + w / 10, up + h / 10, w, h, RGB(200,200,200));
        gr.FillEllipse(left, up, w, h, RGB(255,255,255));
        gr.DrawEllipse(left, up, w, h, 2, RGB(0,0,0));
        gr.DrawString(msg, fnt(jsonData.ultimate.font), fntclr(jsonData.ultimate.font), (window.Width - messageMeasure.Width) / 2, (window.Height- messageMeasure.Height) / 2, w, h, 0);
    },

    lamp: function(gr, x, y, w, h, clr) {
        gr.FillEllipse(x, y, w, h, RGB(clr[0],clr[1],clr[2]));
        gr.DrawEllipse(x, y, w, h, 5, RGB(128,128,128));
    }
}
