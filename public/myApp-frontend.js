// GET RELOAD PAGE

let urlGetReload = 'http://localhost:3000/api/zmanim/get-reload';

const arrayReload = [0];

const getReload = async () => {
  let reload = await fetch(urlGetReload)
    .then(res => res.json())
    .then(data => {
      if (arrayReload.length <= 1) {
        arrayReload.push(data.reload);
        return;
      }
      if (arrayReload[arrayReload.length - 1] != data.reload) {
        console.log('not same');
        location.reload();
      }
      arrayReload.push(data.reload)
    })
    .catch(err => console.error(err))
}

setInterval(async () => {
  getReload()
  if (arrayReload.length >= 3) {
    arrayReload.pop()
  }
}, 1000);

// -------------------------------------------------------------------------------

// MONTRE

function clock() {
  const date = new Date();
  const hours = ((date.getHours() + 11) % 12) + 1;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const hour = hours * 30;
  const minute = minutes * 6;
  const second = seconds * 6;

  let min = minutes * 6;
  min += 45;

  let hor = hours * 30;
  hor += 60;

  document.querySelector(".min").style.transform = `rotate(${min}deg)`;

  document.querySelector(".hor").style.transform = `rotate(${hor}deg)`;
}

setInterval(() => {
  clock();
}, 1000);
//

// donne heure et minutes sans les secondes

const modifierHeure = (heure) => {
  return new Date(heure).toLocaleTimeString().substring(0, 5);
};

// ZMANEI TEFILA H'OL

const displayTefChol = async () => {
  let ZmanTefChol = await fetch("http://localhost:3000/api/zmanim/zman-chol");
  ZmanTefChol = await ZmanTefChol.json();
  let arvitOfChol = document.querySelector("#arvit");
  arvitOfChol.innerHTML = ZmanTefChol.arvitChol;
  let shacharitOfChol = document.querySelector("#shacharit");
  shacharitOfChol.innerHTML = ZmanTefChol.shacharitChol;
  let minchaOfChol = document.querySelector("#mincha");
  minchaOfChol.innerHTML = ZmanTefChol.minchaChol;
};

displayTefChol();

// ZMANEI SHABAT minchaShbt

const displayZmaneiShabat = async () => {
  let ZmaneiShabat = await fetch(
    "http://localhost:3000/api/zmanim/zman-shabat"
  );
  ZmaneiShabat = await ZmaneiShabat.json();
  // console.log(ZmaneiShabat);
  let shirAshirim = document.querySelector("#shirAshirim");
  shirAshirim.innerHTML = ZmaneiShabat.shirAshirim;
  let minchaErevShbt = document.querySelector("#minchaErevShbt");
  minchaErevShbt.innerHTML = ZmaneiShabat.minchaErevShbt;
  let shaharitShbt = document.querySelector("#shaharitShbt");
  shaharitShbt.innerHTML = ZmaneiShabat.shaharitShbt;
  let minchaShbt = document.querySelector("#minchaShbt");
  minchaShbt.innerHTML = ZmaneiShabat.minchaShbt;
};

displayZmaneiShabat()

// ZMANEI AYOM CALENDRIER

const displayZmaneiAyom = async () => {
  let ZmaneiAyom = await fetch("http://localhost:3000/api/zmanim/jerusalem");
  ZmaneiAyom = await ZmaneiAyom.json();
  // console.log(ZmaneiAyom);
  ZmaneiShabat = ZmaneiAyom.HadlakAndTzais;
  ZmaneiAyom = ZmaneiAyom.BasicZmanim;
  let AlosHashachar = document.querySelector("#AlosHashachar");
  AlosHashachar.innerHTML = modifierHeure(ZmaneiAyom.AlosHashachar);
  let Sunrise = document.querySelector("#Sunrise");
  Sunrise.innerHTML = modifierHeure(ZmaneiAyom.Sunrise);
  let SofZmanShmaMGA = document.querySelector("#SofZmanShmaMGA");
  SofZmanShmaMGA.innerHTML = modifierHeure(ZmaneiAyom.SofZmanShmaMGA);
  let SofZmanShmaGRA = document.querySelector("#SofZmanShmaGRA");
  SofZmanShmaGRA.innerHTML = modifierHeure(ZmaneiAyom.SofZmanShmaGRA);
  let Chatzos = document.querySelector("#Chatzos");
  Chatzos.innerHTML = modifierHeure(ZmaneiAyom.Chatzos);
  let Sunset = document.querySelector("#Sunset");
  Sunset.innerHTML = modifierHeure(ZmaneiAyom.Sunset);
  let Tzais = document.querySelector("#Tzais");
  Tzais.innerHTML = modifierHeure(ZmaneiAyom.Tzais);
  let hadlaka = document.querySelector("#hadlaka");
  hadlaka.innerHTML = modifierHeure(ZmaneiShabat.hadlaka);
  let Tzais72 = document.querySelector("#Tzais72");
  Tzais72.innerHTML = modifierHeure(ZmaneiShabat.Tzais72);
  let TzaisShabat = document.querySelector("#TzaisShabat");
  // ajout d'une minute
  ZmaneiShabat.Tzais = new Date(ZmaneiShabat.Tzais).getTime() + 60000;
  TzaisShabat.innerHTML = new Date(ZmaneiShabat.Tzais)
    .toLocaleTimeString()
    .substring(0, 5);
};

setInterval(() => {
  displayZmaneiAyom();
}, 1000);


// INFO DAF PARASHA ET AUTRES

const displayInfo = async () => {
  let info = await fetch("http://localhost:3000/api/zmanim/info");
  info = await info.json();
  // console.log(info);
  // console.log(info.eventsByDate.ParashatAshavua);
  let ParashatAshavua = document.querySelector("#ParashatAshavua");
  ParashatAshavua.innerHTML = `${info.ParashatAshavua}`;
  let daf = document.querySelector("#daf");
  daf.innerHTML = info.DafYomiEvent.render;
  let dateH = document.querySelector("#dateH");
  dateH.innerHTML = info.HebrewDateEvent.render2;
};

setInterval(() => {
  displayInfo();
}, 1000);

// DATE en francais

let date = new Date().toLocaleDateString();
date = date.split("/");
let date2 = date[2].split("").slice(-2).join("");
date[2] = date2;
date = date.join("/");
console.log(date);
let afficheDate = document.querySelector("#dateFr");
afficheDate.innerHTML = date;


// DIAPORAMA

const diaporama = async () => {
  let arrayImageRecup = [];
  // let secondeInterval = 3000;

  const infoDiaporama = async () => {
    fetch("http://localhost:3000/api/zmanim/checkbox")
      .then((res) => res.json())
      .then((data) => {
        /* arrAndSec sert a retourner 2 elements : le nb d'images ainsi que les secondesInterval*/
        const arrAndSec = [];
        let secondeInterval;
        // console.log("data", data);
        if (!data.image1 && !data.image2 && !data.image3 && !data.image4) {
          return arrayPush(arrayImageRecup, 0);
        }
        if (data.secInterval == "") {
          console.log("ya pas de seconde d'interval personnalisé");
        } else {
          secondeInterval = data.secInterval + "000";
          // console.log("milisecondes interval = " + secondeInterval);
        }
        if (data.image1) {
          arrayPush(arrayImageRecup, 1);
        }
        if (data.image2) {
          arrayPush(arrayImageRecup, 2);
        }
        if (data.image3) {
          arrayPush(arrayImageRecup, 3);
        }
        if (data.image4) {
          arrayPush(arrayImageRecup, 4);
        }
        arrAndSec.push(arrayImageRecup.length, secondeInterval)
        // console.log('arrAndSec', arrAndSec);
        return arrAndSec;
      })
      .then(diapoFondu(arrayImageRecup))
      .catch((err) => console.error(err));
  };

  infoDiaporama();
};

diaporama();


// -----------------------PORTEE GLOBAL---------------------------

function diapoFondu(arrayImageRecup) {
  return (arrAndSec) => {
    let numberOfArray = arrAndSec[0];
    let secondeInterval = arrAndSec[1];
    function displayDiaporama() {
      let theImg = document.querySelector(".box-img");
      let newImg = document.createElement("img");
      // console.log("number Array", arrayImageRecup.length);
      switch (numberOfArray) {
        case 1:
          console.log("un");
          createNewImg().src = arrayImageRecup[0];
          break;
        case 2:
          console.log("deux");
          function interval2() {
            createNewImg().src = arrayImageRecup[0];
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[1];
            }, secondeInterval);
          }
          interval2();
          setInterval(() => {
            removeOldImages();
            interval2();
          }, secondeInterval * 2);
          break;
        case 3:
          console.log("trois");
          function interval3() {
            createNewImg().src = arrayImageRecup[0];
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[1];
            }, secondeInterval);
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[2];
            }, secondeInterval * 2);
          }
          interval3();
          setInterval(() => {
            removeOldImages(theImg);
            interval3();
          }, secondeInterval * 3);
          break;
        case 4:
          console.log("quatre");
          function interval4() {
            createNewImg().src = arrayImageRecup[0];
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[1];
            }, secondeInterval);
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[2];
            }, secondeInterval * 2);
            setTimeout(() => {
              createNewImg().src = arrayImageRecup[3];
            }, secondeInterval * 3);
          }
          interval4();
          setInterval(() => {
            removeOldImages(theImg);
            interval4();
          }, secondeInterval * 4);
          break;
        default:
          createNewImg().src = arrayImageRecup[0];
          break;
      }
    }
    displayDiaporama();
  };
}

function arrayPush(arrayImageRecup, numberOfImage) {
  arrayImageRecup.push(
    `http://localhost:3000/images/imageAffiche${numberOfImage}.jpg`
  );
  return;
}

function createNewImg() {
  let theImg = document.querySelector(".box-img");
  let newImg = document.createElement("img");
  newImg.className = "image-diaporama";
  theImg.appendChild(newImg);
  return newImg;
}

function removeOldImages() {
  let theImg = document.querySelector(".box-img");
  let liste = theImg.childNodes;
  let liste2 = [];
  liste.forEach((element) => {
    liste2.push(element);
  });
  for (let i = 0; i < liste2.length - 1; i++) {
    const element = liste2[i];
    // console.log("for = ", element);
    element.remove();
  }
};