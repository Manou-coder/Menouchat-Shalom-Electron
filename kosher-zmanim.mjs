import * as KosherZmanim from "kosher-zmanim";
import { HebrewDateFormatter, JewishCalendar, JewishDate, YomiCalculator } from "kosher-zmanim";

// YomiCalculator.getDafYomiBavli(jewishCalendar);

let date = new Date();

console.log(date.getTime());




// let coucou = KosherZmanim.JewishCalendar.isCheshvanLong(5772);



let coucou = new KosherZmanim.JewishDate();

console.log(coucou);

// let dodo = KosherZmanim.YomiCalculator.getDafYomiBavli(coucou);

let dodo = YomiCalculator.getDafYomiBavli(coucou);

console.log(dodo);

// let papi = dodo.getDaf()

// let papi2 = dodo.getMasechta()

// console.log(papi + " " + papi2);


// let baba = new KosherZmanim.HebrewDateFormatter().formatDafYomiBavli(dodo)

// let babi = new KosherZmanim.HebrewDateFormatter()

// babi = babi.setHebrewFormat(true);

// babi = babi.isHebrewFormat()

let jd = new JewishCalendar();

let hdf = new HebrewDateFormatter();

hdf.setHebrewFormat(true);

let babi = hdf.format(jd)

let dateH = new JewishCalendar().getDayOfOmer()


console.log(dateH);


console.log(jd);

console.log(babi);