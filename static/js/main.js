// Import necessary modules from Three.js via the importmap
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { makeAnimal } from './Animal.js';
import { Player } from './Player.js';
import { mapDims, mapBounds, gameBounds, cityBounds, posTrees, getRandomInt, getRandomRotation } from './Utils.js';


class World {
    constructor() {
        this.meshes = []; // All meshes, including animals
        this.animals = []; // All animals
        this.objects = []; // All objects
    }

    resetObjects() {
        const makeBox = function(mesh) {
            if (mesh) {
                const b = new THREE.Box3();
                b.setFromObject(mesh);
                this.objects.push(b);
            }
        };

        this.objects = [];
        this.meshes.forEach(makeBox);
        this.animals.forEach(makeBox);
    }

    update(timeElapsedS) {
        this.animals.forEach((animal) => {
            animal.update(timeElapsedS);
        });
    }
};

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

const textureLoader = new THREE.TextureLoader();

const waterHeight = 100;
const waterGeometry = new THREE.PlaneGeometry(mapDims.width, waterHeight);
const water = new Water(
    waterGeometry,
    {
        textureWidth: mapDims.width,
        textureHeight: waterHeight,
        waterNormals: textureLoader.load('/static/textures/waternormals.jpg', (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
);
water.rotation.x = - Math.PI / 2;
water.position.z = gameBounds.left;
scene.add(water);

let sun = new THREE.Vector3();
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

const parameters = {
    elevation: 2,
    azimuth: 180
};

const pmremGenerator = new THREE.PMREMGenerator( renderer );
const sceneEnv = new THREE.Scene();

let renderTarget;

function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    if ( renderTarget !== undefined ) renderTarget.dispose();

    sceneEnv.add( sky );
    renderTarget = pmremGenerator.fromScene( sceneEnv );
    scene.add( sky );

    scene.environment = renderTarget.texture;

}
updateSun();

textureLoader.load('/static/textures/grass.jpg', (grassTexture) => {
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;

  const groundGeometry = new THREE.PlaneGeometry(mapDims.width, waterHeight);
  const groundMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.position.z = 0;

  scene.add(ground);
});

textureLoader.load('/static/textures/dirt.jpg', (dirtTexture) => {
  dirtTexture.wrapS = dirtTexture.wrapT = THREE.MirroredRepeatWrapping;

  const dirtGeometry = new THREE.PlaneGeometry(mapDims.width, waterHeight);
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture });
  const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0;
  dirt.position.z = gameBounds.right;

  scene.add(dirt);
});

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

        world.meshes.push(building);
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

        world.meshes.push(building);

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
        let index = world.meshes.indexOf(building);
        if (index > -1) {
            world.meshes[index] = undefined;
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
        world.meshes.push(station);
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
            world.meshes.push(rail);
        });
        console.debug(rails.map((rail) => rail.position));
    });

    gltfLoader.load('/static/models/train.glb', (glb) => {
        const train = glb.scene;
        train.scale.set(0.4,0.4,0.4);
        scene.add(train);
        train.position.set(0, 0.2, cityBounds.left - 8);
        train.rotation.y = -Math.PI / 2;
        world.meshes.push(train);
    });
}

// River env
gltfLoader.load('/static/models/low_poly_dock.glb', (glb) => {
    let dockSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.debug(dockSize);
    const numDocks = Math.floor((gameBounds.bottom - gameBounds.top) / dockSize.z);
    console.debug(numDocks);
    const docks = Array.from({ length: numDocks }, () => (glb.scene.clone()));
    docks.forEach((dock) => { scene.add(dock); });

    const groundDist = -2;
    // All docks are set at the border of the river and forest.
    docks.forEach((dock, index) => {
        dock.position.z = gameBounds.left - 50;
        dock.position.y = groundDist;
        dock.rotation.y = - Math.PI / 2;

        // The docks are originally loaded horizontal compared to the original scene
        // and we rotate the object 90 degrees (pi/2). This means we must adjust the x
        // position by the Z size.
        if (index == 0) dock.position.x = gameBounds.top;
        else dock.position.x = docks[index-1].position.x + dockSize.z;
        world.meshes.push(dock);
    });
    console.debug(docks.map((dock) => dock.position));
});

const resourceRange = {
    meat: { min: 1, max: 5},
    lumber: { min: 1, max: 5},
    metal: { min: 1, max: 3}
};

class Boat {
    model;

    isTrading = false;

    meatWanted;
    metalOffered;

    constructor(model) {
        this.model = model;
        const tradeOffer = generateTrade(resourceRange.meat, resourceRange.metal);
        this.meatWanted = tradeOffer[0];
        this.metalOffered = tradeOffer[1];
    }
};

const boatInteractionDist = 15;
var boats = [];
gltfLoader.load('/static/models/ss_norrtelje_lowpoly.glb', (glb) => {
    let boatSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.debug(boatSize);
    const boat = glb.scene;

    const groundDist = 0;
    boat.position.x = 0;
    boat.position.y = groundDist;
    boat.position.z = gameBounds.left - 43;
    boat.rotation.y = -Math.PI / 2;

    scene.add(boat);
    boat.name = `boat-1`;
    boats.push(new Boat(boat));
    world.meshes.push(boat);
});

function distanceWithin(src, dst, dist) {
    const distance = src.position.distanceTo(dst.position);
    console.debug(`src: ${src.name}, dst: ${dst.name}, distance ${distance}`);
    return distance <= dist;
}

// Forest env
const numTrees = {type1: 10, type2: 10};

gltfLoader.load('/static/models/leaf_tree_-_ps1_low_poly.glb', (glb) => {
    const trees = Array.from({ length: numTrees.type1 }, () => (glb.scene.clone()));
    trees.forEach((tree) => { scene.add(tree); });

    const groundDist = 0;
    trees.forEach((tree) => {
        tree.position.x = getRandomInt(posTrees.top, posTrees.bottom);
        tree.position.y = groundDist;
        tree.position.z = getRandomInt(posTrees.right, posTrees.left);
        tree.rotation.y = getRandomRotation();
        world.meshes.push(tree);
    });
    console.debug(trees.map((tree) => tree.position));
});

gltfLoader.load('/static/models/pine_tree_01.glb', (glb) => {
    const trees = Array.from({ length: numTrees.type2 }, () => (glb.scene.clone()));
    trees.forEach((tree) => { scene.add(tree); });
    const groundDist = 3;

    trees.forEach((tree) => {
        tree.scale.set(7,7,7);
        tree.position.x = getRandomInt(posTrees.top, posTrees.bottom);
        tree.position.y = groundDist;
        tree.position.z = getRandomInt(posTrees.right, posTrees.left);
        tree.rotation.y = getRandomRotation();
        world.meshes.push(tree);
    });
    console.debug(trees.map((tree) => tree.position));
});

// Animals
const addAnimal = function(name, glbPath, defaultAnimation, scaleV3, groundDist, scene) {
    makeAnimal(name, glbPath, defaultAnimation, scaleV3, groundDist, scene).then((animal) => {
        world.animals.push(animal);
    }, (err) => {
        console.error(`Problem loading animal: ${err}`);
    });
};

addAnimal('bison', '/static/models/bison.glb', 'ArmatureAction', new THREE.Vector3(0.5,0.5,0.5), 3, scene);
addAnimal('fox', '/static/models/fox.glb', 'idle', new THREE.Vector3(300,300,300), 0, scene);
addAnimal('deer', '/static/models/animated_low_poly_deer_game_ready.glb', 'Take 001', new THREE.Vector3(1,1,1), 0, scene);

world.resetObjects();
const player = new Player(scene, camera, world);

// UI Utilities
// Show popup
function showPopup(meatWanted, metalOffered) {
    document.getElementById('popup').style.display = 'flex';
    document.getElementById('meatWanted').innerText = `Meat wanted: ${meatWanted}`;
    document.getElementById('metalOffered').innerText = `Metal given: ${metalOffered}`;
}

// Generate a random trade offer
function generateTrade(meatRange, metalRange) {
    let meatCount = Math.floor(Math.random() * meatRange.max) + meatRange.min;
    let metalCount = Math.floor(Math.random() * metalRange.max) + metalRange.min;
    return [meatCount, metalCount];
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
    let boat = boats.find((boat) => boat.isTrading);
    if (!boat) {
        console.error('Failed to find the trading boat.');
        return;
    }

    if (player.inventory.meat >= boat.meatWanted) {
        player.inventory.meat -= boat.meatWanted;
        player.inventory.metal += boat.metalOffered;
        alert(`Trade accepted! You gave ${boat.meatWanted} meat and received ${boat.metalOffered} metal.`);
        resetTradeUI();
    } else {
        alert('Not enough meat to complete this trade.');
        resetTradeUI();
    }

    // TODO(@NyaliaLui): This is an API call to set the boat trading flag
    let index = boats.indexOf(boat);
    if (index > -1) boats[index].isTrading = false;
    else console.error('Could not find the trading boat. Was it deleted?');
}

// -- Player controls
document.addEventListener('keydown', (event) => {
    if (event.altKey && removableBuildings) {
        // TODO(@NyaliaLui): This is a place holder for a game event
        // when the max resources are collected.
        removeBuildings(removableBuildings);
        loadTrainStation();
        world.resetObjects();
    } else if (event.key === 'i') {
        // TODO(@NyaliaLui): This should be apart of the player controls which requires
        // the list of environment objects
        boats.forEach((boat) => {
            if (distanceWithin(player.model(), boat.model, boatInteractionDist)) {
                boat.isTrading = true;
                showPopup(boat.meatWanted, boat.metalOffered);
            }
        });
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
