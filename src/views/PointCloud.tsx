import { useEffect } from "react";
import SceneInit from '../sceneInit';
import * as THREE from 'three'; 
import { BoxGeometry, MeshBasicMaterial } from "three";
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';


export default function PointCloudRenderer() {

    const pcScene = new SceneInit('PointCloudRendererCanvas');

    useEffect(() => {
        pcScene.initialize();
        pcScene.animate(); 

        pcScene.scene.getObjectByName('Directional Light');
        pcScene.addDirectionalLightHelper(1);

        return () => {
            pcScene.dispose();
        };
    }, []);

    const handleFileUpload = (event : any) => {
        const file = event.target.files[0];
        if (file) {
          const fileExtension = file.name.split(".").pop().toLowerCase();
          console.log(fileExtension);
          const reader = new FileReader();
          reader.onload = () => {
            let objLoader;
            if (fileExtension === "ply") {
                objLoader = new PLYLoader();
              } else if (fileExtension === "pcd") {
                objLoader = new PCDLoader();
              } else {
                alert("Unsupported file type. Please upload a .ply or .pcd file.");
                return;
              }
            
            let loadedPC;
            objLoader.load(reader.result as string, (objScene) => {
                loadedPC = objScene;
                pcScene.scene.add(loadedPC);
            });
          };
          reader.readAsDataURL(file);
        }
      };
    
      const handleClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pcd'; // currently only supports .pcd
        input.addEventListener('change', handleFileUpload);
        input.click();
      };
        
    return ( 
        <div className="PointCloudRenderer flex flex-col justify-center items-center">
            <div className="CanvasContainer relative">
                <canvas id="PointCloudRendererCanvas" />
            </div>
            <button
                className="flex-grow mt-4 w-60 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded"
                onClick={handleClick}
            >
                upload point cloud
            </button>
            <div className="absolute bottom-4 left-4">
              {/* <Link href="/">
                <button
                  className="flex-grow mt-4 mb-5 w-60 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded"
                >
                  Back
                </button>
              </Link> */}
            </div>
        </div>
      );
}
