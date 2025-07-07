import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

import { mapDims, mapBounds, cityBounds, gameBounds, disposeScene } from './Utils.js';

export { 
    World,
    makeDocks,
    makeBuildings,
    removeBuildings,
    loadTrainStation
};

class World {
    constructor() {
        this.animals = [];
        this.boat = undefined;
        this.train = undefined;
        this.nonAnimals = [];
        this.objectBounds = []; // The boundaries for all objects
        this.removableBuildings = [];

        this.minDistance = 10; // The minimum distance between objects
    }

    initEnvironment(scene, renderer) {
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

        const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
        const theta = THREE.MathUtils.degToRad( parameters.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
        water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

        sceneEnv.add( sky );
        let renderTarget = pmremGenerator.fromScene( sceneEnv );
        scene.add( sky );

        scene.environment = renderTarget.texture;

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

        makeDocks(scene, this);
        makeBuildings(scene, this);
    }

    resetBounds() {
        this.objectBounds = [];
        this.animals.forEach((animal) => {
            this.objectBounds.push(animal);
        }, this);

        if (this.boat) {
            this.objectBounds.push(this.boat);
        }

        this.nonAnimals.forEach((nonAnimal) => {
            if (nonAnimal) {
                let box = new THREE.Box3();
                box.setFromObject(nonAnimal);
                this.objectBounds.push({model: nonAnimal, boundingBox: box});
            }
        }, this);
    }

    update(timeElapsedS) {
        this.animals.forEach((animal) => {
            animal.update(timeElapsedS);
        });
    }
};

function makeDocks(scene, world) {
    let gltfLoader = new GLTFLoader();
    gltfLoader.load('/static/models/low_poly_dock.glb', (glb) => {
        let dockSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        let numDocks = Math.floor((gameBounds.bottom - gameBounds.top) / dockSize.z);
        let docks = Array.from({ length: numDocks }, () => (glb.scene.clone()));
        docks.forEach((dock) => { scene.add(dock); });

        let groundDist = -2;
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
            world.nonAnimals.push(dock);
        });
    });
}

function makeBuildings(scene, world) {
    let gltfLoader = new GLTFLoader();
    let roadWidth = 10;
    gltfLoader.load('/static/models/mega_moduler_apartment_building.glb', (glb) => {
        let buildingSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        let numBuildings = Math.floor((mapBounds.bottom - mapBounds.top) / buildingSize.x);
        let buildings = Array.from({ length: numBuildings }, () => (glb.scene.clone()));
        buildings.forEach((building) => { scene.add(building); });
        
        let groundDist = -1;
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
    gltfLoader.load('/static/models/mega_moduler_apartment_building.glb', (glb) => {
        let buildingSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        let numBuildings = Math.floor((mapBounds.bottom - mapBounds.top) / buildingSize.x);
        let buildings = Array.from({ length: numBuildings }, () => (glb.scene.clone()));
        buildings.forEach((building) => { scene.add(building); });
        
        let removableBuildingsRange = { min: 3, max: 5 };
        let groundDist = -1;
        buildings.forEach((building, index) => {
            building.position.x  = 0;
            building.position.y = groundDist;
            building.position.z = cityBounds.left;

            if (index == 0) building.position.x = mapBounds.top;
            else building.position.x = buildings[index-1].position.x + buildingSize.x + roadWidth;

            building.name = `front-building-${index}`;

            world.nonAnimals.push(building);

            if (index >= removableBuildingsRange.min && index <= removableBuildingsRange.max) {
                world.removableBuildings.push(building.name);
            }
        });
    });
}

function removeBuildings(scene, world) {
    world.removableBuildings.forEach((name) => {
        let building = scene.getObjectByName(name);
        scene.remove(building);

        // Mark removed buildings for removal
        let index = world.nonAnimals.indexOf(building);
        if (index > -1) {
            world.nonAnimals.splice(index, 1);
        }

        disposeScene(building);
    });
}

function loadTrainStation(scene, world) {
    let gltfLoader = new GLTFLoader();
    gltfLoader.load('/static/models/mount_royal_train_station.glb', (glb) => {
        let station = glb.scene;
        let stationSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        scene.add(station);

        let groundDist = 24;
        station.position.set(0, groundDist, cityBounds.left - 65);
        world.nonAnimals.push(station);
    });

    gltfLoader.load('/static/models/rail_long.glb', (glb) => {
        let railSize = new THREE.Box3().setFromObject(glb.scene).getSize(new THREE.Vector3());
        let numRails = 8;
        let rails = Array.from({ length: numRails }, () => (glb.scene.clone()));
        rails.forEach((rail) => { 
            rail.scale.set(5,2,2);
            scene.add(rail);
        });

        let groundDist = 0;
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
    });

    gltfLoader.load('/static/models/train.glb', (glb) => {
        world.train = glb.scene;
        world.train.scale.set(0.4,0.4,0.4);
        scene.add(world.train);
        world.train.position.set(0, 0.2, cityBounds.left - 8);
        world.train.rotation.y = -Math.PI / 2;
        world.nonAnimals.push(world.train);
    });
}
