# XRMuseum

This project aims to import 3D objects (meshes) in a dynamic and adaptive way, a bit like Youtube dynamically adapts the quality of a video. We use a visual quality index (HDRVDP2) on the meshes in order to improve the decision regarding the level of detail of the objects to be imported. Objects are compressed using Draco to improve loading speed.

The principle is as follows: the objects are broken down into different levels of detail which are stored on a server. On the client side, a script evaluates the different levels of detail depending on the user's position / rotation and available bandwidth, and determines the best level of detail, which will be decompressed and added to the scene.

The code uses [Babylon.js](https://www.babylonjs.com) and is in the [folder with the same name](https://github.com/Plateforme-VR-ENISE/AdaptiveStreaming/tree/main/Babylon.js) in this repository. Please refer to the *README.md* files contained in this folder for building and running.

## TODOS

There are still many possible improvements on this framework. Here is a non-exhaustive list of things that can be done:

  - VR tests: this application is intended to be used in VR, so we could perform performance measurements (FPS, loading time, number of polygons) with and without the adaptive algorithm.
  - Recordings in VR: to see how the application renders in VR.
  - Create a metric taking into account the distance with the fovea (center of the field of vision).
  - Using eye-tracking.
  - Adapt the algorithms according to the material capacities and the type of device of the user
