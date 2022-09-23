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
    var pfx = volume.distribute_groups.length > 1 ? "Distributed " : "";
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
    
    return `#bae6fd${opacity}`;
}

function sizePercentage(obj) {
    return (obj.metrics.size_used_bytes*100/obj.metrics.size_bytes).toFixed(1);
}

function inodesPercentage(obj) {
    return (obj.metrics.inodes_used_count*100/obj.metrics.inodes_count).toFixed(1);
}
