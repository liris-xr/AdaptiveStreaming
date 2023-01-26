# BabylonMuseum

Dans ce dossier se trouvent différentes versions de l'application : 
 - **master** est la version "normale" du musée
 - **test_scene** est une version simplifiée utilisée pour réaliser les tests sur l'application
 - **animations** est la version permettant d'enregistrer les vidéos des animations
 - **animations_refs** est la version qui a permis d'enregistrer les références
 - **animation_objs** est une version qui était censée permettre d'enregistrer les animations avec LoDs mais sans compression
 - **Version_LoadAllDraco**, **Version_LoadOBJ**, **Version_LoadOBJ100%** et **Version_LoadOnlyFullDraco** sont d'anciennes versions.

Il y a aussi le fichier *old_colde.ts* qui contient du code réalisé précédemment et qui pourrait être utile par le futur.

## Requirements

Les différents packages requis pour l'exécution des différents projets sont listés dans les fichiers *package.json*. Pour installer ces packages, allez dans le dossier du projet à lancer et exécutez la commande ```npm install```.

Pour les projets **animations**, **animations_obj** et **animations_refs**, OBS a aussi besoin d'être installé lancé et configuré correctement, afin d'enregistrer automatiquement les runs.  

Installez [OBS Studio](https://obsproject.com/fr/welcome) et [OBS WebSocket](https://github.com/Palakis/obs-websocket/blob/4.x-current/README.md).

Dans OBS, configurez la scène, pour n'enregistrer que votre navigateur :
 - Choisissez la source **Window Capture**
 - Dans la popup, choisissez, parmi la liste des applications ouvertes, le navigateur où est lancé l'application
 - Cochez la case afin de ne pas enregistrer la souris
 - Une fois la source configurée, allez dans les Filtres
 - Ici, ajustez les bords afin de n'enregistrer que l'application et pas la liste des onglets par exemple

Enfin, dans OBS, configurez le Websocket : 
 - Le port sur lequel le socket écoute doit être 4444
 - Le mot de passe doit être *alpha-beta*

## Lancement de l'application

Ici, vous avez 2 choix pour lancer votre application. Vous pouvez la lancer en mode développement ou en mode production / la déployer. 

En mode développement, si vous modifiez votre code, l'application redémarrera automatiquement afin de se mettre à jour. En mode production, vous compilez et empaquetez votre application et elle est prête à être déployée sur un serveur.

Pour lancer l'application en mode développement, lancez la commande ```npm run start```. Un nouvel onglet s'ouvrira automatiquement dans votre navigateur avec la bonne URL. Vous pouvez utiliser l'application !

Pour utiliser l'application en mode production, lancez la commande ```npm run build```. Cette commande va compiler votre code et le code résultant se trouvera dans le dossier ```/dist```. Pour faire fonctionner l'application, il faut la déployer. Pour le faire en local, vous pouvez créer un dossier vierge. Ajoutez-y les fichiers du dossier ```/dist```. Ajoutez le dossier ```/assets``` (le dossier, pas uniquement son contenu). Lancez maintenant un serveur http depuis le dossier (via, par exemple, la commande ```python -m http.server``` pour des tests en local) et lancez une requête vers ce serveur (ex: ```https://localhost:8000``` avec Python).

Une fois l'application lancée, vous pourrez vous déplacer librement (sauf si vous avez les animations lancées). En mode *desktop*, utilisez les flèches directionnelles pour vous déplacer et la souris pour regarder autour de vous. En mode VR, les déplacements se font en mode *roomscale*, c'est-à-dire que vous vous déplacez dans une pièce en marchant et vous passez d'une pièce à l'autre en vous téléportant. Les objets dans leur version la plus simplifiée sont déjà présents dans la scène. Un bouton vous permet de lancer l'import des niveaux suivants. Lors de l'import, vous pourrez toujours vous déplacer librement.

Dans le projet **master**, 2 boutons vous permettent de sélectionner la stratégie et la métrique à employer lors de l'import, des isocaèdres vous permettent de vous téléporter d'une scène à l'autre et la majorité des murs et sols ont été ajoutés pour restreindre l'espace en mode *desktop*. Ces restrictions n'ont pas été ajoutées en mode VR. Aussi, les objets n'ont pas de *colliders* et on ne peut pas interagir avec. Pour les projets d'**animations**, un bouton supplémentaire permet de choisir l'animation à lancer.

## Description du code (fichiers les plus importants)

Le code s'organise de la même façon dans tous les projets (sauf peut-être dans les versions plus anciennes). Ici, je donne une description brève de l'utilité de certains fichiers. Pour plus d'informations sur les méthodes ou les autres fichiers, vous pouvez vous référer à la doc présentes dans chacun des fichiers.

### Le fichier principal : index.ts

Ce fichier est le point d’entrée dans le programme. Dans ce fichier, la classe Museum se charge tout d’abord d’initialiser les variables et fonctions permettant de lancer le projet. Pour cela elle crée un objet qui fera l’interface avec WebGL et une scène, puis un environnement XR (mixed reality = réalité virtuelle et/ou augmentée) et enfin définit une boucle qui gère les entrées des contrôleurs, l’affichage de la scène et l’import des objets. La classe Museum est aussi celle qui remplit initialement la scène. Elle crée les lumières, les isocaèdres pour la téléportation entre les salles et importe la structure du musée à partir du
fichier *.gltf*.

### Les MuseumObjects : museum_object.ts

Un MuseumObject représente un objet dans le musée. Il contient toutes les métadonnées de l’objet ainsi que les différents niveaux de détail importés. Les fichiers *metadata.json* contiennent, pour chaque objet, son nom, sa surface et, pour tous les niveaux de détail et la texture, sa localisation, sa taille et son indice de qualité visuelle. Le MuseumObject possède aussi une référence vers un objet DracoCompression. Cet objet décompresse les fichiers .drc de manière asynchrone en utilisant des WebWorkers.

### L’ObjectManager : object_manager.ts

L’ObjectManager est en quelque sorte l’orchestrateur dans le code. Il initialise les MuseumObjects et lance l’exécution des stratégies. Il est aussi chargé de récupérer des informations sur les objets (position, rotation, localisation et mise à l’échelle) du fichier *positions.json*.

### Le SpeedManager : speed_manager.ts
La classe SpeedManager calcule la bande passante et la vitesse de décompression en réalisant une moyenne des données obtenues lors des derniers imports. Toutes ses méthodes sont statiques et sont donc accessibles sans avoir à créer d’instance.

### L’objet Strategies : strategies.ts
C’est dans l’objet Strategies que sont implémentées nos stratégies. Dans ce fichier, on retrouve aussi l’énumération ChooseStrategy qui liste les différents types de stratégie. Toutes les méthodes sont statiques pour éviter de devoir instancier la classe. Cette classe offre notamment la méthode executeStrategy qui appelle la méthode privée correspondant à la stratégie qui a été choisie.

### L’objet Metrics : metrics.ts
C’est dans l’objet Metrics que sont implémentées nos métriques. Dans ce fichier, on retrouve aussi l’énumération ChooseMetric qui liste les différents types de métrique. Toutes les méthodes sont statiques pour éviter de devoir instancier la classe. Cette classe offre notamment la méthode calcUtility qui calcule l’utilité d’un objet pour un point de vue avec la métrique choisie en appelant la bonne méthode. L’utilité est la valeur renvoyée par une métrique, par exemple la distance entre l’objet et la caméra ou la surface visible à l’écran de l’objet.