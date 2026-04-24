const pkjs = require("../../src/pkjs/index.js");

describe("pkjs unit", () => {
  test("formatDateForApi retourne DD-MM-YYYY", () => {
    const value = pkjs.formatDateForApi(new Date("2026-04-24T10:11:00Z"));
    expect(value).toBe("24-04-2026");
  });

  test("formatDateTag retourne YYYY-MM-DD", () => {
    const value = pkjs.formatDateTag(new Date("2026-04-24T10:11:00Z"));
    expect(value).toBe("2026-04-24");
  });

  test("normalizeTime normalise les heures", () => {
    expect(pkjs.normalizeTime("5:07 (CEST)")).toBe("05:07");
    expect(pkjs.normalizeTime("14:42")).toBe("14:42");
    expect(pkjs.normalizeTime("bad")).toBe("00:00");
  });

  test("extractPrayerTimes lit les bons champs de timings", () => {
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

  test("shouldUseCache valide date/ville/pays et champs de prière", () => {
    const config = { city: "Paris", countryCode: "FR" };
    const cache = {
      date: "2026-04-24",
      city: "Paris",
      countryCode: "FR",
      fajr: "05:00",
      dhuhr: "13:30",
      asr: "17:00",
      maghrib: "20:30",
      isha: "22:00",
    };

    expect(pkjs.shouldUseCache(cache, config, "2026-04-24")).toBe(true);
    expect(pkjs.shouldUseCache({ ...cache, city: "Lyon" }, config, "2026-04-24")).toBe(false);
    expect(pkjs.shouldUseCache({ ...cache, isha: null }, config, "2026-04-24")).toBe(false);
  });

  test("mergeConfig applique les valeurs par defaut", () => {
    expect(pkjs.mergeConfig(null)).toEqual({ city: "Paris", countryCode: "FR" });
    expect(pkjs.mergeConfig({ city: "Lille" })).toEqual({ city: "Lille", countryCode: "FR" });
  });
});
