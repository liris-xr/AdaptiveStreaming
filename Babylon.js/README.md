## BabylonMuseum

This folder contains different versions of the application:
  - **master** is the "normal" museum version.
  - **test_scene** is a simplified version used to perform the tests on the application.
  - **animations** is the version that may be used for recording animation videos.
  - **animations_refs** is the version that may be used to generate the reference frames.
  - **Version_LoadAllDraco** and **Version_LoadOnlyFullDraco** are old versions that may contain interesting routines.

The *old_colde.ts* file also contains old but potentially useful code.

## Requirements

This project uses [babylon.js](https://www.babylonjs.com) v4, and therefore relies on [node.js](https://nodejs.org/en/). The best way of installing and using node.js is probably via [nvm](https://github.com/nvm-sh/nvm). This code has been done with node.js v14, but should be usable with any ulterior version. 
The different packages required for running different projects are listed in *package.json* files. To install these packages, go to the folder of the project to launch and run  ```npm install```.

For **animations**, **animations_obj** and **animations_refs** projects, OBS is required. It should be correctly configured and launched in order to record automatically.

Install [OBS Studio](https://obsproject.com/fr/welcome) and [OBS WebSocket](https://github.com/Palakis/obs-websocket/blob/4.x-current/README.md) .

In OBS, configure the scene to only record your browser:
  - Choose source **Window Capture**.
  - In the popup, choose, from the list of open applications, the browser where the application is launched.
  - Check the box in order not to register the mouse.
  - Once the source is configured, go to Filters.
  - Adjust the edges in order to save only the application and not the list of tabs for example.

Finally, in OBS, configure the Websocket:
  - The port the socket is listening on must be 4444.
  - Password must be *alpha-beta*.

## Launching the application

Two methods are available to launch your application : you may launch it in development mode or in production mode / deploy it. In development mode, if the code is modified, the application will restart automatically in order to update itself. In production mode, the application is compiled and packaged. It is then ready to be deployed on a server.

* To launch the application in development mode, use ```npm run start```. A new tab will automatically open in your browser with the correct URL.
* To build the application in production mode, use ```npm run build```. This command will compile your code and the resulting package will be in the ```/dist``` folder. It must then be deployed : 
    - To do this locally, create a blank folder, then add the ```/dist``` folder files and the ```/assets``` folder (the folder, not just its contents) in it. Now launch an http server from the folder (via, for example, the command ```python -m http.server``` for local tests) and issue a request to this server (ex: ```https:/ /localhost:8000``` with Python).
* Depending on your *node.js* version, it may be necessary to add the ```-openssl-legacy-provider``` option to these command lines.

## Usage
Once the application is launched, you will be able to move freely (except in the **animations** projects, in which the camera is scripted). In *desktop* mode, use the arrow keys to move around and the mouse to look around. In VR mode, movements are done in *roomscale* mode, that is to say that you move in a room by walking and you go from one room to another by teleporting. The objects in their most simplified version are already present in the scene. A button allows you to launch the import of the following levels. When importing, you will still be able to move freely.

In the **master** project, 2 buttons are used to select the strategy and the metric to use during the import, isocahedrons allow you to teleport from one scene to another and the majority of walls and floors were added to restrict space in *desktop* mode. These restrictions have not been added in VR mode. Please note that objects do not have *colliders* and you can not interact with them. For **animations** projects, an additional button lets you choose the animation to launch.
