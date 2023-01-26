/* Web-Based-VR-Tutorial Project Template
 * Author: Evan Suma Rosenberg <suma@umn.edu> and Blair MacIntyre <blair@cc.gatech.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * 
 * Sample adapted from https://playground.babylonjs.com/#TAFSN0#323
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { Space } from "@babylonjs/core";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager"
import { Logger } from "@babylonjs/core/Misc/logger";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllerComponent";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { PBRMaterial } from "@babylonjs/core/Materials/";
import { Mesh } from "@babylonjs/core/Meshes";

import ObjectManager from './object_manager'

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";

// Add this to import the controller models from the online repository
import "@babylonjs/loaders"

// More necessary side effects
import "@babylonjs/inspector";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { PBRSheenConfiguration } from "@babylonjs/core/Materials/PBR/pbrSheenConfiguration";


class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private shadowGenerator: ShadowGenerator | null;

    private camera: UniversalCamera | null;
    private xrCamera: WebXRCamera | null;
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null; 

    private object_manager: ObjectManager | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   
        this.scene.useRightHandedSystem = true;

        // The Shadow Generator
        this.shadowGenerator = null;

        // Initialize XR camera and controller member variables
        this.camera = null;
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        // Testing
        this.object_manager = null;
    }

    start(): void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        this.createCamera();
    
        this.createLightings();

        let xrHelper: WebXRDefaultExperience | null;
        try {
            // Initialize WebXR
            xrHelper = await this.scene.createDefaultXRExperienceAsync({ });
            
            // Disable default teleportation
            xrHelper.teleportation.dispose();
    
            // Assigns the web XR camera to a member variable
            this.xrCamera = xrHelper.baseExperience.camera;

            // Assign the left and right controllers to member variables
            xrHelper.input.onControllerAddedObservable.add((inputSource) => {
                
                if(inputSource.uniqueId.endsWith("left")) {
                    this.leftController = inputSource;
                }
                else {
                    this.rightController = inputSource;
                }  
            });
        }
        catch (e) {
            xrHelper = null;
        }
        
        this.loadInterior();

        
        const objectContainer = new Mesh("OBJECTS", this.scene);
        this.object_manager = new ObjectManager(this.scene, null /*this.shadowGenerator*/, objectContainer);
        await this.object_manager._init_();
    
        // Show the debug scene explorer and object inspector
        this.scene.debugLayer.show(); 
    }

    private createCamera() {
        // This creates and positions a first-person camera (non-mesh)
        this.camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);

        // This sets the camera direction
        this.camera.setTarget(new Vector3(1, 1.6, 1));

        // This attaches the camera to the canvas
        this.camera.attachControl(this.canvas, true);

        this.camera.speed = 1;
    }

    private createLightings() {
        const lightContainer = new Mesh("LIGHTS", this.scene);

        // Add some lights to the scene
        const ambientlight = new HemisphericLight("ambient", new Vector3(0, 1, 0), this.scene);
        ambientlight.parent = lightContainer;
        ambientlight.intensity = 1.5;
        ambientlight.diffuse = new Color3(1, 1, 1);

        const sun = new DirectionalLight("sun", new Vector3(-10, -90, 0), this.scene);
        sun.parent = lightContainer;
        sun.intensity = 800;

        const light1 = new DirectionalLight("light1", new Vector3(132.182, -10.365, 0), this.scene);
        light1.parent = lightContainer;
        light1.intensity = 0.3;

        const light2 = new DirectionalLight("light2", new Vector3(21.727, -102.67, -1.278), this.scene);
        light2.parent = lightContainer;
        light2.intensity = 0.3;

        const light3 = new DirectionalLight("light3", new Vector3(28.288, 31.776, 0), this.scene);
        light3.parent = lightContainer;
        light3.intensity = 0.3;

        const light4 = new DirectionalLight("light4", new Vector3(22.322, -31.127, -8.07), this.scene);
        light4.parent = lightContainer;
        light4.intensity = 0.3;

        const light5 = new DirectionalLight("light5", new Vector3(21.924, -37.127, -29.884), this.scene);
        light5.parent = lightContainer;
        light5.intensity = 0.3;

        this.shadowGenerator = new ShadowGenerator(1024, sun);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.getShadowMap()!.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;
    }

    private loadInterior() {
        // The assets manager can be used to load multiple assets
        const assetsManager = new AssetsManager(this.scene);

        // Load a GLB file of an entire scene exported from Unity
        const worldTask = assetsManager.addMeshTask("world task", "", "assets/museum/", "Museum.gltf");
        worldTask.onSuccess = (): void => {
            worldTask.loadedMeshes[0].name = "MUSEUM";
            worldTask.loadedMeshes[0].position = new Vector3(1, -0.5, 4);

            this.shadowGenerator?.addShadowCaster(worldTask.loadedMeshes[0], true);

            worldTask.loadedMeshes.forEach((msh) => {
                msh.receiveShadows = true;
            });
        };

        // This loads all the assets and displays a loading screen
        assetsManager.load();


        // This will execute when all assets are loaded
        assetsManager.onFinish = (): void => {
            const floor = this.scene.getMeshByName("wall_primitive0");
            const ceiling = this.scene.getMeshByName("wall_primitive1");
            const exterior = this.scene.getMeshByName("shadow");
            if (ceiling) {
            ceiling.receiveShadows = true;
            }
            if (floor) {
                floor.receiveShadows = true;
            }
            if (exterior) {
                exterior.receiveShadows = true;
            }

            let wall_mat = this.scene.getMaterialByName("Cyberpunk_5") as PBRMaterial;
            wall_mat.disableBumpMap = true;
            wall_mat.sheen.isEnabled = true;
        }
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update(): void
    {
        this.onRightTouchpad(this.rightController?.motionController?.getComponent("xr-standard-touchpad"));
    }

    private onRightTouchpad(component?: WebXRControllerComponent): void
    {
        if(component?.changes.axes)
        {
            // If thumbstick crosses the turn threshold to the right
            if(component.changes.axes.current.x > 0.75 && component.changes.axes.previous.x <= 0.75)
            {
                // Snap turn by 22.5 degrees
                const cameraRotation = Quaternion.FromEulerAngles(0, -22.5 * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
                console.log("turn right");
            }

            // If thumbstick crosses the turn threshold to the left
            if(component.changes.axes.current.x < -0.75 && component.changes.axes.previous.x >= -0.75)
            {
                // Snap turn by -22.5 degrees
                const cameraRotation = Quaternion.FromEulerAngles(0, 22.5 * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
                console.log("turn left");
            }

        }

        // Forward locomotion, deadzone of 0.5
        if(component?.axes.y! > 0.5 || component?.axes.y! < -0.5)
        {
            // Get the current camera direction
            const directionVector = this.xrCamera!.getDirection(Axis.Z);
            const newDir = new Vector3(directionVector.z, 0, -directionVector.x);
            
            // Restrict vertical movement
            // directionVector.y = 0;

            // Use delta time to calculate the move distance based on speed of 0.5 m/sec
            const moveDistance = -component!.axes.y * (this.engine.getDeltaTime() / 1000) * 0.5;

            // Translate the camera forward
            this.xrCamera!.position.addInPlace(newDir.scale(moveDistance));
        }
    }
}
/******* End of the Game class ******/   

// start the game
const game = new Game();
game.start();