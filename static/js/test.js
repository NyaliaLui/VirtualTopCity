import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Bison {
    constructor(scene, modelPath) {
        this.scene = scene;
        this.modelPath = modelPath;
        this.mixer = null;
        this.model = null;

        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load(this.modelPath, (gltf) => {
            this.model = gltf.scene;
            this.model.traverse(node => {
                if (node.isMesh) { node.castShadow = true; }
            });

            this.scene.add(this.model);

            this.mixer = new THREE.AnimationMixer(this.model);
            const action = this.mixer.clipAction(gltf.animations[0]); // Assuming idle is first
            action.play();
        }, undefined, function (error) {
            console.error('Error loading Bison model:', error);
        });
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
}

const existingCubePositions = [];
const cubeSize = 10;
const minDistance = 15; // Minimum distance between cubes to prevent overlap

function spawnMultipleCubes(scene, count) {
    for (let i = 0; i < count; i++) {
        const position = generateNonOverlappingPosition();

        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true;

        cube.position.set(position.x, cubeSize / 2, position.z); // Sit on ground
        scene.add(cube);

        existingCubePositions.push(position);
    }
}

function generateNonOverlappingPosition() {
    const range = 50; // Ground limits
    let position;
    let isOverlapping;

    do {
        const x = (Math.random() - 0.5) * 2 * range;
        const z = (Math.random() - 0.5) * 2 * range;
        position = { x, z };

        isOverlapping = existingCubePositions.some(existing => {
            const dx = existing.x - x;
            const dz = existing.z - z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            return distance < minDistance;
        });
    } while (isOverlapping);

    return position;
}



// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 10);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Instantiate Bison
const bison = new Bison(scene, '/static/models/bison.glb');

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    bison.update(delta);

    controls.update();
    renderer.render(scene, camera);
}

spawnMultipleCubes(scene, 10);

animate();
