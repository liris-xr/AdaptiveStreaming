/**
 * Utility class contains queues for download and decompression speed
 * Has static getter for those speeds
 */
export default class SpeedManager {
    private static bandwidthQueue: number[] = [];   // The queue containing the last download speeds
    private static dSpeedQueue: number[] = [];      // The queue containing the last decompression speeds
    private static ELEMENTS_IN_QUEUES = 10;         // Max number of elements in the queues

    // ================================================================
    // ===                   PUBLIC METHODS                         ===
    // ================================================================

    /**
     * Pushes pBandwidth in the bandwidth queue and updates the average bandwidth
     * @param pBandwidth The speed at which the last object has been downloaded
     */
    public static pushBandwidth(pBandwidth: number): void {
        this.bandwidthQueue.push(pBandwidth);
        
        // Keeping only the last (elementsInQueues) elements
        while (this.bandwidthQueue.length > this.ELEMENTS_IN_QUEUES) {
            this.bandwidthQueue.shift();
        }
    }

    /**
     * Pushes pDSpeed in the DSpeed queue and updates the average DSpeed
     * @param pDSpeed The Decompression speed
     */
    public static pushDSpeed(pDSpeed: number): void {
        this.dSpeedQueue.push(pDSpeed);
        
        // Keeping only the last (elementsInQueues) elements
        while (this.dSpeedQueue.length > this.ELEMENTS_IN_QUEUES) {
            this.dSpeedQueue.shift();
        }
    }

    /**
     * Calculates and returns the average bandwidth over the last iterations
     */
    public static getBandwidth(): number {
        let total = 0;
        this.bandwidthQueue.forEach((bwElt) => {
            total += bwElt;
        });
        const bw = (this.bandwidthQueue.length == 0) ? 100 : total / this.bandwidthQueue.length;
        return bw;
    }

    /**
     * Calculates and returns the average decompression speed over the last iterations
     */
    public static getDSpeed(): number {
        let total = 0;
        this.dSpeedQueue.forEach((dsElt) => {
            total += dsElt;
        });
        return (this.dSpeedQueue.length == 0) ? 100 : total / this.dSpeedQueue.length;
    }
}