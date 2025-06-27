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
const gameBounds = {right: -100, left: 100, top: -100, bottom: 100};

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
    runVelocity = 25;
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
}

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
  ground.position.z = gameBounds.right;

  scene.add(ground);
});

textureLoader.load('/static/textures/dirt2.jpg', (dirtTexture) => {
  dirtTexture.wrapS = dirtTexture.wrapT = THREE.MirroredRepeatWrapping;
//   dirtTexture.repeat.set(mapDims.width, waterHeight);

  const dirtGeometry = new THREE.PlaneGeometry(mapDims.width, waterHeight);
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture });
  const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0;
  dirt.position.z = 0;

  scene.add(dirt);
});

// --- OBJECTS ---

const gltfLoader = new GLTFLoader();
gltfLoader.load('/static/models/mega_moduler_apartment_building.glb', (glb) => {
    const buildings = [glb.scene.clone(), glb.scene.clone(), glb.scene.clone()];
    let buildingSize = new THREE.Box3().setFromObject(buildings[0]).getSize(new THREE.Vector3());
    buildings.forEach((building) => { scene.add(building); });
    
    // Set buildings position
    const groundDist = -1;
    buildings[0].position.y = groundDist;
    buildings[1].position.x = buildings[0].position.x + buildingSize.x + roadWidth;
    buildings[1].position.y = groundDist;
    buildings[2].position.x = buildings[1].position.x + buildingSize.x + roadWidth;
    buildings[2].position.y = groundDist;
});

// gltfLoader.load('/static/models/mount_royal_train_station.glb', (glb) => {
//     scene.add(glb.scene);
//     glb.scene.position.set(-100, 30, -100);
// });

gltfLoader.load('/static/models/low_poly_dock.glb', (glb) => {
    let dockSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
    console.log(dockSize);
    const numDocks = Math.floor((gameBounds.bottom - gameBounds.top) / dockSize.z);
    console.log(numDocks);
    const docks = Array.from({ length: numDocks }, () => (glb.scene.clone()));
    docks.forEach((dock) => { scene.add(dock); });

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
    console.log(docks.map((dock) => dock.position));
});

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

    console.log(gltfAnimations.map(anim => anim.name));

    characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera,  idle);
});

// -- Keyboard controls
const keyState = {}; // Object to hold the state of the keys
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
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
