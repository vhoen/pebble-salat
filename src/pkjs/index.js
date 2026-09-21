const Clay = require("@rebble/clay");
const clayConfig = require("./config");

const defaultConfig = {
    latitude: "47.24192801770674",
    longitude: "5.9351131785808375",
    fajr: "00:00",
    dhuhr: "00:00",
    asr: "00:00",
    maghrib: "00:00",
    isha: "00:00",
};

const CACHE_KEY = "prayer-times-cache";
const CLAY_SETTINGS_KEY = "clay-settings";
const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const DAILY_FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const KEYS = {
    latitude: 10000,
    longitude: 10001,
    fajr: 10002,
    dhuhr: 10003,
    asr: 10004,
    maghrib: 10005,
    isha: 10006,
    requestFetch: 10007,
    fetching: 10008,
};

function formatDateForApi(date) {
    return formatDateTag(date);
}

function formatDateTag(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

function pad2(value) {
    const text = String(value);
    return text.length < 2 ? "0" + text : text;
}

function normalizeTime(value) {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) {
        return "00:00";
    }

    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    if (seconds >= 30) {
        minutes += 1;
        if (minutes >= 60) {
            minutes = 0;
            hours += 1;
            if (hours >= 24) {
                hours = 0;
            }
        }
    }

    return pad2(hours) + ":" + pad2(minutes);
}

function extractPrayerTimes(timings) {
    return {
        fajr: normalizeTime(timings.Fajr),
        dhuhr: normalizeTime(timings.Dhuhr),
        asr: normalizeTime(timings.Asr),
        maghrib: normalizeTime(timings.Maghrib),
        isha: normalizeTime(timings.Isha),
    };
}

function readCache() {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch (_error) {
        return null;
    }
}

function readClaySettings() {
    try {
        return JSON.parse(localStorage.getItem(CLAY_SETTINGS_KEY) || "null");
    } catch (_error) {
        return null;
    }
}

function writeCache(cache) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function buildPrayerTimesUrl(config, date) {
    const dateParam = formatDateForApi(date);
    const latitude = encodeURIComponent(config.latitude);
    const longitude = encodeURIComponent(config.longitude);
    return `https://api.aladhan.com/v1/timings/${dateParam}?latitude=${latitude}&longitude=${longitude}`;
}

function sendFetchingState(isFetching) {
    Pebble.sendAppMessage({ [KEYS.fetching]: isFetching ? 1 : 0 }, function () {}, function (error) {
        console.log("sendFetchingState error", JSON.stringify(error));
    });
}

function sendPrayerPayload(payload) {
    const source = payload || {};
    const message = {
        [KEYS.latitude]: String(source.latitude || defaultConfig.latitude),
        [KEYS.longitude]: String(source.longitude || defaultConfig.longitude),
        [KEYS.fajr]: String(source.fajr || defaultConfig.fajr),
        [KEYS.dhuhr]: String(source.dhuhr || defaultConfig.dhuhr),
        [KEYS.asr]: String(source.asr || defaultConfig.asr),
        [KEYS.maghrib]: String(source.maghrib || defaultConfig.maghrib),
        [KEYS.isha]: String(source.isha || defaultConfig.isha),
        [KEYS.fetching]: 0,
    };

    Pebble.sendAppMessage(message, function () {}, function (error) {
        console.log("sendAppMessage error", JSON.stringify(error));
    });
}

function shouldUseCache(cache, config, dateTag) {
    return (
        cache &&
        cache.date === dateTag &&
        cache.latitude === config.latitude &&
        cache.longitude === config.longitude &&
        PRAYER_KEYS.every(function (key) {
            return typeof cache[key] === "string";
        })
    );
}

function requestPrayerTimes(url, onSuccess, onError) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
        try {
            const json = JSON.parse(xhr.responseText || "{}");
            onSuccess(json);
        } catch (error) {
            onError(error);
        }
    };
    xhr.onerror = function (error) {
        onError(error || new Error("Network error"));
    };
    xhr.open("GET", url);
    xhr.send();
}

function fetchAndSendPrayerTimes(config, options) {
    const opts = options || {};
    const now = new Date();
    const dateTag = formatDateTag(now);
    const cached = readCache();

    if (!opts.forceRefresh && shouldUseCache(cached, config, dateTag)) {
        sendPrayerPayload(cached);
        return;
    }

    sendFetchingState(true);
    const url = buildPrayerTimesUrl(config, now);

    requestPrayerTimes(
        url,
        function (json) {
            if (!json || !json.data || !json.data.timings) {
                throw new Error("Invalid Aladhan response");
            }

            const times = extractPrayerTimes(json.data.timings);
            const payload = {
                latitude: config.latitude,
                longitude: config.longitude,
                date: dateTag,
                fajr: times.fajr,
                dhuhr: times.dhuhr,
                asr: times.asr,
                maghrib: times.maghrib,
                isha: times.isha,
            };

            writeCache(payload);
            sendPrayerPayload(payload);
        },
        function (error) {
            console.log("Failed to fetch prayer times", String(error));
            if (
                cached &&
                cached.date === dateTag &&
                cached.latitude === config.latitude &&
                cached.longitude === config.longitude
            ) {
                sendPrayerPayload(cached);
                return;
            }
            sendPrayerPayload(config);
        }
    );
}

function pickString(overrides, claySettings, cache, key, fallback) {
    const value = overrides[key] || claySettings[key] || cache[key];
    return value !== undefined && value !== null && String(value) !== "" ? String(value) : fallback;
}

function mergeConfig(incoming) {
    const cache = readCache() || {};
    const claySettings = readClaySettings() || {};
    const overrides = incoming || {};

    return {
        latitude: pickString(overrides, claySettings, cache, "latitude", defaultConfig.latitude),
        longitude: pickString(overrides, claySettings, cache, "longitude", defaultConfig.longitude),
    };
}

function getImmediatePayload(config, date) {
    const cached = readCache();
    const dateTag = formatDateTag(date || new Date());
    if (
        cached &&
        cached.date === dateTag &&
        cached.latitude === config.latitude &&
        cached.longitude === config.longitude &&
        PRAYER_KEYS.every(function (key) {
            return typeof cached[key] === "string";
        })
    ) {
        return cached;
    }

    return {
        latitude: config.latitude,
        longitude: config.longitude,
        fajr: defaultConfig.fajr,
        dhuhr: defaultConfig.dhuhr,
        asr: defaultConfig.asr,
        maghrib: defaultConfig.maghrib,
        isha: defaultConfig.isha,
    };
}

function scheduleDailyPrayerFetch(config) {
    const timer = setInterval(function () {
        fetchAndSendPrayerTimes(config);
    }, DAILY_FETCH_INTERVAL_MS);

    if (timer && typeof timer.unref === "function") {
        timer.unref();
    }
}

function handleSettingsSaved(response, clay) {
    if (!response || response === "CANCELLED" || response === "EXIT") {
        return;
    }

    try {
        const settings = clay.getSettings(response);
        const config = mergeConfig(settings);
        fetchAndSendPrayerTimes(config, { forceRefresh: true });
    } catch (error) {
        console.log("Failed to apply saved settings", String(error));
    }
}

function handleWatchMessage(incoming) {
    const config = mergeConfig(incoming);
    fetchAndSendPrayerTimes(config, { forceRefresh: true });
}

let clay;

if (typeof Pebble !== "undefined" && Pebble && typeof Pebble.addEventListener === "function") {
    clay = new Clay(clayConfig);

    Pebble.addEventListener("ready", function () {
        const config = mergeConfig();
        sendPrayerPayload(getImmediatePayload(config));
        fetchAndSendPrayerTimes(config, { forceRefresh: true });
        scheduleDailyPrayerFetch(config);
    });

    Pebble.addEventListener("appmessage", function (e) {
        handleWatchMessage((e && e.payload) || {});
    });

    Pebble.addEventListener("webviewclosed", function (e) {
        handleSettingsSaved(e && e.response, clay);
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CACHE_KEY,
        CLAY_SETTINGS_KEY,
        PRAYER_KEYS,
        KEYS,
        defaultConfig,
        formatDateForApi,
        formatDateTag,
        normalizeTime,
        extractPrayerTimes,
        readCache,
        readClaySettings,
        writeCache,
        buildPrayerTimesUrl,
        sendFetchingState,
        sendPrayerPayload,
        shouldUseCache,
        requestPrayerTimes,
        fetchAndSendPrayerTimes,
        mergeConfig,
        getImmediatePayload,
        handleSettingsSaved,
        handleWatchMessage,
    };
}
