import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { getRandomRotation, makePosition } from './Utils.js';

export { Animal, makeAnimal };

class Animal {
    constructor(name, glbPath, defaultAnimation, meat, health, scaleV3, position, scene) {
        this.name = name;
        this.glbPath_ = glbPath;
        this.defaultAnimation_ = defaultAnimation;
        this.meat = meat;
        this.health = health;
        this.scaleV3_ = scaleV3;
        this.position_ = position;
        this.scene_ = scene;
        this.model = undefined;
        this.boundingBox = new THREE.Box3();
        this.mixer_ = undefined;
    }

    loadModel() {
        return new Promise((resolve, reject) => {
            let gltfLoader = new GLTFLoader();
            gltfLoader.load(this.glbPath_, (glb) => {
                this.model = glb.scene;
                this.model.name = this.name;
                this.model.scale.copy(this.scaleV3_);
                this.model.position.copy(this.position_);
                this.model.rotation.y = getRandomRotation();
                this.scene_.add(this.model);
                this.boundingBox.setFromObject(this.model);

                this.mixer_ = new THREE.AnimationMixer(this.model);
                console.debug(glb.animations.map((animation) => animation.name));
                let animation = glb.animations.find((animation) => animation.name == this.defaultAnimation_);
                let action = this.mixer_.clipAction(animation); // Assuming idle is first
                action.play();
                resolve(this);
            }, undefined, (err) => {
                reject(err);
            });
        });
    }

    update(timeElapsedS) {
        if (this.mixer_) {
            this.mixer_.update(timeElapsedS);
        }
    }

    editInventory(inventory) {
        inventory.meat += this.meat;
    }
};

function makeAnimal(name, glbPath, defaultAnimation, meat, health, scaleV3, groundDist, scene, world) {
    let pos = makePosition(world.animals, world.minDistance);
    pos.y = groundDist;
    const animal = new Animal(name, glbPath, defaultAnimation, meat, health, scaleV3, pos, scene);
    return animal.loadModel();
}