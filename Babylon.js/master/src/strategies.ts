import { Camera, FreeCamera, Mesh } from "@babylonjs/core/";

import CameraManager from "./camera_manager";
import MuseumObject from "./museum_object";
import ObjectManager from "./object_manager";
import Metrics from "./metrics";
import SpeedManager from './speed_manager';

/**
 * An enumeration listing all the different strategy options
 */
export enum ChooseStrategy {
    Naive_1,
    Greedy_1,
    Proposed_1,
    Greedy_2,
    Uniform_2,
    Hybrid_2
}


/**
 * Class where the different strategies are implemented
 */
export default class Strategies {
    private static _chosenStrategy: ChooseStrategy = ChooseStrategy.Naive_1; // The strategy we will execute

    private static BUFFER: number = 2;                  // Download buffer size in seconds
    private static HORIZON: number = 2;                 // Used by Greedy1 and Proposed1 algorithms
    

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Set the strategy to be executed with executeStrategy
     * @param strategy The strategy to be executed
     */
    public static setStrategy(strategy: ChooseStrategy) {
        this._chosenStrategy = strategy;
    }
    
    /**
     * Returns the currently chosen strategy
     */
    public static getChosenStrategy(): ChooseStrategy {
        return this._chosenStrategy;
    }

    /**
     * Returns the currently chosen stategy's name
     */
    public static getChosenStrategyAsString(): string {
        switch(this._chosenStrategy) {
            case ChooseStrategy.Naive_1:
                return "Naive1";
            case ChooseStrategy.Greedy_1:
                return "Greedy1";
            case ChooseStrategy.Proposed_1:
                return "Proposed1";
            case ChooseStrategy.Greedy_2:
                return "Greedy2";
            case ChooseStrategy.Uniform_2:
                return "Uniform2";
            case ChooseStrategy.Hybrid_2:
                return "Hybrid2";
        }
    }

    /**
     * Execute the chosen strategy
     * @param object_manager The object manager calling for the method
     * @returns A Promise executing the strategy
     */
    public static async executeStrategy(object_manager: ObjectManager): Promise<Mesh[]> {
        switch (this._chosenStrategy) {
            case ChooseStrategy.Naive_1:
                return this.naive1(object_manager);

            case ChooseStrategy.Greedy_1:
                return this.greedy1(object_manager);

            case ChooseStrategy.Proposed_1:
                return this.proposed1(object_manager);
        
            case ChooseStrategy.Greedy_2:
                return this.greedy2(object_manager);

            case ChooseStrategy.Uniform_2:
                return this.uniform2(object_manager);

            case ChooseStrategy.Hybrid_2:
                return this.hybrid2(object_manager);
        }
    }

    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

    /**
     * Naive strategy proposed in paper DASH for 3D Networked Virtual Environment
     * @param object_manager The object manager calling for the method
     */
    private static async naive1(object_manager: ObjectManager): Promise<Mesh[]> {
        // For this strategy, we download the highest non-loaded level of the visible object with the highest utility  
        // Is almost equivalent to the greedy stategy from the other paper

        // ================ INIT ========================

        const camera_manager = CameraManager.getInstance();

        const cameraLater: Camera = camera_manager.getCameraInTime(this.HORIZON);
        const visiblesNow: MuseumObject[] = object_manager.getVisibleObjects(camera_manager.getCamera());
        const visiblesLater: MuseumObject[] = object_manager.getVisibleObjects(cameraLater);
        const visibles: MuseumObject[] = [...visiblesNow, ...visiblesLater.filter( o => !~visiblesNow.indexOf(o) )];  // !~indexOf returns true if element is not in array and false if it is in

        cameraLater.dispose();

        if (visibles.length == 0) return [];

        // ================= EXECUTING OUR STRATEGY ======================= 

        let bestObject = visibles[0];
        let bestLevel = 0;
        let bestUtility = -1;
        // Will remain false if all levels are downloaded (not needed normally)
        let newLevel = false;

        
        // Looping on visible objects
        for (let i = 0; i < visibles.length; i++) {
            const currentObject = visibles[i];

            // Looping on non-loaded levels
            for (let j = currentObject.currentLevel; j < currentObject.getNumberOfLevels(); j++) {
                if (!currentObject.getLevel(j)) {
                    // Score = utility right now * Level's quality score
                    const utility = currentObject.getLevelQuality(j) *
                                     Metrics.calcUtility(currentObject, camera_manager.getCamera());

                    // If we found an item with a better utility over the period (a better candidate),
                    //  we select it (HE IS THE CHOSEN ONE !o.)
                    if (utility > bestUtility) {
                        newLevel = true;
                        bestUtility = utility;
                        bestObject = currentObject;
                        bestLevel = j;
                    }
                }
            }
        }

        // ====================== DOWNLOADING THE MESH ====================

        const importedMeshes = [];
        if (newLevel) {
            try {
                importedMeshes.push(await bestObject.import(bestLevel));
            } catch (err) {
                console.error(err);                
            }
        }

        return importedMeshes;
    }


    /**
     * Proposed strategy proposed in paper DASH for 3D Networked Virtual Environment
     * @param object_manager The object manager calling for the method
     */
    private static async proposed1(object_manager: ObjectManager): Promise<Mesh[]> {
        // For this strategy, we download the segment (mesh) that will give us the highest utility
        // over a period between the time it is downloaded and the horizon

        // ================ INIT ========================
        
        const camera_manager = CameraManager.getInstance();

        const cameraLater: Camera = camera_manager.getCameraInTime(this.HORIZON);
        const visiblesNow: MuseumObject[] = object_manager.getVisibleObjects(camera_manager.getCamera());
        const visiblesLater: MuseumObject[] = object_manager.getVisibleObjects(cameraLater);
        const visibles: MuseumObject[] = [...visiblesNow, ...visiblesLater.filter( o => !~visiblesNow.indexOf(o) )];  // !~indexOf returns true if element is not in array and false if it is in

        cameraLater.dispose();

        if (visibles.length == 0) return [];

        // ================= EXECUTING OUR STRATEGY ======================= 

        let bestObject = visibles[0];
        let bestLevel = 0;
        let bestUtility = -1;
        // In case the download times are too long
        let bestObject2 = visibles[0];
        let bestLevel2 = 0;
        let bestUtility2 = -1;
        // Will remain false if all levels are downloaded (not needed normally)
        let newLevel = false;

        // Looping on visible objects
        for (let i = 0; i < visibles.length; i++) {
            const currentObject = visibles[i];

            // Looping on non-loaded levels
            for (let j = currentObject.currentLevel; j < currentObject.getNumberOfLevels(); j++) {
                if (!currentObject.getLevel(j)) {
                    // Here we calculate a Riemann sum of the utility on a period 
                    //  from the time we get the object to a horizon
                    // This way, we get an estimation of the integral of the utility of each item over the 
                    //  same period, and we can then download the most "useful" one.

                    // t_next is the time it will take to get the object from the server
                    // increment is a division of time for our Riemann sum (here, we divide the period in 4)
                    const t_next = currentObject.getLevelSize(j) * (1 / SpeedManager.getBandwidth() + 1 / SpeedManager.getDSpeed());
                    const increment = (this.HORIZON - t_next) / 4;

                    // If increment < 0 (t_next > horizon), we keep the utility equal to -1
                    //  A negative utility doesn't have much sense and is in reverse order
                    // If it is the case and we don't have a best object (positive utility) yet,
                    //  we execute the greedy strategy
                    if (increment > 0) {
                        // RIEMANN SUM
                        let utility = 0;
                        for (let t = 0; t < 4; t++) {
                            const deltaTime = t_next + t * increment;

                            // The Camera is a linear prediction of where the player will look at in a specific amount of time
                            //  This camera is used to calculate the predicted utility and then destroyed for memory reasons
                            const nextCam = camera_manager.getCameraInTime(deltaTime);
                            utility += increment * Metrics.calcUtility(currentObject, nextCam);
                            nextCam.dispose();
                        }

                        // Multiplying by the level's quality score in the end for optimisation purposes
                        utility *= currentObject.getLevelQuality(j);

                        // If we found an item with a better utility over the period (a better candidate),
                        //  we select it (HE IS THE CHOSEN ONE !o.)
                        if (utility > bestUtility) {
                            newLevel = true;
                            bestUtility = utility;
                            bestObject = currentObject;
                            bestLevel = j;
                        }
                    }
                    else if (bestUtility == -1) {
                        // The Camera is a linear prediction of where the player will look at in a specific amount of time
                        //  This camera is used to calculate the predicted utility and then destroyed for memory reasons
                        const nextCam = camera_manager.getCameraInTime(t_next);
                        const utility = Metrics.calcUtility(currentObject, nextCam) 
                                        * currentObject.getLevelQuality(j)              // The level's quality score
                                        / t_next;
                        nextCam.dispose();
                        
                        // If we found an item with a better utility over the period (a better candidate),
                        //  we select it (HE IS THE CHOSEN ONE !o.)
                        if (utility > bestUtility2) {
                            newLevel = true;
                            bestUtility2 = utility;
                            bestObject2 = currentObject;
                            bestLevel2 = j;
                        }
                    }
                }
            }
        }

        // ====================== DOWNLOADING THE MESH ====================

        const importedMeshes = [];
        if (newLevel) {
            try {
                if (bestUtility != -1)  importedMeshes.push(await bestObject.import(bestLevel));
                else                    importedMeshes.push(await bestObject2.import(bestLevel2));
            } catch (err) {
                console.error(err);                
            }
        }

        return importedMeshes;
    }
    

    /**
     * Greedy strategy proposed in paper DASH for 3D Networked Virtual Environment
     * @param object_manager The object manager calling for the method
     */
    private static async greedy1(object_manager: ObjectManager): Promise<Mesh[]> {
        //  For this strategy, we download the segment (mesh) that will give us the highest utility
        //  at the time it is downloaded
        
        // ================ INIT ========================
        
        const camera_manager = CameraManager.getInstance();

        const cameraLater: Camera = camera_manager.getCameraInTime(this.HORIZON);
        const visiblesNow: MuseumObject[] = object_manager.getVisibleObjects(camera_manager.getCamera());
        const visiblesLater: MuseumObject[] = object_manager.getVisibleObjects(cameraLater);
        const visibles: MuseumObject[] = [...visiblesNow, ...visiblesLater.filter( o => !~visiblesNow.indexOf(o) )];  // !~indexOf returns true if element is not in array and false if it is in

        cameraLater.dispose();

        if (visibles.length == 0) return [];
        
        // ================= EXECUTING OUR STRATEGY ======================= 

        let bestObject = visibles[0];
        let bestLevel = 0;
        let bestUtility = -1;
        let newLevel = false;       // Will remain false if all levels are downloaded

        // Looping on visible objects
        for (let i = 0; i < visibles.length; i++) {
            const currentObject = visibles[i];

            // Looping on non-loaded levels
            //  This is a bit dumb, because the utility doesnt vary between the LoDs
            //  It could if we divide by t_next but it wouldn't change the fact the lower levels are downloaded first
            //  We could add a quality factor to make the more detailed LoDs more interesting
            for (let j = currentObject.currentLevel; j < currentObject.getNumberOfLevels(); j++) {
                if (!currentObject.getLevel(j)) {
                    // t_next is the time it will take to get the object from the server, then decomress it
                    const t_next = currentObject.getLevelSize(j) * (1 / SpeedManager.getBandwidth() + 1 / SpeedManager.getDSpeed());
                    
                    // The Camera is a linear prediction of where the player will look at in a specific amount of time
                    //  This camera is used to calculate the predicted utility and then destroyed for memory reasons
                    const nextCam = camera_manager.getCameraInTime(t_next);
                    const utility = Metrics.calcUtility(currentObject, nextCam)
                                    * currentObject.getLevelQuality(j)              // The level's quality score
                                    / t_next;

                    nextCam.dispose();
                    
                    // If we found an item with a better utility over the period (a better candidate),
                    //  we select it (HE IS THE CHOSEN ONE !o.)
                    if (utility > bestUtility) {
                        newLevel = true;
                        bestUtility = utility;
                        bestObject = currentObject;
                        bestLevel = j;
                    }
                }
            }
        }
        
        // ====================== DOWNLOADING THE MESH ====================

        const importedMeshes = [];
        if (newLevel) {
            try {
                importedMeshes.push(await bestObject.import(bestLevel));
            } catch (err) {
                console.error(err);                
            }
        }

        return importedMeshes;
    }


    /**
     * Greedy strategy proposed in paper Towards 6DoF HTTP Adaptive Streaming Through Point Cloud Compression
     * @param object_manager The object manager calling for the method
     */
    private static async greedy2(object_manager: ObjectManager): Promise<Mesh[]> {
        //  For this strategy, we try to allocate the highest level to the object before going to the next one
        
        // ================ INIT ========================
        
        const cam: FreeCamera = CameraManager.getInstance().getCamera();
        const objects: MuseumObject[] = object_manager.getAllObjects();
        const utilities: Array<{ object: MuseumObject, utility: number, nextLevel: number }> = [];
        let newLevel = false;       // Will remain false if we don't select a level

        // ================== GETTING THE UTILITY AND SORTING =======================

        const bw = SpeedManager.getBandwidth();
        const ds = SpeedManager.getDSpeed();
        const budget = (bw * ds / (bw + ds)) * this.BUFFER;
        let nb_bits = 0;

        for (const obj of objects) {
            utilities.push({ object: obj, utility: Metrics.calcUtility(obj, cam), nextLevel: obj.currentLevel });
        };

        // Sorting our utilities array by descending utility (highest utility first)
        utilities.sort((a, b) => - a.utility + b.utility);
        
        // ================= EXECUTING OUR STRATEGY =======================

        // Looping on all objects (ordered)
        for (let i = 0; i < utilities.length; i++) {
            const objUtility = utilities[i];
            const currentObject = objUtility.object;
            let nextLevel = objUtility.nextLevel;

            // Looping on the levels until our budget is reached
            while (nextLevel + 1 < currentObject.getNumberOfLevels()) {
                // Calculating the cost to download the mesh
                //  if a mesh is already downloaded, its size is 0
                let cost = currentObject.getLevel(nextLevel + 1) ?
                            0 :
                            currentObject.getLevelSize(nextLevel + 1);
                
                cost -= currentObject.getLevel(nextLevel) ?
                        0 :
                        currentObject.getLevelSize(nextLevel);

                // If it costs too much for our budget, we go on to the next item
                //  otherwise, we set the level to download to the current level
                if (nb_bits + cost > budget) { break; }
                else {
                    nb_bits += cost;
                    nextLevel++;
                    newLevel = true;
                }
            }
            
            objUtility.nextLevel = nextLevel;
        }

        // ====================== DOWNLOADING THE MESHES ====================

        const importedMeshes = [];

        if (!newLevel) {
            let ut = 0;
            while (ut < utilities.length) {
                const objUtility = utilities[ut];

                if (objUtility.nextLevel + 1 >= objUtility.object.getNumberOfLevels()) {
                    ut++;
                }
                else {
                    importedMeshes.push(await objUtility.object.import(objUtility.nextLevel + 1));
                    break;
                }
            }
        }
        else {
            for (let i = 0; i < utilities.length; i++) {
                try {
                    const objUtility = utilities[i];
    
                    if (objUtility.nextLevel != objUtility.object.currentLevel)
                        importedMeshes.push(await objUtility.object.import(objUtility.nextLevel));
                } catch (err) {
                    console.error(err);
                }
            }
        }

        return importedMeshes;
    }


    /**
     * Uniform strategy proposed in paper Towards 6DoF HTTP Adaptive Streaming Through Point Cloud Compression
     * @param object_manager The object manager calling for the method
     */
    private static async uniform2(object_manager: ObjectManager): Promise<Mesh[]> {
        // For this strategy, we try to allocate the same level to all objects before going to the next one
        
        // ================ INIT ========================

        const cam: FreeCamera = CameraManager.getInstance().getCamera();
        const objects: MuseumObject[] = object_manager.getAllObjects();
        const utilities: Array<{ object: MuseumObject, utility: number, nextLevel: number }> = [];
        let newLevel = false;       // Will remain false if we don't select a level

        const bw = SpeedManager.getBandwidth();
        const ds = SpeedManager.getDSpeed();
        const budget = (bw * ds / (bw + ds)) * this.BUFFER;
        let nb_bits = 0;

        // ================== GETTING THE UTILITY AND SORTING =======================

        for (const obj of objects) {
            utilities.push({ object: obj, utility: Metrics.calcUtility(obj, cam), nextLevel: obj.currentLevel });
        };

        // Sorting our utilities array by descending utility (highest utility first)
        utilities.sort((a, b) => - a.utility + b.utility);
        // ================= EXECUTING OUR STRATEGY =======================

        let currentLevel = 1;
        let change = true;

        // Looping on levels ascending
        //  change is a boolean telling if we changed the level to download of at least one object in the loop
        //  I do it that way because the objects may have different numbers of levels
        while (change) {
            change = false;

            // Looping on all objects (ordered)
            for (let i = 0; i < utilities.length; i++) {
                const objUtility = utilities[i];
                const currentObject = objUtility.object;
                const nextLevel = objUtility.nextLevel;
    
                // Calculating the cost to download the mesh
                //  if a mesh is already downloaded, its size is 0
                if (currentLevel < currentObject.getNumberOfLevels()) {
                    let cost = currentObject.getLevel(currentLevel) ?
                                0 :
                                currentObject.getLevelSize(currentLevel);
                    
                    cost -= currentObject.getLevel(nextLevel) ?
                            0 :
                            currentObject.getLevelSize(nextLevel);
    
                    // If it costs too much for our budget, we go on to the next item
                    //  otherwise, we set the level to download to the current level
                    if (nb_bits + cost > budget) { continue; }
                    else {
                        change = true;

                        if (currentLevel > nextLevel) {
                            objUtility.nextLevel = currentLevel;
                            nb_bits += cost;
                            newLevel = true;
                        }
                    }
                }
            }

            currentLevel++;
        }

        // ====================== DOWNLOADING THE MESHES ====================


        const importedMeshes = [];

        if (!newLevel) {
            let ut = 0;

            while (ut < utilities.length) {
                const objUtility = utilities[ut];

                if (objUtility.nextLevel + 1 >= objUtility.object.getNumberOfLevels()) {
                    ut++;
                }
                else {
                    importedMeshes.push(await objUtility.object.import(objUtility.nextLevel + 1));
                    break;
                }
            }
        }
        else {
            for (let i = 0; i < utilities.length; i++) {
                try {
                    const objUtility = utilities[i];
    
                    if (objUtility.nextLevel != objUtility.object.currentLevel)
                        importedMeshes.push(await objUtility.object.import(objUtility.nextLevel));
                } catch (err) {
                    console.error(err);
                }
            }
        }

        return importedMeshes;
    }


    /**
     * Hybrid strategy proposed in paper Towards 6DoF HTTP Adaptive Streaming Through Point Cloud Compression
     * @param object_manager The object manager calling for the method
     */
    private static async hybrid2(object_manager: ObjectManager): Promise<Mesh[]> {
        //  For this strategy, we first allocate uniformly on the visible objects
        //  then greedily on the objects that are not in the frustum.

        // ================ INIT ========================

        const cam: FreeCamera = CameraManager.getInstance().getCamera();
        const visibles: MuseumObject[] = object_manager.getVisibleObjects(cam);
        const notVisibles: MuseumObject[] = object_manager.getNotVisibleObjects(cam);
        const visibleUtilities: Array<{ object: MuseumObject, utility: number, nextLevel: number }> = [];
        const notVisibleUtilities: Array<{ object: MuseumObject, utility: number, nextLevel: number }> = [];
        let newLevel = false;       // Will remain false if we don't select a level

        const bw = SpeedManager.getBandwidth();
        const ds = SpeedManager.getDSpeed();
        const budget = (bw * ds / (bw + ds)) * this.BUFFER;
        let nb_bits = 0;

        // ================== GETTING THE UTILITY AND SORTING =======================

        for (const obj of visibles) {
            visibleUtilities.push({ object: obj, utility: Metrics.calcUtility(obj, cam), nextLevel: obj.currentLevel });
        };
        for (const obj of notVisibles) {
            notVisibleUtilities.push({ object: obj, utility: Metrics.calcUtility(obj, cam), nextLevel: obj.currentLevel });
        };

        // Sorting our utilities array by descending utility (highest utility first)
        visibleUtilities.sort((a, b) => - a.utility + b.utility);
        notVisibleUtilities.sort((a, b) => - a.utility + b.utility);

        // ================= EXECUTING OUR STRATEGY =======================

        // ----------------- Part 1 : Uniform on Visible objects --------------
        
        let currentLevel = 1;
        let change = true;

        // Looping on levels ascending
        //  change is a boolean telling if we changed the level to download of at least one object in the loop
        //  I do it that way because the objects may have different numbers of levels
        while (change) {
            change = false;

            // Looping on visible objects (ordered)
            for (let i = 0; i < visibleUtilities.length; i++) {
                const objUtility = visibleUtilities[i];
                const currentObject = objUtility.object;
                const nextLevel = objUtility.nextLevel;
    
                if (currentLevel < currentObject.getNumberOfLevels()) {
                    // Calculating the cost to download the mesh
                    //  if a mesh is already downloaded, its size is 0
                    let cost = currentObject.getLevel(currentLevel) ?
                                0 :
                                currentObject.getLevelSize(currentLevel);
                    
                    cost -= currentObject.getLevel(nextLevel) ?
                            0 :
                            currentObject.getLevelSize(nextLevel);
    
                    // If it costs too much for our budget, we go on to the next item
                    //  otherwise, we set the level to download to the current level
                    if (nb_bits + cost > budget) { continue; }
                    else {
                        change = true;

                        if (currentLevel > nextLevel) {
                            objUtility.nextLevel = currentLevel;
                            nb_bits += cost;
                            newLevel = true;
                        }
                    }
                }
            }

            currentLevel++;
        }

        // ----------------- Part 2 : Greedy on Non-Visible objects ----------------

        // Looping on non visible objects (ordered)
        for (let i = 0; i < notVisibleUtilities.length; i++) {
            const objUtility = notVisibleUtilities[i];
            const currentObject = objUtility.object;
            let nextLevel = objUtility.nextLevel;

            // Looping on the levels until our budget is reached
            while (nextLevel + 1 < currentObject.getNumberOfLevels()) {
                // Calculating the cost to download the mesh
                //  if a mesh is already downloaded, its size is 0
                let cost = currentObject.getLevel(nextLevel + 1) ?
                            0 :
                            currentObject.getLevelSize(nextLevel + 1);
                
                cost -= currentObject.getLevel(nextLevel) ?
                        0 :
                        currentObject.getLevelSize(nextLevel);

                // If cost is too much for our budget, we go on to the next item
                //  otherwise, we set the level to download to the current level
                if (nb_bits + cost > budget) { break; }
                else {
                    nb_bits += cost;
                    nextLevel++;
                    newLevel = true;
                }
            }

            objUtility.nextLevel = nextLevel;
        }
        
        // ====================== DOWNLOADING THE MESHES ====================

        const importedMeshes = [];

        if (!newLevel) {
            let ut = 0;
            while (ut < visibleUtilities.length) {
                const objUtility = visibleUtilities[ut];

                if (objUtility.nextLevel + 1 >= objUtility.object.getNumberOfLevels()) {
                    ut++;
                }
                else {
                    importedMeshes.push(await objUtility.object.import(objUtility.nextLevel + 1));
                    break;
                }
            }

            if (importedMeshes.length == 0) {
                let ut2 = 0;
                while (ut2 < notVisibleUtilities.length) {
                    const objUtility = notVisibleUtilities[ut2];

                    if (objUtility.nextLevel + 1 >= objUtility.object.getNumberOfLevels()) {
                        ut2++;
                    }
                    else {
                        importedMeshes.push(await objUtility.object.import(objUtility.nextLevel + 1));
                        break;
                    }
                }
            }
        }
        else {

            for (let i = 0; i < visibleUtilities.length; i++) {
                try {
                    const objUtility = visibleUtilities[i];
                    if (objUtility.nextLevel != objUtility.object.currentLevel) 
                        importedMeshes.push(await objUtility.object.import(objUtility.nextLevel));
                } catch (err) {
                    // Requested mesh was already downloaded
                    console.error(err);               
                }
            }
            for (let i = 0; i < notVisibleUtilities.length; i++) {
                try {
                    const objUtility = notVisibleUtilities[i];
                    if (objUtility.nextLevel != objUtility.object.currentLevel) 
                        importedMeshes.push(await objUtility.object.import(objUtility.nextLevel));
                } catch (err) {
                    // Requested mesh was already downloaded
                    console.error(err);                
                }
            }
        }

        return importedMeshes;
    }
}