import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { posTrees, getRandomInt, getRandomRotation } from './Utils.js';

export { Animal, makeAnimal };

const gltfLoader = new GLTFLoader();

class Animal {
    constructor(name, glbPath, defaultAnimation, scaleV3, groundDist, scene) {
        this.name = name;
        this.glbPath_ = glbPath;
        this.defaultAnimation_ = defaultAnimation;
        this.scaleV3_ = scaleV3;
        this.groundDist_ = groundDist;
        this.scene_ = scene;
        this.model = undefined;
        this.mixer_ = undefined;
    }

    loadModel() {
        return new Promise((resolve, reject) => {
            gltfLoader.load(this.glbPath_, (glb) => {
                this.model = glb.scene;
                this.model.name = this.name;
                this.model.scale.copy(this.scaleV3_);
                this.model.position.x = getRandomInt(posTrees.top, posTrees.bottom);
                this.model.position.y = this.groundDist_;
                this.model.position.z = getRandomInt(posTrees.right, posTrees.left);
                this.model.rotation.y = getRandomRotation();
                this.scene_.add(this.model);

                this.mixer_ = new THREE.AnimationMixer(this.model);
                console.log(glb.animations.map((animation) => animation.name));
                const animation = glb.animations.find((animation) => animation.name == this.defaultAnimation_);
                const action = this.mixer_.clipAction(animation); // Assuming idle is first
                action.play();
            }, undefined, (err) => {
                reject(err);
            });

            resolve(this);
        });
    }

    update(timeElapsedS) {
        if (this.mixer_) {
            this.mixer_.update(timeElapsedS);
        }
    }
};

function makeAnimal(name, glbPath, defaultAnimation, scaleV3, groundDist, scene) {
    const animal = new Animal(name, glbPath, defaultAnimation, scaleV3, groundDist, scene);
    return animal.loadModel();
}