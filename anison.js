// ==========================================
// anison.js
// ==========================================
//
// anison.info (Anison Generation) connector for gravity panel.
// Searches by song title, scores candidates by artist match, fetches
// the song page, and caches credits/tie-up info per (title, artist).
//
// Public API:
//   anisonRequestForTrack(title, artist) -> kick off fetch (uses cache)
//   anisonExpandPlaceholders(formatStr)  -> replace !program! / !composer! / !lyricist! / !arranger!
//   anisonClearCacheCurrent(title, artist)
//   anisonClearCacheAll()
//   anisonOnTrackChanged()               -> invalidate in-flight + current data
//
// HTTP: anison.info is HTTP-only (HTTPS refused), UTF-8 encoded.
// HTML: no DOM available in SMP — regex-based parsing of a fairly
//       stable legacy structure. `</stong>` typos in source are tolerated.
//


// --- properties ---------------------------------------------------

var anisonAutoFetch = window.GetProperty("8.1. Anison Info - Auto fetch on new track", false);
var anisonCacheTTLDays = 30;
try {
    anisonCacheTTLDays = parseInt(window.GetProperty("8.2. Anison Info - Cache TTL (days)", "30"));
    if (!(anisonCacheTTLDays > 0)) anisonCacheTTLDays = 30;
} catch (e) { anisonCacheTTLDays = 30; }
var anisonArtistDelimiters = window.GetProperty("8.3. Anison Info - Artist delimiters", ",;/／、");


// --- module state -------------------------------------------------

var anisonCacheDir = rootDirectory + "anison_cache\\";
var anisonRequestToken = 0;        // bumped on every track change
var anisonInFlight = false;
var anisonCurrentData = null;      // last loaded record (or null)
var anisonCurrentStatus = "idle";  // "idle" | "fetching" | "done" | "miss" | "error"
var anisonCurrentKey = "";         // cache key of currently displayed data


// --- cache directory setup ----------------------------------------

(function _ensureCacheDir() {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FolderExists(anisonCacheDir)) {
            // recursively ensure parent
            if (!fso.FolderExists(rootDirectory)) fso.CreateFolder(rootDirectory);
            fso.CreateFolder(anisonCacheDir);
        }
    } catch (e) {
        consoleWrite("[anison] cache dir setup failed: " + e);
    }
})();


// --- public API ---------------------------------------------------

function anisonOnTrackChanged() {
    // Bump token so any in-flight response is discarded.
    anisonRequestToken += 1;
    anisonInFlight = false;
    anisonCurrentData = null;
    anisonCurrentStatus = "idle";
    anisonCurrentKey = "";
}

function anisonRequestForTrack(title, artist) {
    if (!title) {
        anisonCurrentStatus = "idle";
        anisonCurrentData = null;
        return;
    }
    var key = _anisonCacheKey(title, artist);
    if (key === anisonCurrentKey && anisonCurrentStatus !== "idle") {
        return; // already handled for this track
    }
    anisonCurrentKey = key;

    var cached = _anisonCacheRead(title, artist);
    if (cached) {
        anisonCurrentData = cached.miss ? null : cached;
        anisonCurrentStatus = cached.miss ? "miss" : "done";
        window.Repaint();
        return;
    }
    // Not in cache → fetch
    anisonCurrentStatus = "fetching";
    anisonCurrentData = null;
    window.Repaint();
    var myToken = ++anisonRequestToken;
    anisonInFlight = true;
    _anisonFetchFlow(title, artist, myToken);
}

function anisonExpandPlaceholders(formatStr) {
    if (!formatStr) return formatStr;
    if (formatStr.indexOf("!") < 0) return formatStr;
    return formatStr.replace(/!(program|composer|lyricist|arranger|program_type)!/g, function (_, field) {
        if (anisonCurrentStatus === "fetching") return "検索中";
        if (anisonCurrentStatus === "done" && anisonCurrentData) {
            return anisonCurrentData[field] || "";
        }
        return "";
    });
}

function anisonClearCacheCurrent(title, artist) {
    var path = _anisonCachePath(title, artist);
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (fso.FileExists(path)) fso.DeleteFile(path);
        anisonCurrentData = null;
        anisonCurrentStatus = "idle";
        anisonCurrentKey = "";
        window.Repaint();
    } catch (e) {
        consoleWrite("[anison] clearCacheCurrent failed: " + e);
    }
}

function anisonClearCacheAll() {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FolderExists(anisonCacheDir)) return;
        var files = utils.Glob(anisonCacheDir + "*.json");
        for (var i = 0; i < files.length; i++) {
            if (fso.FileExists(files[i])) fso.DeleteFile(files[i]);
        }
        anisonCurrentData = null;
        anisonCurrentStatus = "idle";
        anisonCurrentKey = "";
        window.Repaint();
    } catch (e) {
        consoleWrite("[anison] clearCacheAll failed: " + e);
    }
}


// --- internal: cache ----------------------------------------------

function _anisonCacheKey(title, artist) {
    var k = (title || "") + "__" + (artist || "");
    // Strip chars invalid in Windows filenames + control chars.
    k = k.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
    if (k.length > 180) k = k.substring(0, 180);
    return k;
}

function _anisonCachePath(title, artist) {
    return anisonCacheDir + _anisonCacheKey(title, artist) + ".json";
}

function _anisonCacheRead(title, artist) {
    var path = _anisonCachePath(title, artist);
    if (!utils.FileTest(path, "e")) return null;
    try {
        var raw = utils.ReadTextFile(path);
        if (!raw) return null;
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.substring(1); // strip BOM
        var obj = JSON.parse(raw);
        // TTL check
        var fetchedAt = Date.parse(obj.fetched_at);
        if (!isFinite(fetchedAt)) return null;
        var ageMs = Date.now() - fetchedAt;
        if (ageMs > anisonCacheTTLDays * 86400 * 1000) return null;
        return obj;
    } catch (e) {
        consoleWrite("[anison] cache read failed for " + path + ": " + e);
        return null;
    }
}

function _anisonCacheWrite(title, artist, data) {
    var path = _anisonCachePath(title, artist);
    try {
        data.fetched_at = new Date().toISOString();
        utils.WriteTextFile(path, JSON.stringify(data, null, 2));
    } catch (e) {
        consoleWrite("[anison] cache write failed: " + e);
    }
}


// --- internal: HTTP -----------------------------------------------

function _anisonHttpGet(url, callback) {
    try {
        var xhr = new ActiveXObject("Microsoft.XMLHTTP");
        xhr.open("GET", url, true);
        xhr.setRequestHeader("User-Agent", "gravity-panel/anison-fetcher");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(null, xhr.responseText);
            } else {
                callback(new Error("HTTP " + xhr.status), null);
            }
        };
        xhr.send();
    } catch (e) {
        callback(e, null);
    }
}


// --- internal: parsing --------------------------------------------

// Search result page (n.php?m=song&q=...)
// Returns: [{ song_id, title, artists: [string], program, oped }]
function _anisonParseSearchPage(html) {
    var rows = [];
    // Each <tr> in the result table has 5 <td class="list">: song / artists / genre / program / oped
    // The song cell contains: javascript:link('song','ID')
    var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    var m;
    while ((m = trRe.exec(html)) !== null) {
        var tr = m[1];
        if (tr.indexOf("javascript:link('song'") < 0) continue;
        var songIdMatch = tr.match(/javascript:link\('song','(\d+)'\)">([^<]+)</);
        if (!songIdMatch) continue;
        // collect all <a> texts within the row (artist column has multiple)
        var artists = [];
        var aRe = /javascript:link\('person','\d+'\)">([^<]+)</g;
        var am;
        while ((am = aRe.exec(tr)) !== null) artists.push(am[1]);
        // program (use first program link if present)
        var program = "";
        var progMatch = tr.match(/javascript:link\('program','\d+'\)">([^<]+)</);
        if (progMatch) program = progMatch[1];
        // oped is the 5th td; pull the last td contents (loose)
        var opedMatch = tr.match(/<td[^>]*>\s*(OP|ED|IN|IM|AR)[\s\S]{0,8}?<\/td>/i);
        var oped = opedMatch ? opedMatch[1].toUpperCase() : "";

        rows.push({
            song_id: parseInt(songIdMatch[1]),
            title: _anisonHtmlDecode(songIdMatch[2]),
            artists: artists.map(_anisonHtmlDecode),
            program: _anisonHtmlDecode(program),
            program_type: oped
        });
    }
    return rows;
}

// Song detail page (/data/song/{id}.html)
// Returns: { program, program_type, composer, lyricist, arranger, artists, characters }
function _anisonParseSongPage(html) {
    var out = {
        program: "",
        program_type: "",
        composer: "",
        lyricist: "",
        arranger: "",
        artists: [],
        characters: []
    };

    // Credits table: rows look like:
    //   <tr><td class="list">歌手</td><td class="list">キャラ名(CV:<a>声優名</a>)</td></tr>
    //   <tr><td class="list">作詞</td><td class="list"><a>名前</a></td></tr>
    var rowRe = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
    var rm;
    var composers = [], lyricists = [], arrangers = [];
    while ((rm = rowRe.exec(html)) !== null) {
        var label = _anisonStrip(rm[1]);
        var cell = rm[2];

        if (label === "歌手") {
            // キャラ名(CV:<a ...>声優名</a>) or just <a ...>歌手名</a>
            var cvMatch = cell.match(/^([\s\S]*?)\(CV[:：]\s*<a[^>]*>([^<]+)<\/a>\)/);
            if (cvMatch) {
                out.characters.push(_anisonHtmlDecode(_anisonStrip(cvMatch[1])));
                out.artists.push(_anisonHtmlDecode(cvMatch[2]));
            } else {
                var nameMatch = cell.match(/<a[^>]*>([^<]+)<\/a>/);
                if (nameMatch) out.artists.push(_anisonHtmlDecode(nameMatch[1]));
                else out.artists.push(_anisonHtmlDecode(_anisonStrip(cell)));
            }
        } else if (label === "作詞") {
            lyricists.push(_anisonExtractPersonText(cell));
        } else if (label === "作曲") {
            composers.push(_anisonExtractPersonText(cell));
        } else if (label === "編曲") {
            arrangers.push(_anisonExtractPersonText(cell));
        }
    }
    out.lyricist = lyricists.filter(_anisonTruthy).join(", ");
    out.composer = composers.filter(_anisonTruthy).join(", ");
    out.arranger = arrangers.filter(_anisonTruthy).join(", ");

    // Tie-up table: <tr>...<a href="javascript:link('program',ID)">作品名</a>...<td>OP</td></tr>
    // Prefer the row wrapped in <strong> (main tie-up).
    var progRe = /<tr[^>]*>([\s\S]*?javascript:link\('program','\d+'\)[\s\S]*?)<\/tr>/g;
    var pm, mainRow = null, firstRow = null;
    while ((pm = progRe.exec(html)) !== null) {
        if (firstRow === null) firstRow = pm[1];
        if (pm[1].indexOf("<strong>") >= 0 && mainRow === null) mainRow = pm[1];
    }
    var targetRow = mainRow || firstRow;
    if (targetRow) {
        var nameMatch = targetRow.match(/javascript:link\('program','\d+'\)">([^<]+)</);
        if (nameMatch) out.program = _anisonHtmlDecode(nameMatch[1]);
        // OP/ED token usually in the 3rd <td>, with optional number
        var opedMatch = targetRow.match(/<td[^>]*>\s*<(?:strong|stong)>?\s*(OP|ED|IN|IM|AR)\s*(\d*)\s*<\/(?:strong|stong)>?\s*<\/td>/i);
        if (!opedMatch) opedMatch = targetRow.match(/<td[^>]*>\s*(OP|ED|IN|IM|AR)\s*(\d*)\s*<\/td>/i);
        if (opedMatch) {
            out.program_type = opedMatch[1].toUpperCase() + (opedMatch[2] ? " " + opedMatch[2] : "");
        }
    }

    return out;
}

function _anisonExtractPersonText(cell) {
    var m = cell.match(/<a[^>]*>([^<]+)<\/a>/g);
    if (!m) return _anisonStrip(_anisonHtmlDecode(cell));
    var names = m.map(function (tag) {
        var inner = tag.match(/<a[^>]*>([^<]+)<\/a>/);
        return inner ? _anisonHtmlDecode(inner[1]) : "";
    }).filter(_anisonTruthy);
    return names.join(", ");
}

function _anisonHtmlDecode(s) {
    if (!s) return "";
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); });
}

function _anisonStrip(s) {
    if (!s) return "";
    return s.replace(/<[^>]+>/g, "").replace(/^\s+|\s+$/g, "");
}

function _anisonTruthy(x) { return !!x; }


// --- internal: scoring --------------------------------------------

function _anisonTokenizeArtist(artist) {
    if (!artist) return [];
    // Split by configured delimiters
    var delim = anisonArtistDelimiters || ",";
    var re = new RegExp("[" + delim.replace(/[\-\[\]\/\\^$*+?.()|{}]/g, "\\$&") + "]");
    return artist.split(re).map(function (s) { return s.replace(/^\s+|\s+$/g, "").toLowerCase(); }).filter(_anisonTruthy);
}

function _anisonScoreCandidate(candidate, queryTokens) {
    // candidate.artists: array from search row
    // candidate.title: search hit title
    // queryTokens: lowercased tokens from %artist%
    var rowTokens = candidate.artists.map(function (s) { return s.toLowerCase(); });

    var score = 0;
    // Exact same set?
    if (queryTokens.length > 0 && rowTokens.length === queryTokens.length) {
        var allFound = true;
        for (var i = 0; i < queryTokens.length; i++) {
            if (rowTokens.indexOf(queryTokens[i]) < 0) { allFound = false; break; }
        }
        if (allFound) score += 1000;
    }
    // Partial overlaps
    for (var i = 0; i < queryTokens.length; i++) {
        var q = queryTokens[i];
        for (var j = 0; j < rowTokens.length; j++) {
            var r = rowTokens[j];
            if (r === q) score += 100;
            else if (r.indexOf(q) >= 0 || q.indexOf(r) >= 0) score += 30;
        }
    }
    // Count match bonus (helps when artist tokens didn't match — e.g. character vs seiyuu naming)
    if (queryTokens.length > 0 && rowTokens.length === queryTokens.length) score += 20;
    return score;
}


// --- internal: title normalisation --------------------------------

// Strip trailing "(...)" / "（...）" / "-...-" suffix blocks from a title.
// Iterates so stacked suffixes ("Song -live- (instrumental)") collapse in
// one call. Returns the cleaned title, or null if nothing was stripped or
// the entire title would be consumed.
function _anisonStripSuffix(title) {
    if (!title) return null;
    var t = title.replace(/\s+$/, "");
    var original = t;
    var changed = true;
    while (changed) {
        changed = false;
        var m;
        // Trailing (...) or （...） — content must not contain another bracket
        m = t.match(/^(.*?)\s*[（(][^（(）)]+[）)]\s*$/);
        if (m) {
            var head = m[1].replace(/\s+$/, "");
            if (head) { t = head; changed = true; continue; }
        }
        // Trailing -...- — content must not contain another dash
        m = t.match(/^(.*?)\s*-[^-]+-\s*$/);
        if (m) {
            var head2 = m[1].replace(/\s+$/, "");
            if (head2) { t = head2; changed = true; continue; }
        }
    }
    return (t === original) ? null : t;
}


// --- internal: search orchestration -------------------------------

function _anisonFetchFlow(title, artist, token) {
    var queryTokens = _anisonTokenizeArtist(artist);

    function trySearch(searchTitle, isRetry) {
        var searchUrl = "http://anison.info/data/n.php?m=song&q=" + encodeURIComponent(searchTitle);
        _anisonHttpGet(searchUrl, function (err, html) {
            if (token !== anisonRequestToken) return; // stale
            if (err) {
                consoleWrite("[anison] search HTTP error: " + err);
                anisonCurrentStatus = "error";
                _anisonCacheWrite(title, artist, { miss: true, reason: "http_error" });
                window.Repaint();
                return;
            }
            var rows = _anisonParseSearchPage(html);
            if (rows.length === 0) {
                // Retry once with suffix-stripped title (e.g. "Song -25 colors-" → "Song")
                if (!isRetry) {
                    var stripped = _anisonStripSuffix(title);
                    if (stripped) {
                        consoleWrite("[anison] no hits, retrying with stripped title: " + stripped);
                        trySearch(stripped, true);
                        return;
                    }
                }
                anisonCurrentStatus = "miss";
                _anisonCacheWrite(title, artist, { miss: true, reason: "no_hits" });
                window.Repaint();
                return;
            }
            // Score and pick best
            var best = rows[0], bestScore = _anisonScoreCandidate(rows[0], queryTokens);
            for (var i = 1; i < rows.length; i++) {
                var sc = _anisonScoreCandidate(rows[i], queryTokens);
                if (sc > bestScore) { bestScore = sc; best = rows[i]; }
            }
            // Fetch detail page
            var detailUrl = "http://anison.info/data/song/" + best.song_id + ".html";
            _anisonHttpGet(detailUrl, function (derr, dhtml) {
                if (token !== anisonRequestToken) return; // stale
                if (derr) {
                    consoleWrite("[anison] detail HTTP error: " + derr);
                    anisonCurrentStatus = "error";
                    _anisonCacheWrite(title, artist, { miss: true, reason: "detail_http_error" });
                    window.Repaint();
                    return;
                }
                var parsed = _anisonParseSongPage(dhtml);
                // Carry over program info from search row if detail page didn't capture it
                if (!parsed.program && best.program) parsed.program = best.program;
                if (!parsed.program_type && best.program_type) parsed.program_type = best.program_type;
                parsed.song_id = best.song_id;
                parsed.matched_score = bestScore;
                anisonCurrentData = parsed;
                anisonCurrentStatus = "done";
                _anisonCacheWrite(title, artist, parsed);
                anisonInFlight = false;
                window.Repaint();
            });
        });
    }

    trySearch(title, false);
}
