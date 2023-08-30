import { useEffect, useState } from "react";
import SceneInit from '../lib/sceneInit';
import * as THREE from 'three'; 
import '../styles/Home.css';

import { GUI } from 'lil-gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const socket = new WebSocket('ws://localhost:8080');

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
    let mesh : THREE.Mesh;
    let shaderCloud : THREE.Points;
    let INTERSECTED : number | undefined;
    let PARTICLE_SIZE : number = 5;
    let POINT_PICKER_SIZE : number = 3;
    let clickedPositions : THREE.Vector3[] = [];
    let allClickedPositions : THREE.Vector3[][] = [];
    let clickedSphereStack : THREE.Mesh[] = [];
    let labelStack : THREE.Mesh[] = [];

    let cloudToCompare : THREE.Points;
    
    let firstCloudCenter : THREE.Vector3 = new THREE.Vector3();
    let firstMax : THREE.Vector3 = new THREE.Vector3();
    let firstMin : THREE.Vector3 = new THREE.Vector3();
    let secondCloudCenter : THREE.Vector3 = new THREE.Vector3();
    let offset : THREE.Vector3 = new THREE.Vector3();

    
    let lightSourceCenter = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource3 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource4 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource5 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource6 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource7 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);
    const lightSource8 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial);

    let lightSourceMax = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial); // close to max point in cloud
    let lightSourceMin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), shaderMaterial); // close to min point in cloud

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

    const generatePointCloud = (pointCloud : THREE.Points, size : number) => {

        let geometry = pointCloud.geometry;
        let attributes = geometry.attributes;
        let positions = attributes.position.array;
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
                bufferSizes[i / 3] = size;
            }
        } else {
            bufferColors = new Float32Array(positions.length);
            for (let i = 0; i < bufferColors.length; i++) {
                bufferPositions[i] = positions[i];
                bufferColors[i] = 1.0;
                bufferSizes[i / 3] = size;
            }
        }

        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferPositions, 3));
        bufferGeometry.setAttribute('color', new THREE.BufferAttribute(bufferColors, 3));
        bufferGeometry.setAttribute('size', new THREE.BufferAttribute(bufferSizes, 1));
        shaderCloud = new THREE.Points(bufferGeometry, new THREE.ShaderMaterial({
            uniforms: {
                size: { value: size },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            alphaTest: 0.9,
        }));

        shaderCloud.up.set(0, 0, 1);
        shaderCloud.name = 'firstCloud';
        console.log(shaderCloud.name);
        
        let boundingBox = new THREE.Box3().setFromObject(shaderCloud);
        firstCloudCenter = boundingBox.getCenter(new THREE.Vector3());
        firstMax = boundingBox.max;
        firstMin = boundingBox.min;

        scene.camera.position.copy(firstCloudCenter);
        scene.camera.position.x += 10;
        scene.camera.position.y += 10;
        scene.camera.position.z += 5;
        scene.camera.lookAt(firstCloudCenter);
        scene.camera.updateProjectionMatrix();
        scene.camera.updateMatrixWorld();
        
        scene.controls.target.copy(firstCloudCenter);
        scene.controls.update();

        scene.objAxis.position.copy(firstCloudCenter);
        // scene.scene.add(scene.objAxis);

        scene.scene.add(shaderCloud);
        // setFirstCloudLoaded(true);

    }

    const generateSecondCloud = (pointCloud : THREE.Points) => {

        let boundingBox2 = new THREE.Box3().setFromObject(pointCloud);
        secondCloudCenter = boundingBox2.getCenter(new THREE.Vector3());
        offset.subVectors(firstCloudCenter, secondCloudCenter);

        let geometry = pointCloud.geometry;
        let attributes = geometry.attributes;
        let positions = attributes.position.array;
        PARTICLE_SIZE = 2.5;
        let bufferGeometry = new THREE.BufferGeometry();
        let bufferPositions = new Float32Array(positions.length);
        let bufferColors = new Float32Array(positions.length);
        let bufferSizes = new Float32Array(positions.length / 3);

        if (attributes.color !== undefined) {
            let colors = attributes.color.array;
            bufferColors = new Float32Array(colors.length);
            for (let i = 0; i < positions.length; i++) {
                if (i % 3 === 0) {
                    bufferPositions[i] = positions[i] + offset.x + 10;
                } else if (i % 3 === 1) {
                    bufferPositions[i] = positions[i] + offset.y + 10;
                } else {
                    bufferPositions[i] = positions[i] + offset.z;
                }
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
        cloudToCompare = new THREE.Points(bufferGeometry, new THREE.ShaderMaterial({
            uniforms: {
                size: { value: PARTICLE_SIZE },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            alphaTest: 0.9,
        }));

        cloudToCompare.up.set(0, 0, 1);
        cloudToCompare.name = 'secondCloud';

        // let group = new THREE.Group();
        // group.add(cloudToCompare);
        // group.add(shaderCloud);
        
        let midpoint = new THREE.Vector3();
        midpoint.addVectors(firstCloudCenter, secondCloudCenter);
        midpoint.divideScalar(2);
        console.log('scene is: ' + scene.scene);
        
        scene.camera.position.copy(midpoint);
        scene.camera.position.x += 10;
        scene.camera.position.y += 10;
        scene.camera.position.z += 5;

        scene.camera.lookAt(midpoint);
        scene.camera.updateProjectionMatrix();
        scene.camera.updateMatrixWorld();

        scene.controls.target.copy(midpoint);
        scene.controls.update();

        scene.objAxis.position.copy(midpoint);
        scene.scene.add(scene.objAxis);

        // scene.scene.add(group);
        scene.scene.add(cloudToCompare);

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
            textMesh.up.set(0, 0, 1);
            textMesh.lookAt(scene.camera.position);
            labelStack.push(textMesh);
            scene.scene.add(textMesh);
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
        showAxis: true,
        useShaderMaterial: true,
        occlusionDetectionLightSource: false,
        centerLightSource: false,
        viewpoint1: false,
        viewpoint2: false,
        PARTICLE_SIZE: PARTICLE_SIZE,
        POINT_PICKER_SIZE: POINT_PICKER_SIZE,
        wireframe: false,
    };

    const [distance, setDistance] = useState<number>(0);
    const [firstCloudLoaded, setFirstCloudLoaded] = useState<boolean>(false);
    const [allPolygons, setAllPolygons] = useState<THREE.Vector3[][]>([]);
    const [occlusion, setOcclusion] = useState<number>(0.0);
    const [iou, setIou] = useState<number>(0.0);
    const [precision, setPrecision] = useState<number>(0.0);
    const [recall, setRecall] = useState<number>(0.0);
    const [f1, setF1] = useState<number>(0.0);
    const [accuracy, setAccuracy] = useState<number>(0.0);
    const [outputFileName, setOutputFileName] = useState<string>('');

    const computeDistance = (point1 : THREE.Vector3, point2 : THREE.Vector3) => {
        return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2) + Math.pow(point1.z - point2.z, 2));
    }

    useEffect(() => {

        scene.initialize();
        scene.animate(); 

        const gui = new GUI();
        const lightFolder = gui.addFolder('Light');
        lightFolder.add(scene.dirLight, 'intensity', 0, 2);

        const cloudFolder = gui.addFolder('Cloud');
        cloudFolder.add(settings, 'showPoints').name('Cloud').onChange((value : any) => { 
            if (shaderCloud) {
                shaderCloud.visible = value;
            }
        });

        // gui.add(settings, 'showSemantic').name('Semantic').onChange((value : any) => {
            
        // });

        cloudFolder.add(settings, 'useShaderMaterial').name('Use shader mtl').onChange((value : any) => {
            if (value) {
                settings.useShaderMaterial = true;
            } else {
                settings.useShaderMaterial = false;
            }
        });

        cloudFolder.add(settings, 'centerLightSource').name('Center').onChange((value : any) => {
            if (value) {
                if (shaderCloud) {
                    lightSourceCenter.position.set(firstCloudCenter.x, firstCloudCenter.y, firstCloudCenter.z);
                    scene.scene.add(lightSourceCenter);
                } else {
                    console.log('No shader cloud');
                }
            } else {
                scene.scene.remove(lightSourceCenter);
            }
        });

        cloudFolder.add(settings, 'viewpoint1').name('Viewpoint Max').onChange((value : any) => {
            if (value) {
                if (shaderCloud) {
                    lightSourceMax.position.set((firstCloudCenter.x + firstMax.x) / 2, (firstCloudCenter.y + firstMax.y) / 2, (firstCloudCenter.z + firstMax.z) / 2);
                    scene.scene.add(lightSourceMax);
                 } else {
                    console.log('No shader cloud');
                }
            } else { 
                scene.scene.remove(lightSourceMax);
            }
        });

        cloudFolder.add(settings, 'viewpoint2').name('Viewpoint Min').onChange((value : any) => {
            if (value) {
                if (shaderCloud) {
                    lightSourceMin.position.set((firstCloudCenter.x + firstMin.x) / 2, (firstCloudCenter.y + firstMin.y) / 2, (firstCloudCenter.z + firstMin.z) / 2);
                    scene.scene.add(lightSourceMin);
                } else {
                    console.log('No shader cloud');
                }
            } else {
                scene.scene.remove(lightSourceMin);
            }
        });


        cloudFolder.add(settings, 'occlusionDetectionLightSource').name('All lights').onChange((value : any) => {
            if (value) {
                if (shaderCloud) {
                    // if(settings.useShaderMaterial) {
                    //     lightSourceMaterial = shaderMaterial;
                    // } else {
                    //     lightSourceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    // }
    
                    lightSourceCenter.position.set(firstCloudCenter.x, firstCloudCenter.y, firstCloudCenter.z);
                    scene.scene.add(lightSourceCenter);
                    
                    lightSource1.position.set((firstCloudCenter.x + firstMax.x) / 2, (firstCloudCenter.y + firstMax.y) / 2, (firstCloudCenter.z + firstMax.z) / 2);
                    scene.scene.add(lightSource1);
                    
                    lightSource2.position.set((firstCloudCenter.x + firstMin.x) / 2, (firstCloudCenter.y + firstMin.y) / 2, (firstCloudCenter.z + firstMin.z) / 2);
                    scene.scene.add(lightSource2);

                    lightSource3.position.set((firstCloudCenter.x + firstMax.x) / 2, (firstCloudCenter.y + firstMax.y) / 2, (firstCloudCenter.z + firstMin.z) / 2);
                    scene.scene.add(lightSource3);

                    lightSource4.position.set((firstCloudCenter.x + firstMin.x) / 2, (firstCloudCenter.y + firstMin.y) / 2, (firstCloudCenter.z + firstMax.z) / 2);
                    scene.scene.add(lightSource4);

                    lightSource5.position.set((firstCloudCenter.x + firstMax.x) / 2, (firstCloudCenter.y + firstMin.y) / 2, (firstCloudCenter.z + firstMax.z) / 2);
                    scene.scene.add(lightSource5);
                    
                    lightSource6.position.set((firstCloudCenter.x + firstMin.x) / 2, (firstCloudCenter.y + firstMax.y) / 2, (firstCloudCenter.z + firstMin.z) / 2);
                    scene.scene.add(lightSource6);

                    lightSource7.position.set((firstCloudCenter.x + firstMax.x) / 2, (firstCloudCenter.y + firstMin.y) / 2, (firstCloudCenter.z + firstMin.z) / 2);
                    scene.scene.add(lightSource7);

                    lightSource8.position.set((firstCloudCenter.x + firstMin.x) / 2, (firstCloudCenter.y + firstMax.y) / 2, (firstCloudCenter.z + firstMax.z) / 2);
                    scene.scene.add(lightSource8);

                } else {
                    console.log('No shader cloud');
                }
            } else {
                scene.scene.remove(lightSourceCenter);
                scene.scene.remove(lightSource1);
                scene.scene.remove(lightSource2);
                scene.scene.remove(lightSource3);
                scene.scene.remove(lightSource4);
                scene.scene.remove(lightSource5);
                scene.scene.remove(lightSource6);
                scene.scene.remove(lightSource7);
                scene.scene.remove(lightSource8);
            }
        });

        // gui.add(settings, 'PARTICLE_SIZE', 1, 10).name('Particle size').onChange((value : any) => {
        //     if (shaderCloud) {
        //         let resizedCloud = generatePointCloud(loadedPointCloud, value);
        //         scene.scene.remove(shaderCloud);
        //         scene.scene.add(resizedCloud);    
        //     } else {
        //         console.log('No shader cloud');
        //     }
        // });

        cloudFolder.add(settings, 'POINT_PICKER_SIZE', 1, 10).name('Picker size').onChange((value : any) => {
            POINT_PICKER_SIZE = value;
        });

        // const meshFolder = gui.addFolder('Mesh');
        // meshFolder.add(settings, 'wireframe').name('Wireframe').onChange((value : any) => {
        //     if (value) {
        //         settings.wireframe = true;
        //         scene.meshMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
        //     } else {
        //         settings.wireframe = false;
        //         scene.meshMaterial = new THREE.MeshPhongMaterial({
        //             color: 0xaaaaaa,
        //             specular: 0x111111,
        //             shininess: 200,
        //             wireframe: false
        //         });
        //     }
        // });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let selectedSphere : THREE.Mesh | undefined;

        window.addEventListener('mousemove', (event) => {
            if (event.target === scene.renderer.domElement) {
                event.preventDefault();
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                raycaster.setFromCamera(mouse, scene.camera);
                raycaster.params.Points.threshold = 0.02;

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
                            if (settings.useShaderMaterial) {
                                selectedSphere = new THREE.Mesh(
                                    new THREE.SphereGeometry(POINT_PICKER_SIZE / 100, 32, 32),
                                    shaderMaterial,
                                );
                            } else {
                                selectedSphere = new THREE.Mesh(
                                    new THREE.SphereGeometry(POINT_PICKER_SIZE / 100, 32, 32),
                                    new THREE.MeshBasicMaterial({ color: 0xffffff }),
                                );
                            }
                    
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
            
            if (event.target === scene.renderer.domElement) {
                event.preventDefault();
                if (INTERSECTED !== undefined) {
                    let positions = shaderCloud.geometry.attributes.position.array;
                    let x : number = positions[INTERSECTED * 3];
                    let y : number = positions[INTERSECTED * 3 + 1];
                    let z : number = positions[INTERSECTED * 3 + 2];
                    x = parseFloat(x.toFixed(2));
                    y = parseFloat(y.toFixed(2));
                    z = parseFloat(z.toFixed(2));
                    let selectedPosition = new THREE.Vector3(x, y, z);
                    
                    clickedPositions.push(selectedPosition);
                    if (clickedPositions[0] && clickedPositions[1]) {
                        setDistance(computeDistance(clickedPositions[0], clickedPositions[1]));
                    }

                    let clickedSphere = new THREE.Mesh(
                        new THREE.SphereGeometry(POINT_PICKER_SIZE / 100, 32, 32),
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
                        setAllPolygons(allClickedPositions);
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

        // Connection opened
        socket.addEventListener('open', (event) => {
            socket.send('Hello Server!');
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            console.log('Message from server: ', event.data);
            if (event.data.startsWith('-o=')) {
                let occlusion = parseFloat(event.data.split('=').pop() as string);
                setOcclusion(occlusion);
            }
            if (event.data.startsWith('-iou=')) {
                let iou = parseFloat(event.data.split('=').pop() as string);
                setIou(iou);
            }
            if (event.data.startsWith('-precision=')) {
                let precision = parseFloat(event.data.split('=').pop() as string);
                setPrecision(precision);
            }
            if (event.data.startsWith('-recall=')) {
                let recall = parseFloat(event.data.split('=').pop() as string);
                setRecall(recall);
            }
            if (event.data.startsWith('-f1_score=')) {
                let f1 = parseFloat(event.data.split('=').pop() as string);
                setF1(f1);
            }
            if (event.data.startsWith('-accuracy=')) {
                let accuracy = parseFloat(event.data.split('=').pop() as string);
                setAccuracy(accuracy);
            }

        });

        // Connection closed
        socket.addEventListener('close', (event) => {
            console.log('Server connection closed: ', event.code);
        });

        // Connection error
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error: ', error);
        });

        return () => {
            gui.destroy();
        };

    }, []);

  
    let uploadedFileName: string = '';
    
    const handleFileUpload = (event : any) => {
        const file = event.target.files[0];
        if (file) {
            socket.send(`-i=${file.name}`);
            uploadedFileName = file.name.split('.').shift();
            console.log(uploadedFileName);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            console.log(fileExtension);
            const reader = new FileReader();
            reader.onload = () => {
                let loader;
                if (fileExtension === 'pcd') {
                    loader = new PCDLoader();
                    loader.load(reader.result as string, (obj) => {
                            loadedPointCloud = new THREE.Points(obj.geometry, obj.material);
                            generatePointCloud(loadedPointCloud, PARTICLE_SIZE);
                            console.log('point cloud loaded');
                        }
                    );
                } else if (fileExtension === 'ply') {
                    loader = new PLYLoader();
                    loader.load(reader.result as string, (obj) => {
                            const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
                            loadedPointCloud = new THREE.Points(obj, material);
                            generatePointCloud(loadedPointCloud, PARTICLE_SIZE);
                            console.log('point cloud loaded');
                        }
                        );
                    
                } else {
                    console.log('Unsupported file format');
                    return;
                }
            };
            setOutputFileName(uploadedFileName + '_poly.txt');
            reader.readAsDataURL(file);
        }
    };

    const handleMeshUpload = (event : any) => {
        const objFile = event.target.files[0];
        if (objFile) {
            const fileExtension = objFile.name.split('.').pop().toLowerCase();
            if (fileExtension === 'obj') {
                const objReader = new FileReader();
                objReader.onload = () => {
                    const objLoader = new OBJLoader();
                    const mesh = objLoader.parse(objReader.result as string);
                    mesh.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material = scene.meshMaterial;
                        }
                    });
                    // mesh.scale.set(0.01, 0.01, 0.01);
                    mesh.position.set(0, 0, 0);
                    mesh.rotation.x = Math.PI / 2;
                    scene.scene.add(mesh);

                    const boundingBox = new THREE.Box3().setFromObject(mesh);
                    const center = boundingBox.getCenter(new THREE.Vector3());
                    const size = boundingBox.getSize(new THREE.Vector3());
                    const min = boundingBox.min;
                    const max = boundingBox.max;
                    
                    let sphereSize = size.x / 15;

                    lightSourceCenter.position.set(center.x, center.y, center.z);
                    lightSourceCenter.scale.set(sphereSize, sphereSize, sphereSize);
                    scene.scene.add(lightSourceCenter);

                    lightSourceMin.position.set((center.x + min.x) / 2, (center.y + min.y) / 2, (center.z + min.z) / 2);
                    lightSourceMin.scale.set(sphereSize, sphereSize, sphereSize);
                    scene.scene.add(lightSourceMin);

                    lightSourceMax.position.set((center.x + max.x) / 2, (center.y + max.y) / 2, (center.z + max.z) / 2);
                    lightSourceMax.scale.set(sphereSize, sphereSize, sphereSize);
                    scene.scene.add(lightSourceMax);

                    console.log('mesh loaded');
                };
                objReader.readAsText(objFile);
            } else {
                console.log('Unsupported file format');
                return;
            }
        }
    };
    
    const handleChooseSegmentationClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pcd';
        input.addEventListener('change', handleChooseSegmentation);
        input.click();
    };

    const handleChooseGroundTruthClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pcd';
        input.addEventListener('change', handleChooseGroundTruth);
        input.click();
    };

    const handleUploadClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pcd, .ply';
        input.addEventListener('change', handleFileUpload);
        input.click();
    };

    const handleUploadMeshClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.obj, .mtl';
        input.addEventListener('change', handleMeshUpload);
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
        for(let polygon of allPolygons) {
            for(let point of polygon) {
                if (point === polygon[polygon.length - 1]) {
                    data += point.x + " " + point.y + " " + point.z;
                } else {
                    data += point.x + " " + point.y + " " + point.z + ",";
                }
            }
            data += ";"; 
        }
        console.log(`-p=${data}`);
        socket.send(`-p=${data}`);

        let dataToDownload = "";
        for(let polygon of allPolygons) {
            for(let point of polygon) {
                dataToDownload += point.x + " " + point.y + " " + point.z + "\n";
            }
            dataToDownload += "\n"; // add an empty line between polygons
        }
        console.log(outputFileName);
        download(outputFileName, dataToDownload);
    }
    
    const handleComputeOcclusion = () => {
        socket.send('-o');
    }

    const handleChooseSegmentation = (event : any) => {
        const file = event.target.files[0];
        if (file) {
            socket.send(`-s=${file.name}`);   
        }
    }

    const handleChooseGroundTruth = (event : any) => {
        const file = event.target.files[0];
        if (file) {
            socket.send(`-gt=${file.name}`);   
        }
    }

    const handleEvaluateClick = () => {
        socket.send('-e');
    }
    
    return ( 
        <div className="RendererCanvas flex flex-col justify-center items-center">
            <div className="CanvasContainer relative">
                <canvas id="RendererCanvas" />
            </div>
            {/* {
                loading 
                ? 
                (<div className="text-center">
                    <div role="status">
                        <svg aria-hidden="true" className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>)
                : 
                null
            } */}
            <div className="absolute bottom-4 left-4">
                <button
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 ml-5 mb-2 w-60 h-12 font-serif"
                    onClick={handlePolygonExtractClick}
                >
                    <svg className="w-6 h-6 ml-2 mr-8 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>
                    </svg>
                    Extract Polygons
                </button>
            </div>
            <div className="absolute top-1/4 left-4 flex flex-col">
                <button
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 ml-5 mb-2 mt-5 w-60 h-12 font-serif"
                    onClick={handleEvaluateClick}
                >
                    <svg className="w-6 h-6 ml-2 mr-8 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>
                    </svg>
                    Evaluate
                </button>

                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 flex items-center font-serif ml-5">
                    <p className="text-white ml-5 mr-10">IoU: </p>
                    <p className="text-white ml-5">{iou.toFixed(4)}</p>
                </div>
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif flex items-center ml-5">
                    <p className="text-white ml-5 mr-1">Accuracy: </p>
                    <p className="text-white ml-5">{accuracy.toFixed(4)}</p>
                </div>
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif flex items-center ml-5">
                    <p className="text-white ml-5 mr-2">F1 Score: </p>
                    <p className="text-white ml-5">{f1.toFixed(4)}</p>
                </div>
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif flex items-center ml-5">
                    <p className="text-white ml-5 mr-1">Precision: </p>
                    <p className="text-white ml-5">{precision.toFixed(4)}</p>
                </div>
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif flex items-center ml-5">
                    <p className="text-white ml-5 mr-7">Recall: </p>
                    <p className="text-white ml-5">{recall.toFixed(4)}</p>
                </div>

                <button
                    type="button" 
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 ml-5 mb-2 w-60 h-12 font-serif"
                    onClick={handleUploadClick}
                >
                    <svg className="w-8 h-8 ml-2 mr-6 text-white-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    Original Cloud
                </button>
                <button
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 ml-5 mb-2 w-60 h-12 font-serif"
                    onClick={handleChooseGroundTruthClick}
                >
                    <svg className="w-8 h-8 ml-2 mr-6 text-white-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    Ground truth
                </button>
                <button
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 ml-5 mb-2 w-60 h-12 font-serif"
                    onClick={handleChooseSegmentationClick}
                >
                    <svg className="w-8 h-8 ml-2 mr-6 text-white-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    Semantic
                </button>
                
            </div>
            <div className="absolute top-2/3 right-4">
                <button
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 mb-2 w-60 h-12 font-serif"
                    onClick={handleComputeOcclusion}
                >
                    <svg className="w-6 h-6 ml-2 mr-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>
                    </svg>
                    Compute Occlusion
                </button>
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 flex items-center dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif">
                    <p className="text-white ml-5">Occlusion: </p>
                    <p className="text-white ml-5">{occlusion.toFixed(4)}</p>
                </div>
            </div>
            <div className="absolute bottom-4 right-4">
                <button
                    type="button" 
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-base px-5 py-2.5 flex items-center mr-2 mb-2 w-60 h-12 font-serif"
                    onClick={handleUploadMeshClick}
                >
                    <svg className="w-8 h-8 ml-5 mr-10 text-white-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    Mesh
                </button>
            </div>
            <div className="absolute top-1/2 right-4">
                <div className="text-white bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-base px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:focus:ring-gray-700 dark:border-gray-700 w-60 font-serif">
                    <p className="text-white">Points Distance: {distance.toFixed(2)}</p>
                </div>
             </div>
        </div>
    );
}
