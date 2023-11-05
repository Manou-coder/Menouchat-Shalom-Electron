const fs = require('fs')
const path = require('path')

const sourceDir = path.join(
  'out',
  'menouchat-chalom-win32-x64',
  'resources',
  'app'
)
const destinationDir = path.join('out', 'menouchat-chalom-win32-x64')

function copyFiles(source, destination) {
  try {
    const files = fs.readdirSync(source)

    files.forEach((file) => {
      const sourcePath = path.join(source, file)
      const destinationPath = path.join(destination, file)

      if (fs.statSync(sourcePath).isDirectory()) {
        fs.mkdirSync(destinationPath, { recursive: true })
        copyFiles(sourcePath, destinationPath)
      } else {
        fs.copyFileSync(sourcePath, destinationPath)
      }
    })

    console.log('Les fichiers ont été copiés avec succès.')
  } catch (error) {
    console.error('Erreur lors de la copie des fichiers :', error.message)
  }
}

copyFiles(sourceDir, destinationDir)
