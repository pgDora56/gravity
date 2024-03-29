# gravity

foobar2000's panel for music intro quiz using Spider Monkey Panel

https://open.spotify.com/track/1oADvJTsiTP77B5AgsIwcy?si=AlQu_HfiQJ-Ux4-5JnwpVw

## JSON File Format

Most of the settings of this tool are defined in JSON files. It is saved as `setting.json`.

--> [JP Manual](JP_JSON.md)

### Example

It is the example based on me.

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
          "font": { "family": "源真ゴシック Bold" },
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

### Font Object
```
{
    "family": "Font-family",
    "size": font-size(int),
    "color": [R(int),G(int),B(int)]    
}
```

### Display Format Object
```
{
    "format": "title-formatting(refer to foobar2000 reference)",
    "subline": DisplayFormatObject(smaller display at the top),
    "font": FontObject,
}
```

### format

This item defines the copy format. Refer to foobar2000 reference.


## Playlist Cooker

Automatically create playlists from recipe JSON data

Usage: Double Click -> Cook playlist

### Cooking JSON Example

```json
[
    {
        "name": "foo",
        "recipe": {
            "%artist% HAS TrySail": 3,
            "%artist% HAS HoneyWorks": 2,
            "%artist% HAS Sphere": 3
        }
    },
    {
        "name": "bar",
        "recipe": {
            "%title% HAS spirits": 3,
            "%title% HAS lapis": 1
        }
    }
]
```



## License
[MIT License](LICENSE)
