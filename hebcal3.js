const { HebrewCalendar, HDate, Location, Event, Sedra, gematriya } = require("@hebcal/core");


function eventsByDate () {
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
  locale: "he-x-NoNikud",
  addHebrewDates: true,
};

const events = HebrewCalendar.calendar(options);

let eventsByDate = {};
for (const e of events) {
  let date = e.getDate().greg().getTime();
  if (!date || date == "undefined") continue;
  if (date === dateDuJour) {
    Object.assign(e, {render: e.render('he-x-nonikud')});
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

// console.log(events);

let dateInHebrew = new HDate(new Date());
// console.log(dateInHebrew);

let shabat = dateInHebrew.onOrAfter(6).greg();

shabat = new Date(shabat).toDateString()

// console.log(shabat);

let parashatAshavua = new Sedra(5782, true).getString(dateInHebrew, 'he-x-NoNikud');

parashatAshavua = parashatAshavua.split(' ')
parashatAshavua.shift();
parashatAshavua = parashatAshavua.toString()
// console.log(parashatAshavua)

return eventsByDate = Object.assign(eventsByDate, {ParashatAshavua : parashatAshavua})

// console.log(eventsByDate);

// console.log(zmanJerusalem.zmanShabatJerusalem);
}

eventsByDate()

setInterval(() => {
  eventsByDate()
}, 1000);

module.exports.eventsByDate = eventsByDate;

function shabat () {

let dateInHebrew = new HDate(new Date());
// console.log(dateInHebrew);

let shabat = dateInHebrew.onOrAfter(6).greg();

return shabat = new Date(shabat).toDateString()
};

shabat()
setInterval(() => {
  shabat()
}, 300000);


module.exports.shabat = shabat;

