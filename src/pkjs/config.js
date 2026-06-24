module.exports = [
    {
        type: "heading",
        defaultValue: "Salat Settings",
    },
    {
        type: "text",
        defaultValue: "Set the city and country used for today's prayer times.",
    },
    {
        type: "section",
        items: [
            {
                type: "heading",
                defaultValue: "Location",
            },
            {
                type: "input",
                messageKey: "city",
                defaultValue: "Paris",
                label: "City",
                attributes: {
                    placeholder: "Paris",
                    maxLength: 32,
                },
            },
            {
                type: "input",
                messageKey: "countryCode",
                defaultValue: "FR",
                label: "Country code",
                attributes: {
                    placeholder: "FR",
                    maxLength: 2,
                },
            },
        ],
    },
    {
        type: "submit",
        defaultValue: "Save Settings",
    },
];
