import {HebrewCalendar, HDate, Location, Event} from '@hebcal/core';

let objetEvenement;
let arrayEvenement = [];
let arrayEvenement2 = [];

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
      // console.log(typeof ev);
        objetEvenement = Object.assign(ev)
        objetEvenement = {ev , ev}
        arrayEvenement.push(ev.render());
        arrayEvenement2.push(ev);
    }
  }


// console.log(arrayEvenement);
// console.log(arrayEvenement2);
// console.log(objetEvenement);

// for (let i = 0; i < arrayEvenement2.length; i++) {
//   const element = array[i];
//   if
  
// }

// let obj = {};

// const objet1 = {a: 0, b: 1};
// const objet2 = {c: 2, d: 3};

// obj = {objet1};
// obj = {objet1, objet2};

// console.log(obj);

