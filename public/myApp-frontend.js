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

setInterval(() => {
  displayTefChol();
}, 1000);

// ZMANEI AYOM

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

setInterval(() => {
  displayZmaneiShabat();
}, 1000);

// INFO DAF PARASHA ET AUTRES

const displayInfo = async () => {
  let info = await fetch("http://localhost:3000/api/zmanim/info");
  info = await info.json();
  // console.log(info);
  // console.log(info.eventsByDate.ParashatAshavua);
  let ParashatAshavua = document.querySelector("#ParashatAshavua");
  ParashatAshavua.innerHTML = `פרשת ${info.ParashatAshavua}`;
  let daf = document.querySelector("#daf");
  daf.innerHTML = info.DafYomiEvent.render;
  let dateH = document.querySelector("#dateH");
  dateH.innerHTML = info.HebrewDateEvent.render2;
};

setInterval(() => {
  displayInfo();
}, 1000);

// AFFICHAGE IMAGE

// const retournImage = async () => {
//   fetch("http://localhost:3000/api/zmanim/pdf1")
//     .then((res) => res.json())
//     .then((data) => {
//       // console.log(data)
//       // console.log("coucou");
//       document.querySelector(
//         ".myImg"
//       ).src = `http://localhost:3000/${data.urlImage}`;
//     });
// };

// setInterval(() => {
//   retournImage()
// }, 1000);

const fondu = () => {
  document.querySelector(".myImg").style.animationName = 'fondu';
  document.querySelector(".myImg").style.animationDuration = '3s';
}


const coucou = async () => {
  let arrayImageRecup = [];
  let secondeInterval = 2000;

  const enregistreImage = async () => {
    fetch("http://localhost:3000/admin/getdisplayImg")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        if (
          data.image1 === false &&
          data.image2 == false &&
          data.image3 == false &&
          data.image4 == false
        ) {
          console.log("il ya aucune image de valClassNameer");
          return;
        }
        if (data.secInterval == "") {
          console.log(
            "ya pas de seconde d'interval personnalisé - seconde interval par default 2000"
          );
        }
        if (data.secInterval != "") {
          secondeInterval = data.secInterval + "000";
          console.log("seconde interval ==" + secondeInterval);
        }
        if (data.image1 === true) {
          console.log("true1");
          arrayImageRecup.push(
            "http://localhost:3000/images/imageAffiche1.jpg"
          );
        }
        if (data.image2 === true) {
          console.log("true2");
          arrayImageRecup.push(
            "http://localhost:3000/images/imageAffiche2.jpg"
          );
        }
        if (data.image3 === true) {
          console.log("true3");
          arrayImageRecup.push(
            "http://localhost:3000/images/imageAffiche3.jpg"
          );
        }
        if (data.image4 === true) {
          console.log("true4");
          arrayImageRecup.push(
            "http://localhost:3000/images/imageAffiche4.jpg"
          );
        }
      })
      .catch((err) => console.error(err));
  };

  enregistreImage()
  setInterval(() => {
    enregistreImage();
  }, 2000);

  const affich1 = () => {
    let image = document.querySelector(".myImg");
    let theImg = document.querySelector('.theImg');
    let newImg = document.createElement('img');
    setTimeout(() => {
      if (
        arrayImageRecup[0] &&
        arrayImageRecup[1] &&
        arrayImageRecup[2] &&
        arrayImageRecup[3]
      ) {
        const interval4 = () => {
          image.remove()
          let newImg = document.createElement('img');
          newImg.className = 'myImg';
          theImg.appendChild(newImg)
          newImg.src = arrayImageRecup[0];
          console.log("pdf1");
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[1];
            console.log("pdf2");
          }, secondeInterval);
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[2];
            console.log("pdf3");
          }, secondeInterval * 2);
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[3];
            console.log("pdf4");
          }, secondeInterval * 3);
        };
        interval4();
        setInterval(() => {
          interval4();
        }, secondeInterval * 4);
      } else if (arrayImageRecup[0] && arrayImageRecup[1] && arrayImageRecup[2]) {
        const interval3 = () => {
          image.remove()
          let newImg = document.createElement('img');
          newImg.className = 'myImg';
          theImg.appendChild(newImg)
          newImg.src = arrayImageRecup[0];
          console.log("pdf1");
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[1];
            console.log("pdf2");
          }, secondeInterval);
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[2];
            console.log("pdf3");
          }, secondeInterval * 2);
        };
        interval3();
        setInterval(() => {
          interval3();
        }, secondeInterval * 3);
      } else if (arrayImageRecup[0] && arrayImageRecup[1]) {
        console.log('coucou c moi');
        const interval2 = () => {
          image.remove()
          let newImg = document.createElement('img');
          newImg.className = 'myImg';
          theImg.appendChild(newImg)
          newImg.src = arrayImageRecup[0];
          console.log("pdf1");
          setTimeout(() => {
            image.remove()
            let newImg = document.createElement('img');
            newImg.className = 'myImg';
            theImg.appendChild(newImg)
            newImg.src = arrayImageRecup[1];
            console.log("pdf2");
          }, secondeInterval);
        };
        interval2();
        setInterval(() => {
          interval2();
        }, secondeInterval * 2);
      } else if (arrayImageRecup[0]) {
        document.querySelector(".myImg").src = arrayImageRecup[0];
        console.log("pdf1");
      } else {
        console.log("erreur affichage image dans le setInterval");
      }
    }, 1000);
  }
  affich1()
  // setInterval(() => {
  //   affich1()
  // }, 2000);
};

coucou();

// setTimeout(() => {
// location.reload()
// }, 2000);

// document.querySelector(".myImg").src = 'http://localhost:3000/images/imageAffiche4.jpg';

// DATE en francais

let date = new Date().toLocaleDateString();
date = date.split("/");
let date2 = date[2].split("").slice(-2).join("");
date[2] = date2;
date = date.join("/");
console.log(date);
let afficheDate = document.querySelector("#dateFr");
afficheDate.innerHTML = date;
