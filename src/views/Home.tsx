import { useEffect } from "react";
import SceneInit from '../lib/sceneInit';
import * as THREE from 'three'; 
import { GUI } from 'lil-gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';



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
  let clickedPositions : THREE.Vector3[] = [];
  let allClickedPositions : THREE.Vector3[][] = [];
  let clickedSphereStack : THREE.Mesh[] = [];
  let labelStack : THREE.Mesh[] = [];


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

    const generateHtmlLabel = (selectedPosition : THREE.Vector3, clickedPositions : THREE.Vector3[]) => {
        let label = document.createElement('div');
        label.className = 'label';
        label.style.position = 'absolute';
        let screenPosition = selectedPosition.project(scene.camera);
        label.style.left = ((screenPosition.x + 1) * window.innerWidth / 2) + 10 + 'px';
        label.style.top = ((- screenPosition.y + 1) * window.innerHeight / 2) + 10 + 'px';
        label.textContent = `${clickedPositions.indexOf(selectedPosition)}-(${selectedPosition.x.toFixed(2)}, ${selectedPosition.y.toFixed(2)}, ${selectedPosition.z.toFixed(2)})`;
        document.body.appendChild(label);
    }

    const generateTextGeometry = (selectedPosition : THREE.Vector3, clickedPositions : THREE.Vector3[]) => {
        let loader = new FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            let textGeometry = new TextGeometry(`${clickedPositions.indexOf(selectedPosition)} - (${selectedPosition.x.toFixed(2)}, ${selectedPosition.y.toFixed(2)}, ${selectedPosition.z.toFixed(2)})`, {
                font: font,
                size: 0.05,
                height: 0.01,
            });
            let textMaterial = new THREE.MeshBasicMaterial({ color: 0xfff8f7 });
            let textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(
                selectedPosition.x + 0.1,
                selectedPosition.y - 0.1,
                selectedPosition.z + 0.1,
            );
            textMesh.lookAt(scene.camera.position);
            labelStack.push(textMesh);
            scene.scene.add(textMesh);
            console.log('text added');
        });
    }

    const undoClick = () => {
        if(clickedSphereStack.length > 0) {
            let lastClickedObject = clickedSphereStack.pop();
            scene.scene.remove(lastClickedObject);
            clickedPositions.pop();
            let lastLabel = labelStack.pop();
            scene.scene.remove(lastLabel);
        }
    }

    const settings = {
        showPoints: true,
        showSemantic: true,
        showAxis: false,
    };

  useEffect(() => {

    scene.initialize();
    scene.animate(); 

    const axesHelper = new THREE.AxesHelper(10);
    const gui = new GUI();
    const lightFolder = gui.addFolder('Light');
    lightFolder.add(scene.dirLight, 'intensity', 0, 2);

    gui.add(settings, 'showPoints').name('Cloud').onChange((value : any) => { 
        if (shaderCloud) {
            shaderCloud.visible = value;
        }
    });

    // gui.add(settings, 'showSemantic').name('Semantic').onChange((value : any) => {
        
    // });

    gui.add(settings, 'showAxis').name('Axis').onChange((value : any) => {
        if (value) {
            scene.scene.add(axesHelper);
        } else {
            scene.scene.remove(axesHelper);
        }
    });

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

    window.addEventListener('contextmenu', (event) => {
        
        console.log('right clicked');
        if (event.target === scene.renderer.domElement) {
            event.preventDefault();
            if (INTERSECTED !== undefined) {
                let positions = shaderCloud.geometry.attributes.position.array;
                let selectedPosition = new THREE.Vector3( 
                    positions[INTERSECTED * 3],
                    positions[INTERSECTED * 3 + 1],
                    positions[INTERSECTED * 3 + 2],
                );
                clickedPositions.push(selectedPosition);
                let clickedSphere = new THREE.Mesh(
                    new THREE.SphereGeometry(PARTICLE_SIZE / 100, 32, 32),
                    shaderMaterial,
                );
                clickedSphere.position.set(
                    positions[INTERSECTED * 3],
                    positions[INTERSECTED * 3 + 1],
                    positions[INTERSECTED * 3 + 2],
                );
                scene.scene.add(clickedSphere);
                console.log('sphere clicked');
                clickedSphereStack.push(clickedSphere);
                generateTextGeometry(selectedPosition, clickedPositions);
            }
            else {
                INTERSECTED = undefined;
            }
        }
    });
    
    window.addEventListener('keydown', (event) => {
        if (event.key === 'z') {
            console.log('undo');
            undoClick();
        }
    });

    window.addEventListener('keydown', (event) => {
        event.preventDefault();
        if (event.key === 'e') {
            if (clickedPositions.length > 0) { 
                if (confirm('Are you sure to extract all vertices for this polygon?')) {
                    allClickedPositions.push(clickedPositions);
                    alert(`polygon added, index is ${allClickedPositions.indexOf(clickedPositions)}, now ${allClickedPositions.length} polygons in total`)
                    clickedPositions = [];   
                    for (let i = 0; i < clickedSphereStack.length; i++) {
                        scene.scene.remove(clickedSphereStack[i]);
                    }
                    clickedSphereStack = [];
                    for (let i = 0; i < labelStack.length; i++) {
                        scene.scene.remove(labelStack[i]);
                    }
                    labelStack = [];
                    console.log(allClickedPositions);
                }
                else {
                    console.log('Extracting canceled');
                }
            }
            else {
                console.log('No point clicked');
            }
        }
    });

    return () => {
        gui.destroy();
    };

  }, []);
    let uploadedFileName: string = '';
    let outputFileName: string = '';   
    
    const handleFileUpload = (event : any) => {
        const file = event.target.files[0];
        if (file) {
            uploadedFileName = file.name.split('.').shift();
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
                            console.log('point cloud loaded');
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
            outputFileName ='polygon_' + uploadedFileName + '.txt';
            reader.readAsDataURL(file);
        }
    };
  
    const handleUploadClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.obj, .pcd';
        input.addEventListener('change', handleFileUpload);
        input.click();
    };
    
    

    const download = (filename : string, text : string) => {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
      
        element.style.display = 'none';
        document.body.appendChild(element);
      
        element.click();
      
        document.body.removeChild(element);
      }

    const handlePolygonExtractClick = () => {
        let data = "";
        for(let polygon of allClickedPositions) {
            for(let point of polygon) {
                data += point.x + " " + point.y + " " + point.z + "\n";
            }
            data += "\n"; // add an empty line between polygons
        }
        download(outputFileName, data);
    }

  return ( 
      <div className="RendererCanvas flex flex-col justify-center items-center">
          <div className="CanvasContainer relative">
              <canvas id="RendererCanvas" />
          </div>
            <div className="absolute bottom-4 left-4">
                <button
                    className="flex-grow mt-4 mb-5 w-60 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded"
                    onClick={() => {handlePolygonExtractClick()}}
                >
                    Extract Polygons
                </button>
            </div>
          <div className="absolute bottom-4 right-4">
            <button
                className="flex-grow mt-4 mb-5 w-60 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded"
                onClick={handleUploadClick}
            >
                Upload
            </button>
          </div>
      </div>
    );
}
