function Clay() {
    this.getSettings = function (response) {
        const parsed = JSON.parse(response);
        return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
        };
    };
}

module.exports = Clay;
