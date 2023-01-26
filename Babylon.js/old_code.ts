/*

    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;
    
    // Assign the left and right controllers to member variables
    xrHelper.input.onControllerAddedObservable.add((inputSource) => {
        console.log(inputSource);
        if(inputSource.uniqueId.endsWith("left")) 
        {
            this.leftController = inputSource;
        }
        else 
        {
            this.rightController = inputSource;
        }  
    });

    // Register event handler for selection events (pulling the trigger, clicking the mouse button)
    this.scene.onPointerObservable.add((pointerInfo) => {
        this.processPointer(pointerInfo);
    });

    // Polling for controller input
    // this.processControllerInput();

    // Event handler for processing pointer events
    private processPointer(pointerInfo: PointerInfo): void
    {
        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                
                if (pointerInfo.pickInfo?.hit) {

                    // If the object is currently highlighted, disable the edge renderer
                    if(pointerInfo.pickInfo.pickedMesh!.edgesRenderer)
                    {
                        pointerInfo.pickInfo.pickedMesh!.disableEdgesRendering();
                    }
                    // Otherwise, enable edge rendering to highlight the object
                    else
                    {
                        pointerInfo.pickInfo.pickedMesh!.enableEdgesRendering();
                        pointerInfo.pickInfo.pickedMesh!.edgesWidth = 2;
                    }
                }
                */
                /*if (this.animationOn) {
                    this.stopAnimation();
                }
                else {
                    this.startAnimation();
                }
                break;
        }
    }

    
    // Process event handlers for controller input
    private processControllerInput(): void
    {
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftThumbstick(this.leftController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onLeftX(this.leftController?.motionController?.getComponent("x-button"));
        this.onLeftY(this.leftController?.motionController?.getComponent("y-button"));

        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        this.onRightB(this.rightController?.motionController?.getComponent("b-button"));
    }


    private onLeftTrigger(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left trigger pressed");
            }
            else
            {
                Logger.Log("left trigger released");
            }
        }     
    }

    private onLeftSqueeze(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left squeeze pressed");
            }
            else
            {
                Logger.Log("left squeeze released");
            }
        }  
    }

    private onLeftX(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left X pressed");
            }
            else
            {
                Logger.Log("left X released");
            }
        }  
    }

    private onLeftY(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left Y pressed");
            }
            else
            {
                Logger.Log("left Y released");
            }
        }  
    }

    private onLeftThumbstick(component?: WebXRControllerComponent): void
    {   
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left thumbstick pressed");
            }
            else
            {
                Logger.Log("left thumbstick released");
            }
        }  

        if(component?.changes.axes)
        {
            Logger.Log("left thumbstick axes: (" + component.axes.x + "," + component.axes.y + ")");
        }
    }

    private onRightTrigger(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right trigger pressed");
            }
            else
            {
                Logger.Log("right trigger released");
            }
        }  
    }

    private onRightSqueeze(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right squeeze pressed");
            }
            else
            {
                Logger.Log("right squeeze released");
            }
        }  
    }

    private onRightA(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right A pressed");
            }
            else
            {
                Logger.Log("right A released");
            }
        }  
    }

    private onRightB(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right B pressed");
            }
            else
            {
                Logger.Log("right B released");
            }
        }  
    }

    private onRightThumbstick(component?: WebXRControllerComponent): void
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right thumbstick pressed");
            }
            else
            {
                Logger.Log("right thumbstick released");
            }
        }  

        if(component?.changes.axes)
        {
            Logger.Log("right thumbstick axes: (" + component.axes.x + "," + component.axes.y + ")");

            // If thumbstick crosses the turn threshold to the right
            if(component.changes.axes.current.x > 0.75 && component.changes.axes.previous.x <= 0.75)
            {
                // Snap turn by 45 degrees
                const cameraRotation = Quaternion.FromEulerAngles(0, 45 * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }

            // If thumbstick crosses the turn threshold to the left
            if(component.changes.axes.current.x < -0.75 && component.changes.axes.previous.x >= -0.75)
            {
                // Snap turn by -45 degrees
                const cameraRotation = Quaternion.FromEulerAngles(0, -45 * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }

        }

        // Forward locomotion, deadzone of 0.1
        if(component?.axes.y! > 0.1 || component?.axes.y! < -0.1)
        {
            // Get the current camera direction
            const directionVector = this.xrCamera!.getDirection(Axis.Z);
            
            // Restrict vertical movement
            directionVector.y = 0;

            // Use delta time to calculate the move distance based on speed of 3 m/sec
            const moveDistance = -component!.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the camera forward
            this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));
        }

    } 


    

    async WWimportFromUrl(url: string): Promise<BABYLON.Mesh> {
        const data = await this.loadFileAsync(url);
        let mesh = await this.decompressData(data as ArrayBuffer);

        if (this.material) mesh.material = this.material;

        const ToRad = 2 * Math.PI / 360;
        mesh.position = new BABYLON.Vector3(-7, 1, -7);
        mesh.rotation = new BABYLON.Vector3(105 * ToRad, 145 * ToRad, 0);
        
        // Testing
        mesh.translate(new BABYLON.Vector3(Math.random(), 0, Math.random()), 10*Math.random(), BABYLON.Space.WORLD);
        
        return mesh;
    }

    async decompressData( data : ArrayBuffer): Promise<BABYLON.Mesh> {
        var promise = new Promise<BABYLON.Mesh>(async (resolve, reject) =>{
            var callback = (event: MessageEvent) => {
                const vertexData = event.data;
                let parent = new BABYLON.Mesh("dummy", this.scene);
                let mesh = new BABYLON.Mesh("dracoMesh", this.scene, parent);
                const geometry = new BABYLON.Geometry("dracoGeometry", this.scene);

                BABYLON.VertexData.ImportVertexData(vertexData, geometry);
                geometry.applyToMesh(mesh);

                //We resolve the promise with the mesh.
                resolve(parent);
            }

            let workerContent = `
                importScripts("https://preview.babylonjs.com/babylon.js")

                self.onmessage = async e => {
                    let data = e.data
                    var dracoCompression = new BABYLON.DracoCompression(1);
                    var vertexData = await dracoCompression.decodeMeshAsync(data);
                    self.postMessage(vertexData);
                    self.close();
                }
            `

            let blobUrl = URL.createObjectURL(new Blob([workerContent]));
            let myWorker = new Worker(blobUrl);

            myWorker.onmessage = callback;
            myWorker.postMessage( data );
        });

        return promise;
    }
    */