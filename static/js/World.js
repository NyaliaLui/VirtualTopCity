import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

import { mapDims, gameBounds, addBox } from './Utils.js';

export { World };

class World {
    constructor() {
        this.animals = [];
        this.nonAnimals = [];
        this.objectBounds = []; // The boundaries for all objects

        this.minDistance = 5; // The minimum distance between objects
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
    }

    resetBounds() {
        this.objectBounds = [];
        this.animals.forEach((animal) => {
            addBox(animal.model, this.objectBounds);
        }, this);
        this.nonAnimals.forEach((nonAnimal) => {
            addBox(nonAnimal, this.objectBounds);
        }, this);
    }

    update(timeElapsedS) {
        this.animals.forEach((animal) => {
            animal.update(timeElapsedS);
        });
    }
};