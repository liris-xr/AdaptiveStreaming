/* Babylon Museum
 * Author: Luc Billaud <luc.billaud@insa-lyon.fr>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * 
 * Sample adapted from Evan Suma Rosenberg <suma@umn.edu> and Blair MacIntyre <blair@cc.gatech.edu> 's tutorial at IEEEVR2021
 * Find it on Github: Web-Based-VR-Tutorial Project Template
 */

import { AssetsManager, Engine, Scene } from "@babylonjs/core";
import { UniversalCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight, DirectionalLight, ShadowGenerator } from "@babylonjs/core/Lights";
import { WebXRControllerComponent, WebXRInputSource, WebXRCamera, WebXRDefaultExperience } from "@babylonjs/core/XR";
import { Vector3, Color3, Axis, Quaternion } from "@babylonjs/core/Maths";
import { PBRMaterial, RenderTargetTexture, StandardMaterial } from "@babylonjs/core/Materials/";
import { Mesh, MeshBuilder, TransformNode, VertexBuffer } from "@babylonjs/core/Meshes";
import { GUI3DManager, MeshButton3D, Button3D, TextBlock, StackPanel3D } from "@babylonjs/gui/";

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
// Add this to import the controller models from the online repository
import "@babylonjs/loaders"
// More necessary side effects
import "@babylonjs/inspector";

import ObjectManager from './object_manager';
import CameraManager from './camera_manager';
import Strategies, { ChooseStrategy } from "./strategies";
import Metrics, { ChooseMetric } from "./metrics";
import Utils from "./game_utils";

/**
 * Defines a teleportation point
 */
interface TPPoint {
    id: string,
    name: string,
    x: number,
    y: number,
    z: number
}

/**
 * Main class.
 * Entry point of the game.
 */
class Museum 
{ 
    private canvas: HTMLCanvasElement;                  // The HTML page's canvas where the app is drawn
    private engine: Engine;                             // The game engine
    private scene: Scene;                               // The scene where the elements are placed

    private shadowGenerator: ShadowGenerator | null;
    
    private camera: UniversalCamera | null;             // Desktop-mode camera
    private xrCamera: WebXRCamera | null;               // XR-mode camera
    private leftController: WebXRInputSource | null;    // XR left controller
    private rightController: WebXRInputSource | null;   // XR right controller

    private importOn: boolean;                          // Flag indicating if we import the LoDs or not
    private object_manager: ObjectManager;              // The game's object manager
    private tp_points: Array<TPPoint>;                  // The array of the teleportation points
    private importButton: Button3D | undefined;
    private stratButton: Button3D | undefined;
    private metricsButton: Button3D | undefined;

    /**
     * Creates a Museum instance
     */
    constructor() {
        let utils = Utils.getInstance();

        this.canvas = utils.canvas;
        this.engine = utils.engine;
        this.scene = utils.scene;   

        this.scene.useRightHandedSystem = true;

        // The Shadow Generator
        this.shadowGenerator = null;

        // Initialize XR camera and controller member variables
        this.camera = null;
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        // Initialize the managers 
        this.importOn = false;
        
        const objectContainer = new TransformNode("OBJECTS", this.scene);
        this.object_manager = new ObjectManager(this.shadowGenerator, objectContainer);
    
        this.tp_points = [
            {
                id: "main_room",
                name: "Main Room",
                x: 0,
                y: 1.9,
                z: 0
            },
            {
                id: "american_history_room",
                name: "American History Room",
                x: 9,
                y: 1.9,
                z: 7
            },
            {
                id: "statue_room",
                name: "Statue Room",
                x: 9,
                y: 1.9,
                z: -7
            },
            {
                id: "fossils_room",
                name: "Fossils Room",
                x: -12,
                y: 6.9,
                z: 10
            },
            {
                id: "animals_room",
                name: "Animals Room",
                x: -12,
                y: 6.9,
                z: -10
            }
        ];
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
        this.createButtons();

        // Initializing the object manager to ba able to import objects
        await this.object_manager._init_();
        await this.loadInterior();
    
        // Show the debug scene explorer and object inspector
        this.scene.debugLayer.show(); 
    }

    /**
     * Initialize and configure the desktop camera
     */
    private createCamera(): void {
        // This creates and positions a first-person camera (non-mesh)
        this.camera = new UniversalCamera("DesktopCamera", new Vector3(0, 1.9, 0), this.scene);

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
        /*
        I create grounds and boxes here to handle collisions in desktop mode.
        The meshes from the gltf (the museum) are either too complex (too many faces)
        or oriented in the wrong direction (normals pointing outside). Hence, the collisions
        are not what I expected (e.g.: going through the floor)
        */
        const container = new TransformNode("BOUNDARIES", this.scene);

        const mat = new StandardMaterial("groundMat", this.scene);
        mat.diffuseColor = new Color3(0.8, 0.8, 0.8);
        mat.backFaceCulling = false;

        const ToRad = Math.PI / 180;

        // Ground
        let ground = MeshBuilder.CreateGround("ground", {width: 36, height: 34}, this.scene);
        ground.parent = container;
        ground.position = new Vector3(-1, -0.101, 5);
        ground.material = mat;
        ground.checkCollisions = true;

        // STAIRS

        const stairs = new TransformNode("STAIRS", this.scene);
        stairs.parent = container;

        // Left Stair
        let leftStair1 = MeshBuilder.CreateGround("leftStair1", {width: 2, height: 6.4}, this.scene);
        leftStair1.parent = stairs;
        leftStair1.rotation = new Vector3(333 * ToRad, 0, 0);
        leftStair1.position = new Vector3(0, 1.4, 6.75);
        leftStair1.material = mat;
        leftStair1.checkCollisions = true;
        leftStair1.visibility = 0;

        let leftStairPlateform = MeshBuilder.CreateGround("leftStairP", {width: 2, height: 2.3}, this.scene);
        leftStairPlateform.parent = stairs;
        leftStairPlateform.position = new Vector3(0, 2.89, 10.8);
        leftStairPlateform.material = mat;
        leftStairPlateform.checkCollisions = true;
        leftStairPlateform.visibility = 0;

        let leftStair2 = MeshBuilder.CreateGround("leftStair2", {width: 4.5, height: 2}, this.scene);
        leftStair2.parent = stairs;
        leftStair2.rotation = new Vector3(0, 0, 333 * ToRad);
        leftStair2.position = new Vector3(-3, 3.9, 11);
        leftStair2.material = mat;
        leftStair2.checkCollisions = true;
        leftStair2.visibility = 0;

        // Right Stair
        let rightStair1 = MeshBuilder.CreateGround("rightStair1", {width: 2, height: 6.4}, this.scene);
        rightStair1.parent = stairs;
        rightStair1.rotation = new Vector3(27 * ToRad, 0, 0);
        rightStair1.position = new Vector3(0, 1.4, -6.75);
        rightStair1.material = mat;
        rightStair1.checkCollisions = true;
        rightStair1.visibility = 0;

        let rightStairPlateform = MeshBuilder.CreateGround("rightStairP", {width: 2, height: 2.3}, this.scene);
        rightStairPlateform.parent = stairs;
        rightStairPlateform.position = new Vector3(0, 2.89, -10.8);
        rightStairPlateform.material = mat;
        rightStairPlateform.checkCollisions = true;
        rightStairPlateform.visibility = 0;

        let rightStair2 = MeshBuilder.CreateGround("rightStair2", {width: 4.5, height: 2}, this.scene);
        rightStair2.parent = stairs;
        rightStair2.rotation = new Vector3(0, 0, 333 * ToRad);
        rightStair2.position = new Vector3(-3, 3.9, -11);
        rightStair2.material = mat;
        rightStair2.checkCollisions = true;
        rightStair2.visibility = 0;

        // UPPER ROOM

        const upper_room = new TransformNode("UPPER_ROOM", this.scene);
        upper_room.parent = container;

        // Upper Room Ground
        let leftUpperGround = MeshBuilder.CreateGround("leftUpperGround", {width: 26, height: 12}, this.scene);
        leftUpperGround.parent = upper_room;
        leftUpperGround.position = new Vector3(-18, 4.9, 10);
        leftUpperGround.material = mat;
        leftUpperGround.checkCollisions = true;
        leftUpperGround.visibility = 0;

        let leftUpperGround2 = MeshBuilder.CreateGround("leftUpperGround2", {width: 4, height: 6}, this.scene);
        leftUpperGround2.parent = upper_room;
        leftUpperGround2.position = new Vector3(-3, 4.9, 7);
        leftUpperGround2.material = mat;
        leftUpperGround2.checkCollisions = true;
        leftUpperGround2.visibility = 0;
        
        let rightUpperGround = MeshBuilder.CreateGround("rightUpperGround", {width: 26, height: 12}, this.scene);
        rightUpperGround.parent = upper_room;
        rightUpperGround.position = new Vector3(-18, 4.9, -10);
        rightUpperGround.material = mat;
        rightUpperGround.checkCollisions = true;
        rightUpperGround.visibility = 0;

        let rightUpperGround2 = MeshBuilder.CreateGround("rightUpperGround2", {width: 4, height: 6}, this.scene);
        rightUpperGround2.parent = upper_room;
        rightUpperGround2.position = new Vector3(-3, 4.9, -7);
        rightUpperGround2.material = mat;
        rightUpperGround2.checkCollisions = true;
        rightUpperGround2.visibility = 0;

        let centerUpperGround = MeshBuilder.CreateGround("centerUpperGround", {width: 4, height: 8}, this.scene);
        centerUpperGround.parent = upper_room;
        centerUpperGround.position = new Vector3(-29, 4.9, 0);
        centerUpperGround.material = mat;
        centerUpperGround.checkCollisions = true;
        centerUpperGround.visibility = 0;
        
        let upperRoomFrontWall = MeshBuilder.CreateGround("upperRoomFrontWall", {width: 6, height: 32}, this.scene);
        upperRoomFrontWall.parent = upper_room;
        upperRoomFrontWall.position = new Vector3(-31, 7.9, 0);
        upperRoomFrontWall.rotation = new Vector3(0, 180 * ToRad, 90 * ToRad);
        upperRoomFrontWall.material = mat;
        upperRoomFrontWall.checkCollisions = true;
        upperRoomFrontWall.visibility = 0;
        
        let upperRoomLeftWall = MeshBuilder.CreateGround("upperRoomLeftWall", {width: 6, height: 22}, this.scene);
        upperRoomLeftWall.parent = upper_room;
        upperRoomLeftWall.position = new Vector3(-20, 7.9, 16);
        upperRoomLeftWall.rotation = new Vector3(0, 270 * ToRad, 90 * ToRad);
        upperRoomLeftWall.material = mat;
        upperRoomLeftWall.checkCollisions = true;
        upperRoomLeftWall.visibility = 0;
        
        let upperRoomRightWall = MeshBuilder.CreateGround("upperRoomRightWall", {width: 6, height: 22}, this.scene);
        upperRoomRightWall.parent = upper_room;
        upperRoomRightWall.position = new Vector3(-20, 7.9, -16);
        upperRoomRightWall.rotation = new Vector3(0, 90 * ToRad, 90 * ToRad);
        upperRoomRightWall.material = mat;
        upperRoomRightWall.checkCollisions = true;
        upperRoomRightWall.visibility = 0;
        
        let upperRoomLeftBackWall = MeshBuilder.CreateGround("upperRoomLeftBackWall", {width: 6, height: 4}, this.scene);
        upperRoomLeftBackWall.parent = upper_room;
        upperRoomLeftBackWall.position = new Vector3(-9, 7.9, 14);
        upperRoomLeftBackWall.rotation = new Vector3(0, 0, 90 * ToRad);
        upperRoomLeftBackWall.material = mat;
        upperRoomLeftBackWall.checkCollisions = true;
        upperRoomLeftBackWall.visibility = 0;
        
        let upperRoomRightBackWall = MeshBuilder.CreateGround("upperRoomRightBackWall", {width: 6, height: 4}, this.scene);
        upperRoomRightBackWall.parent = upper_room;
        upperRoomRightBackWall.position = new Vector3(-9, 7.9, -14);
        upperRoomRightBackWall.rotation = new Vector3(0, 0, 90 * ToRad);
        upperRoomRightBackWall.material = mat;
        upperRoomRightBackWall.checkCollisions = true;
        upperRoomRightBackWall.visibility = 0;
        
        // GUARDRAILS

        const guardrails = new TransformNode("GUARDRAILS", this.scene);
        guardrails.parent = container;

        let leftGuardrail = MeshBuilder.CreateGround("leftGuardrail", {width: 1.5, height: 26}, this.scene);
        leftGuardrail.parent = guardrails;
        leftGuardrail.position = new Vector3(-14, 5.6, 4);
        leftGuardrail.rotation = new Vector3(0, 90 * ToRad, 90 * ToRad);
        leftGuardrail.material = mat;
        leftGuardrail.checkCollisions = true;
        leftGuardrail.visibility = 0;
        leftGuardrail.isPickable = false;

        let rightGuardrail = MeshBuilder.CreateGround("rightGuardrail", {width: 1.5, height: 26}, this.scene);
        rightGuardrail.parent = guardrails;
        rightGuardrail.position = new Vector3(-14, 5.6, -4);
        rightGuardrail.rotation = new Vector3(0, 270 * ToRad, 90 * ToRad);
        rightGuardrail.material = mat;
        rightGuardrail.checkCollisions = true;
        rightGuardrail.visibility = 0;
        rightGuardrail.isPickable = false;
        
        let frontGuardrail = MeshBuilder.CreateGround("frontGuardrail", {width: 1.5, height: 8}, this.scene);
        frontGuardrail.parent = guardrails;
        frontGuardrail.position = new Vector3(-27, 5.6, 0);
        frontGuardrail.rotation = new Vector3(0, 180 * ToRad, 90 * ToRad);
        frontGuardrail.material = mat;
        frontGuardrail.checkCollisions = true;
        frontGuardrail.visibility = 0;
        frontGuardrail.isPickable = false;
        
        let leftBackGuardrail = MeshBuilder.CreateGround("leftBackGuardrail", {width: 1.5, height: 6}, this.scene);
        leftBackGuardrail.parent = guardrails;
        leftBackGuardrail.position = new Vector3(-1, 5.6, 7);
        leftBackGuardrail.rotation = new Vector3(0, 180 * ToRad, 90 * ToRad);
        leftBackGuardrail.material = mat;
        leftBackGuardrail.checkCollisions = true;
        leftBackGuardrail.visibility = 0;
        leftBackGuardrail.isPickable = false;
        
        let rightBackGuardrail = MeshBuilder.CreateGround("rightBackGuardrail", {width: 1.5, height: 6}, this.scene);
        rightBackGuardrail.parent = guardrails;
        rightBackGuardrail.position = new Vector3(-1, 5.6, -7);
        rightBackGuardrail.rotation = new Vector3(0, 180 * ToRad, 90 * ToRad);
        rightBackGuardrail.material = mat;
        rightBackGuardrail.checkCollisions = true;
        rightBackGuardrail.visibility = 0;
        rightBackGuardrail.isPickable = false;
        
        let leftMiniGuardrail = MeshBuilder.CreateGround("leftMiniGuardrail", {width: 1.5, height: 4}, this.scene);
        leftMiniGuardrail.parent = guardrails;
        leftMiniGuardrail.position = new Vector3(-3, 5.6, 10);
        leftMiniGuardrail.rotation = new Vector3(0, 270 * ToRad, 90 * ToRad);
        leftMiniGuardrail.material = mat;
        leftMiniGuardrail.checkCollisions = true;
        leftMiniGuardrail.visibility = 0;
        leftMiniGuardrail.isPickable = false;
        
        let rightMiniGuardrail = MeshBuilder.CreateGround("rightMiniGuardrail", {width: 1.5, height: 4}, this.scene);
        rightMiniGuardrail.parent = guardrails;
        rightMiniGuardrail.position = new Vector3(-3, 5.6, -10);
        rightMiniGuardrail.rotation = new Vector3(0, 90 * ToRad, 90 * ToRad);
        rightMiniGuardrail.material = mat;
        rightMiniGuardrail.checkCollisions = true;
        rightMiniGuardrail.visibility = 0;
        rightMiniGuardrail.isPickable = false;
        
        let leftMiniGuardrail2 = MeshBuilder.CreateGround("leftMiniGuardrail2", {width: 1.5, height: 4}, this.scene);
        leftMiniGuardrail2.parent = guardrails;
        leftMiniGuardrail2.position = new Vector3(-3, 5.6, 10.01);
        leftMiniGuardrail2.rotation = new Vector3(0, 90 * ToRad, 90 * ToRad);
        leftMiniGuardrail2.material = mat;
        leftMiniGuardrail2.checkCollisions = true;
        leftMiniGuardrail2.visibility = 0;
        leftMiniGuardrail2.isPickable = false;
        
        let rightMiniGuardrail2 = MeshBuilder.CreateGround("rightMiniGuardrail2", {width: 1.5, height: 4}, this.scene);
        rightMiniGuardrail2.parent = guardrails;
        rightMiniGuardrail2.position = new Vector3(-3, 5.6, -10.01);
        rightMiniGuardrail2.rotation = new Vector3(0, 270 * ToRad, 90 * ToRad);
        rightMiniGuardrail2.material = mat;
        rightMiniGuardrail2.checkCollisions = true;
        rightMiniGuardrail2.visibility = 0;
        rightMiniGuardrail2.isPickable = false;

        // WALLS

        const walls = new TransformNode("WALLS", this.scene);
        walls.parent = container;

        // Murs
        let murDevant = MeshBuilder.CreateGround("frontWall", {width: 4, height: 24}, this.scene);
        murDevant.parent = walls;
        murDevant.position = new Vector3(-19, 1.9, 0);
        murDevant.rotation = new Vector3(0, 180 * ToRad, 90 * ToRad);
        murDevant.material = mat;
        murDevant.checkCollisions = true;
        murDevant.visibility = 0;

        let murDerriere = MeshBuilder.CreateGround("backWall", {width: 4, height: 24}, this.scene);
        murDerriere.parent = walls;
        murDerriere.position = new Vector3(17, 1.9, 0);
        murDerriere.rotation = new Vector3(0, 0, 90 * ToRad);
        murDerriere.material = mat;
        murDerriere.checkCollisions = true;
        murDerriere.visibility = 0;

        let murDeGauche = MeshBuilder.CreateGround("leftWall", {width: 11, height: 26}, this.scene);
        murDeGauche.parent = walls;
        murDeGauche.position = new Vector3(4, 5.4, 12);
        murDeGauche.rotation = new Vector3(0, 270 * ToRad, 90 * ToRad);
        murDeGauche.material = mat;
        murDeGauche.checkCollisions = true;
        murDeGauche.visibility = 0;

        let murDeDroite = MeshBuilder.CreateGround("rightWall", {width: 11, height: 26}, this.scene);
        murDeDroite.parent = walls;
        murDeDroite.position = new Vector3(4, 5.4, -12);
        murDeDroite.rotation = new Vector3(0, 90 * ToRad, 90 * ToRad);
        murDeDroite.material = mat;
        murDeDroite.checkCollisions = true;
        murDeDroite.visibility = 0 ;
        
        let cant_pass = MeshBuilder.CreateBox("CantPass", { width: 2, height: 5, depth: 0.5 }, this.scene);
        cant_pass.parent = walls;
        cant_pass.position = new Vector3(9.5, 0.85, 12.25);
        cant_pass.rotation = new Vector3(0, 0 * ToRad, 90 * ToRad);
        cant_pass.material = mat;
        cant_pass.checkCollisions = true;
        cant_pass.visibility = 1;

        // PILLARS

        const pillars = new TransformNode("PILLARS", this.scene);
        pillars.parent = container;

        let centralPillar = MeshBuilder.CreateBox("centralPillar", { width: 5, height: 8, depth: 0.6 }, this.scene);
        centralPillar.parent = pillars;
        centralPillar.position = new Vector3(9.5, 3, -0.1);
        centralPillar.material = mat;
        centralPillar.checkCollisions = true;
        centralPillar.visibility = 0 ;

        let leftPillar = MeshBuilder.CreateBox("leftPillar", { width: 1, height: 12, depth: 7.5 }, this.scene);
        leftPillar.parent = pillars;
        leftPillar.position = new Vector3(1.5, 6, 7.75);
        leftPillar.material = mat;
        leftPillar.checkCollisions = true;
        leftPillar.visibility = 0 ;
        
        let rightPillar = MeshBuilder.CreateBox("rightPillar", { width: 1, height: 12, depth: 7.5 }, this.scene);
        rightPillar.parent = pillars;
        rightPillar.position = new Vector3(1.5, 6, -7.75);
        rightPillar.material = mat;
        rightPillar.checkCollisions = true;
        rightPillar.visibility = 0 ;
        
        let leftStairWall = MeshBuilder.CreateBox("leftStairWall", { width: 0.5, height: 5, depth: 6 }, this.scene);
        leftStairWall.parent = pillars;
        leftStairWall.position = new Vector3(-1.25, 2.4, 7);
        leftStairWall.material = mat;
        leftStairWall.checkCollisions = true;
        leftStairWall.visibility = 0 ;
        
        let rightStairWall = MeshBuilder.CreateBox("rightStairWall", { width: 0.5, height: 5, depth: 6 }, this.scene);
        rightStairWall.parent = pillars;
        rightStairWall.position = new Vector3(-1.25, 2.4, -7);
        rightStairWall.material = mat;
        rightStairWall.checkCollisions = true;
        rightStairWall.visibility = 0 ;
        
        let leftStairWall2 = MeshBuilder.CreateBox("leftStairWall2", { width: 0.5, height: 2, depth: 4 }, this.scene);
        leftStairWall2.parent = pillars;
        leftStairWall2.position = new Vector3(-1.25, 0.9, 12);
        leftStairWall2.material = mat;
        leftStairWall2.checkCollisions = true;
        leftStairWall2.visibility = 0 ;
        
        let rightStairWall2 = MeshBuilder.CreateBox("rightStairWall2", { width: 0.5, height: 2, depth: 4 }, this.scene);
        rightStairWall2.parent = pillars;
        rightStairWall2.position = new Vector3(-1.25, 0.9, -12);
        rightStairWall2.material = mat;
        rightStairWall2.checkCollisions = true;
        rightStairWall2.visibility = 0 ;

        let leftPillar1 = MeshBuilder.CreateBox("leftPillar1", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        leftPillar1.parent = pillars;
        leftPillar1.position = new Vector3(-4.75, 2.4, 9.75);
        leftPillar1.material = mat;
        leftPillar1.checkCollisions = true;
        leftPillar1.visibility = 0 ;

        let leftPillar2 = MeshBuilder.CreateBox("leftPillar2", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        leftPillar2.parent = pillars;
        leftPillar2.position = new Vector3(-5.25, 2.4, 7.25);
        leftPillar2.material = mat;
        leftPillar2.checkCollisions = true;
        leftPillar2.visibility = 0 ;

        let rightPillar1 = MeshBuilder.CreateBox("rightPillar1", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        rightPillar1.parent = pillars;
        rightPillar1.position = new Vector3(-4.75, 2.4, -9.75);
        rightPillar1.material = mat;
        rightPillar1.checkCollisions = true;
        rightPillar1.visibility = 0 ;

        let rightPillar2 = MeshBuilder.CreateBox("rightPillar2", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        rightPillar2.parent = pillars;
        rightPillar2.position = new Vector3(-5.25, 2.4, -7.25);
        rightPillar2.material = mat;
        rightPillar2.checkCollisions = true;
        rightPillar2.visibility = 0 ;

        let leftPillar3 = MeshBuilder.CreateBox("leftPillar3", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        leftPillar3.parent = pillars;
        leftPillar3.position = new Vector3(-9.25, 2.4, 4.25);
        leftPillar3.material = mat;
        leftPillar3.checkCollisions = true;
        leftPillar3.visibility = 0 ;

        let leftPillar4 = MeshBuilder.CreateBox("leftPillar4", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        leftPillar4.parent = pillars;
        leftPillar4.position = new Vector3(-14.25, 2.4, 4.25);
        leftPillar4.material = mat;
        leftPillar4.checkCollisions = true;
        leftPillar4.visibility = 0 ;

        let leftPillar5 = MeshBuilder.CreateBox("leftPillar5", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        leftPillar5.parent = pillars;
        leftPillar5.position = new Vector3(-18.75, 2.4, 4.25);
        leftPillar5.material = mat;
        leftPillar5.checkCollisions = true;
        leftPillar5.visibility = 0 ;

        let rightPillar3 = MeshBuilder.CreateBox("rightPillar3", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        rightPillar3.parent = pillars;
        rightPillar3.position = new Vector3(-9.25, 2.4, -4.25);
        rightPillar3.material = mat;
        rightPillar3.checkCollisions = true;
        rightPillar3.visibility = 0 ;

        let rightPillar4 = MeshBuilder.CreateBox("rightPillar4", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        rightPillar4.parent = pillars;
        rightPillar4.position = new Vector3(-14.25, 2.4, -4.25);
        rightPillar4.material = mat;
        rightPillar4.checkCollisions = true;
        rightPillar4.visibility = 0 ;

        let rightPillar5 = MeshBuilder.CreateBox("rightPillar5", {width: 0.5, height: 5, depth: 0.5}, this.scene);
        rightPillar5.parent = pillars;
        rightPillar5.position = new Vector3(-18.75, 2.4, -4.25);
        rightPillar5.material = mat;
        rightPillar5.checkCollisions = true;
        rightPillar5.visibility = 0 ;
    }

    /**
     * Create the teleportation crystals and main button
     */
    private createButtons(): void {
        const guiManager = new GUI3DManager(this.scene);

        // Teleportation Points
        this.tp_points.forEach((point) => {
            const crystal = MeshBuilder.CreateIcoSphere("crystal" + point.name, {
                radius: 0.25,
                flat: true,
                subdivisions: 1
            }, this.scene);

            crystal.rotation = new Vector3(60 * Math.PI / 180, 0, 0);
            crystal.position = new Vector3(point.x, point.y + 3, point.z);
            crystal.receiveShadows = true;
            
            const crystalMat = new StandardMaterial("crystalMat" + point.name, this.scene);
            crystalMat.diffuseColor = new Color3(0, 0.557, 0.471);
            crystalMat.emissiveColor = new Color3(0, 0.279, 0.235);
            crystal.material = crystalMat;

            const pushButton = new MeshButton3D(crystal, "pushButton" + point.name);
            pushButton.pointerEnterAnimation = () => {
                crystalMat.diffuseColor = new Color3(0.373, 0.027, 0.553);
                crystalMat.emissiveColor = new Color3(0.187, 0.014, 0.276);
            };
            pushButton.pointerOutAnimation = () => {
                crystalMat.diffuseColor = new Color3(0, 0.557, 0.471);
                crystalMat.emissiveColor = new Color3(0, 0.279, 0.235);
            };
            pushButton.pointerDownAnimation = () => {
                crystal.scaling = new Vector3(0.8, 0.8, 0.8);
            };
            pushButton.pointerUpAnimation = () => {
                crystal.scaling = new Vector3(1, 1, 1);
            };
            pushButton.onPointerClickObservable.add(() => {
                if (this.camera) this.camera.position = new Vector3(point.x, point.y, point.z);
                if (this.xrCamera) this.xrCamera.position = new Vector3(point.x, point.y, point.z);
            });
            guiManager.addControl(pushButton);

            this.scene.onBeforeRenderObservable.add(() => {
                crystal.rotation.y += 0.0007 * this.engine.getDeltaTime();
            });
        });

        // Import objects Button
        const panel = new StackPanel3D(true);
        panel.margin = 0.02;
        guiManager.addControl(panel);

        panel.position = new Vector3(1.5, 2, 4);
        panel.scaling = new Vector3(-0.5, 0.5, 0.5);


        this.importButton = new Button3D("importObjects");
        
        const importText = new TextBlock();
        importText.text = "Start";
        importText.color = "cyan";
        importText.fontSize = 42;

        this.importButton.content = importText;
        this.importButton.onPointerUpObservable.add(() => {
            this.toggleImport();
        });   
        
        panel.addControl(this.importButton);

        
        // Selector : Metrics
        this.metricsButton = new Button3D("metricsButton");
        
        const textMetrics = new TextBlock();
        textMetrics.text = "Metric : \nDistance";
        textMetrics.color = "white";
        textMetrics.fontSize = 36;

        this.metricsButton.content = textMetrics;
        this.metricsButton.onPointerUpObservable.add(() => {
            this.cycleMetrics(textMetrics);
        });   

        panel.addControl(this.metricsButton);
        

        // Selector : Strategies
        this.stratButton = new Button3D("stratButton");
        
        const textStrat = new TextBlock();
        textStrat.text = "Strategy : \nNaive1";
        textStrat.color = "white";
        textStrat.fontSize = 36;

        this.stratButton.content = textStrat;
        this.stratButton.onPointerUpObservable.add(() => {
            this.cycleStrats(textStrat);
        });   

        panel.addControl(this.stratButton);
    }

    /**
     * Import the museum from gltf
     */
    private async loadInterior(): Promise<void> {
        // The assets manager can be used to load multiple assets
        const assetsManager = new AssetsManager(this.scene);

        // Load a GLB file of an entire scene exported from Unity
        const worldTask = assetsManager.addMeshTask("world task", "", "assets/museum/", "Museum.gltf");
        worldTask.onSuccess = async (): Promise<void> => {
            worldTask.loadedMeshes[0].name = "MUSEUM";
            worldTask.loadedMeshes[0].position = new Vector3(1, -0.5, 4);

            if (this.shadowGenerator) this.shadowGenerator.addShadowCaster(worldTask.loadedMeshes[0], true);

            worldTask.loadedMeshes.forEach((msh) => {
                if (msh instanceof Mesh) {
                    msh.receiveShadows = true;
                }
            });
        };

        // This loads all the assets and displays a loading screen
        await assetsManager.loadAsync();

        // This will execute when all assets are loaded
        let wall_mat = this.scene.getMaterialByName("Cyberpunk_5") as PBRMaterial;
        wall_mat.disableBumpMap = true;
        wall_mat.sheen.isEnabled = true;

        let stairs = this.scene.getMeshByName("stair_primitive0");
        if (stairs) stairs.isPickable = false;
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
        if (this.importOn) {
            this.object_manager.anim_import();
        }

        // In order to make predictions, 
        //  we have te save the position and rotation after updating
        CameraManager.saveCameraPosition();
    }

    /**
     * Toggle the import flag.  
     * If true, we import the objects.
     */
    private toggleImport(): void {
        if (!this.importOn) {
            this.importOn = true;
            this.stratButton?.onPointerUpObservable.clear();
            this.metricsButton?.onPointerUpObservable.clear();
            (this.stratButton?.content as TextBlock).color = "red";
            (this.metricsButton?.content as TextBlock).color = "red";
        }
        else {
            this.importOn = false;
            this.stratButton?.onPointerUpObservable.add(() => {
                this.cycleStrats(this.stratButton?.content as TextBlock);
            });
            this.metricsButton?.onPointerUpObservable.add(() => {
                this.cycleMetrics(this.metricsButton?.content as TextBlock);
            });
            (this.stratButton?.content as TextBlock).color = "white";
            (this.metricsButton?.content as TextBlock).color = "white";
        }
    }

    /**
     * Selects the next Strategy
     * @param textB The strategy button's text block to write current strat
     */
    private cycleStrats(textB : TextBlock) {   
        switch(Strategies.getChosenStrategy()) {
            case ChooseStrategy.Naive_1: 
                Strategies.setStrategy(ChooseStrategy.Greedy_1);
                textB.text = "Strategy : \nGreedy1";
            break
            case ChooseStrategy.Greedy_1: 
                Strategies.setStrategy(ChooseStrategy.Proposed_1);
                textB.text = "Strategy : \nProposed1";
            break
            case ChooseStrategy.Proposed_1: 
                Strategies.setStrategy(ChooseStrategy.Greedy_2);
                textB.text = "Strategy : \nGreedy2";
            break
            case ChooseStrategy.Greedy_2: 
                Strategies.setStrategy(ChooseStrategy.Uniform_2);
                textB.text = "Strategy : \nUniform2";
            break
            case ChooseStrategy.Uniform_2: 
                Strategies.setStrategy(ChooseStrategy.Hybrid_2);
                textB.text = "Strategy : \nHybrid2";
            break
            case ChooseStrategy.Hybrid_2: 
                Strategies.setStrategy(ChooseStrategy.Naive_1);
                textB.text = "Strategy : \nNaive1";
            break
        }
    }
    

    /**
     * Selects the next Strategy
     * @param textB The strategy button's text block to write current strat
     */
    private cycleMetrics(textB : TextBlock) {   
        switch(Metrics.getChosenMetric()) {
            case ChooseMetric.Distance: 
                Metrics.setMetric(ChooseMetric.Surface);
                textB.text = "Metric : \nSurface";
            break
            case ChooseMetric.Surface: 
                Metrics.setMetric(ChooseMetric.Visible);
                textB.text = "Metric : \nVisible";
            break
            case ChooseMetric.Visible: 
                Metrics.setMetric(ChooseMetric.Potential);
                textB.text = "Metric : \nPotential";
            break
            case ChooseMetric.Potential: 
                Metrics.setMetric(ChooseMetric.Visible_Potential);
                textB.text = "Metric : \nVisible -\nPotential";
            break
            case ChooseMetric.Visible_Potential: 
                Metrics.setMetric(ChooseMetric.Distance);
                textB.text = "Metric : \nDistance";
            break
        }
    }

    /**
     * On X or A press, toggle the animation
     * @param component The left controller's 'X' button or the right controller's 'A' button
     */
    private onButton(component?: WebXRControllerComponent): void {
        if (component?.changes.pressed) {
            if (component?.pressed) {
                this.toggleImport();
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