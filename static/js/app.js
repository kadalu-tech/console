function setCookie(name, value) {
    var secure = `${window.location}`.indexOf("https://") === 0 ? ";secure" : "";
    document.cookie = `${name}=${value}; path=/; domain=${window.location.hostname}; SameSite=Strict ${secure}`;
}

function listCookies() {
    var cookies = document.cookie.split(';');
    return cookies.map(function (c) {
        var nameValue = c.trim().split("=");
        return {
            name: nameValue[0],
            value: nameValue[1]
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

function getMgrCookieName(mgrUrl, suffix) {
    return `${encodeURIComponent(mgrUrl)}${suffix}`;
}

function handleRedirectToLogin(mgrUrl) {
    var mgrApiToken = getCookieValue(getMgrCookieName(mgrUrl, "-token"));
    if (!mgrApiToken) {
        location.href = `/login?mgr=${mgrUrl}`;
    }
}

function resetCookiesAndRedirectToLogin(mgrUrl) {
    var mgrApiCookieName = encodeURIComponent(mgrUrl);
    setCookie(`${mgrApiCookieName}-token`, "");
    setCookie(`${mgrApiCookieName}-userid`, "");
    setCookie(`${mgrApiCookieName}-api_key_id`, "");
    setCookie(`${mgrApiCookieName}-user`, "");
    handleRedirectToLogin(mgrUrl)
}

function authErrorRedirectHandle(mgrUrl, error) {
    if (error instanceof StorageManagerAuthError) {
        resetCookiesAndRedirectToLogin(mgrUrl);
    }
    console.log(error)
}

// Return a SVG with the 16 colored rectangles grid
// Split UUID string as hex color codes. 1 UUID gives 5 hex colors and
// two extra chars. So Join same UUID 3 times to get 16 hex colors.
function uuidThumbmail(str) {
    if (!str) {
        return;
    }
    var uuidStr = str.replace(/-/g, "");
    uuidStr = `${uuidStr}${uuidStr}${uuidStr}`;
    var outstr = '<svg width="400" height="400" class="icon is-medium" viewBox="0 0 400 400">';
    for (var rowIdx=0; rowIdx<4; rowIdx++) {
        for (var colIdx = 0; colIdx < 4; colIdx++) {
            var x = colIdx * 100;
            var y = rowIdx * 100;
            // rowIdx x numLetters x numCols + colIdx x numLetters
            var start = rowIdx * 6 * 4 + colIdx * 6;
            var col = uuidStr.slice(start, start + 6);
            outstr += `<rect x="${x}" y="${y}" width="100" height="100" style="fill:#${col};stroke-width:0" />`;
        }
    }
    return outstr + '</svg>';
}

function humanize(value, bytes=false) {
    const base = bytes ? 1024 : 1000;
    const decimalPlaces = 1;

    if (Math.abs(value) < base) {
        return bytes ? `${value} B` : `${value}`;
    }

    const units = bytes
          ? ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
          : ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

    let u = -1;
    const r = 10**decimalPlaces;

    do {
        value /= base;
        ++u;
    } while (Math.round(Math.abs(value) * r) / r >= base && u < units.length - 1);


    return value.toFixed(decimalPlaces) + ' ' + units[u];
}

function poolStateHtml(pool) {
    if (pool.state != "Started") {
        return `<span class="has-text-gray">${pool.state}</span>`;
    }

    if (pool.metrics.health === "Up") {
        return `<span class="has-text-success">${pool.state}, ${pool.metrics.health}</span>`;
    }

    return `<span class="has-text-danger">${pool.state}, ${pool.metrics.health}</span>`;
}

function storageUnitStateHtml(storageUnit) {
    if (storageUnit.metrics.health === "Up") {
        return `<span class="has-text-success">${storageUnit.metrics.health}</span>`;
    }

    return `<span class="has-text-danger">${storageUnit.metrics.health}</span>`;
}

function storageUnitNameAndStateHtml(storageUnit) {
    if (storageUnit.metrics.health === "Up") {
        return `${storageUnit.node.name}:${storageUnit.port} &nbsp; <span class="has-text-success">${storageUnit.metrics.health}</span>`;
    }

    return `${storageUnit.node.name}:${storageUnit.port} &nbsp; <span class="has-text-danger">${storageUnit.metrics.health}</span>`;
}

function poolType(pool) {
    var repDisp = pool.distribute_groups[0].replica_count + pool.distribute_groups[0].disperse_count;

    var pfx = "";
    if (pool.distribute_groups.length > 1 &&  repDisp > 0) {
        pfx = "Distributed ";
    }

    if(pool.distribute_groups[0].replica_count > 0) {
        return pfx + (pool.distribute_groups[0].replica_keyword == "mirror" ? "Mirror" : "Replicate");
    } else if (pool.distribute_groups[0].disperse_count > 0) {
        return `${pfx}Disperse`;
    }

    return `${pfx}Distribute`;
}

function poolUtilization(pools) {
    var used = 0;
    var total = 0;

    for (var i=0; i<pools.length; i++) {
        used += pools[i].metrics.size_used_bytes;
        total += pools[i].metrics.size_bytes;
    }

    return `${humanize(used, true)}/${humanize(total, true)}`;
}

function poolSizePercentage(pools) {
    var used = 0;
    var total = 0;

    for (var i=0; i<pools.length; i++) {
        used += pools[i].metrics.size_used_bytes;
        total += pools[i].metrics.size_bytes;
    }

    return (used*100/total).toFixed(1);
}

function poolsStorageUnitsCount(pools) {
    var total = 0;

    for (var i=0; i<pools.length; i++) {
        for (var j=0; j<pools[i].distribute_groups.length; j++) {
            total += pools[i].distribute_groups[j].storage_units.length;
        }
    }

    return total;
}

function poolsNodesCount(pools) {
    var nodes = [];

    for (var i=0; i<pools.length; i++) {
        for (var j=0; j<pools[i].distribute_groups.length; j++) {
            for (var k=0; k<pools[i].distribute_groups[j].storage_units.length; k++) {
                var nodeName = pools[i].distribute_groups[j].storage_units[k].node.name;
                if (nodes.indexOf(nodeName) === -1) {
                    nodes.push(nodeName);
                }
            }
        }
    }

    return nodes.length;
}

function poolStorageUnitsCount(pool) {
    var total = 0;

    for (var j=0; j<pool.distribute_groups.length; j++) {
        total += pool.distribute_groups[j].storage_units.length;
    }

    return total;
}

function poolNodesCount(pool) {
    var nodes = [];

    for (var j=0; j<pool.distribute_groups.length; j++) {
        for (var k=0; k<pool.distribute_groups[j].storage_units.length; k++) {
            var nodeName = pool.distribute_groups[j].storage_units[k].node.name;
            if (nodes.indexOf(nodeName) === -1) {
                nodes.push(nodeName);
            }
        }
    }

    return nodes.length;
}

function numberBarColor(p) {
    var opacity = "55";
    if (p >= 90) {
        return `#cc0f35${opacity}`;
    } else if (p >= 70) {
        return `#F28C28${opacity}`;
    }

    return `#c3e1f5`;
}

function sizePercentage(obj) {
    return (obj.metrics.size_used_bytes*100/obj.metrics.size_bytes).toFixed(1);
}

function inodesPercentage(obj) {
    return (obj.metrics.inodes_used_count*100/obj.metrics.inodes_count).toFixed(1);
}

function poolNameAndStatus(pool) {
    if (pool.state != "Started") {
        return `${pool.name} <span class="has-text-grey is-size-6 ml-4">${pool.state}</span>`;
    }

    if (pool.metrics.health === "Up") {
        return `${pool.name} <span class="has-text-success is-size-6 ml-4">${pool.state}, ${pool.metrics.health}</span>`;
    }

    return `${pool.name} <span class="has-text-danger is-size-6 ml-4">${pool.state}, ${pool.metrics.health}</span>`;
}

function nodeNameAndStatus(node) {
    if (node.state != "Up") {
        return `${node.name} <span class="has-text-danger is-size-6 ml-4">${node.state}</span>`;
    }

    return `${node.name} <span class="has-text-success is-size-6 ml-4">${node.state}</span>`;
}

SVG_STOP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" /></svg>';
SVG_PLAY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>';
SVG_DELETE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" /></svg>';

SVG_EDIT = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 icon is-small"> <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>';

SVG_ELLIPSIS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-medium"><path fill-rule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clip-rule="evenodd" /></svg>';

function poolStartButton(pool, idx) {
    return `<div class="is-clickable is-size-6"><i class="has-text-success">${SVG_PLAY}</i> Start</div>`;
}

function poolStopButton(pool, idx) {
    if (pool.state == "Started") {
        return `<span class="is-clickable is-size-6"><i class="has-text-danger">${SVG_STOP}</i> Stop</span>`;
    } else {
        return `<span class="has-text-grey is-size-6"><i>${SVG_STOP}</i> Stop</span>`;
    }
}

function poolDeleteButton(pool, idx) {
    if (pool.state == "Started") {
        return `<span class=""><i class="has-text-grey">${SVG_DELETE}</i> Delete</span>`;
    } else {
        return `<span class="is-clickable"><i class="has-text-danger">${SVG_DELETE}</i> Delete</span>`;
    }
}

function nodeRemoveButton(node, idx) {
    if (node.state != "Up") {
        return `<span class=""><i class="has-text-grey">${SVG_DELETE}</i> Remove</span>`;
    } else {
        return `<span class="is-clickable"><i class="has-text-danger">${SVG_DELETE}</i> Remove</span>`;
    }
}

function getLoggedinUsername(mgrUrl) {
    var mgrApiCookieName = encodeURIComponent(mgrUrl);
    var user = getCookieValue(`${mgrApiCookieName}-user`);
    if (user && user != '') {
        return `${user} @ ${mgrUrl}`;
    }

    return null;
}

function setLoggedinUsername(mgrUrl, value) {
    var mgrApiCookieName = encodeURIComponent(mgrUrl);
    return setCookie(`${mgrApiCookieName}-user`, value);
}

function dropdownTrigger() {
    return `<div class="mt-2 mr-2" @click="dropdownShowing=!dropdownShowing" @click.outside="dropdownShowing=false">
                ${SVG_ELLIPSIS}
            </div>`;
}

async function logout(mgrUrl) {
    var mgr = storageManagerFromCookies(mgrUrl)
    if (mgr.api_key_id == "") {
        resetCookiesAndRedirectToLogin(mgrUrl);
    }

    await mgr.logout();
    resetCookiesAndRedirectToLogin(mgrUrl);
}

function storageManagerFromCookies(mgrUrl) {
    var token = getCookieValue(getMgrCookieName(mgrUrl, "-token"));
    var userId = getCookieValue(getMgrCookieName(mgrUrl, "-userid"));
    var apiKeyId = getCookieValue(getMgrCookieName(mgrUrl, "-api_key_id"));
    return StorageManager.fromToken(mgrUrl, userId, apiKeyId, token);
}

function poolsUrl(mgrUrl) {
    return '/pools?mgr=' + mgrUrl;
}

function nodesUrl(mgrUrl) {
    return '/nodes?mgr=' + mgrUrl;
}
