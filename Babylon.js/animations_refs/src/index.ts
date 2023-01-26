/* Babylon Museum
 * Author: Luc Billaud <luc.billaud@insa-lyon.fr>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * 
 * Sample adapted from Evan Suma Rosenberg <suma@umn.edu> and Blair MacIntyre <blair@cc.gatech.edu> 's tutorial at IEEEVR2021
 * Find it on Github: Web-Based-VR-Tutorial Project Template
 */

import { Animation, AssetsManager, Engine, Scene } from "@babylonjs/core";
import { UniversalCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight, DirectionalLight, ShadowGenerator } from "@babylonjs/core/Lights";
import { Vector3, Color3 } from "@babylonjs/core/Maths";
import { PBRMaterial, RenderTargetTexture } from "@babylonjs/core/Materials/";
import { Mesh, TransformNode } from "@babylonjs/core/Meshes";
import { GUI3DManager, Button3D, TextBlock, StackPanel3D } from "@babylonjs/gui/";

// Side effects
// import "@babylonjs/core/Helpers/sceneHelpers";

// Add this to import the controller models from the online repository
import "@babylonjs/loaders";

// More necessary side effects
// import "@babylonjs/inspector";

import ObjectManager from './object_manager';
import CameraManager from './camera_manager';
import { frameRate, mainroom, statueroom, upperroom } from "./animations";
import OBSWebSocket from "obs-websocket-js";
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

    private shadowGenerator: ShadowGenerator | null;
    
    private camera: UniversalCamera | null;             // Desktop-mode camera

    private importOn: boolean;                          // Flag indicating if we import the LoDs or not
    private object_manager: ObjectManager;              // The game's object manager

    private importButton: Button3D | undefined;
    private stratButton: Button3D | undefined;
    private metricsButton: Button3D | undefined;
    private animationButton: Button3D | undefined;

    private positionAnimations: Animation[]; 
    private rotationAnimations: Animation[];
    private animIndex = 0;

    private obs: OBSWebSocket;
    private anim_on: boolean;
    private intervalId: number = 0;
    private prevMask: number = 0;
    private looped: boolean = false;

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

        // Initialize the managers 
        this.importOn = false;
        
        const objectContainer = new TransformNode("OBJECTS", this.scene);
        this.object_manager = new ObjectManager(this.shadowGenerator, objectContainer);
    
        this.positionAnimations = [];
        this.rotationAnimations = [];

        this.anim_on = false;
        this.obs = new OBSWebSocket();
        this.obs.on('RecordingStarted', () => {
            let i = 0;
            
            // this.engine.beginFrame();
            // this.update();
            // this.scene.render();            
            // this.engine.endFrame();

            setTimeout(() => {
                this.camera!.layerMask = this.prevMask;

                this.engine.beginFrame();            
                // When we are recording, begin the animation
                let anima = this.scene.beginDirectAnimation(
                    this.camera,
                    [this.positionAnimations[this.animIndex], this.rotationAnimations[this.animIndex]],
                    0,
                    21 * frameRate
                );
                anima.pause();
                anima.goToFrame(i);

                this.update();
                this.scene.render();            
                this.engine.endFrame();


                this.intervalId = window.setInterval(() => {
                    this.engine.beginFrame();

                    i++;
                    anima.goToFrame(i);
                    if (i == anima.toFrame) {
                        // After the animation, stop the recording and reset the scene
                        this.obs.send('StopRecording');
                    }

                    // Move and import LoDs
                    this.update();
                    // Render the scene
                    this.scene.render();

                    this.engine.endFrame();
                }, 150);
            }, 1010);
        });

        this.obs.on('RecordingStopped', () => {
            this.stopImport();
            
            setTimeout(() => {
                if (this.looped) { return; }
                this.cycleAnimations(this.animationButton?.content as TextBlock);
                if (this.animIndex == 0) {
                    this.looped = true;
                }
                
                window.clearInterval(this.intervalId);

                setTimeout(() => {
                    this.startImport();                        
                }, 900);  
            }, 100);
        });
    }

    /**
     * Create the scene and start the game
     */
    start(): void {
        // Create the scene
        this.initializeScene().then(() => {
            setTimeout(() => {
                this.engine.beginFrame();

                // Move and import LoDs
                this.update();
                // Render the scene
                this.scene.render();

                this.engine.endFrame();

                this.startImport();                
            }, 2000);

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
        this.createAnimations();

        // Scene elements
        this.createLightings();
        this.createButtons();

        // Initializing the object manager to be able to import objects
        await this.object_manager._init_();
        await this.obs.connect({ address: 'localhost:4444', password: 'alpha-beta' }, err => {
            console.error('socket error:', err);
        });
    
        this.loadInterior();
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
     * Create the animations
     */
    private createAnimations(): void {
        let mainRoomPosAnim = new Animation(
            "mainRoomPos", 
            "position", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        mainRoomPosAnim.setKeys(mainroom.position);

        let mainRoomRotAnim = new Animation(
            "mainRoomRot", 
            "rotation", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        mainRoomRotAnim.setKeys(mainroom.rotation);
        
        this.positionAnimations.push(mainRoomPosAnim);
        this.rotationAnimations.push(mainRoomRotAnim);

        
        let statueRoomPosAnim = new Animation(
            "statueRoomPos", 
            "position", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        statueRoomPosAnim.setKeys(statueroom.position);

        let statueRoomRotAnim = new Animation(
            "statueRoomRot", 
            "rotation", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        statueRoomRotAnim.setKeys(statueroom.rotation);
        
        this.positionAnimations.push(statueRoomPosAnim);
        this.rotationAnimations.push(statueRoomRotAnim);
        

        let upperRoomPosAnim = new Animation(
            "upperRoomPos", 
            "position", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        upperRoomPosAnim.setKeys(upperroom.position);

        let upperRoomRotAnim = new Animation(
            "upperRoomRot", 
            "rotation", 
            frameRate, 
            Animation.ANIMATIONTYPE_VECTOR3, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        upperRoomRotAnim.setKeys(upperroom.rotation);
        
        this.positionAnimations.push(upperRoomPosAnim);
        this.rotationAnimations.push(upperRoomRotAnim);
    }

    /**
     * Create the teleportation crystals and main button
     */
    private createButtons(): void {
        const guiManager = new GUI3DManager(this.scene);

        // Import objects Button
        const panel = new StackPanel3D(true);
        panel.margin = 0.02;
        guiManager.addControl(panel);

        panel.position = new Vector3(1.5, 2, 4);
        panel.scaling = new Vector3(-0.5, 0.5, 0.5);

/*
        this.importButton = new Button3D("importObjects");
        
        const importText = new TextBlock();
        importText.text = "Start\nanimation";
        importText.color = "cyan";
        importText.fontSize = 42;

        this.importButton.content = importText;
        this.importButton.onPointerClickObservable.add(() => {
            if (this.importOn) {
                this.stopImport();
            }
            else {
                this.startImport();
            }
        });   
        
        panel.addControl(this.importButton);
        */

        // Selector : Animations
        this.animationButton = new Button3D("animationButton");
        
        const textAnimation = new TextBlock();
        textAnimation.text = "Animation : \nMain Room";
        textAnimation.color = "white";
        textAnimation.fontSize = 36;

        this.animationButton.content = textAnimation;
        this.animationButton.onPointerClickObservable.add(() => {
            this.cycleAnimations(textAnimation);
        });   

        panel.addControl(this.animationButton);

        
        // Selector : Metrics
        this.metricsButton = new Button3D("metricsButton");
        
        const textMetrics = new TextBlock();
        textMetrics.text = "Metric : \nDistance";
        textMetrics.color = "white";
        textMetrics.fontSize = 36;

        this.metricsButton.content = textMetrics;

        panel.addControl(this.metricsButton);
        

        // Selector : Strategies
        this.stratButton = new Button3D("stratButton");
        
        const textStrat = new TextBlock();
        textStrat.text = "Strategy : \nNaive1";
        textStrat.color = "white";
        textStrat.fontSize = 36;

        this.stratButton.content = textStrat;

        panel.addControl(this.stratButton);
    }

    /**
     * Import the museum from gltf
     */
    private loadInterior(): void {
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
        assetsManager.load();

        assetsManager.onFinish = () => {
            // This will execute when all assets are loaded
            let wall_mat = this.scene.getMaterialByName("Cyberpunk_5") as PBRMaterial;
            wall_mat.disableBumpMap = true;
            wall_mat.sheen.isEnabled = true;

            let stairs = this.scene.getMeshByName("stair_primitive0");
            if (stairs) stairs.isPickable = false;
        }
    }

    /**
     * The main update loop.  
     * Will be executed once per frame before the scene is rendered
     */
    private update(): void {

        // In order to make predictions, 
        //  we have te save the position and rotation after updating
        CameraManager.saveCameraPosition();
    }

    /**
     * Start the animation and start importing the objects.
     */
    private async startImport(): Promise<void> {
        if (!this.importOn) {
            this.importOn = true;

            // During the animation, we can't change the metric / strategy / animation
            this.stratButton?.onPointerClickObservable.clear();
            this.metricsButton?.onPointerClickObservable.clear();
            this.animationButton?.onPointerClickObservable.clear();
            (this.stratButton?.content as TextBlock).color = "red";
            (this.metricsButton?.content as TextBlock).color = "red";
            (this.animationButton?.content as TextBlock).color = "red";
            

            const animTxt = (this.animIndex == 0) ?
                            "MainRoom" : 
                            (this.animIndex == 1) ?
                            "StatueRoom" :
                            "UpperRoom";    
            const filename = `${animTxt}-Ref`;

            // Sending the name to OBS and record
            await this.obs.send('SetFilenameFormatting', {"filename-formatting": filename});
            this.obs.send('StartRecording');
            
            this.prevMask = this.camera!.layerMask;
            this.camera!.layerMask = 0;

            this.engine.beginFrame();
            this.update();
            this.scene.render();
            this.engine.endFrame();
        }
    }

    /**
     * Stop importing the objects and resets the buttons behaviours
     */
    private stopImport(): void {
        if (this.importOn) {
            this.importOn = false;

            (this.stratButton?.content as TextBlock).color = "white";
            (this.metricsButton?.content as TextBlock).color = "white";
            (this.animationButton?.content as TextBlock).color = "white";
        }
    }

    /**
     * Selects the next animation
     * @param textB The Animation button's text block to write current animation
     */
    private cycleAnimations(textB: TextBlock) {
        let nextAnim = (this.animIndex + 1) % this.positionAnimations.length;

        switch (nextAnim) {
            case 0:
                textB.text = "Animation : \nMain Room";
            break
            case 1:
                textB.text = "Animation : \nStatue Room";
            break
            case 2:
                textB.text = "Animation : \nUpper Room";
            break
        }

        this.animIndex = nextAnim;
    }
}
/******* End of the Game class ******/   

// start the game
const museum_game = new Museum();
museum_game.start();