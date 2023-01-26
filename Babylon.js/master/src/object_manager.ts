import { Camera, Frustum, Quaternion, Scene, Tools, Vector3 } from "@babylonjs/core/";
import { ShadowGenerator } from "@babylonjs/core/Lights";
import { DracoCompression, TransformNode } from "@babylonjs/core/Meshes/";

import MuseumObject from './museum_object';
import Strategies from "./strategies";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";

/**
 * Structure of the data in the positions.json file
 */
interface ObjectData{ 
    name: string; 
    position: number[]; 
    rotation: number[]; 
    scale: number; 
}

/**
 * Class in charge of creating the MuseumObjects and importing the LoDs
 */
export default class ObjectManager {
    private shadowGenerator: ShadowGenerator | null;    // If we want to have the object to cast shadows
    private container: TransformNode | undefined;       // The node containing the objects

    private objectsData: ObjectData[] | undefined;      // The data about the objects (position, rotation, scale)  
    private objects: MuseumObject[];                    // The MuseumObjects subsequently created

    public import_started: boolean                      // Used to ensure that we execute our startegy only once at a time

    /**
     * Creates an object manager (has to be initialized)
     * @param pScene The scene
     * @param pShadowGenerator Sun's shadow generator (to cast shadows)
     * @param pContainer The node containing that will contain the objects
     */
    constructor(pShadowGenerator: ShadowGenerator | null,
                pContainer?: TransformNode) {
        this.shadowGenerator = pShadowGenerator;
        this.container = pContainer;

        this.objects = [];

        this.import_started = false;
    }

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Initialize the object manager  
     * Has to be called before using the object manager
     */
    public async _init_() {
        // Loads the position.json file to initialize the MuseumObjects
        const objData = await this.loadFileAsStringAsync("./assets/objects/positions.json");
        this.objectsData = JSON.parse(objData) as ObjectData[];
        const ToRad = Math.PI / 180;

        // Create a shared DracoCompression object
        //  (shared Draco with 5 workers has been the best in my tests)
        const dracocomp = new DracoCompression(5);
            
        // Create the MuseumObjects, initialize them and import level 0 (all objects at the same time)
        await Promise.all(this.objectsData.map(async (element: ObjectData) => {
            const pos = new Vector3(element.position[0], element.position[1], element.position[2]);
            const rot = new Vector3(element.rotation[0] * ToRad, element.rotation[1] * ToRad, element.rotation[2] * ToRad);
            const sca = new Vector3(element.scale, element.scale, element.scale);
            
            const importer = new MuseumObject(dracocomp, "./assets/objects/" + element.name + "/", pos, rot, sca);
            this.objects.push(importer);

            await importer._init_();
            if (importer.container && this.container) importer.container.parent = this.container;
        
            const msh = await importer.import(0);
            if (msh && this.shadowGenerator) this.shadowGenerator.getShadowMap()!.renderList!.push(msh);
        }));
    }

    /**
     * Imports all objects using a certain strategy
     */
    public async anim_import() {
        if (!this.import_started && !this.checkAllLoaded()) {
            this.import_started = true;
            const meshes = await Strategies.executeStrategy(this);

            if (this.shadowGenerator) {
                for (const mesh of meshes) {
                    this.shadowGenerator.getShadowMap()!.renderList!.push(mesh);
                }
            }

            await this.delay(1);                     // Sans délai, l'objet qui vient d'être importé n'est pas compté dans les objets visibles
            this.import_started = false;
        }
    }    

    /**
     * Returns all objects seen by the camera
     * @param cam The point of view
     */
    public getVisibleObjects(cam: Camera): MuseumObject[] {
        // from https://playground.babylonjs.com/#4AZJV8#6 and
        //  https://forum.babylonjs.com/t/check-isinfrustum-but-with-a-percentage-of-the-camera-view/16906/5
        
        // Apparently the XR Camera Frustum is rotated by 180°
        //  Thus, we rotate it to make sure that the frustum is correcty oriented
        //  This behaviour is similar to what I observed when using Unity
        if (cam instanceof WebXRCamera) {
            cam.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(0, Math.PI, 0));
        }
        
        const proj = cam.getProjectionMatrix(true);
        const view = cam.getViewMatrix(true);
        const transform = view.multiply(proj);

        // This allows us to check if a mesh is in the frustum even with cloned cameras.
        const frustumPlanes = Frustum.GetPlanes(transform);

        // Rotating the XR Camera back to its original rotation
        if (cam instanceof WebXRCamera) {
            cam.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(0, -Math.PI, 0));
        }

        const visibles = this.objects.filter((obj) => { 
            const currentMesh = obj.getCurrentMesh();

            if (currentMesh) return currentMesh.isInFrustum(frustumPlanes);
            else throw "Error : no level of detail has been imported"
        });

        return visibles;
    } 

    /**
     * Returns all objects not seen by the camera
     * @param cam The point of view
     */
    public getNotVisibleObjects(cam: Camera): MuseumObject[] {
        // from https://playground.babylonjs.com/#4AZJV8#6 and
        //  https://forum.babylonjs.com/t/check-isinfrustum-but-with-a-percentage-of-the-camera-view/16906/5
                
        // Apparently the XR Camera is rotated by 180°
        if (cam instanceof WebXRCamera) {
            cam.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(0, Math.PI, 0))
        }
        
        const proj = cam.getProjectionMatrix(true);
        const view = cam.getViewMatrix(true);
        const transform = view.multiply(proj);

        // This allows us to check if a mesh is in the frustum even with cloned cameras.
        const frustumPlanes = Frustum.GetPlanes(transform);

        // Rotating the XR Camera back to its original rotation
        if (cam instanceof WebXRCamera) {
            cam.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(0, -Math.PI, 0))
        }

        const notVisibles = this.objects.filter((obj) => { 
            const currentMesh = obj.getLevel(obj.currentLevel);

            if (currentMesh) return !currentMesh.isInFrustum(frustumPlanes);
            else throw "Error : no level of detail has been imported"
        });
        return notVisibles;
    }

    /**
     * Returns all the MuseumObjects
     */
    public getAllObjects(): MuseumObject[] {
        return this.objects;
    }

    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

    /**
     * Returns true if the max LoD from all objects is downloaded
     */
    private checkAllLoaded(): boolean {
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];

            // console.warn(obj.getLevel(obj.getNumberOfLevels() - 1));

            if (!obj.getLevel(obj.getNumberOfLevels() - 1)) return false;
        }
        return true;
    }

    /**
     * Promise to wait for a specified duration
     * @param ms Time in milliseconds to wait
     */
    private delay(ms: number): Promise<void> {
        return new Promise(res => setTimeout(res, ms))
    }

    /**
     * Promise to load a file (asynchronously then) as a string
     * @param url The URL to the file to be downloaded
     */
    private loadFileAsStringAsync(url: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            Tools.LoadFile(url, function(data) {
                if (typeof(data) == 'string') {
                    resolve(data);
                }
                else {
                    reject("Requested data was an ArrayBuffer");
                }
            }, undefined, undefined, false, function (req, ex) {
                reject(ex);
            });
        });
    }
}