function Clay() {
    this.getSettings = function (response) {
        const parsed = JSON.parse(response);
        return {
            city: parsed.city,
            countryCode: parsed.countryCode,
        };
    };
}

module.exports = Clay;
