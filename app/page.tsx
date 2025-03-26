'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Home() {
  const viewport = useRef<HTMLDivElement>(null);

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

    function animate() {
    
      renderer.render( scene, camera );
    
    }
    renderer.setAnimationLoop(animate);
    
    if (viewport.current) {
      viewport.current.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, viewport.current);
      controls.target.set(0, 5, 0);
      controls.update();
      
      const skyColor = 0xB1E1FF;  // light blue
      const groundColor = 0xB97A20;  // brownish orange
      const intensity = 1;
      const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, intensity);
      scene.add(hemisphereLight);
      
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
      loader.load('./Building-GLTF.glb', (gltf) => {
      
        scene.add(gltf.scene);
      
      }, undefined, (err) => {
      
        console.error(`GLTF Load err: ${err}`);
      
      } );
    }
  }, []);

  return (
      <main>
        <div ref={viewport}></div>
      </main>
  );
}
