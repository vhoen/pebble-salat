const pkjs = require("../../src/pkjs/index.js");

const DEFAULT_LAT = "47.24192801770674";
const DEFAULT_LON = "5.9351131785808375";

function mockLocalStorage(initial) {
  const storage = { ...(initial || {}) };
  global.localStorage = {
    getItem: jest.fn((key) => (storage[key] != null ? storage[key] : null)),
    setItem: jest.fn((key, value) => {
      storage[key] = String(value);
    }),
  };
  return storage;
}

function mockPebble() {
  global.Pebble = {
    sendAppMessage: jest.fn((_msg, onSuccess, onError) => {
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    }),
  };
  return global.Pebble;
}

function mockXhr({ responseText, failParse, networkError }) {
  let instance;
  global.XMLHttpRequest = jest.fn(function () {
    instance = this;
    this.open = jest.fn();
    this.send = jest.fn(() => {
      if (networkError) {
        this.onerror(new Error("Network error"));
        return;
      }
      this.responseText = responseText;
      if (failParse) {
        this.responseText = "{bad";
      }
      this.onload();
    });
  });
  return () => instance;
}

describe("pkjs unit", () => {
  afterEach(() => {
    delete global.localStorage;
    delete global.Pebble;
    delete global.XMLHttpRequest;
  });

  test("formatDateForApi returns YYYY-MM-DD", () => {
    const value = pkjs.formatDateForApi(new Date("2026-04-24T10:11:00Z"));
    expect(value).toBe("2026-04-24");
  });

  test("formatDateTag returns YYYY-MM-DD", () => {
    const value = pkjs.formatDateTag(new Date("2026-04-24T10:11:00Z"));
    expect(value).toBe("2026-04-24");
  });

  test("normalizeTime normalizes prayer times", () => {
    expect(pkjs.normalizeTime("5:07 (CEST)")).toBe("05:07");
    expect(pkjs.normalizeTime("14:42")).toBe("14:42");
    expect(pkjs.normalizeTime("21:36:59")).toBe("21:37");
    expect(pkjs.normalizeTime("21:36:29")).toBe("21:36");
    expect(pkjs.normalizeTime("23:59:59")).toBe("00:00");
    expect(pkjs.normalizeTime("bad")).toBe("00:00");
  });

  test("getImmediatePayload ignores cache from another day", () => {
    mockLocalStorage({
      [pkjs.CACHE_KEY]: JSON.stringify({
        date: "2026-06-23",
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LON,
        fajr: "05:00",
        dhuhr: "13:00",
        asr: "17:00",
        maghrib: "21:36",
        isha: "22:00",
      }),
    });

    const config = { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
    const payload = pkjs.getImmediatePayload(config, new Date("2026-06-24T10:00:00Z"));

    expect(payload.latitude).toBe(DEFAULT_LAT);
    expect(payload.fajr).toBe("00:00");
  });

  test("getImmediatePayload returns matching cache", () => {
    const cache = {
      date: "2026-06-24",
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "17:00",
      maghrib: "21:36",
      isha: "22:00",
    };
    mockLocalStorage({ [pkjs.CACHE_KEY]: JSON.stringify(cache) });

    expect(
      pkjs.getImmediatePayload(
        { latitude: DEFAULT_LAT, longitude: DEFAULT_LON },
        new Date("2026-06-24T10:00:00Z")
      )
    ).toEqual(cache);
  });

  test("extractPrayerTimes reads timing fields", () => {
    const timings = {
      Fajr: "05:01",
      Dhuhr: "13:39",
      Asr: "17:22",
      Maghrib: "20:40",
      Isha: "22:11",
    };

    expect(pkjs.extractPrayerTimes(timings)).toEqual({
      fajr: "05:01",
      dhuhr: "13:39",
      asr: "17:22",
      maghrib: "20:40",
      isha: "22:11",
    });
  });

  test("shouldUseCache validates date coords and prayer fields", () => {
    const config = { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
    const cache = {
      date: "2026-04-24",
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      fajr: "05:00",
      dhuhr: "13:30",
      asr: "17:00",
      maghrib: "20:30",
      isha: "22:00",
    };

    expect(pkjs.shouldUseCache(cache, config, "2026-04-24")).toBe(true);
    expect(pkjs.shouldUseCache({ ...cache, latitude: "0" }, config, "2026-04-24")).toBe(false);
    expect(pkjs.shouldUseCache({ ...cache, isha: null }, config, "2026-04-24")).toBe(false);
  });

  test("mergeConfig applies defaults", () => {
    mockLocalStorage();
    expect(pkjs.mergeConfig(null)).toEqual({
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
    });
    expect(pkjs.mergeConfig({ latitude: "48.8566" })).toEqual({
      latitude: "48.8566",
      longitude: DEFAULT_LON,
    });
  });

  test("mergeConfig reads persisted Clay settings", () => {
    mockLocalStorage({
      [pkjs.CLAY_SETTINGS_KEY]: JSON.stringify({
        latitude: "48.8566",
        longitude: "2.3522",
      }),
    });

    expect(pkjs.mergeConfig(null)).toEqual({
      latitude: "48.8566",
      longitude: "2.3522",
    });
  });

  test("readCache and readClaySettings tolerate invalid JSON", () => {
    mockLocalStorage({
      [pkjs.CACHE_KEY]: "{bad",
      [pkjs.CLAY_SETTINGS_KEY]: "{bad",
    });
    expect(pkjs.readCache()).toBeNull();
    expect(pkjs.readClaySettings()).toBeNull();
  });

  test("writeCache persists payload", () => {
    const storage = mockLocalStorage();
    pkjs.writeCache({ latitude: DEFAULT_LAT });
    expect(JSON.parse(storage[pkjs.CACHE_KEY])).toEqual({ latitude: DEFAULT_LAT });
  });

  test("buildPrayerTimesUrl uses latitude and longitude", () => {
    const url = pkjs.buildPrayerTimesUrl(
      { latitude: DEFAULT_LAT, longitude: DEFAULT_LON },
      new Date("2026-09-21T10:11:00Z")
    );

    expect(url).toBe(
      `https://api.aladhan.com/v1/timings/2026-09-21?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}`
    );
  });

  test("sendFetchingState and sendPrayerPayload use AppMessage keys", () => {
    const pebble = mockPebble();
    pkjs.sendFetchingState(true);
    pkjs.sendPrayerPayload({
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "17:00",
      maghrib: "20:00",
      isha: "22:00",
    });

    expect(pebble.sendAppMessage).toHaveBeenCalled();
    const fetchingMsg = pebble.sendAppMessage.mock.calls[0][0];
    expect(fetchingMsg[pkjs.KEYS.fetching]).toBe(1);
    const payloadMsg = pebble.sendAppMessage.mock.calls[1][0];
    expect(payloadMsg[pkjs.KEYS.latitude]).toBe(DEFAULT_LAT);
    expect(payloadMsg[pkjs.KEYS.fajr]).toBe("05:00");
  });

  test("sendAppMessage error callbacks are invoked", () => {
    global.Pebble = {
      sendAppMessage: jest.fn((_msg, _ok, onError) => onError({ code: 1 })),
    };
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    pkjs.sendFetchingState(false);
    pkjs.sendPrayerPayload({});
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("fetchAndSendPrayerTimes uses cache when valid", () => {
    const today = pkjs.formatDateTag(new Date());
    const cache = {
      date: today,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "17:00",
      maghrib: "20:00",
      isha: "22:00",
    };
    mockLocalStorage({ [pkjs.CACHE_KEY]: JSON.stringify(cache) });
    const pebble = mockPebble();

    pkjs.fetchAndSendPrayerTimes({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });

    expect(pebble.sendAppMessage).toHaveBeenCalled();
    expect(global.XMLHttpRequest).toBeUndefined();
  });

  test("fetchAndSendPrayerTimes forceRefresh fetches and caches", () => {
    const storage = mockLocalStorage();
    mockPebble();
    mockXhr({
      responseText: JSON.stringify({
        data: {
          timings: {
            Fajr: "05:01",
            Dhuhr: "13:39",
            Asr: "17:22",
            Maghrib: "20:40",
            Isha: "22:11",
          },
        },
      }),
    });

    pkjs.fetchAndSendPrayerTimes(
      { latitude: DEFAULT_LAT, longitude: DEFAULT_LON },
      { forceRefresh: true }
    );

    const cached = JSON.parse(storage[pkjs.CACHE_KEY]);
    expect(cached.fajr).toBe("05:01");
    expect(cached.latitude).toBe(DEFAULT_LAT);
  });

  test("fetchAndSendPrayerTimes falls back to cache on network error", () => {
    const today = pkjs.formatDateTag(new Date());
    const cache = {
      date: today,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "17:00",
      maghrib: "20:00",
      isha: "22:00",
    };
    mockLocalStorage({ [pkjs.CACHE_KEY]: JSON.stringify(cache) });
    const pebble = mockPebble();
    mockXhr({ networkError: true });
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    pkjs.fetchAndSendPrayerTimes(
      { latitude: DEFAULT_LAT, longitude: DEFAULT_LON },
      { forceRefresh: true }
    );

    const last = pebble.sendAppMessage.mock.calls[pebble.sendAppMessage.mock.calls.length - 1][0];
    expect(last[pkjs.KEYS.fajr]).toBe("05:00");
    log.mockRestore();
  });

  test("fetchAndSendPrayerTimes falls back to config when no cache", () => {
    mockLocalStorage();
    const pebble = mockPebble();
    mockXhr({ networkError: true });
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    pkjs.fetchAndSendPrayerTimes(
      { latitude: "48.8566", longitude: "2.3522" },
      { forceRefresh: true }
    );

    const last = pebble.sendAppMessage.mock.calls[pebble.sendAppMessage.mock.calls.length - 1][0];
    expect(last[pkjs.KEYS.latitude]).toBe("48.8566");
    log.mockRestore();
  });

  test("fetchAndSendPrayerTimes handles invalid API payload", () => {
    mockLocalStorage();
    mockPebble();
    mockXhr({ responseText: JSON.stringify({ data: {} }) });
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    pkjs.fetchAndSendPrayerTimes(
      { latitude: DEFAULT_LAT, longitude: DEFAULT_LON },
      { forceRefresh: true }
    );

    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("requestPrayerTimes reports parse errors", () => {
    mockXhr({ failParse: true });
    const onSuccess = jest.fn();
    const onError = jest.fn();
    pkjs.requestPrayerTimes("https://example.test", onSuccess, onError);
    expect(onError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test("handleSettingsSaved refreshes on valid response", () => {
    mockLocalStorage();
    mockPebble();
    mockXhr({
      responseText: JSON.stringify({
        data: {
          timings: {
            Fajr: "05:01",
            Dhuhr: "13:39",
            Asr: "17:22",
            Maghrib: "20:40",
            Isha: "22:11",
          },
        },
      }),
    });
    const clay = {
      getSettings: jest.fn(() => ({ latitude: "48.8566", longitude: "2.3522" })),
    };

    pkjs.handleSettingsSaved(
      JSON.stringify({ latitude: "48.8566", longitude: "2.3522" }),
      clay
    );
    expect(clay.getSettings).toHaveBeenCalled();
  });

  test("handleSettingsSaved ignores cancelled responses", () => {
    const clay = { getSettings: jest.fn() };
    pkjs.handleSettingsSaved("CANCELLED", clay);
    pkjs.handleSettingsSaved("EXIT", clay);
    pkjs.handleSettingsSaved(null, clay);
    expect(clay.getSettings).not.toHaveBeenCalled();
  });

  test("handleSettingsSaved logs when getSettings throws", () => {
    const clay = {
      getSettings: jest.fn(() => {
        throw new Error("bad settings");
      }),
    };
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    pkjs.handleSettingsSaved("{}", clay);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("handleWatchMessage forces refresh", () => {
    mockLocalStorage();
    mockPebble();
    mockXhr({
      responseText: JSON.stringify({
        data: {
          timings: {
            Fajr: "05:01",
            Dhuhr: "13:39",
            Asr: "17:22",
            Maghrib: "20:40",
            Isha: "22:11",
          },
        },
      }),
    });

    pkjs.handleWatchMessage({ latitude: "48.8566", longitude: "2.3522" });
    expect(global.XMLHttpRequest).toHaveBeenCalled();
  });

  test("KEYS assign stable AppMessage identifiers", () => {
    expect(pkjs.KEYS.latitude).toBe(10000);
    expect(pkjs.KEYS.longitude).toBe(10001);
    expect(pkjs.KEYS.fajr).toBe(10002);
    expect(pkjs.KEYS.fetching).toBe(10008);
  });

  test("registers Pebble listeners and schedules daily fetch on ready", () => {
    jest.resetModules();
    jest.useFakeTimers();

    const handlers = {};
    global.localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
    };
    global.Pebble = {
      addEventListener: jest.fn((name, handler) => {
        handlers[name] = handler;
      }),
      sendAppMessage: jest.fn((_msg, onSuccess) => {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      }),
    };
    global.XMLHttpRequest = jest.fn(function () {
      this.open = jest.fn();
      this.send = jest.fn(() => {
        this.responseText = JSON.stringify({
          data: {
            timings: {
              Fajr: "05:01",
              Dhuhr: "13:39",
              Asr: "17:22",
              Maghrib: "20:40",
              Isha: "22:11",
            },
          },
        });
        this.onload();
      });
    });

    require("../../src/pkjs/index.js");

    expect(handlers.ready).toBeDefined();
    expect(handlers.appmessage).toBeDefined();
    expect(handlers.webviewclosed).toBeDefined();

    handlers.ready();
    handlers.appmessage({ payload: { latitude: DEFAULT_LAT, longitude: DEFAULT_LON } });
    handlers.webviewclosed({
      response: JSON.stringify({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON }),
    });

    jest.advanceTimersByTime(24 * 60 * 60 * 1000);

    jest.useRealTimers();
    jest.resetModules();
  });
});
