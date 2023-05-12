import { useEffect } from "react";
import SceneInit from '../sceneInit';
import * as THREE from 'three'; 
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'lil-gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';


export default function Home() {

  const scene = new SceneInit('RendererCanvas');

  useEffect(() => {
    scene.initialize();
    scene.animate(); 

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
    scene.scene.add(boxMesh);
    
    scene.addPointLightHelper(0.5);

    const gui = new GUI({ autoPlace: true });
    const lightFolder = gui.addFolder('Light');
    lightFolder.add(scene.pointLight, 'intensity', 0, 10);
    lightFolder.add(scene.pointLight.position, 'x', -10, 10);
    lightFolder.add(scene.pointLight.position, 'y', -10, 10);
    lightFolder.add(scene.pointLight.position, 'z', -10, 10);
    lightFolder.open();

    const transformControls = new TransformControls(scene.camera, scene.renderer.domElement);
        transformControls.addEventListener('dragging-changed', (event) => {
            scene.controls.enabled = !event.value;
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedObject : any = null;
    window.addEventListener('mousedown', (event) => {
        if (event.target === scene.renderer.domElement) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, scene.camera);
            const intersects = raycaster.intersectObjects(scene.dragableObjects);
            
            if (intersects.length > 0) {
                const object = intersects[0].object;
                selectedObject = object;
                console.log(selectedObject);
                scene.controls.enabled = false;
                transformControls.attach(object);
                transformControls.setMode('translate');
                scene.scene.add(transformControls);
            } else {
                selectedObject = null;
            }
        }
    });

    window.addEventListener('keydown', (event) => {
        const key = event.key;
        if (selectedObject && key === 'Delete') {
            console.log('Delete');
            scene.scene.remove(selectedObject);
            transformControls.detach();
            selectedObject = null;
        }
      });

    const guiControls = { mode: 'rotate' };
    gui.add(guiControls, 'mode', ['translate', 'rotate', 'scale']).onChange((mode : any) => {
        transformControls.setMode(mode);
    });

  }, []);

    const handleFileUpload = (event : any) => {
        const file = event.target.files[0];
        if (file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        console.log(fileExtension);
        const reader = new FileReader();
        reader.onload = () => {
            let loader;
            let loadedMesh;
            if (fileExtension === 'pcd') {
                loader = new PCDLoader();
            } else if (fileExtension === 'obj') {
                loader = new OBJLoader();
            } else {
                console.log('Unsupported file format');
                return;
            }
            loader.load(reader.result as string, (objScene) => {
                loadedMesh = objScene;
                // loadedMesh.position.set(0, 0, 0);
                // loadedMesh.castShadow = true;
                // loadedMesh.receiveShadow = true;
                scene.dragableObjects.push(loadedMesh);
                scene.scene.add(loadedMesh);

            });
        };
        reader.readAsDataURL(file);
        }
    };
  
    const handleClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.obj, .pcd';
        input.addEventListener('change', handleFileUpload);
        input.click();
    };

    // const handleClearScene = () => {
    //   const meshes : any = [];
    //   scene.scene.traverse((object : any) => {
    //     if (object instanceof THREE.Mesh) {
    //       meshes.push(object);
    //     }
    //   });
    //   meshes.forEach((mesh : any) => {
    //     mesh.geometry.dispose();
    //     mesh.material.dispose();
    //     scene.scene.remove(mesh);
    //   });
    //   scene.renderer.render(scene.scene, scene.camera);
    //   console.log(meshes);
    //   console.log(scene.scene);
    //   console.log('Cleared scene');
    // };


  return ( 
      <div className="RendererCanvas flex flex-col justify-center items-center">
          <div className="CanvasContainer relative">
              <canvas id="RendererCanvas" />
          </div>
          <div className="absolute bottom-4 right-4">
            <button
                className="flex-grow mt-4 mb-5 w-60 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded"
                onClick={handleClick}
                
            >
                Upload
            </button>
          </div>
          {/* <div className="absolute bottom-4 right-4">
            <button
              className="flex-grow mt-4 mb-5 w-60 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded"
              onClick={handleClearScene}
            >
              Clear Scene
            </button>
          </div> */}
      </div>
    );
}
