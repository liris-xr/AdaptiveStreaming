# XRMuseum

Ce projet a pour but de réaliser de l'import d'objets 3D (maillages) de manière dynamique et adaptative, un peu de la même façon que Youtube adapte dynamiquement la qualité d'une vidéo. De plus, nous utilisons un indice de qualité visuelle (HDRVDP2) sur les maillages afin d'améliorer la qualité de la décision des objets à importer ainsi qu'une méthode de compression (Google Draco) de maillages afin d'accélérer l'import des objets.

Le principe est le suivant : les objets sont déclinés en différents niveaux de détail qui sont stockés sur un serveur. Du côté du client, un script évalue les différents niveaux de détail en fonction de la position, la rotation et la bande passante de l'utilisateur, et détermine le meilleur niveau de détail, qui sera décompressé et ajouté à la scène.

Il existe différentes stratégies et métriques pour importer les niveaux de détail et nous avons testé ces stratégies et métriques en comparant des vidéos de déplacements dans le musée avec une version *offline*, où tous les objets étaient déjà importés au meilleur niveau de détail. Ces vidéos ont été enregistrées avec OBS puis comparées avec Matlab et analysées avec Python.

Pour chaque partie (Babylon.js / Matlab / Python), se référer aux fichiers *README.md* contenus dans les dossiers correspondants.  
Pour plus de détails, se référer à mon rapport de stage.

## TODOS

Tout n'a pas été réalisé sur le musée et il reste beaucoup d'améliorations et d'experiences possibles.  
Je fais ici une liste non exhaustive de choses qui pourront être réalisées.

 - Experience subjective : voir si les résultats obtenus avec l'expérience objective décrite ci-dessus collent avec des notes données par des humains.
 - Tests en VR : cette application a pour but d'être utilisé en VR, donc on pourrait réaliser des mesures de performance (FPS, temps de chargement, nombre de polygones) avec et sans l'algorithme adaptatif.
 - Enregistrements en VR : pour voir comment l'application rend en VR.
 - Débranchage de la compression : j'ai tenté de faire une version parallelélisée d'import d'objets 3D au format .obj, mais l'import est trop long (plus d'une minute) --> regarder le code du [OBJFileLoader](https://github.com/BabylonJS/Babylon.js/blob/master/loaders/src/OBJ/objFileLoader.ts) de Babylon et adapter en conséquence **animations_objs**
 - En fonction des résultats précédents, trouver une nouvelle stratégie et métrique optimale
 - Créer une métrique prenant en compte la distance avec la fovéa (centre du champ de vision)
 - Utiliser de l'eye-tracking avec
 - Adapter les algorithmes en fonction des capacités materielles et du type de device de l'utilisateur