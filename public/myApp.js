// declaration des zmanim dans le DOM

let shacharitChol = document.querySelector("#shacharitChol");
let minchaChol = document.querySelector("#minchaChol");
let arvitChol = document.querySelector("#arvitChol");

let shirAshirim = document.querySelector("#shirAshirim");
let minchaErevShbt = document.querySelector("#minchaErevShbt");
let shaharitShbt = document.querySelector("#shaharitShbt");
let minchaShbt = document.querySelector("#minchaShbt");

// Affichage des zmanim a partir de la DB

const displayZmanChol = async () => {
  let ZmanTefChol = await fetch("http://localhost:3000/horaires/zmanChol.txt")
    .then((data) => data.json())
    .then((data) => {
      console.log(data.shacharitChol);
      shacharitChol.value = data.shacharitChol;
      minchaChol.value = data.minchaChol;
      arvitChol.value = data.arvitChol;
    })
    .catch((err) => {
      console.error(err);
      return;
    });
};

displayZmanChol();

const displayZmanShabat = async () => {
  let ZmanTefChol = await fetch("http://localhost:3000/horaires/zmanShbt.txt")
    .then((data) => data.json())
    .then((data) => {
      console.log(data);
      shirAshirim.value = data.shirAshirim;
      minchaErevShbt.value = data.minchaErevShbt;
      shaharitShbt.value = data.shaharitShbt;
      minchaShbt.value = data.minchaShbt;
    })
    .catch((err) => {
      console.error(err);
      return;
    });
};

displayZmanShabat();

// function commune pour enregistrer les zmanim dans la DB

const sendZman = async (url, body) => {
  let zman = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/JSON",
      "Content-Type": "application/JSON",
    },
    body: JSON.stringify(body),
  })
    .then((data) => data.json())
    .then((data) => console.log(data));
};

const loaderFunc = (loader) => {
  loader.setAttribute("id", "loader-2");
};

const validator = (loader) => {
  if (loader.childNodes.length >= 8) {
    return;
  }
  loader.setAttribute("id", "loader-1");
  let img = document.createElement("img");
  img.style.marginTop = "5px";
  img.src = "../public/validator.png";
  loader.appendChild(img);
  setTimeout(() => {
    loader.removeChild(img);
  }, 2000);
};

const erreur = (loader) => {
  if (loader.childNodes.length >= 8) {
    return;
  }
  loader.setAttribute("id", "loader-1");
  let img = document.createElement("img");
  img.style.marginTop = "5px";
  img.src = "../public/error.png";
  loader.appendChild(img);
};

// ZMANEI CHOL (parametrage de l'envoi des zmanim de chol)

let formChol = document.querySelector("#formChol");

let urlChol = "http://localhost:3000/admin/zman-chol";

let loaderChol = document.querySelector(".loader.chol");

formChol.addEventListener("submit", async (e) => {
  let bodyChol = {
    shacharitChol: shacharitChol.value,
    minchaChol: minchaChol.value,
    arvitChol: arvitChol.value,
  };
  e.preventDefault();
  loaderFunc(loaderChol);
  await sendZman(urlChol, bodyChol)
    .then(() => validator(loaderChol))
    .catch((err) => {
      loaderChol.setAttribute("id", "loader-1");
      erreur(loaderChol);
    });
});

// ZMANEI SHABAT (parametrage de l'envoi des zmanim de shabat)

let formShabat = document.querySelector("#formShabat");

let urlShabat = "http://localhost:3000/admin/zman-shabat";

let loaderShabat = document.querySelector(".loader.shabat");

formShabat.addEventListener("submit", async (e) => {
  let bodyShabat = {
    shirAshirim: shirAshirim.value,
    minchaErevShbt: minchaErevShbt.value,
    shaharitShbt: shaharitShbt.value,
    minchaShbt: minchaErevShbt.value,
  };
  e.preventDefault();
  loaderFunc(loaderShabat);
  await sendZman(urlShabat, bodyShabat)
    .then(() => validator(loaderShabat))
    .catch((err) => {
      loaderShabat.setAttribute("id", "loader-1");
      erreur(loaderShabat);
    });
});

// let checkbox = document.querySelector('#image1');
// console.log(checkbox);

// let form = document.querySelector('#form');
// console.log(form);

let formImg = document.querySelector("#formImg");
// console.log(formImg);

const displayFormImg = async () => {
  let formImg = await fetch("http://localhost:3000/admin/displayImg", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image1: document.querySelector("#image1").checked,
      image2: document.querySelector("#image2").checked,
      image3: document.querySelector("#image3").checked,
      image4: document.querySelector("#image4").checked,
      secInterval: document.querySelector("#secInterval").value,
    }),
  });
};

formImg.addEventListener("submit", (e) => {
  e.preventDefault();
  // console.log(e);
  displayFormImg();
});

// addEventListener('submit', (e) => {
//     e.preventDefault()
//     sendPdf()
// })

// const sendPdf = async () => {
//     let urlPdf = await fetch('http://localhost:3000/admin/pdf1',
//     {method: 'POST',
//         headers: {
//       'Accept': 'application/JSON',
//       'Content-Type': 'application/JSON'
//     },
//     body: JSON.stringify({body: checkbox.value})
//     })
//     .then(data => data.json())
//     .then(data => data.zmanChol)
//     .then(data => console.log(data))
// }

// let submitChol = document.querySelector('#submitChol');
// console.log(submitChol);

// submitChol.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     displayZmanChol()
//     console.log('bravo');
// })

// AFFICHAGE SANS CHANGER DE PAGE

// let submitChol = document.querySelector('#submitChol');
// console.log(submitChol);

// submitChol.addEventListener('click', (e) => {
//     e.preventDefault();
//     e.stopPropagation()
// })

/*

// console.log('coucou');

// http://localhost:3000/api/zmanim/zman-chol

const displayZmanChol = async () => {
    let ZmanTefChol = await fetch('http://localhost:3000/admin/zman-chol', 
    {method: 'POST',
        headers: {
      'Accept': 'application/json', 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({body: 'body'})
    })
    .then(data => data.json())
    .then(data => data.zmanChol)
    .then(data => console.log(data))

    // ZmanTefChol = await ZmanTefChol.json();
    // if (ZmanTefChol.error) {
    //     console.log('erreur');
    //     return;
    // } else {
    // console.log(ZmanTefChol);
    // let shacharitChol = document.getElementsByName('shacharitChol')[0];
    // shacharitChol.value = ZmanTefChol.shacharitChol;
    // let minchaChol = document.getElementsByName('minchaChol')[0];
    // minchaChol.value = ZmanTefChol.minchaChol;
    // let arvitChol = document.getElementsByName('arvitChol')[0];
    // arvitChol.value = ZmanTefChol.arvitChol;
    // }
}

let submitChol = document.querySelector('#submitChol');
console.log(submitChol);

submitChol.addEventListener('submit', async (e) => {
    e.preventDefault();
    displayZmanChol()
    console.log('bravo');
})


const displayZmanShabat = async () => {
    let ZmanTefShabat = await fetch('http://localhost:3000/admin/zman-shabat', {method: 'POST'});
    ZmanTefShabat = await ZmanTefShabat.json();
    console.log(ZmanTefShabat);
    if (ZmanTefShabat.error) {
        console.log('erreur');
        return;
    } else {
    let shirAshirim = document.getElementsByName('shirAshirim')[0];
    shirAshirim.value = ZmanTefShabat.shirAshirim;
    let minchaErevShbt = document.getElementsByName('minchaErevShbt')[0];
    minchaErevShbt.value = ZmanTefShabat.minchaErevShbt;
    let shaharitShbt = document.getElementsByName('shaharitShbt')[0];
    shaharitShbt.value = ZmanTefShabat.shaharitShbt;
    let minchaShbt = document.getElementsByName('minchaShbt')[0];
    minchaShbt.value = ZmanTefShabat.minchaShbt;
    let validShabat = document.getElementById('valid');
}
};


let submitShabat = document.querySelector('#submitShabat');
console.log(submitShabat);

submitShabat.addEventListener('click', async (e) => {
    e.preventDefault();
    displayZmanShabat()
    console.log('bravo2');
})

*/
