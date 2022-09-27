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

function resetCookiesAndRedirectToLogin(mgr_url) {
    var mgrApiCookieName = encodeURIComponent(mgr_url);
    setCookie(`${mgrApiCookieName}-token`, "");
    setCookie(`${mgrApiCookieName}-userid`, "");
    handleRedirectToLogin(mgr_url)
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

function humanize(value, bytes=false) {
    const base = bytes ? 1024 : 1000;
    const decimal_places = 1;

    if (Math.abs(value) < base) {
        return bytes ? `${value} B` : `${value}`;
    }

    const units = bytes
          ? ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
          : ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

    let u = -1;
    const r = 10**decimal_places;

    do {
        value /= base;
        ++u;
    } while (Math.round(Math.abs(value) * r) / r >= base && u < units.length - 1);


    return value.toFixed(decimal_places) + ' ' + units[u];
}

function volumeStateHtml(volume) {
    if (volume.state != "Started") {
        return `<span class="has-text-gray">${volume.state}</span>`;
    }

    if (volume.metrics.health === "Up") {
        return `<span class="has-text-success">${volume.state}, ${volume.metrics.health}</span>`;
    }

    return `<span class="has-text-danger">${volume.state}, ${volume.metrics.health}</span>`;
}

function storageUnitStateHtml(storage_unit) {
    if (storage_unit.metrics.health === "Up") {
        return `<span class="has-text-success">${storage_unit.metrics.health}</span>`;
    }

    return `<span class="has-text-danger">${storage_unit.metrics.health}</span>`;
}

function volumeType(volume) {
    var rep_disp = volume.distribute_groups[0].replica_count + volume.distribute_groups[0].disperse_count;

    var pfx = "";
    if (volume.distribute_groups.length > 1 &&  rep_disp > 0) {
        pfx = "Distributed ";
    }

    if(volume.distribute_groups[0].replica_count > 0) {
        return pfx + (volume.distribute_groups[0].replica_keyword == "mirror" ? "Mirror" : "Replicate");
    } else if (volume.distribute_groups[0].disperse_count > 0) {
        return `${pfx}Disperse`;
    }

    return `${pfx}Distribute`;
}

function poolUtilization(volumes) {
    var used = 0;
    var total = 0;

    for (var i=0; i<volumes.length; i++) {
        used += volumes[i].metrics.size_used_bytes;
        total += volumes[i].metrics.size_bytes;
    }

    return `${humanize(used, true)}/${humanize(total, true)}`;
}

function poolSizePercentage(volumes) {
    var used = 0;
    var total = 0;

    for (var i=0; i<volumes.length; i++) {
        used += volumes[i].metrics.size_used_bytes;
        total += volumes[i].metrics.size_bytes;
    }

    return (used*100/total).toFixed(1);
}

function poolStorageUnitsCount(volumes) {
    var total = 0;

    for (var i=0; i<volumes.length; i++) {
        for (var j=0; j<volumes[i].distribute_groups.length; j++) {
            total += volumes[i].distribute_groups[j].storage_units.length;
        }
    }

    return total;
}

function poolNodesCount(volumes) {
    var nodes = [];

    for (var i=0; i<volumes.length; i++) {
        for (var j=0; j<volumes[i].distribute_groups.length; j++) {
            for (var k=0; k<volumes[i].distribute_groups[j].storage_units.length; k++) {
                var node_name = volumes[i].distribute_groups[j].storage_units[k].node.name;
                if (nodes.indexOf(node_name) === -1) {
                    nodes.push(node_name);
                }
            }
        }
    }

    return nodes.length;
}

function volumeStorageUnitsCount(volume) {
    var total = 0;

    for (var j=0; j<volume.distribute_groups.length; j++) {
        total += volume.distribute_groups[j].storage_units.length;
    }

    return total;
}

function volumeNodesCount(volume) {
    var nodes = [];

    for (var j=0; j<volume.distribute_groups.length; j++) {
        for (var k=0; k<volume.distribute_groups[j].storage_units.length; k++) {
            var node_name = volume.distribute_groups[j].storage_units[k].node.name;
            if (nodes.indexOf(node_name) === -1) {
                nodes.push(node_name);
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

function volumeNameAndStatus(volume) {
    if (volume.state != "Started") {
        return `${volume.name} <span class="has-text-grey is-size-6 ml-4">${volume.state}</span>`;
    }

    if (volume.metrics.health === "Up") {
        return `${volume.name} <span class="has-text-success is-size-6 ml-4">${volume.state}, ${volume.metrics.health}</span>`;
    }

    return `${volume.name} <span class="has-text-danger is-size-6 ml-4">${volume.state}, ${volume.metrics.health}</span>`;
}

SVG_STOP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" /></svg>';
SVG_PLAY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>';
SVG_DELETE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-small"><path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" /></svg>';

SVG_ELLIPSIS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 icon is-medium"><path fill-rule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clip-rule="evenodd" /></svg>';

function volumeStartButton(volume, idx) {
    return `<div class="is-clickable is-size-6"><i class="has-text-success">${SVG_PLAY}</i> Start</div>`;
}

function volumeStopButton(volume, idx) {
    if (volume.state == "Started") {
        return `<span class="is-clickable is-size-6"><i class="has-text-danger">${SVG_STOP}</i> Stop</span>`;
    } else {
        return `<span class="has-text-grey is-size-6"><i>${SVG_STOP}</i> Stop</span>`;
    }
}

function volumeDeleteButton(volume, idx) {
    if (volume.state == "Started") {
        return `<span class=""><i class="has-text-grey">${SVG_DELETE}</i> Delete</span>`;
    } else {
        return `<span class="is-clickable"><i class="has-text-danger">${SVG_DELETE}</i> Delete</span>`;
    }
}

function getLoggedinUsername(mgr_url) {
    var mgrApiCookieName = encodeURIComponent(mgr_url);
    var user = getCookieValue(`${mgrApiCookieName}-user`);
    if (user) {
        return `${user} @ ${mgr_url}`;
    }

    return user;
}

function setLoggedinUsername(mgr_url, value) {
    var mgrApiCookieName = encodeURIComponent(mgr_url);
    return setCookie(`${mgrApiCookieName}-user`, value);
}

function dropdownTrigger() {
    return `<div class="mt-2 mr-2" @click="dropdown_showing=!dropdown_showing" @click.outside="dropdown_showing=false">
                ${SVG_ELLIPSIS}
            </div>`;
}
