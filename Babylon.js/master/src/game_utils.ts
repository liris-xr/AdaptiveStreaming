import { Engine, Scene } from "@babylonjs/core";

/**
 * Singleton creating the canvas, engine and scene
 */
export default class Utils {
    // Singleton instance
    private static _instance: Utils;

    public canvas: HTMLCanvasElement;                  // The HTML page's canvas where the app is drawn
    public engine: Engine;                             // The game engine
    public scene: Scene;                               // The scene where the elements are placed

    private constructor() {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true, {disableWebGL2Support:true}); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   
    }

    /**
     * Get the instance or create it if it hasn't
     * @returns The singleton instance
     */
    public static getInstance() {
        if (!this._instance) {
            this._instance = new Utils();
        }
        
        return this._instance;
    }
}
