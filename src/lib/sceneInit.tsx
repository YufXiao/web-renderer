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
    public dirLight : any;
    public dragableObjects : any;
    public dragControls : any;
    public pointClouds : THREE.Points[] = [];
    public shaderMaterial : any;

    constructor(canvasId : any, shaderMaterial : any) {
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
        this.shaderMaterial = shaderMaterial;
    }

    initialize() {
        this.camera = new THREE.PerspectiveCamera(
            this.fov,
            window.innerWidth / window.innerHeight,
            1,
            10000
        );
        this.camera.position.set(10, 10, 15);

        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 15, 80 );

        const canvas : any = document.getElementById(this.canvasId);
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        });
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d);
		hemiLight.position.set(0, 20, 0);
		this.scene.add(hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.dirLight.position.set(3, 10, 10);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.camera.top = 2;
        this.dirLight.shadow.camera.bottom = - 2;
        this.dirLight.shadow.camera.left = - 2;
        this.dirLight.shadow.camera.right = 2;
        this.dirLight.shadow.camera.near = 0.1;
        this.dirLight.shadow.camera.far = 40;
        this.scene.add(this.dirLight);

        const mesh = new THREE.Mesh( new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({color: 0x393b39, depthWrite: false}));
        mesh.translateY(-5.0);
        mesh.rotation.x = - Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const axesHelper = new THREE.AxesHelper(10);
        // this.scene.add(axesHelper);
        window.addEventListener('resize', () => this.onWindowResize(), false);        
    }

    animate() {
        this.animationFrameId = window.requestAnimationFrame(this.animate.bind(this));
        this.shaderMaterial.uniforms.u_time.value += this.clock.getDelta();
        // console.log(this.shaderMaterial.uniforms.u_time.value);
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