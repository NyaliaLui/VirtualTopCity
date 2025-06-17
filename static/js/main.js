import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene and Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);

const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(5, 5, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Load Brick Texture
const textureLoader = new THREE.TextureLoader();
const brickTexture = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
brickTexture.wrapS = THREE.RepeatWrapping;
brickTexture.wrapT = THREE.RepeatWrapping;
brickTexture.repeat.set(2, 4); // Repeat the texture to cover a tall building

// Create a building shape
const buildingWidth = 4;
const buildingHeight = 8;
const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, 4); // Width, Height, Depth
const buildingMaterial = new THREE.MeshStandardMaterial({ map: brickTexture });
const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
building.position.set(0,buildingHeight/2,0);
scene.add(building);

// Create a thin metallic plate
const plateWidth = buildingWidth;
const plateHeight = 0.2;
const plateDepth = 0.05;

const plateGeometry = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
const plateMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 1.0,
    roughness: 0.2
});

const plate = new THREE.Mesh(plateGeometry, plateMaterial);

// Position the plate halfway up the front face
plate.position.set(
    0,                  // X: center of building
    building.position.y,              // Y: halfway up building (building height = 8)
    4 / 2 + plateDepth / 2 + 0.01 // Z: just in front of building front face
);

scene.add(plate);

// Door dimensions and material
const doorWidth = 1.2;
const doorHeight = 2;
const doorDepth = 0.1;

const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2f2f });
const door = new THREE.Mesh(doorGeometry, doorMaterial);

// Position the door beneath the metal plate (building base is at Y=0)
door.position.set(
    0,                      // center horizontally
    doorHeight / 2,         // half the door's height from ground
    4 / 2 + doorDepth / 2 + 0.01 // flush with front face
);
scene.add(door);

// Window dimensions and material
const windowWidth = 0.8;
const windowHeight = 1.2;
const windowDepth = 0.05;

const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xadd8e6,
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.7
});

// Left window
const windowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
windowLeft.position.set(
    -doorWidth,
    door.position.y, // same height as door center
    door.position.z
);
scene.add(windowLeft);

// Right window
const windowRight = new THREE.Mesh(windowGeometry, windowMaterial);
windowRight.position.set(
    doorWidth,
    door.position.y,
    door.position.z
);
scene.add(windowRight);

 

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
