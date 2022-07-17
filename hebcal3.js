const { HebrewCalendar, HDate, Location, Event, Sedra, gematriya } = require("@hebcal/core");


function eventsByDate () {
  let dateAnnee = new Date().getFullYear();
let dateDuJour = new Date().toDateString();
dateDuJour = new Date('05/10/2022');
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
    // console.log(e);
    Object.assign(e, {render2: e.render('he-x-nonikud')});
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

let jewishHolliday = '';

if(eventsByDate.hasOwnProperty('HolidayEvent')) {
  // console.log(eventsByDate.HolidayEvent.AsaraBTevetEvent);
  // console.log('yes');
  jewishHolliday = eventsByDate.HolidayEvent.render2;
  delete eventsByDate.HolidayEvent;
  delete eventsByDate.TimedEvent;
} else if (eventsByDate.hasOwnProperty('AsaraBTevetEvent')) {
  jewishHolliday = eventsByDate.AsaraBTevetEvent.render2;
  delete eventsByDate.AsaraBTevetEvent;
  delete eventsByDate.TimedEvent;
}


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



// console.log(eventsByDate);

// let coucou = JSON.stringify(eventsByDate);

// console.log(coucou);


return eventsByDate = Object.assign(eventsByDate, {ParashatAshavua : parashatAshavua}, {Holliday: jewishHolliday})

// console.log(eventsByDate);

// console.log(zmanJerusalem.zmanShabatJerusalem);
}

eventsByDate()

// console.log(eventsByDate());

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

