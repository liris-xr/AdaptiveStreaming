/* Babylon Museum
 * Author: Luc Billaud <luc.billaud@insa-lyon.fr>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * 
 * Sample adapted from Evan Suma Rosenberg <suma@umn.edu> and Blair MacIntyre <blair@cc.gatech.edu> 's tutorial at IEEEVR2021
 * Find it on Github: Web-Based-VR-Tutorial Project Template
 */ 

import { Engine, Scene } from "@babylonjs/core";
import { UniversalCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight, DirectionalLight } from "@babylonjs/core/Lights";
import { WebXRControllerComponent, WebXRInputSource, WebXRCamera, WebXRDefaultExperience } from "@babylonjs/core/XR";
import { Vector3, Color3, Axis, Quaternion } from "@babylonjs/core/Maths";
import { StandardMaterial } from "@babylonjs/core/Materials/";
import { MeshBuilder, TransformNode, Mesh } from "@babylonjs/core/Meshes";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui/2D";

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
// Add this to import the controller models from the online repository
import "@babylonjs/loaders"
// More necessary side effects
import "@babylonjs/inspector";

import ObjectManager from './object_manager';
import CameraManager from './camera_manager';
import Metrics from "./metrics";
import Utils from "./game_utils";


/**
 * Main class.
 * Entry point of the game.
 */
class Museum 
{ 
    private canvas: HTMLCanvasElement;                  // The HTML page's canvas where the app is drawn
    private engine: Engine;                             // The game engine
    private scene: Scene;                               // The scene where the elements are placed

    private camera: UniversalCamera | null;             // Desktop-mode camera
    private xrCamera: WebXRCamera | null;               // XR-mode camera
    private leftController: WebXRInputSource | null;    // XR left controller
    private rightController: WebXRInputSource | null;   // XR right controller

    private animationOn: boolean;                       // Flag indicating if we import the LoDs or not
    private object_manager: ObjectManager;              // The game's object manager
    button: Button | undefined;                         // Start button (used for tests)

    /**
     * Creates a Museum instance
     */
    constructor() {
        let utils = Utils.getInstance();
        
        this.canvas = utils.canvas;
        this.engine = utils.engine;
        this.scene = utils.scene;

        this.scene.useRightHandedSystem = true;

        // Initialize XR camera and controller member variables
        this.camera = null;
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        // Initialize the managers 
        this.animationOn = false;
        
        const objectContainer = new TransformNode("OBJECTS", this.scene);
        this.object_manager = new ObjectManager(null, objectContainer);
    }

    /**
     * Create the scene and start the game
     */
    start(): void {
        // Create the scene
        this.initializeScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => {
                // Move and import LoDs
                this.update();

                // Render the scene
                this.scene.render();
            });

            // Catching browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }
    
    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

    /**
     * Create the scene and initialize the project
     */
    private async initializeScene() {
        // Create elements needed for the game 
        this.createCamera();
        await this.createXR();

        // Scene elements
        this.createLightings();
        this.createBoundaries();

        // Initializing the object manager to ba able to import objects
        await this.object_manager._init_();
    
        // Show the debug scene explorer and object inspector
        this.scene.debugLayer.show(); 
    }

    /**
     * Initialize and configure the desktop camera
     */
    private createCamera(): void {
        // This creates and positions a first-person camera (non-mesh)
        this.camera = new UniversalCamera("camera1", new Vector3(0, 1.9, 0), this.scene);

        // This sets the camera direction
        this.camera.setTarget(new Vector3(-1, 1.9, 0));

        // This attaches the camera to the canvas
        this.camera.attachControl(this.canvas, true);

        // Walking speed
        this.camera.speed = 0.15;

        // Set gravity and collisions to walk
        this.scene.gravity = new Vector3(0, -0.05, 0);
        this.scene.collisionsEnabled = true;

        this.camera.applyGravity = true;
        this.camera.checkCollisions = true;

        // Set width and height of our character
        this.camera.ellipsoid = new Vector3(0.5, 1.5, 0.5);
        this.camera.ellipsoidOffset = new Vector3(0, 1, 0); 

        // Setting the distance with the near plane so that we don't see through the walls
        this.camera.minZ = 0.25;
    }

    /**
     * Create Lights in our scene
     */
    private createLightings(): void {
        const lightContainer = new TransformNode("LIGHTS", this.scene);

        // Add an ambient light to the scene
        const ambientlight = new HemisphericLight("ambient", new Vector3(0, 1, 0), this.scene);
        ambientlight.parent = lightContainer;
        ambientlight.intensity = 1.5;
        ambientlight.diffuse = new Color3(1, 1, 1);
    }

    /**
     * Initialize the XR-mode
     */
    private async createXR() {
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
            console.error(e);
        }
    }

    /**
     * Create planes to walk on (+ walls)
     */
    private createBoundaries(): void {
        const container = new TransformNode("BOUNDARIES", this.scene);

        const mat = new StandardMaterial("groundMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.backFaceCulling = false;

        // Ground
        const ground = MeshBuilder.CreateGround("ground", {width: 36, height: 36}, this.scene);
        ground.parent = container;
        ground.position = new Vector3(-10, 0, 0);
        ground.material = mat;
        ground.checkCollisions = true;

        // GUI
        const plane = Mesh.CreatePlane("plane", 2, this.scene);
        plane.position = new Vector3(-2, 1, 0);
        plane.rotation = new Vector3(7 * Math.PI / 4, Math.PI / 2, 0);


        const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);

        // Test button that will start/stop our animation
        const button1 = Button.CreateSimpleButton("but1", "Start");
        button1.width = 1;
        button1.height = 0.4;
        button1.color = "white";
        button1.fontSize = 50;
        button1.background = "green";
        button1.onPointerUpObservable.add(() => {
            this.toggleAnimation();
        });
        advancedTexture.addControl(button1);
        
        this.button = button1;
    }

    /**
     * The main update loop.  
     * Will be executed once per frame before the scene is rendered
     */
    private update(): void {
        // Catch the controllers' inputs (thumbsticks = movement, X & A = toggle import)
        this.onThumbstick(this.leftController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onButton(this.leftController?.motionController?.getComponent("x-button"));

        this.onThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onButton(this.rightController?.motionController?.getComponent("a-button"));
        
        // Requesting the objects' import
        // This is done here so that the timer for the predictor is right
        // The import is not done literally every single frame (cf. ObjectManager.anim_import)
        if (this.animationOn) {
            // this.camera!.rotation.y += 0.0001 * this.scene.deltaTime;
            // this.camera!.rotation.x += 0.0001 * this.scene.deltaTime;

            this.object_manager.anim_import();

            // Tests for XR
            if (this.button) {
                const camera_m = CameraManager.getInstance();
                const cameranow = camera_m.getCamera();
                const cameralater = camera_m.getCameraInTime(1);

                const now = this.object_manager.getVisibleObjects(cameranow);
                const later = this.object_manager.getVisibleObjects(cameralater);

                const bg = ["red", "orange", "yellow", "green", "blue"];
                const fg = ["black", "brown", "purple", "gray", "white"];
                this.button.background = bg[later.length];
                this.button.color = fg[now.length];

                let obj = now[0];

                if (obj) this.button.textBlock!.text = obj.getCurrentMesh().name + " " + Metrics.calcUtility(obj, cameralater).toFixed(3);
                else this.button.textBlock!.text = "No visible obj";

                cameralater.dispose();
            }
        }

        // In order to make predictions, 
        //  we have te save the position and rotation after updating
        CameraManager.saveCameraPosition();
    }

    /**
     * Toggle the animation flag.  
     * If true, we import the objects.
     */
    private async toggleAnimation(): Promise<void> {
        if (!this.animationOn) {
            this.animationOn = true;
        }
        else {
            this.animationOn = false;
        }
    }

    /**
     * On X or A press, toggle the animation
     * @param component The left controller's 'X' button or the right controller's 'A' button
     */
    private onButton(component?: WebXRControllerComponent): void {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                this.toggleAnimation();
            }
        }
    }

    /**
     * When we move the thumbstick, move the camera
     * @param component The left or right controller's thumbstick
     */
    private onThumbstick(component?: WebXRControllerComponent): void {
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
            
            // Restrict vertical movement
            const newDir = new Vector3(directionVector.x, 0, directionVector.z);

            // Use delta time to calculate the move distance based on speed of 3 m/sec
            const moveDistance = -component!.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the camera forward
            this.xrCamera!.position.addInPlace(newDir.scale(moveDistance));
        }
    }
}
/******* End of the Game class ******/   

// start the game
const museum_game = new Museum();
museum_game.start();