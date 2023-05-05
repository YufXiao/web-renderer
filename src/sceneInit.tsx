import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js'

import { DragControls } from 'three/addons/controls/DragControls.js';


export default class SceneInit{

    public camera : any;
    public scene : any;
    public renderer : any;
    public fov : number;
    public nearPlane : number;
    public farPlane : number;
    public canvasId : any;
    public clock : any;
    public stats : any;
    public controls : any;
    public ambientLight : any;
    public directionalLight : any;
    public animationFrameId : any;
    public pointLight : any;
    public dragableObjects : any;
    public dragControls : any;

    constructor(canvasId : any) {
        this.scene = undefined;
        this.camera = undefined;
        this.renderer = undefined;

        this.fov = 45;
        this.nearPlane = 1;
        this.farPlane = 1000;
        this.canvasId = canvasId;

        this.clock = undefined;
        this.stats = undefined;
        this.controls = undefined;

        this.ambientLight = undefined;
        this.pointLight = undefined;
        this.directionalLight = undefined;

        this.animationFrameId = null;
        this.dragableObjects = [];
        this.dragControls = undefined;
    }

    initialize() {
        this.camera = new THREE.PerspectiveCamera(
            this.fov,
            window.innerWidth / window.innerHeight,
            1,
            1000
        );
        this.camera.position.z = 30;
        this.camera.position.y = 20;
        this.camera.position.x = 20;

        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        
        const canvas : any = document.getElementById(this.canvasId);
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        });
        this.renderer.shadowMap.enabled = false;

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        ambientLight.castShadow = true;
        this.scene.add(ambientLight);
        
        this.pointLight = new THREE.PointLight(0xffffff, 0.5);
        this.pointLight.castShadow = true;
        this.pointLight.position.set(0, 15, 15);
        this.scene.add(this.pointLight);

        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);

        this.dragControls = new DragControls(this.dragableObjects, this.camera, this.renderer.domElement);

        this.dragControls.addEventListener('dragstart', () => {
            this.controls.enabled = false;
        });
        this.dragControls.addEventListener('dragend', () => {
            this.controls.enabled = true;
        });

        window.addEventListener('resize', () => this.onWindowResize(), false);        
    }

    animate() {
        this.animationFrameId = window.requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.stats.update();
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.controls.dispose();

        if (this.stats.dispose) {
            this.stats.dispose();
        } else if (this.stats.domElement && this.stats.domElement.parentElement) {
            this.stats.domElement.parentElement.removeChild(this.stats.domElement);
        }

        this.scene.traverse((object : any) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                object.material.dispose();
            } else if (object instanceof THREE.Texture) {
                object.dispose();
            }
        });
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        
    }   

    addDirectionalLightHelper(size = 1) {
        if (this.directionalLight instanceof THREE.DirectionalLight) {
            const helper = new THREE.DirectionalLightHelper(this.directionalLight, size);
            this.scene.add(helper);
        } else {
            console.error('The provided object is not an instance of THREE.DirectionalLight');
        }
    }

    addPointLightHelper(size = 1) {
        if (this.pointLight instanceof THREE.PointLight) {
            const helper = new THREE.PointLightHelper(this.pointLight, size);
            this.scene.add(helper);
        } else {
            console.error('The provided object is not an instance of THREE.PointLight');
        }
    }

}