const defaultConfig = {
    city: "Paris",
    countryCode: "FR",
};

Pebble.addEventListener("ready", function () {
    Pebble.sendAppMessage(defaultConfig);
});

Pebble.addEventListener("appmessage", function (e) {
});
