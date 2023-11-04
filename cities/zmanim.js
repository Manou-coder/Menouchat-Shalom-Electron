const KosherZmanim = require('kosher-zmanim')
const hebcal = require('../hebcal3')
const { shabat } = require('../hebcal3')

// const jerusalem = {
//     date: new Date(),
//     timeZoneId: "Asia/Jerusalem",
//     latitude: 31.770707215675863,
//     longitude: 35.18218638465854,
//     elevation: 800
// };

// let zmanJerusalem = KosherZmanim.getZmanimJson(jerusalem);

// //ajout du Zman adlaka et tzais de chabat

// const ShabatJerusalem = {
//     date: new Date(hebcal.shabat),
//     timeZoneId: "Asia/Jerusalem",
//     latitude: 31.770707215675863,
//     longitude: 35.18218638465854,
//     elevation: 800
// };

// const zmanShabatJerusalem = KosherZmanim.getZmanimJson(ShabatJerusalem);

// // hadlaka 40 mn avant la Shkia
// let hadlaka = zmanShabatJerusalem.BasicZmanim.Sunset;
// hadlaka = new Date(hadlaka).getTime();
// hadlaka -= 2400000;
// hadlaka = new Date(hadlaka).toISOString();

// let HadlakAndTzais = {
//     hadlaka: hadlaka,
//     Tzais: zmanShabatJerusalem.BasicZmanim.Tzais,
//     Tzais72: zmanShabatJerusalem.BasicZmanim.Tzais72
// }

// zmanJerusalem = Object.assign(zmanJerusalem, {HadlakAndTzais: HadlakAndTzais});

// // fin de l'ajout

// // console.log(zmanJerusalem);

function zmanJerusalem() {
  const jerusalem = {
    date: new Date(),
    timeZoneId: 'Asia/Jerusalem',
    latitude: 31.770707215675863,
    longitude: 35.18218638465854,
    elevation: 800,
  }

  let zmanJerusalem = KosherZmanim.getZmanimJson(jerusalem)

  //ajout du Zman adlaka et tzais de chabat

  const ShabatJerusalem = {
    date: new Date(shabat()),
    timeZoneId: 'Asia/Jerusalem',
    latitude: 31.770707215675863,
    longitude: 35.18218638465854,
    elevation: 800,
    complexZmanim: true,
  }

  const zmanShabatJerusalem = KosherZmanim.getZmanimJson(ShabatJerusalem)
  console.log('zmanShabatJerusalem: ', zmanShabatJerusalem)

  // hadlaka 40 mn avant la Shkia
  let hadlaka = zmanShabatJerusalem.Zmanim.Sunset
  hadlaka = new Date(hadlaka).getTime()
  hadlaka -= 2400000
  hadlaka = new Date(hadlaka).toISOString()

  let HadlakAndTzais = {
    hadlaka: hadlaka,
    Tzais: zmanShabatJerusalem.Zmanim.Tzais,
    Tzais72: zmanShabatJerusalem.Zmanim.Tzais72,
    Tzais16Point1Degrees: zmanShabatJerusalem.Zmanim.Tzais16Point1Degrees,
  }

  return (zmanJerusalem = Object.assign(zmanJerusalem, {
    HadlakAndTzais: HadlakAndTzais,
  }))
}

zmanJerusalem()

setInterval(() => {
  zmanJerusalem()
  // console.log(zmanJerusalem2());
}, 300000)

// console.log(zmanJerusalem())

module.exports.zmanJerusalem = zmanJerusalem
