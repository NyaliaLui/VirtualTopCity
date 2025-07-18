import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export { InputController, FirstPersonCamera, Player };

const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};

function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

function v3dToString(v3d) {
    return `${v3d.x}, ${v3d.y}, ${v3d.z}`;
}

const ACTIONS = {
    idle: 'axe_IDLE',
    walk: 'axe_WALK',
    run: 'axe_RUN',
    hit: 'axe_ATK1+ATK2(hit)'
};

const HEIGHTS = {
    camera: 3,
    user: 0
};

const Q180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI);

class InputController {
  constructor() {
    this.target_ = document;
    this.initialize_();    
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
  }

  onMouseMove_(e) {
    this.current_.mouseX = e.pageX - window.innerWidth / 2;
    this.current_.mouseY = e.pageY - window.innerHeight / 2;

    if (this.previous_ === null) {
      this.previous_ = {...this.current_};
    }

    this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
    this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
  }

  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  isMouseDown() {
    return this.current_.leftButton || this.current_.rightButton;
  }

  isMouseUp() {
    return !this.isMouseDown();
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = {...this.current_};
    }
  }
};


class FirstPersonCamera {
    // constants
    FADEDURATION = 0.2;
    RUNVELOCITY = 50;
    WALKVELOCITY = 10;

  constructor(model, mixer, animationsMap, camera, world) {
    this.model_ = model;
    this.mixer_ = mixer;
    this.animationsMap_ = animationsMap;
    this.currentAction_ = ACTIONS.idle;
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(0, HEIGHTS.camera, 0);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.world_ = world;

    this.animationsMap_.forEach((value, key) => {
        if (key == this.currentAction_) {
            value.play();
        }
    });
  }

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateAnimation_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    // this.updateHeadBob_(timeElapsedS);
    this.input_.update(timeElapsedS);
  }

  isCurrentAnimation(animation) {
    return this.currentAction_ == animation;
  }

  updateAnimation_(timeElapsedS) {
        let directionPressed = this.input_.key(KEYS.w) || this.input_.key(KEYS.s) || this.input_.key(KEYS.a) || this.input_.key(KEYS.d);

        let play = '';
        if (directionPressed) {
            play = ACTIONS.walk;
        } else if (this.input_.isMouseDown()) {
            play = ACTIONS.hit;
        } else {
            play = ACTIONS.idle;
        }

        if (this.currentAction_ != play) {
            let toPlay = this.animationsMap_.get(play);
            let current = this.animationsMap_.get(this.currentAction_);

            current.fadeOut(this.FADEDURATION);
            toPlay.reset().fadeIn(this.FADEDURATION).play();

            this.currentAction_ = play;
        }

        this.mixer_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    this.model_.quaternion.copy(this.rotation_);
    this.model_.quaternion.multiply(Q180);
    this.camera_.position.copy(this.translation_);
    this.model_.position.copy(this.translation_);
    this.model_.position.y = HEIGHTS.user;
    this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * 1.5;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    this.world_.objectBounds.forEach((obj) => {
        if (ray.intersectBox(obj.boundingBox, result)) {
            if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
                closest = result.clone();
            }
        }
    });

    this.camera_.lookAt(closest);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
      const nextStepTime = nextStep * wavelength / 10;
      this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0);
    const strafeVelocity = (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

    this.translation_.add(forward);
    this.translation_.add(left);

    if (forwardVelocity != 0 || strafeVelocity != 0) {
      this.headBobActive_ = true;
    }
  }

  updateRotation_(timeElapsedS, xh=null, yh=null) {
    if (!xh) {
      xh = this.input_.current_.mouseXDelta / window.innerWidth;
    }

    if (!yh) {
      yh = this.input_.current_.mouseYDelta / window.innerHeight;
    }

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }

  focusOnModel(model, timeElapsedS) {
    // Get the model's world position
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Move the camera in front of the model (along the Z axis)
    let zprime = center.z + (this.world_.minDistance * 2);
    this.translation_.x = center.x;
    this.translation_.z = zprime;
    this.updateTranslation_(timeElapsedS);
    this.updateRotation_(timeElapsedS, center.x, zprime);

    // Make the camera look at the model's center
    this.camera_.lookAt(center);

    this.updateCamera_(timeElapsedS);
  }
}


class Player {
    constructor(scene, camera, world) {
        this.scene_ = scene;
        this.camera_ = camera;
        this.world_ = world;
        this.fpsCamera_ = undefined;
        this.inventory = { meat: 15, lumber: 0, metal: 0 };
        this.hitCooldown = false;
        this.hitCooldownS = 0.5 * 1000;
        this.initializeModel_();
    }

    initializeModel_() {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('/static/models/animated_fps_axe.glb', (glb) => {
            const model = glb.scene;

            // Scale and position the model
            model.name = 'username';
            model.scale.set(2, 2, 2);
            model.position.set(0, HEIGHTS.user, 0);
            this.scene_.add(model);

            const gltfAnimations = glb.animations;
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = new Map();
            gltfAnimations.forEach((a) => {
                animationsMap.set(a.name, mixer.clipAction(a));
            });

            this.fpsCamera_ = new FirstPersonCamera(model, mixer, animationsMap, this.camera_, this.world_);
        });
    }

    update(timeElapsedS) {
        if (this.fpsCamera_) {
            this.fpsCamera_.update(timeElapsedS);
        }
    }

    checkCollisions() {
        if (this.hitCooldown || !this.fpsCamera_ || !this.fpsCamera_.isCurrentAnimation(ACTIONS.hit)) {
            return;
        }

        let playerBox = new THREE.Box3().setFromObject(this.model());
        let removableIndexes = [];
        let objHit = false;
        this.world_.objectBounds.forEach((obj) => {
            if (playerBox.intersectsBox(obj.boundingBox) && 'health' in obj) {
                // At this point, obj should be either an Animal or Tree since they
                // are the only ones with a health property.
                console.debug(`Player ${this.model().name} hit ${obj.name}!`);
                obj.health -= 1;

                if (obj.health <= 0) {
                  console.debug(`${obj.name} is destroyed!`);
                  obj.editInventory(this.inventory);
                  this.scene_.remove(obj.model);
                  let animalIndex = this.world_.animals.indexOf(obj);
                  if (animalIndex > -1) {
                    this.world_.animals.splice(animalIndex, 1);
                  }
                  removableIndexes.push(obj);
                }

                objHit = true;
            }
        }, this);

        removableIndexes.forEach((toRemove) => {
            this.world_.objectBounds.splice(toRemove, 1);
        }, this);

        // If at least one object was hit, start cooldown
        if (objHit) {
            this.startHitCooldown();
        }

        return objHit;
    }

    startHitCooldown() {
        this.hitCooldown = true;
        setTimeout(() => {
            this.hitCooldown = false;
        }, this.hitCooldownS);
    }

    model() {
        if (!this.fpsCamera_) {
            this.initializeModel_();
        }

        return this.fpsCamera_.model_;
    }

    focusOnModel(model, timeElapsedS) {
        if (!this.fpsCamera_) {
            return;
        }

        this.fpsCamera_.focusOnModel(model, timeElapsedS);
    }
}
