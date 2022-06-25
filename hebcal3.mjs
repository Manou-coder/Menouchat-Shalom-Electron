import {HebrewCalendar, HDate, Location, Event} from '@hebcal/core';

let objetEvenement;
let arrayEvenement = [];

let dateAnnee = new Date().getFullYear()
let dateDuJour = new Date('04/18/2022').toDateString();
dateDuJour = new Date(dateDuJour)
dateDuJour = dateDuJour.getTime();

const options = {
  year: dateAnnee,
  isHebrewYear: false,
  candlelighting: true,
  location: Location.lookup('Jerusalem'),
  dafyomi: true,
  sedrot: true,
  omer: true,
  locale: 'he',
  addHebrewDates: true
};

const events = HebrewCalendar.calendar(options);

for (let ev of events) {
    const hd = ev.getDate();
    let date = hd.greg();
    date = date.getTime()
    // console.log(date.toLocaleDateString(), ev.render(), hd.toString());
    if (date === dateDuJour) {
        objetEvenement = ev;
        arrayEvenement.push(ev);
    }
  }

// console.log(objetEvenement);
console.log(arrayEvenement);




