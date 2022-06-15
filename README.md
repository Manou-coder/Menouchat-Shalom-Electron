# menouchat-chalom-backend
backend du louach zmanim de menouchat-chalom

* Pour utiliser le mdule "gm", il faut que "graphicsMagick" (version 1.3.35 - les autres ne marchent pas) soit installé sur votre ordinateur.

* Si le module "gm" ne trouve pas de comande sur la console pour "gm" alors changer en "gm.exe"
dans le fichier "node_modules\gm\lib\command.js" à la ligne 208. (------ le node_module/gm dans le projet a été modifié !!!! -------) 

* pour que graphicsMagick fonctionne il faut telecharger "ghostscript" (version 9.50 - les autres ne marchent pas);

* il faut aussi telecharger les fonts de ghostscript et les inserer dans "programfiles/gs/" ainsi que changer le PATH dans variables d'environnement. pour plus d'infos "http://www.graphicsmagick.org/INSTALL-windows.html".
