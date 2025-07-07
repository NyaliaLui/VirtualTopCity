import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { getRandomInt, getRandomRotation, makePosition, resourceRange } from './Utils.js';

export { Tree, makeTree };

class Tree {
    constructor(name, glbPath, scaleV3, position, scene) {
        this.name = name;
        this.glbPath_ = glbPath;
        this.scaleV3_ = scaleV3;
        this.position_ = position;
        this.scene_ = scene;
        this.model = undefined;
        this.boundingBox = new THREE.Box3();
        // this.lumber = getRandomInt(resourceRange.lumber.min, resourceRange.lumber.max+1);
        this.lumber = 2;
        this.health = 3;
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

                resolve(this);
            }, undefined, (err) => {
                reject(err);
            });
        });
    }

    update(timeElapsedS) {}

    editInventory(inventory) {
        inventory.lumber += this.lumber;
    }
};

function makeTree(name, glbPath, scaleV3, groundDist, scene, world) {
    let pos = makePosition(world.animals, world.minDistance);
    pos.y = groundDist;
    const tree = new Tree(name, glbPath, scaleV3, pos, scene);
    return tree.loadModel();
}