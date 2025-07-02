// Import necessary modules from Three.js via the importmap
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeAnimal } from './Animal.js';
import { boatInteractionDist, makeBoat } from './Boat.js';
import { Player } from './Player.js';
import { makeTree } from './Tree.js';
import { mapBounds, gameBounds, cityBounds, distanceWithin, resourceRange } from './Utils.js';
import { World, makeDocks } from './World.js';

const roadWidth = 10;

// Scene: This is the container for all our 3D objects.
const scene = new THREE.Scene();
// The background will be set by the skybox loader later.

// Camera: This defines our point of view.\
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 0); // Adjusted camera position for a better view

// Renderer: This is what draws the scene onto the canvas.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Enable shadow mapping in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

const world = new World();
world.initEnvironment(scene, renderer);

// --- OBJECTS ---

const gltfLoader = new GLTFLoader();

// City env
// Back row of buildings
gltfLoader.load('/static/models/mega_moduler_apartment_building.glb', (glb) => {
    let buildingSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.debug(buildingSize);
    const numBuildings = Math.floor((mapBounds.bottom - mapBounds.top) / buildingSize.x);
    console.debug(numBuildings);
    const buildings = Array.from({ length: numBuildings }, () => (glb.scene.clone()));
    buildings.forEach((building) => { scene.add(building); });
    
    const groundDist = -1;
    buildings.forEach((building, index) => {
        building.position.x  = 0;
        building.position.y = groundDist;
        building.position.z = cityBounds.left - 65;

        if (index == 0) building.position.x = mapBounds.top;
        else building.position.x = buildings[index-1].position.x + buildingSize.x + roadWidth;

        world.nonAnimals.push(building);
    });
});

// Front row of buildings
const removableBuildingsRange = { min: 3, max: 5};
var removableBuildings = new Array(3);
gltfLoader.load('/static/models/mega_moduler_apartment_building.glb', (glb) => {
    let buildingSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.debug(buildingSize);
    const numBuildings = Math.floor((mapBounds.bottom - mapBounds.top) / buildingSize.x);
    console.debug(numBuildings);
    const buildings = Array.from({ length: numBuildings }, () => (glb.scene.clone()));
    buildings.forEach((building) => { scene.add(building); });
    
    const groundDist = -1;
    buildings.forEach((building, index) => {
        building.position.x  = 0;
        building.position.y = groundDist;
        building.position.z = cityBounds.left;

        if (index == 0) building.position.x = mapBounds.top;
        else building.position.x = buildings[index-1].position.x + buildingSize.x + roadWidth;

        building.name = `front-building-${index}`;

        world.nonAnimals.push(building);

        if (index >= removableBuildingsRange.min && index <= removableBuildingsRange.max) {
            removableBuildings.push(building.name);
        }
    });
});

function removeBuildings(names) {
    names.forEach((name) => {
        let building = scene.getObjectByName(name);
        scene.remove(building);

        // Mark removed buildings for removal
        let index = world.nonAnimals.indexOf(building);
        if (index > -1) {
            world.nonAnimals[index] = undefined;
        }
    });
}

function loadTrainStation() {
    gltfLoader.load('/static/models/mount_royal_train_station.glb', (glb) => {
        const station = glb.scene;
        let stationSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        console.debug(stationSize);
        scene.add(station);

        const groundDist = 24;
        station.position.set(0, groundDist, cityBounds.left - 65);
        world.nonAnimals.push(station);
    });

    gltfLoader.load('/static/models/rail_long.glb', (glb) => {
        let railSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        console.debug(railSize);
        const numRails = 8;
        console.debug(numRails);
        const rails = Array.from({ length: numRails }, () => (glb.scene.clone()));
        rails.forEach((rail) => { 
            rail.scale.set(5,2,2);
            scene.add(rail);
        });

        const groundDist = 0;
        // All rails are set at the border of the city and forest.
        rails.forEach((rail, index) => {
            rail.position.z = cityBounds.left - railSize.z - 4.5;
            rail.position.y = groundDist;
            rail.rotation.y = - Math.PI / 2;

            // The city are originally loaded horizontal compared to the original scene
            // and we rotate the object 90 degrees (pi/2). This means we must adjust the x
            // position by the Z size.
            if (index == 0) rail.position.x = -30;
            else rail.position.x = rails[index-1].position.x + railSize.z + 3;
            world.nonAnimals.push(rail);
        });
        console.debug(rails.map((rail) => rail.position));
    });

    gltfLoader.load('/static/models/train.glb', (glb) => {
        const train = glb.scene;
        train.scale.set(0.4,0.4,0.4);
        scene.add(train);
        train.position.set(0, 0.2, cityBounds.left - 8);
        train.rotation.y = -Math.PI / 2;
        world.nonAnimals.push(train);
    });
}

// River env
const addBoat = async function(name, glbPath, groundDist, scene) {
    await makeBoat(name, glbPath, groundDist, scene).then((boat) => {
        world.boat = boat;
    }, (err) => {
        console.error(`Problem loading ${name}: ${err.stack}`);
    });
};

await addBoat('boat-1', '/static/models/ss_norrtelje_lowpoly.glb', 0, scene);

// Forest env
const addTree = async function(name, glbPath, scaleV3, groundDist, scene) {
    await makeTree(name, glbPath, scaleV3, groundDist, scene, world).then((tree) => {
        world.animals.push(tree);
    }, (err) => {
        console.error(`Problem loading tree ${name}: ${err.stack}`);
    });
};

const numTrees = 10;
for (let i=0; i<numTrees; ++i) {
    await addTree(`BigPine-${i}`, '/static/models/leaf_tree_-_ps1_low_poly.glb', new THREE.Vector3(1,1,1), 0, scene);
    await addTree(`SmallPine-${i}`, '/static/models/pine_tree_01.glb', new THREE.Vector3(7,7,7), 3, scene);
}

// Remove a tree from the scene and world after it dies

// Animals
const addAnimal = async function(name, glbPath, defaultAnimation, scaleV3, groundDist, scene) {
    await makeAnimal(name, glbPath, defaultAnimation, scaleV3, groundDist, scene, world).then((animal) => {
        world.animals.push(animal);
    }, (err) => {
        console.error(`Problem loading animal ${name}: ${err.stack}`);
    });
};

await addAnimal('bison', '/static/models/bison.glb', 'ArmatureAction', new THREE.Vector3(0.5,0.5,0.5), 3, scene);
await addAnimal('fox', '/static/models/fox.glb', 'idle', new THREE.Vector3(300,300,300), 0, scene);
await addAnimal('deer', '/static/models/animated_low_poly_deer_game_ready.glb', 'Take 001', new THREE.Vector3(1,1,1), 0, scene);

world.resetBounds();
const player = new Player(scene, camera, world);

// UI Utilities
// Show popup
function showPopup(meatWanted, metalOffered) {
    document.getElementById('popup').style.display = 'flex';
    document.getElementById('meatWanted').innerText = `Meat wanted: ${meatWanted}`;
    document.getElementById('metalOffered').innerText = `Metal given: ${metalOffered}`;
}

function updateTradeUI(billboardMsg) {
    document.getElementById('billboard').innerText = billboardMsg;
    document.getElementById('decision-btns').style.display = 'none';
}

function resetTradeUI() {
    document.getElementById('billboard').innerText = 'The Kansas river is tough and my crew is low on food. Are you willing to trade for some metal?';
    document.getElementById('decision-btns').style.display = 'flex';
    hideTradeUI();
}

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
        alert(`Trade accepted! You gave ${world.boat.meatWanted} meat and received ${world.boat.metalOffered} metal.`);
        resetTradeUI();
    } else {
        alert('Not enough meat to complete this trade.');
        resetTradeUI();
    }
}

// -- Player controls
document.addEventListener('keydown', (event) => {
    if (event.altKey && removableBuildings) {
        // TODO(@NyaliaLui): This is a place holder for a game event
        // when the max resources are collected.
        removeBuildings(removableBuildings);
        loadTrainStation();
        world.resetBounds();
    } else if (event.key === 'i') {
        if (world.boat && distanceWithin(player.model(), world.boat.model, boatInteractionDist)) {
            showPopup(world.boat.meatWanted, world.boat.metalOffered);
        }
    }
}, false);

// --- ANIMATION LOOP ---

const clock = new THREE.Clock();
function animate() {
    const timeElapsedS = clock.getDelta();
    world.update(timeElapsedS);
    player.update(timeElapsedS);
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
