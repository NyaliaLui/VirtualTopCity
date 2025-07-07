// Import necessary modules from Three.js via the importmap
import * as THREE from 'three';
import { makeAnimal } from './Animal.js';
import { boatInteractionDist, makeBoat } from './Boat.js';
import { Player } from './Player.js';
import { makeTree } from './Tree.js';
import { distanceWithin, lvlCompletePopup, updateHUD } from './Utils.js';
import { World, removeBuildings, loadTrainStation } from './World.js';

function addBoat(name, scene, world) {
    makeBoat(name, '/static/models/ss_norrtelje_lowpoly.glb', 0, scene).then((boat) => {
        world.boat = boat;
    }, (err) => {
        console.error(`Problem loading ${name}: ${err.stack}`);
    });
};

function addTree(name, scene, world) {
    makeTree(name, '/static/models/leaf_tree_-_ps1_low_poly.glb', new THREE.Vector3(1, 1, 1), 0, scene, world).then((tree) => {
        world.animals.push(tree);
    }, (err) => {
        console.error(`Problem loading tree ${name}: ${err.stack}`);
    });
};

function addAnimal(name, glbPath, defaultAnimation, meat, health, scaleV3, groundDist, scene, world) {
    makeAnimal(name, glbPath, defaultAnimation, meat, health, scaleV3, groundDist, scene, world).then((animal) => {
        world.animals.push(animal);
    }, (err) => {
        console.error(`Problem loading animal ${name}: ${err.stack}`);
    });
};

function addObjects(scene, world) {
    // River env
    addBoat('boat-1', scene, world);

    // Forest env
    for (let i = 0; i < numTrees; ++i) {
        addTree(`Pine-${i}`, scene, world);
    }

    // Animals
    addAnimal('bison', '/static/models/bison.glb', 'ArmatureAction', 3, 5, new THREE.Vector3(0.5, 0.5, 0.5), 3, scene, world);
    addAnimal('fox', '/static/models/fox.glb', 'idle', 1, 1, new THREE.Vector3(300, 300, 300), 0, scene, world);
    addAnimal('deer', '/static/models/animated_low_poly_deer_game_ready.glb', 'Take 001', 2, 3, new THREE.Vector3(1, 1, 1), 0, scene, world);
}

// UI Utilities
function showTradeUI(meatWanted, metalOffered) {
    document.getElementById('popup').style.display = 'flex';
    document.getElementById('meatWanted').innerText = `Meat wanted: ${meatWanted}`;
    document.getElementById('metalOffered').innerText = `Metal given: ${metalOffered}`;
}

function resetTradeUI() {
    document.getElementById('billboard').innerText = 'The Kansas river is tough and my crew is low on food. Are you willing to trade for some metal?';
    document.getElementById('decision-btns').style.display = 'flex';
    hideTradeUI(); // Defined in index.html
}

function isLevelDone(player, winCondition, levelFin, scene, world) {
    if (levelFin) {
        return true;
    }

    if (JSON.stringify(player.inventory) == JSON.stringify(winCondition)) {
        removeBuildings(scene, world);
        loadTrainStation(scene, world);
        world.resetBounds();
        lvlCompletePopup('flex');
        return true;
    }

    return false;
}

const cameraOrigin = new THREE.Vector3(5, 5, 0);

// Scene: This is the container for all our 3D objects.
const scene = new THREE.Scene();

// Camera: This defines our point of view.\
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(cameraOrigin); // Adjusted camera position for a better view

// Renderer: This is what draws the scene onto the canvas.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Enable shadow mapping in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

const numTrees = 10;
let levelFin = false;
let isFocused = false;
let winCondition = {
    meat: 10,
    lumber: 0, // number of trees * (random range of [min, max])
    metal: 100 // number of boats * 100
};

let world = new World();
world.initEnvironment(scene, renderer);
addObjects(scene, world);
world.resetBounds();
let player = new Player(scene, camera, world);
updateHUD(player, winCondition);

// Accept trade
window.executeTrade = function () {
    // TODO(@NyaliaLui): This is an API call to get the boat that is trading with the user
    if (!world.boat) {
        console.error('Failed to find the trading boat.');
        return;
    }

    if (player.inventory.meat >= world.boat.meatWanted) {
        player.inventory.meat -= world.boat.meatWanted;
        player.inventory.metal += world.boat.metalOffered;
        updateHUD(player, winCondition);
        resetTradeUI();
    } else {
        resetTradeUI();
    }
}

// -- Player controls
document.addEventListener('keydown', (event) => {
    if (event.key === 'i') {
        if (world.boat && distanceWithin(player.model(), world.boat.model, boatInteractionDist)) {
            showTradeUI(world.boat.meatWanted, world.boat.metalOffered);
        }
    }
}, false);

// --- ANIMATION LOOP ---

const clock = new THREE.Clock();
function animate() {
    const timeElapsedS = clock.getDelta();
    world.update(timeElapsedS);
    player.update(timeElapsedS);
    if (player.checkCollisions()) {
        updateHUD(player, winCondition);
    }
    levelFin = isLevelDone(player, winCondition, levelFin, scene, world);
    if (levelFin && world.train && !isFocused) {
        player.focusOnModel(world.train, timeElapsedS);
        isFocused = true;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// --- RESPONSIVENESS ---

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop!
animate();
resetTradeUI();
