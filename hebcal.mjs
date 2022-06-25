import {HebrewCalendar, HDate, Location, Event, DafYomi, DafYomiEvent, gematriya, Sedra, HolidayEvent, months, flags, OmerEvent} from '@hebcal/core';

const options = {
  year: 5782,
  isHebrewYear: true,
  candlelighting: true,
  location: Location.lookup('Jerusalem'),
  sedrot: true,
  omer: true,
};
const events = HebrewCalendar.calendar(options);


console.log(events);

for (const ev of events) {
  const hd = ev.getDate();
  const date = hd.greg();
  let dateHebreu = new HDate(hd);
  // console.log(date.toLocaleDateString(), ev.render('he'), dateHebreu.render('he'));
}

let dateDujour = new HDate();

let dateDujour2 = new HDate();
// console.log(dateDujour);

const jourMoisEnH = (objetDate) => {
    let dayOfMonth = gematriya(objetDate.day);
    return dayOfMonth;
};

// console.log( jourMoisEnH(dateDujour));

const jourSemaineEnH = () => {
    let day;
    switch (new Date().getDay()) {
        case 0:
          day = "ראשון";
          break;
        case 1:
          day = "שני";
          break;
        case 2:
           day = "שלישי";
          break;
        case 3:
          day = "רביעי";
          break;
        case 4:
          day = "חמישי";
          break;
        case 5:
          day = "שישי";
          break;
        case 6:
          day = "שביעי";
      }
      return day;
}

let moisEnH = new HDate().render('h').split(' ')[1].replace(",", "");

const anneEnH = (objetDate) => {
    let anne = gematriya(objetDate.year);
    return anne;
};

console.log(`יום ${jourSemaineEnH(dateDujour)} ${jourMoisEnH(dateDujour)} ${moisEnH} ${anneEnH(dateDujour)}`);

console.log(dateDujour.renderGematriya())

let dateH = new HDate(16, months.NISAN, 5749);

console.log(dateH);

let omer = new OmerEvent(dateH, 1).render('he');

console.log(omer);




// let holliday = new HolidayEvent(dateH).render('he')

// console.log(holliday);


// let parasha = new Sedra(5722, true).getString(dateH, 'he')
// console.log(parasha);


// const ev = new Event(new HDate(6, 'Sivan', 5749), 'Shavuot', flags.CHAG);
// ev.render(); // 'Shavuot'
// ev.render('he'); // 'שָׁבוּעוֹת'
// ev.render('ashkenazi'); // 'Shavuos'

// console.log(ev)








// import {HDate, months} from '@hebcal/core';

// const hd1 = new HDate();
// console.log(hd1.render('he'));
// const hd2 = new HDate(new Date(2008, 10, 13));
// console.log(hd2);
// const hd3 = new HDate(15, 'Cheshvan', 5769);
// console.log(hd3);
// const hd4 = new HDate(15, months.CHESHVAN, 5769);
// console.log(hd4);
// const hd5 = new HDate(733359); // ==> 15 Cheshvan 5769
// console.log(hd5);
// const monthName = 'אייר';
// const hd6 = new HDate(5, monthName, 5773);
// console.log(hd6);

