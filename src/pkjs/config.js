module.exports = [
    {
        type: "heading",
        defaultValue: "Salat Settings",
    },
    {
        type: "text",
        defaultValue: "Set the latitude and longitude used for today's prayer times.",
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
                messageKey: "latitude",
                defaultValue: "48.8603781426827",
                label: "Latitude",
                attributes: {
                    placeholder: "48.8603781426827",
                    type: "number",
                    step: "any",
                },
            },
            {
                type: "input",
                messageKey: "longitude",
                defaultValue: "2.3385559481067775",
                label: "Longitude",
                attributes: {
                    placeholder: "2.3385559481067775",
                    type: "number",
                    step: "any",
                },
            },
        ],
    },
    {
        type: "submit",
        defaultValue: "Save Settings",
    },
];
