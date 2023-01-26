import { FreeCamera } from "@babylonjs/core/";
import { Vector2, Vector3, Matrix } from "@babylonjs/core/Maths";

import MuseumObject from "./museum_object";
import ConvexHull from "./convex_hull";

/**
 * An enumeration listing all the different metrics options
 */
export enum ChooseMetric {
    Surface,
    Distance,
    Visible,
    Potential,
    Visible_Potential
}


/**
 * Class where the different metrics are implemented
 */
export default class Metrics {
    private static _chosenMetric: ChooseMetric = ChooseMetric.Distance; 

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Set the metric to be calculated with calcUtility
     * @param metric The metric to be calculated
     */
    public static setMetric(metric: ChooseMetric) {
        this._chosenMetric = metric;
    }
    
    /**
     * Calculate the utility using the chosen metric
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    public static calcUtility(object: MuseumObject, camera: FreeCamera): number {
        switch (this._chosenMetric) {
            case ChooseMetric.Distance:
                return this.distance(object, camera);

            case ChooseMetric.Surface:
                return this.surface(object, camera);

            case ChooseMetric.Visible:
                return this.visible(object, camera);

            case ChooseMetric.Potential:
                return this.potential(object, camera);

            case ChooseMetric.Visible_Potential:
                return this.visible_potential(object, camera);

            default:
                return Number.NaN;
        }
    }

    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

    /**
     * Metric returning the inversed square distance to the object
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    private static distance(object: MuseumObject, camera: FreeCamera): number {
        // We have to clone those in order to not modify the camera position
        const objPosition = object.getPosition().clone();
        const camPosition = camera.position.clone();
        
        return 1 / objPosition
                .scale(-1)
                .add(camPosition)  // Vector between the camera and the object
                .lengthSquared();
    }

    /**
     * Metric returning the scaled area of the object divided by the squared distance
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    private static surface(object: MuseumObject, camera: FreeCamera): number {
        const area = object.getMetadata().area;
        const scale = object.getScale().x;    // x, y and z are the same value so it doesn't matter

        // We have to clone those in order to not modify the camera position
        const objPosition = object.getPosition().clone();
        const camPosition = camera.position.clone();
        
        return area * scale * scale /                  // Scaling twice since it is a surface
                objPosition
                .scale(-1)
                .add(camPosition)  // Vector between the camera and the object
                .lengthSquared();
    }

    /**
     * Metric returning the relative area on screen of the object
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    private static visible(object: MuseumObject, camera: FreeCamera): number {
        const currentMesh = object.getCurrentMesh();             // The currently displayed mesh
        const box = currentMesh.getBoundingInfo().boundingBox;    // Its bounding box

        // Projecting the corners of the bounding box on the screen
        const corners = [];
        for (const vec of box.vectorsWorld) {
            const to2D = Vector3.Project(vec,
                Matrix.Identity(), 
                camera.getTransformationMatrix(),
                camera.viewport
            );
            if (to2D.z >= 0)    corners.push(new Vector2(to2D.x, to2D.y));  // If user is inside a bounding box, this will give unexpected results
        }

        // Calculating the surface
        if (corners.length <= 2)    return 0;
        
        const surfaceOnScreen = ConvexHull.getSurfaceOnScreen(corners);
        return surfaceOnScreen;
    }

    /**
     * Metric returning the relative area on screen of the object when the camera is targeting this object
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    private static potential(object: MuseumObject, camera: FreeCamera): number {
        const currentMesh = object.getCurrentMesh();             // The currently displayed mesh
        const box = currentMesh.getBoundingInfo().boundingBox;    // Its bounding box
        const cameraCopy = camera.clone("dummy0") as FreeCamera;

        // Targetting the object
        cameraCopy.setTarget(box.centerWorld);

        // Projecting the corners of the bounding box on the screen
        const corners = [];
        for (const vec of box.vectorsWorld) {
            const to2D = Vector3.Project(vec,
                Matrix.Identity(), 
                cameraCopy.getViewMatrix(true).multiply(cameraCopy.getProjectionMatrix(true)),
                camera.viewport
            );
            if (to2D.z >= 0)    corners.push(new Vector2(to2D.x, to2D.y));  // If user is inside a bounding box, this will give unexpected results
        }

        cameraCopy.dispose();

        // Calculating the surface
        if (corners.length <= 2)    return 0;

        const surfaceOnScreen = ConvexHull.getSurfaceOnScreen(corners);
        return surfaceOnScreen;
    }

    /**
     * Metric returning the visible area if visible and -cos of potential area otherwise
     * @param object The object to calculate the utility of
     * @param camera The point of view used for calculation
     */
    private static visible_potential(object: MuseumObject, camera: FreeCamera): number {
        // Visible area
        let score = this.visible(object, camera);

        // If not visible --> -cos(Potential Area)
        if (score == 0) {
            score = -Math.cos(this.potential(object, camera));
        }

        return score;
    }
}