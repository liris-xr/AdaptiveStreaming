# Adaptive streaming of 3D content for web-based virtual reality

This project is a web framework for dynamic adaptive streaming of 3D graphics, embedded in an online 6 Degrees of Freedom (6DoFs) experience (a virtual museum). It allows to import 3D objects (meshes) in a dynamic and adaptive way, a bit like Youtube dynamically adapts the quality of a video. Our framework integrates several strategies and utility metrics from the state of the art to schedule the streaming of the different objects composing the 3D environment, in order to minimize the latency and to optimize the quality of what is being visualized by the user at each moment. It uses a visual quality index (HDRVDP2) on the meshes in order to improve the decision regarding the level of detail of the objects to be imported. Objects are compressed using Draco to improve loading speed.

The principle is as follows: the objects are broken down into different levels of detail which are stored on a server. On the client side, a script evaluates the different levels of detail depending on the user's position / rotation and available bandwidth, and determines the best level of detail, which will be decompressed and added to the scene.

Our objective is to provide the research community with a common basis for comparing 6DoF streaming strategies and algorithms.

The code uses [Babylon.js](https://www.babylonjs.com) and is in the [folder with the same name](https://github.com/Plateforme-VR-ENISE/AdaptiveStreaming/tree/main/Babylon.js) in this repository. Please refer to the *README.md* files contained in this folder for building and running.

## TODOS

There are still many possible improvements on this framework. Here is a non-exhaustive list of things that can be done:

  - Including a metric taking into account the distance with the fovea (center of the field of vision).
  - Integrating eye-tracking information.
  - Adapting the algorithms according to the device capabilities.
