// Import necessary modules from Three.js via the importmap
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

// --- BASIC SETUP ---
const W = 'w';
const A = 'a';
const S = 's';
const D = 'd';
const SHIFT = 'shift';
const DIRECTIONS = [W, A, S, D];
const idle = 'idle';
const walk = 'walk';
const run = 'run';
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

}

class CharacterControls {

    model;
    mixer;
    animationsMap = new Map(); // Walk, Run, Idle
    orbitControl;
    camera;

    // state
    toggleRun = false;
    currentAction;
    
    // temporary data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, -1, 0);
    rotateQuarternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();
    
    // constants
    fadeDuration = 0.2;
    runVelocity = 50;
    walkVelocity = 10;

    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        })
        this.orbitControl = orbitControl;
        this.camera = camera;
        this.updateCameraTarget(0,0);
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    update(delta, keyState) {
        const directionPressed = DIRECTIONS.some(key => keyState[key] == true);

        let play = '';
        if (directionPressed && this.toggleRun) {
            play = run;
        } else if (directionPressed) {
            play = walk;
        } else {
            play = idle;
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction == run || this.currentAction == walk) {
            // calculate towards camera direction
            let angleYCameraDirection = Math.atan2(
                    (this.camera.position.x - this.model.position.x), 
                    (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            let directionOffset = this.directionOffset(keyState);

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection);
            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

            // run/walk velocity
            const velocity = this.currentAction == run ? this.runVelocity : this.walkVelocity;

            // move model & camera
            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
            this.updateCameraTarget(moveX, moveZ);
        }
    }

    updateCameraTarget(moveX, moveZ) {
        // move camera
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;

        // update camera target
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    directionOffset(keyState) {
        let directionOffset = 0; // w

        if (keyState[W]) {
            if (keyState[A]) {
                directionOffset = -Math.PI / 4; // w+a
            } else if (keyState[D]) {
                directionOffset = Math.PI / 4; // w+d
            }
        } else if (keyState[S]) {
            if (keyState[A]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2; // s+a
            } else if (keyState[D]) {
                directionOffset = Math.PI / 4 + Math.PI / 2; // s+d
            } else {
                directionOffset = Math.PI; // s
            }
        } else if (keyState[A]) {
            directionOffset = - Math.PI / 2; // a
        } else if (keyState[D]) {
            directionOffset = Math.PI / 2; // d
        }

        return directionOffset;
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

// --- CONTROLS ---

// OrbitControls: Allows the camera to be manipulated with the mouse.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 15;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();

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

gltfLoader.load('/static/models/ss_norrtelje_lowpoly.glb', (glb) => {
    let boatSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.log(boatSize);
    const boat = glb.scene;

    const groundDist = 0;
    boat.position.x = 0;
    boat.position.y = groundDist;
    boat.position.z = gameBounds.left - 43;
    boat.rotation.y = -Math.PI / 2;

    scene.add(boat);
});

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

    console.log(bison.animations.map(anim => anim.name));
});

const fox = {scene: new THREE.Object3D(), animations: [], mixer: undefined};
gltfLoader.load('/static/models/fox.glb', (glb) => {
    fox.scene = glb.scene;
    fox.scene.name = 'fox';
    fox.scene.scale.set(300,300,300);

    fox.animations = glb.animations;
    fox.mixer = new THREE.AnimationMixer(fox.scene);
    placeFox();

    console.log(fox.animations.map(anim => anim.name));
});

const deer = {scene: new THREE.Object3D(), animations: [], mixer: undefined};
gltfLoader.load('/static/models/animated_low_poly_deer_game_ready.glb', (glb) => {
    deer.scene = glb.scene;
    deer.scene.name = 'deer';

    deer.animations = glb.animations;
    deer.mixer = new THREE.AnimationMixer(deer.scene);
    placeDeer();

    console.log(deer.animations.map(anim => anim.name));
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
gltfLoader.load('/static/models/Xbot.glb', (glb) => {
    const model = glb.scene;

    // Scale and position the model
    model.scale.set(2, 2, 2);
    model.position.set(0, 0, 0);
    model.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
    });
    scene.add(model);

    const gltfAnimations = glb.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map();
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a));
    });

    console.debug(gltfAnimations.map(anim => anim.name));

    characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera,  idle);
});

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
    }
    controls.update();
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
