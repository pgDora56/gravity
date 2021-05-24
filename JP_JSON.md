# gravity - JSONの書き方

## JSONの紹介

JSONはプログラミング言語が読み取りやすい形で書かれた、設定ファイルなどに使われるデータフォーマットです。

紹介ページをいくつか掲載します。

* [JSONの紹介(少し固め)](https://www.json.org/json-ja.html)
* [JSON入門 - とほほのWWW入門(簡単め)](http://www.tohoho-web.com/ex/json.html)

下のページだけでも読んでみると理解しやすいかもしれません。

## オブジェクト

設定中で使います。フォントと表示形式のオブジェクトが存在します。

### フォントオブジェクト

```
{
    "family": "Font-family",
    "size": font-size(int),
    "color": [R(int),G(int),B(int)]    
}
```

|項目|内容|
|-|-|
|family|フォント名を指定します。|
|size|フォントサイズを指定します。|
|color|RGBで色を指定します。|

#### 例

```
{
    "family": "Meiryo UI",
    "size": 16,
    "color": [0,0,0]
}
```

この場合、`Meiryo UI` の フォントサイズ16、色は黒(RGBが0,0,0のため)というフォントを表します。

`defaultfont` の設定ではすべての項目が必須ですが、他の項目では適宜省略が可能です。省略したものは `defaultfont` の設定をもとに自動で設定されます。

### 表示形式オブジェクト

```
{
    "format": "title-formatting(refer to foobar2000 reference)",
    "subline": DisplayFormatObject(smaller display at the top),
    "font": FontObject,
}
```

|項目|内容|
|-|-|
|format|foobar2000の[Title-formatting](https://foobar2000.xrea.jp/?Title+Formatting+Help)の形式で表示する内容を指定します。|
|subline|メインで表示される行の上に小さく表示される行の内容を表示形式オブジェクトで指定します（入れ子になります）。|
|font|表示するフォントをフォントオブジェクトで指定します。|

#### 例

```
{
  "format": "%title%",
  "font": {
        "family": "Meiryo UI",
        "size": 24
  },
  "subline": {
      "format":"ALBUM: %album% [#%track number%] [by %album artist%]",
      "font": {
            "family": "Meiryo UI",
            "size": 12
      }
  }
}
```


## 設定例

まず例を掲載します。例の後ろに各項目の説明を載せます。

```
{
  "defaultfont": {
        "family": "源真ゴシック Medium",
        "size": 16,
        "color": [0,0,0]
  },
  "header": {
      "color": [255,224,193],
      "font": {
          "size": 12
      }
  },
  "ultimate": {
      "maxiplay": 15,
      "font": {
          "size": 48
      }
  },
  "display": [
      {
          "format": "$if2(%program%,-) [*%program-rubi%]",
          "font": { 
                "family": "源真ゴシック Bold" 
          },
          "subline": {
              "format":"$if(%work_year%,%work_year%$ifequal(%work_year%,%date%,,/%date%),*%date%) $if2(%type%,%genre%) $repeat('★',%rate%)",
              "font": {
                    "family": "源真ゴシック Medium"
              }
          }
      },
      {
          "format": "%title%[  *$if2(%title_rubi%, %title-rubi%) ]",
          "font": {
                "family": "源真ゴシック Bold",
                "size": 24
          },
          "subline": {
              "format":"ALBUM: %album% [#%track number%] [by %album artist%]",
              "font": {
                    "family": "源真ゴシック Medium",
                    "size": 12
              }
          }
      },
      {
          "format": "[%artist%][ '//' %ARTIST_MEMBER%][  *%artist_rubi% ]",
          "subline": {
              "format":"[LYRICS: %lyricist%][ COMPOSER: %composer%][ ARRANGER: %arranger%]"
          }

      }
  ],
  "format": "%title%[ / %artist%][ / [L:%LYRICIST%] [C:%COMPOSER%] [A:%ARRANGER%]][ - %program%][ - %type%][ $if2(%work_year%,%date%)]"
}

```

### defaultfont

**フォントオブジェクトを指定**

基本的なフォントになります。特に指定がないものはこれを指定します。
