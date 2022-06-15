import {default as pdfConverter} from 'pdf-poppler'
import path from 'path'


function convertImage(pdfPath) {

    let option = {
        format : 'jpeg',
        out_dir : '/images',
        out_prefix : path.basename(pdfPath, path.extname(pdfPath)),
        page : 1
    }
// option.out_dir value is the path where the image will be saved

    pdfConverter.convert(pdfPath, option)
    .then(() => {
        console.log('file converted')
    })
    .catch(err => {
        console.log('an error has occurred in the pdf converter ' + err)
    })

}

console.log("couocu")


convertImage('files/montre.pdf');

export default convertImage
