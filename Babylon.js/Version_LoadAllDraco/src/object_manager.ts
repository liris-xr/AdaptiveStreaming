import { Scene } from "@babylonjs/core/scene";
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { ShadowGenerator } from "@babylonjs/core/Lights";

import DracoImporter from './draco_importer';

interface ObjectData{ 
    name: string; 
    position: number[]; 
    rotation: number[]; 
    scale: number; 
}

export default class ObjectManager {
    private scene: Scene;
    private shadowGenerator: ShadowGenerator | null;
    private container: BABYLON.Mesh | undefined;

    private objectsData: any | null;
    private importers: DracoImporter[];
    private levels: number[];

    constructor(pScene: Scene, pShadowGenerator: ShadowGenerator | null, pContainer?: BABYLON.Mesh) {
        this.scene = pScene;
        this.shadowGenerator = pShadowGenerator;
        this.container = pContainer;

        this.importers = [];
        this.levels = [];
    }

    async _init_() {
        let objData = await this.loadFileAsStringAsync("./src/positions.json");
        this.objectsData = JSON.parse(objData);

        const ToRad = Math.PI / 180;
            
        await Promise.all(this.objectsData.map(async (element: ObjectData, j: number) => {
            let pos = new BABYLON.Vector3(element.position[0], element.position[1], element.position[2]);
            let rot = new BABYLON.Vector3(element.rotation[0] * ToRad, element.rotation[1] * ToRad, element.rotation[2] * ToRad);
            let sca = new BABYLON.Vector3(element.scale, element.scale, element.scale);
            
            let importer = new DracoImporter(this.scene, "./assets/objects/" + element.name + "/", pos, rot, sca);
            this.importers.push(importer);
            this.levels.push(0);

            await importer._init_();
            if (importer.container && this.container) importer.container.parent = this.container;
        
            importer.import(0).then((msh) => {
                if (msh && this.shadowGenerator) this.shadowGenerator.getShadowMap()!.renderList!.push(msh);
            });
        }));
    }

    async anim_import() {
        for (let i = 1; i < 10; i++) {
            await Promise.all(this.importers.map((importer) => {
                importer.import(i);
            }));
        }
    }

    loadFileAsStringAsync(url: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            BABYLON.Tools.LoadFile(url, function(data) {
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