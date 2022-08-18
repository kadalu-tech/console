function setCookie(name, value) {
    var secure = `${window.location}`.indexOf("https://") === 0 ? ";secure" : "";
    document.cookie = `${name}=${value}; path=/; domain=${window.location.hostname}; SameSite=Strict ${secure}`;
}

function listCookies() {
    var cookies = document.cookie.split(';');
    return cookies.map(function (c) {
        var name_value = c.trim().split("=");
        return {
            name: name_value[0],
            value: name_value[1]
        }
    });
}

function getCookieValue(name) {
    var cookies = listCookies();
    for (var idx=0; idx<cookies.length; idx++) {
        if (cookies[idx].name === name) {
            return cookies[idx].value;
        }
    }

    return null;
}

function getMgrCookieName(mgr_url, suffix) {
    return `${encodeURIComponent(mgr_url)}${suffix}`;
}

function handleRedirectToLogin(mgr_url) {
    var mgrApiToken = getCookieValue(getMgrCookieName(mgr_url, "-token"));
    if (!mgrApiToken) {
        location.href = `/login?mgr=${mgr_url}`;
    }
}

// Return a SVG with the 16 colored rectangles grid
// Split UUID string as hex color codes. 1 UUID gives 5 hex colors and
// two extra chars. So Join same UUID 3 times to get 16 hex colors.
function uuidThumbmail(str) {
    var uuidStr = str.replace(/-/g, "");
    uuidStr = `${uuidStr}${uuidStr}${uuidStr}`;
    var outstr = '<svg width="400" height="400" class="icon is-small" viewBox="0 0 400 400">';
    for (var row_idx=0; row_idx<4; row_idx++) {
        for (var col_idx = 0; col_idx < 4; col_idx++) {
            var x = col_idx * 100;
            var y = row_idx * 100;
            // row_idx x num_letters x num_cols + col_idx x num_letters
            var start = row_idx * 6 * 4 + col_idx * 6;
            var col = uuidStr.slice(start, start + 6);
            outstr += `<rect x="${x}" y="${y}" width="100" height="100" style="fill:#${col};stroke-width:0" />`;
        }
    }
    return outstr + '</svg>';
}
