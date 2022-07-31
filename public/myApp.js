
// POST RELOAD PAGE

let urlReload = 'http://localhost:3000/admin/reload'
let bodyReload = {reload: true};

const reloadPage = async (url, body) => {
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


// GET RELOAD PAGE

let urlGetReload = 'http://localhost:3000/api/zmanim/get-reload';

const arrayReload = [0];

const getReload = async () => {
  let reload = await fetch(urlGetReload)
    .then(res => res.json())
    .then(data => {
      // console.log('data.reload',data.reload);
      // console.log(arrayReload);
      // console.log('array-1', arrayReload[arrayReload.length - 1]);
      if (arrayReload.length <= 1) {
        // console.log('moins que 1');
        arrayReload.push(data.reload);
        return;
      }
      if (arrayReload[arrayReload.length - 1] != data.reload) {
        console.log('pas les meme');
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
  let ZmanTefChol = await fetch("http://localhost:3000/api/zmanim/zman-chol")
    .then((data) => data.json())
    .then((data) => {
      //   console.log(data.shacharitChol);
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
  let ZmanTefChol = await fetch("http://localhost:3000/api/zmanim/zman-shabat")
    .then((data) => data.json())
    .then((data) => {
      //   console.log(data);
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

// Affichage des nom de photos a partir de la db

let imageName1 = document.querySelector(".image-name.one");
let imageName2 = document.querySelector(".image-name.two");
let imageName3 = document.querySelector(".image-name.three");
let imageName4 = document.querySelector(".image-name.four");

const displayNameOfFile = async () => {
  let objectImage = await fetch("http://localhost:3000/db/images-display.txt")
    .then((data) => data.json())
    .then((data) => {
      // console.log(data);
      let imageDisplay = data.imageDisplay;
      // console.log(imageDisplay[0]);
      // console.log(file1);
      imageName1.innerHTML = imageDisplay[0];
      imageName2.innerHTML = imageDisplay[1];
      imageName3.innerHTML = imageDisplay[2];
      imageName4.innerHTML = imageDisplay[3];
    })
    .catch((err) => {
      console.error(err);
      return;
    });
};

displayNameOfFile();

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
      erreur(loaderChol);da
    });
    reloadPage(urlReload, bodyReload)
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
    minchaShbt: minchaShbt.value,
  };
  e.preventDefault();
  loaderFunc(loaderShabat);
  await sendZman(urlShabat, bodyShabat)
    .then(() => validator(loaderShabat))
    .catch((err) => {
      loaderShabat.setAttribute("id", "loader-1");
      erreur(loaderShabat);
    });
    reloadPage(urlReload, bodyReload)
});

// FORMULAIRE ENVOI DES PDF

let label = document.querySelectorAll(".label-image");
// console.log(label);

label.forEach((label) => {
  // console.log(label.parentNode.children);
  label.addEventListener("click", (e) => {
    e.preventDefault();
    label.parentNode.children[2].click();
  });
});

const formPDF1 = document.querySelector(".formPDF.one");
// console.log(formPDF1);

const formPDF2 = document.querySelector(".formPDF.two");
// console.log(formPDF2);

const formPDF3 = document.querySelector(".formPDF.three");
// console.log(formPDF3);

const formPDF4 = document.querySelector(".formPDF.four");
// console.log(formPDF4);

addEvent(formPDF1);
addEvent(formPDF2);
addEvent(formPDF3);
addEvent(formPDF4);

function addEvent(formPDF, loaderPdf, inputFile) {
  loaderPdf = formPDF.children[6];
  inputFile = formPDF.children[2];
  inputFile.addEventListener("change", (e) => {
    e.preventDefault();
    loaderFunc(loaderPdf);
    allPDF(inputFile.id, loaderPdf);
  });
}

function allPDF(files, loaderPdf) {
  let formParent = loaderPdf.parentNode;
  // console.log(formParent);
  files = document.getElementById(files);
  // console.log(files.files[0]);
  const formData = new FormData();
  formData.append("files", files.files[0]);
  formData.append("nameOfFile", files.files[0].name);
  formData.append("numberOfImage", files.id.substr(-1));
  fetch("http://localhost:3000/admin/upload_pdf", {
    method: "POST",
    body: formData,
    headers: {
      //   "Content-Type":'undefined'
    },
  })
    .then((res) => {
      console.log(res);
      if (!res.ok) {
        loaderPdf.setAttribute("id", "loader-1");
        erreur(loaderPdf);
      } else {
        validator(loaderPdf);
        formParent.children[3].innerHTML = files.files[0].name;
      }
      reloadPage(urlReload, bodyReload);
    })
    .catch((err) => {
      loaderPdf.setAttribute("id", "loader-1");
      erreur(loaderPdf);
      return "Error occured", err;
    });
}

// CHECKBOX


let checkbox1 = document.querySelector("#image1");
let checkbox2 = document.querySelector("#image2");
let checkbox3 = document.querySelector("#image3");
let checkbox4 = document.querySelector("#image4");
let secInterval = document.querySelector(".sec-interval.sec");

/* la function affichant les checkbox se trouve dans la fonction diaporama */

let checkboxs = document.querySelectorAll(".checkbox");
// console.log(checkboxs);

checkboxs.forEach((e) => {
  e.addEventListener("change", (e) => {
    e.preventDefault();
    displayFormImg();
    reloadPage(urlReload, bodyReload);    
  });
});

secInterval.addEventListener("blur", (e) => {
  e.preventDefault();
  displayFormImg();
  reloadPage(urlReload, bodyReload);
});

const displayFormImg = async () => {
  // console.log('coucou');
  let formImg = await fetch("http://localhost:3000/admin/checkbox", {
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
      secInterval: secInterval.value,
    }),
  })
    .then((res) => {
      // console.log(res);
      return res.json();
    })
    // .then((res) => console.log(res));
};

// MODAL

const modalContainer = document.querySelector(".modal-container");
const modalTriggers = document.querySelectorAll(".modal-trigger");

modalTriggers.forEach((trigger) =>
  trigger.addEventListener("click", toggleModal)
);

function toggleModal(e) {
  e.preventDefault();
  let modal = modalContainer.children[1];
  console.log(modal.children);
  try {
    // console.log(e.target.parentNode.children);
    // console.log(e.target.parentNode.children[2].id);
    let nameOfImage = e.target.parentNode.children[2].id.substr(-1);
    // console.log("nameOfImage", nameOfImage);
    modal.style.backgroundImage = `url('http://localhost:3000/images/imageAffiche${nameOfImage}.jpg')`;
    modal.children[1].innerHTML = e.target.parentNode.children[3].innerHTML;
  } catch (error) {}
  modalContainer.classList.toggle("active");
}

// DIAPORAMA

const diaporama = async () => {
  let arrayImageRecup = [];
  // let secondeInterval = 3000;

  const infoDiaporama = async () => {
    fetch("http://localhost:3000/api/zmanim/checkbox")
      .then((res) => res.json())
      .then((data) => {

        checkbox1.checked = data.image1;
        checkbox2.checked = data.image2;
        checkbox3.checked = data.image3;
        checkbox4.checked = data.image4;
        secInterval.value = data.secInterval;


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

// function pour le validateur et l'erreur

const loaderFunc = (loader) => {
  console.log(loader);
  loader.style.marginTop = "5px";
  loader.style.display = "block";
  if (loader.children.length >= 4) {
    console.log("coucou");
    loader.removeChild(document.getElementById("imgError"));
  }
  loader.setAttribute("id", "loader-2");
};

const validator = (loader) => {
  console.log(loader.childNodes.length);
  if (loader.childNodes.length >= 9) {
    return;
  }
  loader.setAttribute("id", "loader-1");
  let img = document.createElement("img");
  img.style.marginTop = "5px";
  img.src = "../public/assets/validator.png";
  loader.appendChild(img);
  setTimeout(() => {
    loader.removeChild(img);
    loader.style.display = "none";
    window.location.reload();
  }, 2000);
};

const erreur = (loader) => {
  if (loader.childNodes.length >= 9) {
    return;
  }
  loader.setAttribute("id", "loader-1");
  let img = document.createElement("img");
  img.style.marginTop = "5px";
  img.src = "../public/assets/error.png";
  img.id = "imgError";
  loader.appendChild(img);
  setTimeout(() => {
    loader.removeChild(img);
    loader.style.display = "none";
    window.location.reload();
  }, 4000);
};



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