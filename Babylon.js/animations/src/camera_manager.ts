import { FreeCamera, Scene } from "@babylonjs/core/";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";

import Utils from "./game_utils";

/**
 * Utility singleton class that gives us the active camera and the predicted one
 */
export default class CameraManager {
    private static _instance: CameraManager;    // Singleton instance

    private prevRotation: Vector3;              // The rotation of the active camera at the previous frame
    private prevRotQuaternion: Quaternion;
    private prevPosition: Vector3;              // The position of the active camera at the previous frame

    /**
     * Create a new Camera Manager.  
     * Private constructor because CameraManager is a singleton
     */
    private constructor() {
        this.prevPosition = Vector3.Zero();
        this.prevRotation = Vector3.Zero();
        this.prevRotQuaternion = Quaternion.Identity();
    }

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Returns the instance of the CameraManager singleton.  
     * Creates an instance if there was none.
     */
    public static getInstance() {
        if (!this._instance) {
            this._instance = new CameraManager();
        }

        return this._instance;
    }

    /**
     * Call this method after updating to save the camera's position and rotation
     */
    public static saveCameraPosition(): void {
        const cam = this.getInstance().getCamera();

        // .clone() is required so that we don't get a reference
        this.getInstance().prevPosition = cam.position.clone();

        //  UniversalCamera uses rotation and WebXRCamera uses rotationQuaternion !
        if (cam instanceof WebXRCamera) {
            this.getInstance().prevRotQuaternion = cam.rotationQuaternion.clone(); 
        }
        else {
            this.getInstance().prevRotation = cam.rotation.clone();
        }
    }

    /**
     * Returns the currently active camera as a FreeCamera
     */
    public getCamera(): FreeCamera {
        let cam = Utils.getInstance().scene.activeCamera;

        if (cam) {
            try {
                if (cam instanceof WebXRCamera) {
                    return cam as WebXRCamera;
                }
                else if (cam instanceof UniversalCamera) {
                    return cam as UniversalCamera;
                }
                else {
                    return cam as FreeCamera;
                }
            }
            catch(e) {
                throw e;
            }
        }
        else {
            throw "Camera Error : No active camera yet !";
        }
    }

    /**
     * Returns a linear prediction of the active camera in delta seconds.  
     * Don't forget to dispose of this camera after use for memory reasons.
     * @param scene The game scene
     * @param delta Time elapsed before prediction
     */
    public getCameraInTime(delta: number): FreeCamera {
        // We make a copy of the active camera
        let futureCamera: FreeCamera;
        const currentCamera = this.getCamera();
        futureCamera = currentCamera.clone("futureCamera") as FreeCamera;

        // This is the time since last frame
        //  (when we save the position and rotation)
        const deltaTime = Utils.getInstance().scene.deltaTime;

        // Linear prediction of the position
        const deltaPos = futureCamera.position
                        .subtract(this.prevPosition)
                        .scale(delta * 1000 / deltaTime);
        futureCamera.position
            .addInPlace(deltaPos);

        // Linear prediction of the rotation
        //  As UniversalCamera uses rotation and WebXRCamera uses rotationQuaternion,
        //  we have to separate the 2 cases
        if (currentCamera instanceof WebXRCamera) {
            const currentRotation = currentCamera.rotationQuaternion;
            const deltaRotQuatUnscaled = currentRotation
                                    .multiply(Quaternion.Inverse(this.prevRotQuaternion));
            const nextRotation = Quaternion.Slerp(   
                                currentRotation, 
                                currentRotation
                                    .multiply(deltaRotQuatUnscaled),
                                delta * 1000 / deltaTime
                            );
    
            futureCamera.rotationQuaternion = nextRotation;

            // As the predicted camera is not a WebXRCamera, we have to rotate it beforehand ; it won't be rotated afterwards
            //  Check ObjectManager.getVisibleObjects
            futureCamera.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(0, -Math.PI, 0));
        }
        else {
            const deltaRot = futureCamera.rotation
                        .subtract(this.prevRotation)
                        .scale(delta * 1000 / deltaTime);
            futureCamera.rotation
                .addInPlace(deltaRot);
        }        
        
        // Forcing computation of matrices
        futureCamera.getViewMatrix(true);
        futureCamera.getProjectionMatrix(true);
        
        // Return the predicted camera (has to be destroyed after being use)
        return futureCamera;
    }

    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

}