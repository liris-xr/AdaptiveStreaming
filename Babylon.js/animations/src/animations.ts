import { Vector3 } from "@babylonjs/core/Maths";

export const frameRate = 10;

export const upperroom = {
    position: [
        {
            frame: 0,
            value: new Vector3(-5, 6.9, -9)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(-9.5, 6.9, -11)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(-14, 6.9, -8)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(-27, 6.9, -7)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(-29, 6.9, 3)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(-24, 6.9, 6.5)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(-15, 6.9, 8.5)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(-7.5, 6.9, 8.5)
        }
    ],
    rotation: [
        {
            frame: 0,
            value: new Vector3(Math.PI / 12, Math.PI / 12, 0)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(Math.PI / 18, -Math.PI / 9, 0)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(0, -2*Math.PI / 3, 0)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(Math.PI / 36, -Math.PI / 2, 0)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(0, 0, 0)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(Math.PI / 12, Math.PI / 6, 0)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(Math.PI / 12, 3*Math.PI / 4, 0)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(Math.PI / 12, 2 * Math.PI / 3, 0)
        }
    ]       
};

export const mainroom = {
    position: [
        {
            frame: 0,
            value: new Vector3(0, 1.9, 0)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(-4, 1.9, -3)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(-11, 1.9, -1.5)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(-15, 1.9, -2)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(-12, 1.9, 2)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(-9, 1.9, 2)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(-3, 1.9, 1.5)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(0, 1.9, 0)
        }
    ],
    rotation: [
        {
            frame: 0,
            value: new Vector3(0, -Math.PI / 2, 0)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(Math.PI / 18, -Math.PI, 0)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(Math.PI / 17, -Math.PI, 0)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(Math.PI / 36, 0, 0)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(Math.PI / 18, 0, 0)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(0, Math.PI / 2, 0)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(0, Math.PI, 0)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(0, 3 * Math.PI / 2, 0)
        }
    ]
};

export const statueroom = {
    position: [
        {
            frame: 0,
            value: new Vector3(5, 1.9, 4)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(8, 1.9, -8)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(10, 1.9, -8)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(11, 1.9, -3)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(13, 1.9, -1)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(9.5, 1.9, 3)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(8, 1.9, 5)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(7.5, 1.9, 6.5)
        }
    ],
    rotation: [
        {
            frame: 0,
            value: new Vector3(Math.PI / 18, -5*Math.PI / 6, 0)
        },
        {
            frame: 3 * frameRate,
            value: new Vector3(Math.PI / 18, -4*Math.PI / 6, 0)
        },
        {
            frame: 6 * frameRate,
            value: new Vector3(Math.PI / 18, -9*Math.PI/6, 0)
        },
        {
            frame: 9 * frameRate,
            value: new Vector3(Math.PI / 36, -4*Math.PI / 3, 0)
        },
        {
            frame: 12 * frameRate,
            value: new Vector3(-Math.PI / 6, -11*Math.PI / 6, 0)
        },
        {
            frame: 15 * frameRate,
            value: new Vector3(-Math.PI / 36, -5*Math.PI / 3, 0)
        },
        {
            frame: 18 * frameRate,
            value: new Vector3(0, -2*Math.PI, 0)
        },
        {
            frame: 21 * frameRate,
            value: new Vector3(Math.PI / 18, -29*Math.PI / 12, 0)
        }
    ]       
};