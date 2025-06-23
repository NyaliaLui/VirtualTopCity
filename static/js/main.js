// static/js/main.js
// This file contains all the Three.js logic for the scene.

// Import necessary modules from Three.js via the import map
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene, Camera, and Renderer Setup ---

// 1. Scene
// The scene is the container for all objects, lights, and cameras.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // A sky-blue background

// 2. Camera
// A perspective camera mimics the way the human eye sees.
// Arguments: FOV, aspect ratio, near clip, far clip
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4, 8, 15); // Move the camera back and up further to see the taller building

// 3. Renderer
// The renderer is responsible for drawing the scene onto the canvas.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Append the renderer's canvas element to the HTML body
document.body.appendChild(renderer.domElement);


// --- Lighting ---

// Add some lighting to the scene to make the building visible.
// 1. Ambient Light: Illuminates all objects in the scene from all directions.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// 2. Directional Light: Emits light in a specific direction, like the sun.
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 5);
scene.add(directionalLight);


// --- Objects in the Scene ---

// 1. Texture Loader
// The texture loader is used to load the brick image.
const textureLoader = new THREE.TextureLoader();
const brickTexture = textureLoader.load(
    // A seamless brick texture from the Three.js examples
    'https://threejs.org/examples/textures/brick_diffuse.jpg',
    (texture) => {
        // This ensures the texture repeats across the surface
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Adjust how many times the texture repeats
        texture.repeat.set(3, 6); // Repeat texture more on the Y axis
    }
);


// 2. Building Geometry and Material
// Create a box geometry with dimensions that resemble a building. The height is now 12.
const buildingGeometry = new THREE.BoxGeometry(5, 12, 5);
// Apply the loaded brick texture to the material.
const buildingMaterial = new THREE.MeshStandardMaterial({
    map: brickTexture,
    // Add a normal map for more realistic surface detail
    normalMap: textureLoader.load('https://threejs.org/examples/textures/brick_roughness.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 6); // Repeat texture more on the Y axis
    }),
    roughness: 0.8,
    metalness: 0.1
});

// 3. Building Mesh
const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
// Position the building so its base is at y=0
building.position.y = 6;
scene.add(building);

// --- Building Features ---

// We will create the features and add them as children of the main building mesh.
// This ensures that if the building moves, its features move with it.
// Positions will be relative to the building's center.

// 4. Metallic Plate
const plateGeometry = new THREE.BoxGeometry(5.1, 0.5, 0.1); // Slightly wider than the building
const plateMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.2
});
const plate = new THREE.Mesh(plateGeometry, plateMaterial);
// Position it halfway up (y=0 in local space) and on the front face (z = building_depth/2)
plate.position.set(0, 0, 2.55);
building.add(plate);

// 5. Door
const doorGeometry = new THREE.BoxGeometry(1.2, 2.5, 0.1);
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 }); // Dark wood color
const door = new THREE.Mesh(doorGeometry, doorMaterial);
// Position it at the bottom center of the building's front face.
// Building base is at y=-6 (local space). Door center y = -6 + (door_height/2) = -4.75
door.position.set(0, -4.75, 2.55);
building.add(door);

// 6. Windows
// Window height is 3/4 of the door's height (2.5 * 0.75 = 1.875)
const windowWidth = 1;
const windowHeight = 1.875;
const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, 0.1);
const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xadd8e6, // Light blue
    transparent: true,
    opacity: 0.6
});
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const frameThickness = 0.07;

// Helper function to create a simple 4-sided frame for a window
function createStandardFrame(windowMesh, width, height) {
    const frameGroup = new THREE.Group();
    const topBottomFrameGeom = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, 0.11);
    const sideFrameGeom = new THREE.BoxGeometry(frameThickness, height, 0.11);

    const topFrame = new THREE.Mesh(topBottomFrameGeom, frameMaterial);
    topFrame.position.y = height / 2 + frameThickness / 2;
    frameGroup.add(topFrame);

    const bottomFrame = new THREE.Mesh(topBottomFrameGeom, frameMaterial);
    bottomFrame.position.y = -height / 2 - frameThickness / 2;
    frameGroup.add(bottomFrame);

    const leftFrame = new THREE.Mesh(sideFrameGeom, frameMaterial);
    leftFrame.position.x = -width / 2 - frameThickness / 2;
    frameGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(sideFrameGeom, frameMaterial);
    rightFrame.position.x = width / 2 + frameThickness / 2;
    frameGroup.add(rightFrame);

    windowMesh.add(frameGroup);
}


// Left Window (Lower)
const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
leftWindow.position.set(-1.5, -4.75, 2.55);
createStandardFrame(leftWindow, windowWidth, windowHeight);
building.add(leftWindow);

// Right Window (Lower)
const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
rightWindow.position.set(1.5, -4.75, 2.55);
createStandardFrame(rightWindow, windowWidth, windowHeight);
building.add(rightWindow);

// 7. Horizontal Window above Door
const h_windowWidth = 4;
const h_windowHeight = 0.75;
const horizontalWindowGeometry = new THREE.BoxGeometry(h_windowWidth, h_windowHeight, 0.1);
const horizontalWindow = new THREE.Mesh(horizontalWindowGeometry, windowMaterial);
horizontalWindow.position.set(0, -3, 2.55);
building.add(horizontalWindow);

// Custom frame for horizontal window with dividers
const h_frameGroup = new THREE.Group();
const h_topBottomGeom = new THREE.BoxGeometry(h_windowWidth + frameThickness * 2, frameThickness, 0.11);
const h_sideGeom = new THREE.BoxGeometry(frameThickness, h_windowHeight, 0.11);
const h_dividerGeom = new THREE.BoxGeometry(frameThickness, h_windowHeight, 0.11);

const h_topFrame = new THREE.Mesh(h_topBottomGeom, frameMaterial);
h_topFrame.position.y = h_windowHeight / 2 + frameThickness / 2;
h_frameGroup.add(h_topFrame);

const h_bottomFrame = new THREE.Mesh(h_topBottomGeom, frameMaterial);
h_bottomFrame.position.y = -h_windowHeight / 2 - frameThickness / 2;
h_frameGroup.add(h_bottomFrame);

const h_leftFrame = new THREE.Mesh(h_sideGeom, frameMaterial);
h_leftFrame.position.x = -h_windowWidth / 2 - frameThickness / 2;
h_frameGroup.add(h_leftFrame);

const h_rightFrame = new THREE.Mesh(h_sideGeom, frameMaterial);
h_rightFrame.position.x = h_windowWidth / 2 + frameThickness / 2;
h_frameGroup.add(h_rightFrame);

// Add dividers to split into thirds
const divider1 = new THREE.Mesh(h_dividerGeom, frameMaterial);
divider1.position.x = -h_windowWidth / 6;
h_frameGroup.add(divider1);

const divider2 = new THREE.Mesh(h_dividerGeom, frameMaterial);
divider2.position.x = h_windowWidth / 6;
h_frameGroup.add(divider2);

horizontalWindow.add(h_frameGroup);


// 8. Upper Windows (Duplicates of the lower side windows)
// Left Window (Upper)
const upperLeftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
upperLeftWindow.position.set(-1.5, 1.5, 2.55);
createStandardFrame(upperLeftWindow, windowWidth, windowHeight);
building.add(upperLeftWindow);

// Right Window (Upper)
const upperRightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
upperRightWindow.position.set(1.5, 1.5, 2.55);
createStandardFrame(upperRightWindow, windowWidth, windowHeight);
building.add(upperRightWindow);


// 9. Ground Plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide }); // Forest green
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// Rotate the plane to be horizontal
ground.rotation.x = -Math.PI / 2;
scene.add(ground);


// --- Controls ---

// OrbitControls allow the camera to be manipulated with the mouse.
// Arguments: The camera to control, the DOM element to attach event listeners to.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Adds a sense of inertia to the controls
// Set a target for the controls to orbit around the center of the building
controls.target.set(0, 6, 0);


// --- Animation Loop ---

// The animate function is called on every frame to update the scene.
function animate() {
    // requestAnimationFrame is a browser API for scheduling animations.
    requestAnimationFrame(animate);

    // Building does not rotate

    // Update the controls if damping is enabled
    controls.update();

    // Render the scene from the perspective of the camera
    renderer.render(scene, camera);
}


// --- Responsive Design ---

// Add an event listener to handle window resize events.
window.addEventListener('resize', () => {
    // Update the camera's aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update the renderer's size
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


// --- Start the Animation ---
animate();
