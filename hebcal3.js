const { HebrewCalendar, HDate, Location, Event, gematriya } = require("@hebcal/core");


let dateAnnee = new Date().getFullYear();
let dateDuJour = new Date().toDateString();
dateDuJour = new Date(dateDuJour);
dateDuJour = dateDuJour.getTime();

const options = {
  year: dateAnnee,
  isHebrewYear: false,
  candlelighting: true,
  location: Location.lookup("Jerusalem"),
  dafyomi: true,
  sedrot: true,
  omer: true,
  locale: "he",
  addHebrewDates: true,
};

const events = HebrewCalendar.calendar(options);


let eventsByDate = {};
for (const e of events) {
  let date = e.getDate().greg().getTime();
  if (!date || date == "undefined") continue;
  if (date === dateDuJour) {
    Object.assign(e, {render: e.render('he')});
    eventsByDate[e.constructor.name] = e;
  }
}


// renvoyer le daf en hebreu au lieu de en chiffres
const renvoyerLeDafAuBonFormat = () => {
  eventsByDate['DafYomiEvent'].render = eventsByDate['DafYomiEvent'].desc;
  let nomDuDaf = eventsByDate['DafYomiEvent'].render.replace(/[\d]/g, "");
  let numeroDuDaf = eventsByDate['DafYomiEvent'].render.replace(/[\D]/g, "");
  numeroDuDaf = gematriya(numeroDuDaf)
  nomDuDaf = nomDuDaf + " " + numeroDuDaf;
  eventsByDate['DafYomiEvent'].render = nomDuDaf;
};

renvoyerLeDafAuBonFormat()



// console.log(eventsByDate['DafYomiEvent']);
// console.log(eventsByDate['OmerEvent']);

// console.log(eventsByDate);

module.exports = eventsByDate;