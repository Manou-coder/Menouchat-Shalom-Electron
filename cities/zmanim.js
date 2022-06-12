const KosherZmanim = require("kosher-zmanim");

const jerusalem = {
    date: new Date(),
    timeZoneId: "Asia/Jerusalem",
    latitude: 31.770707215675863,
    longitude: 35.18218638465854
};

const zmanJerusalem = KosherZmanim.getZmanimJson(jerusalem);

// console.log(zmanJerusalem);

module.exports = zmanJerusalem;


// app.get("/api/zmanim", (req, res) => {
//     res.json(zmanim2);
// })






