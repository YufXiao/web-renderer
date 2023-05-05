import { useEffect } from "react";
import SceneInit from '../sceneInit';
import * as THREE from 'three'; 
import { BoxGeometry, MeshBasicMaterial } from "three";
import { GUI } from 'lil-gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Link } from "react-router-dom";



export default function MeshRenderer() {

  const meshScene = new SceneInit('MeshRendererCanvas');

  useEffect(() => {
      meshScene.initialize();
      meshScene.animate(); 

      const boxGeometry = new THREE.BoxGeometry(100, 1, 100);
      boxGeometry.translate(0, -10, 0);
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0.8,
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      // boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      meshScene.scene.add(boxMesh);
      
      meshScene.addPointLightHelper(0.5);
      // meshScene.addDirectionalLightHelper(0.5);
      return () => {
          console.log('disposing');
          meshScene.dispose();
          document.body.removeChild(meshScene.renderer.domElement);
      };
  }, []);

  const handleFileUpload = (event : any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const objLoader = new OBJLoader();
          let loadedMesh;
          objLoader.load(reader.result as string, (objScene) => {
              loadedMesh = objScene;
              const material = new THREE.MeshStandardMaterial({ color: 0x000f00 });
              loadedMesh.position.set(0, 0, 0);
              loadedMesh.castShadow = true;
              loadedMesh.receiveShadow = true;
              meshScene.dragableObjects.push(loadedMesh);
              meshScene.scene.add(loadedMesh);

          });
        };
        reader.readAsDataURL(file);
      }
    };
  
    const handleClick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.obj, ply';
      input.addEventListener('change', handleFileUpload);
      input.click();
    };

    const handleClearScene = () => {
      const meshes : any = [];
      meshScene.scene.traverse((object : any) => {
        if (object instanceof THREE.Mesh) {
          meshes.push(object);
        }
      });
    
      meshes.forEach((mesh : any) => {
        
        mesh.geometry.dispose();
        mesh.material.dispose();
        meshScene.scene.remove(mesh);
      });
      meshScene.renderer.render(meshScene.scene, meshScene.camera);
      console.log(meshes);
      console.log(meshScene.scene);
      console.log('Cleared scene');
    };

    const handleBack = () => {
      meshScene.renderer.clear();
    }

  return ( 
      <div className="MeshRenderer flex flex-col justify-center items-center">
          <div className="CanvasContainer relative">
              <canvas id="MeshRendererCanvas" />
          </div>
          <div className="absolute bottom-4 center">
            <button
                className="flex-grow mt-4 mb-5 w-60 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded"
                onClick={handleClick}
            >
                upload
            </button>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/">
              <button
                className="flex-grow mt-4 mb-5 w-60 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded"
                onClick={handleBack}
              >
                Back
              </button>
            </Link>
          </div>
          <div className="absolute bottom-4 right-4">
            
            <button
              className="flex-grow mt-4 mb-5 w-60 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded"
              onClick={handleClearScene}
            >
              Clear Scene
            </button>
            
          </div>
      </div>
    );
}
