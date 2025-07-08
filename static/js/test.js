import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, cube, controls;

init();
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Add controls
    controls = new OrbitControls(camera, renderer.domElement);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown);
    document.getElementById('restartBtn').addEventListener('click', restart);
}

function animate() {
    requestAnimationFrame(animate);
    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (event.code === 'Space') {
        showVictoryPopup();
    }
}

function showVictoryPopup() {
    const popup = document.getElementById('victoryPopup');
    popup.style.display = 'block';
}

function restart() {
    // Remove renderer from DOM
    renderer.domElement.remove();
    renderer.dispose();

    // Dispose old scene
    disposeScene(scene);

    // Hide popup
    document.getElementById('victoryPopup').style.display = 'none';

    // Recreate everything
    init();
}

// Helper function to dispose scene objects
function disposeScene(rootObject) {
    rootObject.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        if (object.texture) object.texture.dispose();
    });
}
