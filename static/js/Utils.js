export { mapDims, mapBounds, gameBounds, playBounds, cityBounds, posTrees, getRandomInt, getRandomRotation };

const mapDims = {width: 500, height: 500};
const mapBounds = {right: -250, left: 250, top: -200, bottom: 170};
const gameBounds = {right: -100, left: 100, top: -100, bottom: 100};
const playBounds = {right: gameBounds.right + 50, left: gameBounds.left - 50, top: gameBounds.top + 50, bottom: gameBounds.bottom - 50};
const cityBounds = {right: gameBounds.right, left: playBounds.right, top: gameBounds.top, bottom: gameBounds.bottom};
const posTrees = {left: playBounds.left - 5, right: playBounds.right + 5, top: playBounds.top, bottom: playBounds.bottom};

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function getRandomRotation() {
    let denominator = [6,4,3,2];
    return (- Math.PI / denominator[Math.floor(Math.random() * denominator.length)]);
}