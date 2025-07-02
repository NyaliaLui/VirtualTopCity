import * as THREE from 'three';

export {
    mapDims,
    mapBounds,
    gameBounds,
    playBounds,
    cityBounds,
    posTrees,
    resourceRange,
    getRandomInt,
    getRandomRotation,
    distanceWithin,
    addBox,
    makePosition,
    generateTrade
};

const mapDims = {width: 500, height: 500};
const mapBounds = {right: -250, left: 250, top: -200, bottom: 170};
const gameBounds = {right: -100, left: 100, top: -100, bottom: 100};
const playBounds = {right: gameBounds.right + 50, left: gameBounds.left - 50, top: gameBounds.top + 50, bottom: gameBounds.bottom - 50};
const cityBounds = {right: gameBounds.right, left: playBounds.right, top: gameBounds.top, bottom: gameBounds.bottom};
const posTrees = {left: playBounds.left - 5, right: playBounds.right + 5, top: playBounds.top, bottom: playBounds.bottom};
const resourceRange = {
    meat: { min: 1, max: 5},
    lumber: { min: 1, max: 5},
    metal: { min: 1, max: 3}
};

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function getRandomRotation() {
    let denominator = [6,4,3,2];
    return (- Math.PI / denominator[Math.floor(Math.random() * denominator.length)]);
}

function distanceWithin(src, dst, dist) {
    const distance = src.position.distanceTo(dst.position);
    return distance <= dist;
}

function addBox(mesh, arr) {
    const b = new THREE.Box3();
    b.setFromObject(mesh);
    arr.push(b);
}

function makePosition(existingPositions, minDistance) {
    let temp = new THREE.Object3D();
    let isOverlapping;

    do {
        temp.position.x = getRandomInt(posTrees.top, posTrees.bottom);
        temp.position.z = getRandomInt(posTrees.right, posTrees.left);

        isOverlapping = existingPositions.some((existing) => {
            temp.position.y = existing.model.position.y;
            return distanceWithin(existing.model, temp, minDistance);
        });
    } while (isOverlapping);

    return temp.position;
}

function generateTrade() {
    let meatCount = getRandomInt(resourceRange.meat.min, resourceRange.meat.max);
    let metalCount = getRandomInt(resourceRange.metal.min, resourceRange.metal.max);
    return [meatCount, metalCount];
}