import { Scene } from "@babylonjs/core/scene";
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";


export default class DracoImporter {
    private scene: Scene;
    private draco: BABYLON.DracoCompression;
    private metadata: any | null;
    private folderPath : string | null;

    private position: BABYLON.Vector3;
    private rotation: BABYLON.Vector3;
    private scale: BABYLON.Vector3;

    private material: BABYLON.PBRMaterial | undefined;
    public container: BABYLON.Mesh | null;

    constructor(pScene: Scene, 
                pFolderPath: null | string, 
                pPosition: BABYLON.Vector3,
                pRotation: BABYLON.Vector3,
                pScale: BABYLON.Vector3) {
        this.scene = pScene;
        this.draco = new BABYLON.DracoCompression(1);
        this.folderPath = pFolderPath;
        this.container = null;

        this.position = pPosition;
        this.rotation = pRotation;
        this.scale = pScale;
    }

    async _init_(): Promise<void> {
        if (this.folderPath != null) {
            let pMetadata = await this.loadFileAsStringAsync(this.folderPath + "metadata.json");
            this.metadata = JSON.parse(pMetadata);

            this.container = new BABYLON.Mesh(this.metadata.name, this.scene);
            let texture = new BABYLON.Texture(this.folderPath + this.metadata.Textures[0].filename, this.scene);      

            this.material = new BABYLON.PBRMaterial(this.metadata.name + "Material", this.scene);
            this.material.backFaceCulling = false;
            this.material.albedoTexture = texture;
            this.material.metallicTexture = texture;
            this.material.roughness = 1;
            this.material.metallic = 0.3;
        }
    }

    async import(level: number): Promise<BABYLON.Mesh | null> {
        if (level < 0 || level > this.metadata.nb_levels) return null;

        const data = await this.loadFileAsArrayBufferAsync(this.folderPath + this.metadata.Levels[level].filename);
        let vertexData = await this.draco.decodeMeshAsync(data);

        let mesh = new BABYLON.Mesh(this.metadata.name + level, this.scene, this.container);
        
        const geometry = new BABYLON.Geometry("dracoGeometry", this.scene);
        BABYLON.VertexData.ImportVertexData(vertexData, geometry);
        geometry.applyToMesh(mesh);
        
        if (this.material) mesh.material = this.material;

        mesh.position = this.position;
        mesh.rotation = this.rotation;
        mesh.scaling = this.scale;
        mesh.receiveShadows = true;
        
        return mesh;
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

    loadFileAsArrayBufferAsync(url: string): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>(function (resolve, reject) {
            BABYLON.Tools.LoadFile(url, function(data) {
                if (typeof(data) == 'string') {
                    reject("Requested data was a string");
                }
                else {
                    resolve(data);
                }
            }, undefined, undefined, true, function (req, ex) {
                reject(ex);
            });
        });
    }
}