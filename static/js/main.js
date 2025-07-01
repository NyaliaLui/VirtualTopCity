// Import necessary modules from Three.js via the importmap
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

// --- BASIC SETUP ---
const W = 'w';
const A = 'a';
const S = 's';
const D = 'd';
const SHIFT = 'shift';
const DIRECTIONS = [W, A, S, D];
const idle = 'axe_IDLE';
const walk = 'axe_WALK';
const run = 'axe_RUN';
const hit = 'axe_ATK1+ATK2(hit)';
const roadWidth = 10;
const mapDims = {width: 500, height: 500};
const mapBounds = {right: -250, left: 250, top: -200, bottom: 170};
const gameBounds = {right: -100, left: 100, top: -100, bottom: 100};
const playBounds = {right: gameBounds.right + 50, left: gameBounds.left - 50, top: gameBounds.top + 50, bottom: gameBounds.bottom - 50};
const cityBounds = {right: gameBounds.right, left: playBounds.right, top: gameBounds.top, bottom: gameBounds.bottom};

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function getRandomRotation() {
    let denominator = [6,4,3,2];
    return (- Math.PI / denominator[Math.floor(Math.random() * denominator.length)]);
}

class KeyDisplay {

    map = new Map();

    constructor() {
        const w = document.createElement("div");
        const a = document.createElement("div");
        const s = document.createElement("div");
        const d = document.createElement("div");
        const shift = document.createElement("div");

        this.map.set(W, w);
        this.map.set(A, a);
        this.map.set(S, s);
        this.map.set(D, d);
        this.map.set(SHIFT, shift);

        this.map.forEach( (v, k) => {
            v.style.color = 'blue';
            v.style.fontSize = '50px';
            v.style.fontWeight = '800';
            v.style.position = 'absolute';
            v.textContent = k;
        })

        this.updatePosition();

        this.map.forEach( (v, _) => {
            document.body.append(v);
        });
    }

    updatePosition() {
        this.map.get(W).style.top = `${window.innerHeight - 150}px`;
        this.map.get(A).style.top = `${window.innerHeight - 100}px`;
        this.map.get(S).style.top = `${window.innerHeight - 100}px`;
        this.map.get(D).style.top = `${window.innerHeight - 100}px`;
        this.map.get(SHIFT).style.top = `${window.innerHeight - 100}px`;

        this.map.get(W).style.left = `${300}px`;
        this.map.get(A).style.left = `${200}px`;
        this.map.get(S).style.left = `${300}px`;
        this.map.get(D).style.left = `${400}px`;
        this.map.get(SHIFT).style.left = `${50}px`;
    }

    down (key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'red';
        }
    }

    up (key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'blue';
        }
    }

};

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
    });
});

// Front row of buildings
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

        if (index >= 3 && index <= 5) {
            removableBuildings.push(building.name);
        }
    });
});

function removeBuildings(names) {
    names.forEach((name) => {
        let building = scene.getObjectByName(name);
        scene.remove(building);
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
        });
        console.debug(rails.map((rail) => rail.position));
    });

    gltfLoader.load('/static/models/train.glb', (glb) => {
        const train = glb.scene;
        train.scale.set(0.4,0.4,0.4);
        scene.add(train);
        train.position.set(0, 0.2, cityBounds.left - 8);
        train.rotation.y = -Math.PI / 2;
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
});

function distanceWithin(src, dst, dist) {
    const distance = src.position.distanceTo(dst.position);
    console.debug(`src: ${src.name}, dst: ${dst.name}, distance ${distance}`);
    return distance <= dist;
}

// Forest env
const numTrees = {type1: 10, type2: 10};
const posTrees = {left: playBounds.left - 5, right: playBounds.right + 5, top: playBounds.top, bottom: playBounds.bottom};

gltfLoader.load('/static/models/leaf_tree_-_ps1_low_poly.glb', (glb) => {
    const trees = Array.from({ length: numTrees.type1 }, () => (glb.scene.clone()));
    trees.forEach((tree) => { scene.add(tree); });

    const groundDist = 0;
    trees.forEach((tree) => {
        tree.position.x = getRandomInt(posTrees.top, posTrees.bottom);
        tree.position.y = groundDist;
        tree.position.z = getRandomInt(posTrees.right, posTrees.left);
        tree.rotation.y = getRandomRotation();
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
    });
    console.debug(trees.map((tree) => tree.position));
});

// Animals
const bison = { scene: new THREE.Object3D(), animations: [], mixer: undefined};
gltfLoader.load('/static/models/bison.glb', (glb) => {
    bison.scene = glb.scene;
    bison.scene.name = 'bison';
    bison.scene.scale.set(0.5,0.5,0.5);

    bison.animations = glb.animations;
    bison.mixer = new THREE.AnimationMixer(bison.scene);
    placeBison();

    console.debug(bison.animations.map(anim => anim.name));
});

const fox = {scene: new THREE.Object3D(), animations: [], mixer: undefined};
gltfLoader.load('/static/models/fox.glb', (glb) => {
    fox.scene = glb.scene;
    fox.scene.name = 'fox';
    fox.scene.scale.set(300,300,300);

    fox.animations = glb.animations;
    fox.mixer = new THREE.AnimationMixer(fox.scene);
    placeFox();

    console.debug(fox.animations.map(anim => anim.name));
});

const deer = {scene: new THREE.Object3D(), animations: [], mixer: undefined};
gltfLoader.load('/static/models/animated_low_poly_deer_game_ready.glb', (glb) => {
    deer.scene = glb.scene;
    deer.scene.name = 'deer';

    deer.animations = glb.animations;
    deer.mixer = new THREE.AnimationMixer(deer.scene);
    placeDeer();

    console.debug(deer.animations.map(anim => anim.name));
});

function placeBison() {
    const groundDist = 3;
    bison.scene.position.x = getRandomInt(posTrees.top, posTrees.bottom);
    bison.scene.position.y = groundDist;
    bison.scene.position.z = getRandomInt(posTrees.right, posTrees.left);
    bison.scene.rotation.y = getRandomRotation();
    scene.add(bison.scene);
}

function placeFox() {
    // let foxSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    // console.debug(foxSize);
    const groundDist = 0;
    fox.scene.position.x = getRandomInt(posTrees.top, posTrees.bottom);
    fox.scene.position.y = groundDist;
    fox.scene.position.z = getRandomInt(posTrees.right, posTrees.left);
    fox.scene.rotation.y = getRandomRotation();
    scene.add(fox.scene);
}

function placeDeer() {
    // let deerSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    // console.debug(deerSize);
    const groundDist = 0;
    deer.scene.position.x = getRandomInt(posTrees.top, posTrees.bottom);
    deer.scene.position.y = groundDist;
    deer.scene.position.z = getRandomInt(posTrees.right, posTrees.left);
    deer.scene.rotation.y = getRandomRotation();
    scene.add(deer.scene);
}

var characterControls;
gltfLoader.load('/static/models/animated_fps_axe.glb', (glb) => {
    const model = glb.scene;

    // Scale and position the model
    model.name = 'username';
    model.scale.set(2, 2, 2);
    model.position.set(0, 0, 0);
    model.rotation.y = -Math.PI;
    model.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
    });
    scene.add(model);

    const gltfAnimations = glb.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map();
    gltfAnimations.forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a));
    });

    console.log(gltfAnimations.map(anim => anim.name));
});

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

    if (characterControls.inventory.meat >= boat.meatWanted) {
        characterControls.inventory.meat -= boat.meatWanted;
        characterControls.inventory.metal += boat.metalOffered;
        characterControls.updateHUD();
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

// -- Keyboard controls
const keyState = {}; // Object to hold the state of the keys
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
    } else if (event.altKey && removableBuildings) {
        removeBuildings(removableBuildings);
        loadTrainStation();
    } else if (event.key === 'i') {
        boats.forEach((boat) => {
            if (distanceWithin(characterControls.model, boat.model, boatInteractionDist)) {
                boat.isTrading = true;
                showPopup(boat.meatWanted, boat.metalOffered);
            }
        });
    } else {
        keyState[event.key.toLowerCase()] = true;
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keyState[event.key.toLowerCase()] = false;
}, false);

// --- ANIMATION LOOP ---

const clock = new THREE.Clock();
function animate() {
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keyState);
        characterControls.updateHUD();
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
