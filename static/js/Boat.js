import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { getRandomInt, getRandomRotation, generateTrade, gameBounds } from './Utils.js';

export { boatInteractionDist, Boat, makeBoat };

const boatInteractionDist = 15;

class Boat {
    constructor(name, glbPath, position, scene) {
        this.name = name;
        this.glbPath_ = glbPath;
        this.position_ = position;
        this.scene_ = scene;
        this.model = undefined;
        let tradeOffer = generateTrade();
        this.meatWanted = tradeOffer[0];
        this.metalOffered = tradeOffer[1];
    }

    loadModel() {
        return new Promise((resolve, reject) => {
            let gltfLoader = new GLTFLoader();
            gltfLoader.load(this.glbPath_, (glb) => {
                this.model = glb.scene;
                this.model.name = this.name;
                this.model.position.copy(this.position_);
                this.model.rotation.y = -Math.PI / 2;
                this.scene_.add(this.model);
                console.log(`boat pos ${this.model.position.x}, ${this.model.position.y}, ${this.model.position.z}`);

                resolve(this);
            }, undefined, (err) => {
                reject(err);
            });
        });
    }

    update(timeElapsedS) {}
};

async function makeBoat(name, glbPath, groundDist, scene) {
    const boat = new Boat(name, glbPath, new THREE.Vector3(0, groundDist, gameBounds.left - 43), scene);
    return boat.loadModel();
}