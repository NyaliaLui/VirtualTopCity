import { useEffect, useRef } from 'react'
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

import './App.css'
import vrModel from './assets/Building-GLTF.glb'

function App() {
  const viewport = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const fov = 75;
    const aspect =  window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(145, 96, -180);
    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    
    viewport.current && viewport.current.appendChild(renderer.domElement);
    
    const controls = new OrbitControls(camera, viewport.current);
    controls.target.set(0, 5, 0);
    controls.update();
    
    class ColorGUIHelper {
        constructor(object, prop) {
          this.object = object;
          this.prop = prop;
        }
        get value() {
          return `#${this.object[this.prop].getHexString()}`;
        }
        set value(hexString) {
          this.object[this.prop].set(hexString);
        }
      }
    
    const skyColor = 0xB1E1FF;  // light blue
    const groundColor = 0xB97A20;  // brownish orange
    const intensity = 1;
    const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    scene.add(hemisphereLight);
    
    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(hemisphereLight, 'color'), 'value').name('skyColor');
    gui.addColor(new ColorGUIHelper(hemisphereLight, 'groundColor'), 'value').name('groundColor');
    gui.add(hemisphereLight, 'intensity', 0, 5, 0.01);
    
    const color = 0xFFFFFF;
    const sun = new THREE.DirectionalLight(color, intensity);
    sun.position.set(0, 235, 0);
    sun.target.position.set(-13, 2, -6);
    scene.add(sun);
    scene.add(sun.target);
    
    function updateSun() {
      sun.target.updateMatrixWorld();
    }
    updateSun();
    
    const loader = new GLTFLoader();
    //TODO(@NyaliaLui): Hardcoding OR sending the full path over the network is a vulnerability. 
    //                  Must find a way to call ThreeJS with the GLB path like a function. Perhaps
    //                  move away from the module-like JS file?
    loader.load(vrModel, (gltf) => {
    
      scene.add(gltf.scene);
    
    }, undefined, (err) => {
    
      console.error(`GLTF Load err: ${err}`);
    
    } );
    
    function animate() {
    
      renderer.render( scene, camera );
    
    }
  }, []);

  return (
    <>
      <header id="nav">
        <a href="/">
        <h2>Topeka in VR</h2>
        </a>
      </header>
      <div ref={viewport}></div>
    </>
  )
}

export default App
