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


displayZmanModif();

console.log('coucou');