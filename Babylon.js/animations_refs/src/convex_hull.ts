import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import { intersection, MultiPolygon, Polygon } from "polygon-clipping";

/**
 * Class calculating the visible area of an object.  
 * Calculate a convex hull of the bounding box and returns its area on screen.
 */
export default class ConvexHull {

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Main method calculating the hull and returning its area.
     * @param points The corners of the bounding box
     */
    public static getSurfaceOnScreen(points: Vector2[]): number {
        const hull = this.computeConvexHull(points);
        const hullAsPolygon = this.vector2ToPolygon(hull);

        // Clipping the polygon in the screen
        const screenPolygon = [[[0,0],[1,0],[1,1],[0,1],[0,0]]];
        const polygonOnScreen = intersection(hullAsPolygon as Polygon, screenPolygon as Polygon);

        return this.polygonSurface(polygonOnScreen);
    }

    /**
     * Creates a convex hull from a list of points
     * @param points The list of points
     */
    public static computeConvexHull(points: Vector2[]): Vector2[] {
        // https://en.wikipedia.org/wiki/Gift_wrapping_algorithm
        points.sort((v1, v2) => { return v1.x - v2.x; });

        const firstPoint = points[0];
        let pointOnHull = points[0];
        let endpoint: Vector2;
        const hull = [];

        do {
            if (hull) hull.push(pointOnHull);
            
            endpoint = points[0];
            for (const v of points) {
                if ((endpoint == pointOnHull) || (this.isBetterPoint(v, endpoint, pointOnHull))) {
                    endpoint = v;
                }
            };

            pointOnHull = endpoint;
        } while (endpoint != firstPoint);
        
        return hull;
    }

    /**
     * Returns the area of a polygon
     * @param polygon A MultiPolygon (array of polygon)
     */
    public static polygonSurface(polygon: MultiPolygon): number {
        if (!(polygon && polygon[0] && polygon[0][0])) return 0;
        const nodelist = polygon[0][0];
        let surface: number = 0;

        for (let i = 1; i < nodelist.length; i++) {
            surface += nodelist[i - 1][0] * nodelist[i][1] - nodelist[i - 1][1] * nodelist[i][0];
        }

        return Math.abs(surface) / 2;
    }
    

    // ================================================================
    // ===                   PRIVATE METHODS                        ===
    // ================================================================

    /**
     * Returns true if pointToTest is a better point than pointToCompareTo for the hull.
     * @param pointToTest Point that will be tested
     * @param pointToCompareTo Reference point to be tested against
     * @param origin Current point on the hull
     */
    private static isBetterPoint(pointToTest: Vector2, pointToCompareTo: Vector2, origin: Vector2): boolean {
        // orientation method from https://the-algorithms.com/algorithm/jarvis-algorithm
        const p = origin;
        const q = pointToTest;
        const r = pointToCompareTo;

        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        return val < 0;
    }

    /**
     * Converts a list of Vector2 into a polygon (array of array of array of number)
     * @param points A list of Vector2
     */
    private static vector2ToPolygon(points: Vector2[]): number[][][] {
        const array: number[][][] = [[]];

        for (const vect of points) {
            array[0].push([vect.x, vect.y]);
        }

        return array;
    }
}