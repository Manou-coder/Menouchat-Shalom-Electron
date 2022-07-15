const displayZmanModif = async () => {
    let ZmanTefChol = await fetch('http://localhost:3000/api/zmanim/zman-chol');
    ZmanTefChol = await ZmanTefChol.json();
    if (ZmanTefChol.error) {
        console.log('erreur');
        return;
    } else {
    console.log(ZmanTefChol);
    let shacharitChol = document.getElementsByName('shacharitChol')[0];
    shacharitChol.value = ZmanTefChol.shacharitChol;
    let minchaChol = document.getElementsByName('minchaChol')[0];
    minchaChol.value = ZmanTefChol.minchaChol;
    let arvitChol = document.getElementsByName('arvitChol')[0];
    arvitChol.value = ZmanTefChol.arvitChol;
    var img = document.createElement("img");
    img.src = "../public/validator.png";
    var div = document.getElementById("x");
    div.appendChild(img);
    setTimeout(() => {
        img.remove()
    }, 1000);
    }
    let ZmanTefShabat = await fetch('http://localhost:3000/api/zmanim/zman-shabat');
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
    console.log(validShabat);
    validShabat.src = "../public/validator.png";
    }
};

displayZmanModif()

// let checkbox = document.querySelector('#image1');
// console.log(checkbox);

// let form = document.querySelector('#form');
// console.log(form);

let formImg = document.querySelector('#formImg');
console.log(formImg);


const displayFormImg = async () => {
    let formImg = await fetch('http://localhost:3000/admin/displayImg', 
    {method: 'POST',
        headers: {
      'Accept': 'application/json', 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        image1: document.querySelector('#image1').checked,
        image2: document.querySelector('#image2').checked,
        image3: document.querySelector('#image3').checked,
        image4: document.querySelector('#image4').checked,
        secInterval: document.querySelector('#secInterval').value
    })
    })
}


formImg.addEventListener('submit', (e) => {
    e.preventDefault()
    // console.log(e);
    displayFormImg()
})


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