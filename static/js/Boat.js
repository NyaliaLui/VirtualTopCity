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
        this.boundingBox = new THREE.Box3();
        // let tradeOffer = generateTrade();
        this.meatWanted = 5;
        this.metalOffered = 100;
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
                this.boundingBox.setFromObject(this.model);

                resolve(this);
            }, undefined, (err) => {
                reject(err);
            });
        });
    }

    update(timeElapsedS) {}
};

function makeBoat(name, glbPath, groundDist, scene) {
    const boat = new Boat(name, glbPath, new THREE.Vector3(0, groundDist, gameBounds.left - 43), scene);
    return boat.loadModel();
}