import Poco from "commodetto/Poco";

const render = new Poco(screen);

const backgroundColor = render.makeColor(255, 248, 232);
const titleBarColor = render.makeColor(24, 34, 48);
const prayerLineColor = render.makeColor(45, 60, 72);
const prayerAccentColor = render.makeColor(193, 138, 66);

const state = {
	city: "Paris",
	countryCode: "FR",
};

const prayerRows = [
	"Fajr : 00:00",
	"Dhuhr : 00:00",
	"Asr : 00:00",
	"Maghrib : 00:00",
	"Isha : 00:00",
];

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

function draw() {
	render.begin();
	render.fillRectangle(backgroundColor, 0, 0, render.width, render.height);

	render.fillRectangle(titleBarColor, 10, 10, render.width - 20, 18);
	render.fillRectangle(prayerAccentColor, 10, 30, render.width - 20, 3);

	const cityLabel = `${state.city} (${state.countryCode})`;
	drawBitmapText(cityLabel, 14, 12, backgroundColor);

	let y = 54;
	for (const row of prayerRows) {
		drawBitmapText(row, 18, y, prayerLineColor);
		y += 28;
	}

	render.end();
}

draw();
watch.addEventListener("secondchange", draw);
