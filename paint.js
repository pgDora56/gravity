class Paint {
    constructor() {
        this.headerColors = [RGB(215, 0, 58), RGB(0, 123, 187), RGB(240, 131, 0), RGB(195, 216, 37), RGB(116, 50, 92)];
        this.leftMargin = 15;
        this.headerH = 0;
        this.totalHeight = 0;
    }

    // デフォルトの形式(上寄せ)でパネルのメイン部分の行を描画する
    // @param gr GdiGraphics
    // @param display 表示する部分の内容
    // @param i 何ブロック目か(int)
    main(gr, display, i) {
        this.totalHeight += 5;
        let startXloc = this.totalHeight;
        if (display.subline != undefined) {
            var subfnt = fntToSub(display.font, display.subline.font);
            var subclr = RGB(subfnt.color[0], subfnt.color[1], subfnt.color[2]);
            var ms = gr.MeasureString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), this.leftMargin, this.totalHeight, window.Width - this.leftMargin, 10000, 0);
            gr.DrawString(fb.TitleFormat(display.subline.format).Eval(), fnt(subfnt), subclr, this.leftMargin, this.totalHeight, window.Width - this.leftMargin, ms.Height + 1, 0);
            this.totalHeight += ms.Height + 1;
        }
        var mainHeight = gr.MeasureString(fb.TitleFormat(display.format).Eval(), fnt(display.font), this.leftMargin, this.totalHeight, window.Width - this.leftMargin, 10000, 0).Height;
        gr.DrawString(fb.TitleFormat(display.format).Eval(), fnt(display.font), fntclr(display.font), this.leftMargin, this.totalHeight, window.Width - this.leftMargin, mainHeight + 1, 0);
        let h = (ms == undefined) ? mainHeight - 8 : ms.Height + mainHeight - 8;
        gr.FillSolidRect(5, startXloc + 4, 3, h, this.headerColors[i % 5]);
        this.totalHeight += mainHeight;
    }

    // ヘッダを描画する
    // @param gr GdiGraphics
    // @param focus boolean
    header(gr, focus) {
        var tText = paint.makeTopText();
        var headerMeasure = gr.MeasureString(tText, fnt(jsonData.header.font), 0, 0, window.Width, 10000, 0);
        this.headerH = headerMeasure.Height + 2;
        if (this.headerH < 3) this.headerH = gr.MeasureString("Shiina", fnt(jsonData.header.font), 0, 0, window.Width, 10000, 0).Height + 2;
        var hcolor = jsonData.header.color;
        let backcolor = RGB(hcolor[0], hcolor[1], hcolor[2]);
        if (!focus) backcolor = RGB(Math.round((hcolor[0] + 255 * 2) / 3), Math.round((hcolor[1] + 255 * 2) / 3), Math.round((hcolor[2] + 255 * 2) / 3));
        gr.FillSolidRect(0, 0, window.Width, this.headerH - 2, backcolor);
        gr.DrawString(tText, fnt(jsonData.header.font), fntclr(jsonData.header.font), 0, 0, window.Width, this.headerH, 0);
        this.totalHeight += this.headerH;
    }

    // アートワークを描画する
    // @param gr GdiGraphics
    artwork(gr) {
        try {
            var img = utils.GetAlbumArtV2(fb.GetNowPlaying());
            if (img != null) {
                var w_per_h = img.Width / img.Height;
                var drawing_height = window.Height - this.headerH;
                var h = drawing_height * 0.7;
                var w = h * w_per_h;
                var x = window.Width - window.Width * 0.05 - w;
                var y = this.headerH + drawing_height * 0.05;
                var src_x = 0;
                var src_y = 0;
                var src_w = img.Width;
                var src_h = img.Height;
                var alpha = 150;
                gr.DrawImage(img, x, y, w, h, src_x, src_y, src_w, src_h, 0, alpha);
                img.RotateFlip(6);
                gr.DrawImage(img, x, y + h + 5, w, h, src_x, src_y, src_w, src_h, 0, alpha * 0.3);
            }
        }
        catch {
            consoleWrite("Album Artwork is not found");
        }
    }

    // ヘッダに表示する内容を生成する
    // @return ヘッダに表示する内容(string)
    makeTopText() {
        // プレイリスト名＆何曲目か/プレイリスト総曲数
        var playing_item_location = plman.GetPlayingItemLocation();
        var topText = plman.GetPlaylistName(playing_item_location.PlaylistIndex); // Playlist Name

        if (is_ultimate) {
            let prefix_text = "";
            if (is_adaptive) {
                let status = " - ";
                if (adaptive_this_q_result == 1) {
                    status = " O ";
                } else if (adaptive_this_q_result == -1) {
                    status = " X ";
                }
                let mode_mark = "";
                if (adaptive_loop) mode_mark += "L";
                if (adaptive_order_random) mode_mark += "R";
                prefix_text = `${(mode_mark != "") ? "[" + mode_mark + "] " : ""} ${adaptive_now[1]}pt(${(adaptive_now[0] == adaptive_list_numbers.length - 1 && !adaptive_loop) ? 'Last' : "Rank" + (adaptive_now[0] + 1)}/${adaptive_list_numbers.length})${status} // `
            } else if (ultimate_score_counting) {
                prefix_text = `Score: ${ultimateScoreCountTotal}pt {${ultimateScoreCount}} `;
            } else if (ultimate_score_counting_ox) {
                prefix_text = `${ox_score.o}o ${ox_score.x}x  `;
            } else if (ultimate_score_counting_percent) {
                let percentage = percent_score.total > 0 ? Math.round((percent_score.correct / percent_score.total) * 1000) : 0;
                prefix_text = `${percent_score.correct}/${percent_score.total} (Ave:${percentage / 1000})  `;
            }
            if (ultimateAutoStop == 0) {
                let min = Math.floor(ultimate_timer / 60);
                let sec = ultimate_timer % 60;
                return prefix_text + "Elapsed -> " + min + ":" + ((sec < 10) ? "0" : "") + sec + " // " + topText + " " + this.getModeText();
            } else {
                // Ultimate-modeのときは残り時間を表示
                if (ultimate_timer <= 0) return prefix_text + "Additional time";
                let min = Math.floor(ultimate_timer / 60);
                let sec = ultimate_timer % 60;
                return prefix_text + "Remain -> " + min + ":" + ((sec < 10) ? "0" : "") + sec + " // " + topText + " " + this.getModeText();
            }
        }

        if (fb.IsPlaying) topText += ' [' + (playing_item_location.PlaylistItemIndex + 1) + "/" + plman.PlaylistItemCount(plman.PlayingPlaylist) + ']';

        // Rantro, Mix, Outroの場合は記載
        topText += " // " + this.getModeText()

        // RECORD_TIMEまわり
        var rec = (isSpotify) ? spotRecordTime : fb.TitleFormat("[%RECORD_TIME%]").Eval();
        if (rec == "") return topText;
        topText += ' // REC:' + rec.replace(/-1/g, "-");
        return topText;
    }

    getModeText() {
        let mtext = (all_memorize) ? "[M]" : "";
        switch (mode) {
            case 1: // Rantro
                mtext += "Rantro>>" + minPercent + "%~" + maxPercent + "% ";
                break;
            case 2: // Mix
                mtext += "Mix>>I:R(" + minPercent + "%~" + maxPercent + "%)=" + mixIntroRatio + ":" + mixRantroRatio + " ";
                break;
            case 3: // Outro
                mtext += "Outro>>" + outroLocation + "sec before the end ";
                break;
            case 4: // S-Rantro
                mtext += "S-Rantro>>" + minPercent + "%~" + maxPercent + "% (Flip: " + s_rantro_flip_count + ")";
                break;
        }
        return mtext;
    }

    // 任意のメッセージを中央に表示するパネルを出現させる
    // Ultimate-modeで主に使用
    // @param gr GdiGraphics
    // @param msg 表示する文字列(string)
    message(gr, msg) {
        var messageMeasure = gr.MeasureString(msg, fnt(jsonData.ultimate.font), 0, 0, window.Width, 10000, 0);
        let w = messageMeasure.Width * 2;
        let h = messageMeasure.Height * 2;
        if (w < h) w = h;
        let left = window.Width / 2 - w / 2;
        let up = window.Height / 2 - h / 2;

        gr.FillEllipse(left + w / 10, up + h / 10, w, h, RGB(200, 200, 200));
        gr.FillEllipse(left, up, w, h, RGB(255, 255, 255));
        gr.DrawEllipse(left, up, w, h, 2, RGB(0, 0, 0));
        gr.DrawString(msg, fnt(jsonData.ultimate.font), fntclr(jsonData.ultimate.font), (window.Width - messageMeasure.Width) / 2, (window.Height - messageMeasure.Height) / 2, w, h, 0);
    }

    lamp(gr, x, y, w, h, clr) {
        gr.FillEllipse(x, y, w, h, RGB(clr[0], clr[1], clr[2]));
        gr.DrawEllipse(x, y, w, h, 5, RGB(128, 128, 128));
    }

    // スコア推移グラフを背景に薄く描画する
    // @param gr GdiGraphics
    scoreGraph(gr) {
        // 履歴が2問未満の場合は描画しない
        if (percent_score_history.length < 2) return;

        // グラフの描画領域を設定（ヘッダの下、メインコンテンツの背景）
        let graphX = 30;
        let graphY = this.headerH + 20;
        let graphWidth = window.Width - 60;
        let graphHeight = window.Height - this.headerH - 40;

        // 最小サイズチェック
        if (graphWidth < 100 || graphHeight < 100) return;

        // 透明度付きの色を設定（0xAARRGGBB形式）
        // alpha = 50 (約20%透明度), RGB(100, 150, 200)
        let lineColor = 0x32648CC8;  // 50% transparent blue
        let gridColor = 0x19C8C8C8;  // 10% transparent gray
        let lineWidth = 2;

        // 補助線を描画（0%, 50%, 100%）
        for (let i = 0; i <= 2; i++) {
            let y = graphY + graphHeight - (graphHeight * i / 2);
            gr.DrawLine(graphX, y, graphX + graphWidth, y, 1, gridColor);
        }

        // データポイント間の幅を計算
        let pointSpacing = graphWidth / (percent_score_history.length - 1);

        // 折れ線グラフを描画
        for (let i = 0; i < percent_score_history.length - 1; i++) {
            // 現在のポイントと次のポイントの座標を計算
            let x1 = graphX + (i * pointSpacing);
            let y1 = graphY + graphHeight - (percent_score_history[i] * graphHeight);
            let x2 = graphX + ((i + 1) * pointSpacing);
            let y2 = graphY + graphHeight - (percent_score_history[i + 1] * graphHeight);

            // 線を描画
            gr.DrawLine(x1, y1, x2, y2, lineWidth, lineColor);
        }

        // %表示用のフォント（小さめ、半透明）
        let textFont = gdi.Font("Meiryo UI", 12, 0);
        let textColor = 0x64648CC8;  // 40% transparent blue

        // データポイントを小さな円で描画し、全てに%を表示
        for (let i = 0; i < percent_score_history.length; i++) {
            let x = graphX + (i * pointSpacing);
            let y = graphY + graphHeight - (percent_score_history[i] * graphHeight);
            gr.FillEllipse(x - 3, y - 3, 6, 6, lineColor);
            
            // 各ポイントに%を表示
            let percentText = Math.round(percent_score_history[i] * 100) + "%";
            let textWidth = gr.MeasureString(percentText, textFont, 0, 0, 1000, 1000, 0).Width;
            gr.DrawString(percentText, textFont, textColor, x - textWidth / 2, y - 20, textWidth + 10, 20, 0);
        }
    }
}
