import { useEffect } from "react";
import SceneInit from '../lib/sceneInit';
import * as THREE from 'three'; 
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'lil-gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';


export default function Home() {
  let shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0.0 },
        },
        vertexShader: `
            uniform float u_time;
            uniform vec3 color;
            varying vec3 vColor;
            void main() {
                float fluctuation = sin(u_time * 4.0 * 3.1416); // u_time in seconds
                vColor = vec3(1.0, 1.0, 1.0) * (fluctuation * 0.5 + 0.5);
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }
            `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }`,
    })
  const scene = new SceneInit('RendererCanvas', shaderMaterial);
  let loadedPointCloud : THREE.Points;
  let shaderCloud : THREE.Points;
  let INTERSECTED : number | undefined;
  let PARTICLE_SIZE : number;

  const vertexShader = `
        uniform float size;
        attribute vec3 color;
        varying vec3 vColor;

        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;

        void main() {
            gl_FragColor = vec4( vColor, 1.0 );
        }
    `;

   const generatePointCloud = (pointCloud : THREE.Points) => {
        let geometry = pointCloud.geometry;
        let attributes = geometry.attributes;
        let positions = attributes.position.array;
        PARTICLE_SIZE = 3.0;
        let bufferGeometry = new THREE.BufferGeometry();
        let bufferPositions = new Float32Array(positions.length);
        let bufferColors = new Float32Array(positions.length);
        let bufferSizes = new Float32Array(positions.length / 3);
        if (attributes.color !== undefined) {
            let colors = attributes.color.array;
            bufferColors = new Float32Array(colors.length);
            for (let i = 0; i < positions.length; i++) {
                bufferPositions[i] = positions[i];
                bufferColors[i] = colors[i];
                bufferSizes[i / 3] = PARTICLE_SIZE;
            }
        } else {
            bufferColors = new Float32Array(positions.length);
            for (let i = 0; i < bufferColors.length; i++) {
                bufferPositions[i] = positions[i];
                bufferColors[i] = 1.0;
                bufferSizes[i / 3] = PARTICLE_SIZE;
            }
        }
        
        
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferPositions, 3));
        bufferGeometry.setAttribute('color', new THREE.BufferAttribute(bufferColors, 3));
        bufferGeometry.setAttribute('size', new THREE.BufferAttribute(bufferSizes, 1));
        
        // let material = new THREE.PointsMaterial({
        //     size: PARTICLE_SIZE,
        //     vertexColors: true,
        //     alphaTest: 0.9,
        // });
        // shaderCloud = new THREE.Points(bufferGeometry, material);
        shaderCloud = new THREE.Points(bufferGeometry, new THREE.ShaderMaterial({
            uniforms: {
                size: { value: PARTICLE_SIZE },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            alphaTest: 0.9,
        }));

        scene.scene.add(shaderCloud);
    }


  useEffect(() => {
    scene.initialize();
    scene.animate(); 
    const gui = new GUI();
    const lightFolder = gui.addFolder('Light');
    lightFolder.add(scene.dirLight, 'intensity', 0, 2);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedSphere : THREE.Mesh | undefined;
    window.addEventListener('mousemove', (event) => {
        if (event.target === scene.renderer.domElement) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, scene.camera);
            raycaster.params.Points.threshold = 0.05;
            if (shaderCloud) {
                const intersects = raycaster.intersectObject(shaderCloud, false);
                if (intersects.length > 0) {
                    let positions = shaderCloud.geometry.attributes.position.array;
                    let intersect = intersects[0];
                    INTERSECTED = intersect.index;
                    if (INTERSECTED !== undefined) {
                        if (selectedSphere) {
                            scene.scene.remove(selectedSphere);
                        }
                        selectedSphere = new THREE.Mesh(
                            new THREE.SphereGeometry(PARTICLE_SIZE / 100, 32, 32),
                            shaderMaterial,
                            // new THREE.MeshBasicMaterial({ color: 0xff0000 })
                        );
                        selectedSphere.position.set(
                            positions[INTERSECTED * 3],
                            positions[INTERSECTED * 3 + 1],
                            positions[INTERSECTED * 3 + 2],
                        );
                        scene.scene.add(selectedSphere);
                    }
                } else {
                    INTERSECTED = undefined;
                }
            }    
        }
    });

    return () => {
        gui.destroy();
    };

  }, []);

    const handleFileUpload = (event : any) => {
        const file = event.target.files[0];
        if (file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        console.log(fileExtension);
        const reader = new FileReader();
        reader.onload = () => {
            let loader;
            if (fileExtension === 'pcd') {
                loader = new PCDLoader();
                loader.load(reader.result as string, (obj) => {
                        loadedPointCloud = new THREE.Points(obj.geometry, obj.material);
                        generatePointCloud(loadedPointCloud);
                    }
                );
            } else if (fileExtension === 'obj') {
                loader = new OBJLoader();
                loader.load(reader.result as string, (obj) => {
                        let loadedMesh = obj;
                        loadedMesh.position.set(0, 0, 0);
                        loadedMesh.castShadow = true;
                        loadedMesh.receiveShadow = true;
                        scene.dragableObjects.push(loadedMesh);
                        scene.scene.add(loadedMesh);
                    }
                );
            } else {
                console.log('Unsupported file format');
                return;
            }
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
      </div>
    );
}
