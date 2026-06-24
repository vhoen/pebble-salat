const Clay = require("@rebble/clay");
const clayConfig = require("./config");

const defaultConfig = {
    city: "Paris",
    countryCode: "FR",
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
    city: 10000,
    countryCode: 10001,
    fajr: 10002,
    dhuhr: 10003,
    asr: 10004,
    maghrib: 10005,
    isha: 10006,
};

function formatDateForApi(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatDateTag(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

function normalizeTime(value) {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) {
        return "00:00";
    }

    const hours = String(parseInt(match[1], 10)).padStart(2, "0");
    return `${hours}:${match[2]}`;
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

function sendPrayerPayload(payload) {
    const source = payload || {};
    const message = {
        [KEYS.city]: String(source.city || defaultConfig.city),
        [KEYS.countryCode]: String(source.countryCode || defaultConfig.countryCode),
        [KEYS.fajr]: String(source.fajr || defaultConfig.fajr),
        [KEYS.dhuhr]: String(source.dhuhr || defaultConfig.dhuhr),
        [KEYS.asr]: String(source.asr || defaultConfig.asr),
        [KEYS.maghrib]: String(source.maghrib || defaultConfig.maghrib),
        [KEYS.isha]: String(source.isha || defaultConfig.isha),
    };

    Pebble.sendAppMessage(message, function () {}, function (error) {
        console.log("sendAppMessage error", JSON.stringify(error));
    });
}

function shouldUseCache(cache, config, dateTag) {
    return (
        cache &&
        cache.date === dateTag &&
        cache.city === config.city &&
        cache.countryCode === config.countryCode &&
        PRAYER_KEYS.every((key) => typeof cache[key] === "string")
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

    const dateParam = formatDateForApi(now);
    const city = encodeURIComponent(config.city);
    const country = encodeURIComponent(config.countryCode);
    const url = `https://api.aladhan.com/v1/timingsByCity/${dateParam}?city=${city}&country=${country}`;

    requestPrayerTimes(
        url,
        function (json) {
            if (!json || !json.data || !json.data.timings) {
                throw new Error("Invalid Aladhan response");
            }

            const times = extractPrayerTimes(json.data.timings);
            const payload = {
                city: config.city,
                countryCode: config.countryCode,
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
            if (cached && cached.city === config.city && cached.countryCode === config.countryCode) {
                sendPrayerPayload(cached);
                return;
            }
            sendPrayerPayload(config);
        }
    );
}

function mergeConfig(incoming) {
    const claySettings = readClaySettings() || {};
    const source = incoming || claySettings || {};
    return {
        city: source.city ? String(source.city) : defaultConfig.city,
        countryCode: source.countryCode ? String(source.countryCode) : defaultConfig.countryCode,
    };
}

function getImmediatePayload(config) {
    const cached = readCache();
    if (
        cached &&
        cached.city === config.city &&
        cached.countryCode === config.countryCode &&
        PRAYER_KEYS.every((key) => typeof cached[key] === "string")
    ) {
        return cached;
    }

    return config;
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

let clay;

if (typeof Pebble !== "undefined" && Pebble && typeof Pebble.addEventListener === "function") {
    clay = new Clay(clayConfig);

    Pebble.addEventListener("ready", function () {
        const config = mergeConfig(readCache());
        sendPrayerPayload(getImmediatePayload(config));
        fetchAndSendPrayerTimes(config, { forceRefresh: true });
        scheduleDailyPrayerFetch(config);
    });

    Pebble.addEventListener("appmessage", function (e) {
        const incoming = (e && e.payload) || {};
        const config = mergeConfig(incoming);
        fetchAndSendPrayerTimes(config, { forceRefresh: true });
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
        sendPrayerPayload,
        shouldUseCache,
        requestPrayerTimes,
        fetchAndSendPrayerTimes,
        mergeConfig,
        getImmediatePayload,
        handleSettingsSaved,
    };
}
