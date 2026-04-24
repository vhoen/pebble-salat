describe("pkjs e2e", () => {
  const realDate = Date;

  function mockDate(isoString) {
    class MockDate extends Date {
      constructor(...args) {
        if (args.length) {
          super(...args);
          return;
        }
        super(isoString);
      }

      static now() {
        return new realDate(isoString).getTime();
      }
    }

    global.Date = MockDate;
  }

  function setupGlobals() {
    const storage = {};
    global.localStorage = {
      getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null)),
      setItem: jest.fn((key, value) => {
        storage[key] = String(value);
      }),
    };

    const events = {};
    global.Pebble = {
      addEventListener: jest.fn((name, handler) => {
        events[name] = handler;
      }),
      sendAppMessage: jest.fn((_msg, onSuccess) => {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      }),
    };

    return { storage, events };
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (console.log.mockRestore) {
      console.log.mockRestore();
    }
    global.Date = realDate;
    delete global.Pebble;
    delete global.localStorage;
    delete global.XMLHttpRequest;
  });

  test("ready: envoie cache immédiat puis met a jour via API", () => {
    mockDate("2026-04-24T10:30:00.000Z");
    const { storage, events } = setupGlobals();
    storage["prayer-times-cache"] = JSON.stringify({
      date: "2026-04-23",
      city: "Paris",
      countryCode: "FR",
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "17:00",
      maghrib: "20:00",
      isha: "22:00",
    });

    function FakeXHR() {}
    FakeXHR.prototype.open = jest.fn();
    FakeXHR.prototype.send = jest.fn(function () {
      this.responseText = JSON.stringify({
        data: {
          timings: {
            Fajr: "05:05",
            Dhuhr: "13:05",
            Asr: "17:05",
            Maghrib: "20:05",
            Isha: "22:05",
          },
        },
      });
      this.onload();
    });
    global.XMLHttpRequest = FakeXHR;

    require("../../src/pkjs/index.js");

    expect(typeof events.ready).toBe("function");
    events.ready();

    expect(global.Pebble.sendAppMessage).toHaveBeenCalledTimes(2);

    const firstPayload = global.Pebble.sendAppMessage.mock.calls[0][0];
    expect(firstPayload[10000]).toBe("Paris");
    expect(firstPayload[10002]).toBe("00:00");

    const secondPayload = global.Pebble.sendAppMessage.mock.calls[1][0];
    expect(secondPayload[10002]).toBe("05:05");
    expect(secondPayload[10003]).toBe("13:05");

    const persisted = JSON.parse(storage["prayer-times-cache"]);
    expect(persisted.fajr).toBe("05:05");
    expect(persisted.date).toBe("2026-04-24");
  });

  test("appmessage: fallback sur config si echec reseau", () => {
    mockDate("2026-04-24T10:30:00.000Z");
    const { events } = setupGlobals();

    function FakeXHR() {}
    FakeXHR.prototype.open = jest.fn();
    FakeXHR.prototype.send = jest.fn(function () {
      this.onerror(new Error("boom"));
    });
    global.XMLHttpRequest = FakeXHR;

    require("../../src/pkjs/index.js");

    expect(typeof events.appmessage).toBe("function");
    events.appmessage({ payload: { city: "Lille", countryCode: "FR" } });

    expect(global.Pebble.sendAppMessage).toHaveBeenCalledTimes(1);
    const payload = global.Pebble.sendAppMessage.mock.calls[0][0];
    expect(payload[10000]).toBe("Lille");
    expect(payload[10001]).toBe("FR");
    expect(payload[10002]).toBe("00:00");
  });
});
