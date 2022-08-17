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
