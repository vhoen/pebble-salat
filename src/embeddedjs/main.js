import Poco from "commodetto/Poco";
import Message from "pebble/message";

const render = new Poco(screen);

const backgroundColor = render.makeColor(255, 248, 232);
const titleBarColor = render.makeColor(24, 34, 48);
const prayerLineColor = render.makeColor(45, 60, 72);
const prayerPastColor = render.makeColor(124, 141, 156);
const prayerAccentColor = render.makeColor(193, 138, 66);

const state = {
	city: "Paris",
	countryCode: "FR",
	times: {
		fajr: "--:--",
		dhuhr: "--:--",
		asr: "--:--",
		maghrib: "--:--",
		isha: "--:--",
	},
};

const APP_KEYS = new Map([
	["city", 10000],
	["countryCode", 10001],
	["fajr", 10002],
	["dhuhr", 10003],
	["asr", 10004],
	["maghrib", 10005],
	["isha", 10006],
]);

const GLYPHS = {
	" ": [0, 0, 0, 0, 0, 0, 0],
	"(": [4, 8, 16, 16, 16, 8, 4],
	")": [4, 2, 1, 1, 1, 2, 4],
	":": [0, 4, 4, 0, 4, 4, 0],
	"0": [14, 17, 19, 21, 25, 17, 14],
	"1": [4, 12, 4, 4, 4, 4, 14],
	"2": [14, 17, 1, 2, 4, 8, 31],
	"3": [30, 1, 1, 14, 1, 1, 30],
	"4": [2, 6, 10, 18, 31, 2, 2],
	"5": [31, 16, 16, 30, 1, 1, 30],
	"6": [14, 16, 16, 30, 17, 17, 14],
	"7": [31, 1, 2, 4, 8, 8, 8],
	"8": [14, 17, 17, 14, 17, 17, 14],
	"9": [14, 17, 17, 15, 1, 1, 14],
	"A": [14, 17, 17, 31, 17, 17, 17],
	"B": [30, 17, 17, 30, 17, 17, 30],
	"C": [14, 17, 16, 16, 16, 17, 14],
	"D": [30, 17, 17, 17, 17, 17, 30],
	"E": [31, 16, 16, 30, 16, 16, 31],
	"F": [31, 16, 16, 30, 16, 16, 16],
	"G": [14, 17, 16, 23, 17, 17, 14],
	"H": [17, 17, 17, 31, 17, 17, 17],
	"I": [14, 4, 4, 4, 4, 4, 14],
	"J": [1, 1, 1, 1, 17, 17, 14],
	"K": [17, 18, 20, 24, 20, 18, 17],
	"L": [16, 16, 16, 16, 16, 16, 31],
	"M": [17, 27, 21, 21, 17, 17, 17],
	"N": [17, 25, 21, 19, 17, 17, 17],
	"O": [14, 17, 17, 17, 17, 17, 14],
	"P": [30, 17, 17, 30, 16, 16, 16],
	"Q": [14, 17, 17, 17, 21, 18, 13],
	"R": [30, 17, 17, 30, 20, 18, 17],
	"S": [15, 16, 16, 14, 1, 1, 30],
	"T": [31, 4, 4, 4, 4, 4, 4],
	"U": [17, 17, 17, 17, 17, 17, 14],
	"V": [17, 17, 17, 17, 17, 10, 4],
	"W": [17, 17, 17, 21, 21, 21, 10],
	"X": [17, 17, 10, 4, 10, 17, 17],
	"Y": [17, 17, 10, 4, 4, 4, 4],
	"Z": [31, 1, 2, 4, 8, 16, 31],
};

function drawBitmapText(text, x, y, color) {
	const scale = 2;
	let cursorX = x;
	for (const char of text.toUpperCase()) {
		const glyph = GLYPHS[char] || GLYPHS[" "];
		for (let row = 0; row < glyph.length; row++) {
			const bits = glyph[row];
			for (let col = 0; col < 5; col++) {
				if (bits & (1 << (4 - col))) {
					render.fillRectangle(
						color,
						cursorX + col * scale,
						y + row * scale,
						scale,
						scale
					);
				}
			}
		}
		cursorX += 6 * scale;
	}
}

function parseMinutes(timeValue) {
	if (typeof timeValue !== "string")
		return null;

	const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
	if (!match)
		return null;

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59)
		return null;

	return hour * 60 + minute;
}

function getPrayerStatuses() {
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const schedule = [
		state.times.fajr,
		state.times.dhuhr,
		state.times.asr,
		state.times.maghrib,
		state.times.isha,
	].map(parseMinutes);

	let nextPrayerIndex = -1;
	for (let i = 0; i < schedule.length; i++) {
		if (schedule[i] !== null && schedule[i] > currentMinutes) {
			nextPrayerIndex = i;
			break;
		}
	}

	return schedule.map((minutes, index) => ({
		isPast: minutes !== null && minutes <= currentMinutes,
		isNext: index === nextPrayerIndex,
	}));
}

function draw() {
	render.begin();
	render.fillRectangle(backgroundColor, 0, 0, render.width, render.height);

	render.fillRectangle(titleBarColor, 10, 10, render.width - 20, 18);
	render.fillRectangle(prayerAccentColor, 10, 30, render.width - 20, 3);

	const cityLabel = `${state.city} (${state.countryCode})`;
	drawBitmapText(cityLabel, 14, 12, backgroundColor);

	const prayerRows = [
		`Fajr : ${state.times.fajr}`,
		`Dhuhr : ${state.times.dhuhr}`,
		`Asr : ${state.times.asr}`,
		`Maghrib : ${state.times.maghrib}`,
		`Isha : ${state.times.isha}`,
	];
	const prayerStatuses = getPrayerStatuses();

	let y = 54;
	for (let i = 0; i < prayerRows.length; i++) {
		const row = prayerRows[i];
		const status = prayerStatuses[i];
		const color = status.isPast ? prayerPastColor : prayerLineColor;

		drawBitmapText(row, 18, y, color);
		if (status.isNext)
			drawBitmapText(row, 19, y, color);

		y += 28;
	}

	render.end();
}

function readValue(payload, key) {
	let value = null;

	if (payload && typeof payload.get === "function") {
		value = payload.get(key);
	}
	else if (payload && Object.prototype.hasOwnProperty.call(payload, key)) {
		value = payload[key];
	}

	return typeof value === "string" && value ? value : null;
}

const message = new Message({
	format: "map",
	keys: APP_KEYS,
	onReadable() {
		const payload = message.read();
		if (!payload)
			return;

		state.city = readValue(payload, "city") || state.city;
		state.countryCode = readValue(payload, "countryCode") || state.countryCode;
		state.times.fajr = readValue(payload, "fajr") || state.times.fajr;
		state.times.dhuhr = readValue(payload, "dhuhr") || state.times.dhuhr;
		state.times.asr = readValue(payload, "asr") || state.times.asr;
		state.times.maghrib = readValue(payload, "maghrib") || state.times.maghrib;
		state.times.isha = readValue(payload, "isha") || state.times.isha;

		draw();
	},
});

void message;

draw();
watch.addEventListener("minutechange", draw);
