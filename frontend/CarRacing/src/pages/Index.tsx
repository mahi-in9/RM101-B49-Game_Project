import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const CarRacingGame = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const carModelRef = useRef(null);
  const enemyCar1Ref = useRef(null);
  const enemyCar2Ref = useRef(null);
  const gameStateRef = useRef({
    isGameOver: false,
    score: 0,
    moveLeft: false,
    moveRight: false,
    carBaseY: 0,
    points: [],
    roadLines: [],
    buildings: [],
    streetLights: [],
    trafficLights: [],
    kerbs: [],
    playerBox: new THREE.Box3(),
    enemyBox1: new THREE.Box3(),
    enemyBox2: new THREE.Box3(),
    pointBox: new THREE.Box3()
  });
  const animationIdRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game constants
  const GAME_CONFIG = {
    roadWidth: 10,
    roadLength: 200,
    driveSpeed: 0.5,
    enemyCarSpeed: 0.6,
    carMoveSpeed: 0.15,
    kerbHeight: 0.2,
    kerbWidth: 0.3,
    numPoints: 15,
    pointValue: 10,
    pointRadius: 0.3,
    buildingSpacing: 15,
    lightSpacing: 30
  };

  const updateScore = useCallback((newScore) => {
    gameStateRef.current.score = newScore;
    setScore(newScore);
  }, []);

  const createKerbTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 16;
    const stripeWidth = 8;
    const colors = ['#ff0000', '#ffffff'];
    for (let i = 0; i < canvas.width / stripeWidth; i++) {
      ctx.fillStyle = colors[i % 2];
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const createBuilding = useCallback(() => {
    const height = Math.random() * 30 + 10;
    const width = Math.random() * 8 + 4;
    const depth = Math.random() * 8 + 4;
    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2),
      roughness: 0.8,
      metalness: 0.1
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    return building;
  }, []);

  const createStreetLight = useCallback(() => {
    const group = new THREE.Group();
    const poleHeight = 6;
    const poleRadius = 0.1;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    pole.position.y = poleHeight / 2;
    group.add(pole);

    const armLength = 1.5;
    const armGeo = new THREE.BoxGeometry(armLength, poleRadius * 1.5, poleRadius * 1.5);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0, poleHeight - poleRadius * 2, 0);
    group.add(arm);

    const lightFixtureGeo = new THREE.SphereGeometry(poleRadius * 2, 16, 8);
    const lightFixtureMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff00,
      emissiveIntensity: 0.5
    });
    const lightFixture = new THREE.Mesh(lightFixtureGeo, lightFixtureMat);
    lightFixture.position.set(0, poleHeight - poleRadius * 2, 0);
    group.add(lightFixture);

    group.userData.armLength = armLength;
    return group;
  }, []);

  const createTrafficLight = useCallback(() => {
    const group = new THREE.Group();
    const poleHeight = 5;
    const poleRadius = 0.15;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = poleHeight / 2;
    pole.castShadow = true;
    group.add(pole);

    const housingWidth = 0.5;
    const housingHeight = 1.2;
    const housingDepth = 0.3;
    const housingGeo = new THREE.BoxGeometry(housingWidth, housingHeight, housingDepth);
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.y = poleHeight - housingHeight / 2;
    housing.castShadow = true;
    group.add(housing);

    const lightRadius = housingWidth * 0.25;
    const lightGeo = new THREE.SphereGeometry(lightRadius, 16, 8);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 1 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00, emissiveIntensity: 1 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, emissiveIntensity: 1 });

    const redLight = new THREE.Mesh(lightGeo, redMat);
    redLight.position.set(0, housingHeight * 0.3, housingDepth / 2 + 0.01);
    housing.add(redLight);
    const yellowLight = new THREE.Mesh(lightGeo, yellowMat);
    yellowLight.position.set(0, 0, housingDepth / 2 + 0.01);
    housing.add(yellowLight);
    const greenLight = new THREE.Mesh(lightGeo, greenMat);
    greenLight.position.set(0, -housingHeight * 0.3, housingDepth / 2 + 0.01);
    housing.add(greenLight);

    return group;
  }, []);

  const resetPointPosition = useCallback((point, initial = false) => {
    const laneWidth = GAME_CONFIG.roadWidth / 2 - GAME_CONFIG.kerbWidth - GAME_CONFIG.pointRadius * 2;
    point.position.x = (Math.random() * 2 - 1) * laneWidth;
    point.position.y = GAME_CONFIG.pointRadius + 0.01;
    if (initial) {
      point.position.z = Math.random() * GAME_CONFIG.roadLength * 0.8 - GAME_CONFIG.roadLength * 0.4;
    } else {
      point.position.z = GAME_CONFIG.roadLength / 2 + Math.random() * GAME_CONFIG.roadLength * 0.5;
    }
    point.visible = true;
  }, []);

  const initScene = useCallback(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0d7e6);
    scene.fog = new THREE.Fog(0xa0d7e6, GAME_CONFIG.roadLength * 0.4, GAME_CONFIG.roadLength * 0.9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, -7);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Loading manager for tracking progress
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
      console.log("All resources loaded!");
      setIsLoading(false);
      setLoadingProgress(100);
    };
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      setLoadingProgress(progress);
    };
    loadingManager.onError = (url) => {
      console.error(`Error loading ${url}`);
      setIsLoading(false);
    };

    // Enhanced lighting for better street atmosphere
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced ambient light for more dramatic look
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Stronger directional light
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Add additional street lighting atmosphere
    const streetAmbient = new THREE.AmbientLight(0xffaa55, 0.2); // Warm street light color
    scene.add(streetAmbient);

    // Load HDRI environment
    const hdrPath = 'https://threejs.org/examples/textures/equirectangular/';
    const hdrName = 'venice_sunset_1k.hdr';
    new RGBELoader(loadingManager)
      .setPath(hdrPath)
      .load(hdrName, function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
      }, undefined, (error) => {
        console.error('Error loading HDRI:', error);
        scene.background = new THREE.Color(0xa0d7e6);
      });

    // Ground
    const groundGeo = new THREE.PlaneGeometry(GAME_CONFIG.roadWidth * 5, GAME_CONFIG.roadLength * 1.5);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x55aa55, 
      side: THREE.DoubleSide, 
      roughness: 0.9, 
      metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Road - Make it darker and more realistic
    const roadGeo = new THREE.PlaneGeometry(GAME_CONFIG.roadWidth, GAME_CONFIG.roadLength * 1.5);
    const roadMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a, // Much darker road
      roughness: 0.9, 
      metalness: 0.0,
      bumpScale: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.0;
    road.receiveShadow = true;
    scene.add(road);

    // Road lines - Make them more visible on dark road
    const lineLength = 4;
    const lineGap = 4;
    const numLines = Math.floor(GAME_CONFIG.roadLength * 1.5 / (lineLength + lineGap));
    const lineGeo = new THREE.PlaneGeometry(0.4, lineLength); // Slightly wider lines
    const lineMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide, 
      roughness: 0.1, 
      metalness: 0.0,
      emissive: 0x222222, // Slight glow
      emissiveIntensity: 0.1
    });
    
    for (let i = 0; i < numLines; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.y = 0.005;
      line.position.z = (GAME_CONFIG.roadLength * 1.5 / 2) - (lineLength / 2) - i * (lineLength + lineGap);
      line.receiveShadow = true;
      gameStateRef.current.roadLines.push(line);
      scene.add(line);
    }

    // Kerbs
    const kerbTexture = createKerbTexture();
    kerbTexture.wrapS = THREE.RepeatWrapping;
    kerbTexture.wrapT = THREE.ClampToEdgeWrapping;
    kerbTexture.repeat.set(GAME_CONFIG.roadLength * 1.5 / 4, 1);
    const kerbGeo = new THREE.BoxGeometry(GAME_CONFIG.kerbWidth, GAME_CONFIG.kerbHeight, GAME_CONFIG.roadLength * 1.5);
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTexture, roughness: 0.7, metalness: 0.1 });

    const kerbLeft = new THREE.Mesh(kerbGeo, kerbMat);
    kerbLeft.position.set(-(GAME_CONFIG.roadWidth / 2) - (GAME_CONFIG.kerbWidth / 2), GAME_CONFIG.kerbHeight / 2, 0);
    kerbLeft.castShadow = true;
    kerbLeft.receiveShadow = true;
    scene.add(kerbLeft);
    gameStateRef.current.kerbs.push(kerbLeft);

    const kerbRight = new THREE.Mesh(kerbGeo, kerbMat);
    kerbRight.position.set((GAME_CONFIG.roadWidth / 2) + (GAME_CONFIG.kerbWidth / 2), GAME_CONFIG.kerbHeight / 2, 0);
    kerbRight.castShadow = true;
    kerbRight.receiveShadow = true;
    scene.add(kerbRight);
    gameStateRef.current.kerbs.push(kerbRight);

    // Buildings
    const numBuildings = Math.floor(GAME_CONFIG.roadLength * 1.5 / GAME_CONFIG.buildingSpacing);
    for (let i = 0; i < numBuildings; i++) {
      const buildingLeft = createBuilding();
      const buildingRight = createBuilding();
      const zPos = (GAME_CONFIG.roadLength * 1.5 / 2) - (GAME_CONFIG.buildingSpacing / 2) - i * GAME_CONFIG.buildingSpacing;
      const xOffsetLeft = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 1 + Math.random() * 5 + buildingLeft.geometry.parameters.width / 2;
      const xOffsetRight = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 1 + Math.random() * 5 + buildingRight.geometry.parameters.width / 2;
      buildingLeft.position.set(-xOffsetLeft, buildingLeft.position.y, zPos);
      buildingRight.position.set(xOffsetRight, buildingRight.position.y, zPos);
      gameStateRef.current.buildings.push(buildingLeft, buildingRight);
      scene.add(buildingLeft);
      scene.add(buildingRight);
    }

    // Street lights
    const numLights = Math.floor(GAME_CONFIG.roadLength * 1.5 / GAME_CONFIG.lightSpacing);
    for (let i = 0; i < numLights; i++) {
      const lightLeft = createStreetLight();
      const lightRight = createStreetLight();
      const zPos = (GAME_CONFIG.roadLength * 1.5 / 2) - (GAME_CONFIG.lightSpacing / 2) - i * GAME_CONFIG.lightSpacing;
      const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.8;

      lightLeft.position.set(-xPos, 0, zPos);
      lightLeft.rotation.y = Math.PI / 2;
      lightLeft.children[1].position.x = -lightLeft.userData.armLength / 2;
      lightLeft.children[2].position.x = -lightLeft.userData.armLength;
      gameStateRef.current.streetLights.push(lightLeft);
      scene.add(lightLeft);

      lightRight.position.set(xPos, 0, zPos);
      lightRight.rotation.y = -Math.PI / 2;
      lightRight.children[1].position.x = -lightRight.userData.armLength / 2;
      lightRight.children[2].position.x = -lightRight.userData.armLength;
      gameStateRef.current.streetLights.push(lightRight);
      scene.add(lightRight);
    }

    // Traffic lights
    const trafficLightLeft = createTrafficLight();
    const trafficLightRight = createTrafficLight();
    const trafficLightZ = GAME_CONFIG.roadLength * 0.4;
    const trafficLightX = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.5;
    trafficLightLeft.position.set(-trafficLightX, 0, trafficLightZ);
    trafficLightLeft.rotation.y = Math.PI / 2;
    trafficLightRight.position.set(trafficLightX, 0, trafficLightZ);
    trafficLightRight.rotation.y = -Math.PI / 2;
    gameStateRef.current.trafficLights.push(trafficLightLeft, trafficLightRight);
    scene.add(trafficLightLeft);
    scene.add(trafficLightRight);

    // Points
    const pointGeometry = new THREE.SphereGeometry(GAME_CONFIG.pointRadius, 16, 16);
    const pointMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xaaaa00,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    
    for (let i = 0; i < GAME_CONFIG.numPoints; i++) {
      const point = new THREE.Mesh(pointGeometry, pointMaterial);
      point.castShadow = true;
      point.receiveShadow = true;
      resetPointPosition(point, true);
      gameStateRef.current.points.push(point);
      scene.add(point);
    }

    // Load Ferrari car models
    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);

    const carUrl = 'https://threejs.org/examples/models/gltf/ferrari.glb';

    loader.load(carUrl, (gltf) => {
      // Player car
      const carModel = gltf.scene.clone();
      carModel.scale.set(0.8, 0.8, 0.8);
      const box = new THREE.Box3().setFromObject(carModel);
      gameStateRef.current.carBaseY = -box.min.y + 0.01;
      carModel.position.set(0, gameStateRef.current.carBaseY, 0);
      carModel.rotation.y = Math.PI;

      carModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      carModelRef.current = carModel;
      scene.add(carModel);

      // Enemy cars - Create two cars from the front
      const enemyCar1 = gltf.scene.clone();
      enemyCar1.scale.set(0.8, 0.8, 0.8);
      const leftLaneX = -GAME_CONFIG.roadWidth / 4;
      enemyCar1.position.set(leftLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 0.8);
      enemyCar1.rotation.y = 0; // Enemy car faces forward

      enemyCar1.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          // Red color for first enemy car
          if (node.material) {
            node.material = node.material.clone();
            node.material.color.setHex(0xcc0000); // Red color
          }
        }
      });
      enemyCar1Ref.current = enemyCar1;
      scene.add(enemyCar1);

      // Second enemy car
      const enemyCar2 = gltf.scene.clone();
      enemyCar2.scale.set(0.8, 0.8, 0.8);
      const rightLaneX = GAME_CONFIG.roadWidth / 4;
      enemyCar2.position.set(rightLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 1.2);
      enemyCar2.rotation.y = 0; // Enemy car faces forward

      enemyCar2.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          // Blue color for second enemy car
          if (node.material) {
            node.material = node.material.clone();
            node.material.color.setHex(0x0066cc); // Blue color
          }
        }
      });
      enemyCar2Ref.current = enemyCar2;
      scene.add(enemyCar2);

      // Set camera position
      camera.position.set(0, gameStateRef.current.carBaseY + 3, -7);
      camera.lookAt(carModel.position.x, gameStateRef.current.carBaseY + 1, carModel.position.z + 5);
    }, (progress) => {
      console.log('Loading progress:', progress);
    }, (error) => {
      console.error('Error loading car model:', error);
      // Fallback to simple geometry if GLTF fails
      const fallbackGeo = new THREE.BoxGeometry(2, 1, 4);
      const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.5 });
      const carModel = new THREE.Mesh(fallbackGeo, fallbackMat);
      gameStateRef.current.carBaseY = 0.5 + 0.01;
      carModel.position.set(0, gameStateRef.current.carBaseY, 0);
      carModel.castShadow = true;
      carModel.receiveShadow = true;
      carModelRef.current = carModel;
      scene.add(carModel);

      // Fallback enemy cars if GLTF fails
      const enemyCar1 = new THREE.Mesh(fallbackGeo, new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5, metalness: 0.5 }));
      const leftLaneX = -GAME_CONFIG.roadWidth / 4;
      enemyCar1.position.set(leftLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 0.8);
      enemyCar1.castShadow = true;
      enemyCar1.receiveShadow = true;
      enemyCar1Ref.current = enemyCar1;
      scene.add(enemyCar1);

      const enemyCar2 = new THREE.Mesh(fallbackGeo, new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.5, metalness: 0.5 }));
      const rightLaneX = GAME_CONFIG.roadWidth / 4;
      enemyCar2.position.set(rightLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 1.2);
      enemyCar2.castShadow = true;
      enemyCar2.receiveShadow = true;
      enemyCar2Ref.current = enemyCar2;
      scene.add(enemyCar2);
    });

    // Mount renderer
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
  }, [createBuilding, createStreetLight, createTrafficLight, createKerbTexture, resetPointPosition]);

  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    animationIdRef.current = requestAnimationFrame(animate);

    if (gameStateRef.current.isGameOver) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return;
    }

    const deltaZ = GAME_CONFIG.driveSpeed;
    const sceneryRecycleDistance = GAME_CONFIG.roadLength / 2;

    // Move road lines
    gameStateRef.current.roadLines.forEach(line => {
      line.position.z -= deltaZ;
      if (line.position.z < -sceneryRecycleDistance) {
        line.position.z += GAME_CONFIG.roadLength * 1.5;
      }
    });

    // Move buildings
    gameStateRef.current.buildings.forEach(building => {
      building.position.z -= deltaZ;
      if (building.position.z < -sceneryRecycleDistance - building.geometry.parameters.depth / 2) {
        const sideSign = Math.sign(building.position.x);
        const xOffset = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 1 + Math.random() * 5 + building.geometry.parameters.width / 2;
        building.position.set(sideSign * xOffset, building.geometry.parameters.height / 2, GAME_CONFIG.roadLength * 1.5 / 2 + Math.random() * GAME_CONFIG.buildingSpacing * 2);
      }
    });

    // Move street lights
    gameStateRef.current.streetLights.forEach(light => {
      light.position.z -= deltaZ;
      if (light.position.z < -sceneryRecycleDistance) {
        const sideSign = Math.sign(light.position.x);
        const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.8;
        light.position.set(sideSign * xPos, 0, GAME_CONFIG.roadLength * 1.5 / 2 + Math.random() * GAME_CONFIG.lightSpacing * 2);
      }
    });

    // Move traffic lights
    gameStateRef.current.trafficLights.forEach(light => {
      light.position.z -= deltaZ;
      if (light.position.z < -sceneryRecycleDistance) {
        const sideSign = Math.sign(light.position.x);
        const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.5;
        light.position.set(sideSign * xPos, 0, GAME_CONFIG.roadLength * 1.5 / 2 + Math.random() * GAME_CONFIG.roadLength * 0.5);
      }
    });

    // Move kerbs
    gameStateRef.current.kerbs.forEach(kerb => {
      kerb.position.z -= deltaZ;
      if (kerb.position.z < -sceneryRecycleDistance) {
        kerb.position.z += GAME_CONFIG.roadLength * 1.5;
      }
    });

    // Move points
    gameStateRef.current.points.forEach(point => {
      if (!point.visible) return;
      point.position.z -= deltaZ;
      point.rotation.y += 0.05;
      if (point.position.z < -sceneryRecycleDistance) {
        resetPointPosition(point);
      }
    });

    // Move enemy cars
    if (enemyCar1Ref.current && carModelRef.current) {
      enemyCar1Ref.current.position.z -= (GAME_CONFIG.enemyCarSpeed + GAME_CONFIG.driveSpeed);
      if (enemyCar1Ref.current.position.z < -sceneryRecycleDistance) {
        enemyCar1Ref.current.position.z = GAME_CONFIG.roadLength * 0.8 + Math.random() * GAME_CONFIG.roadLength * 0.5;
        enemyCar1Ref.current.position.x = -GAME_CONFIG.roadWidth / 4 + (Math.random() - 0.5) * 2;
      }
    }

    if (enemyCar2Ref.current && carModelRef.current) {
      enemyCar2Ref.current.position.z -= (GAME_CONFIG.enemyCarSpeed + GAME_CONFIG.driveSpeed);
      if (enemyCar2Ref.current.position.z < -sceneryRecycleDistance) {
        enemyCar2Ref.current.position.z = GAME_CONFIG.roadLength * 1.2 + Math.random() * GAME_CONFIG.roadLength * 0.5;
        enemyCar2Ref.current.position.x = GAME_CONFIG.roadWidth / 4 + (Math.random() - 0.5) * 2;
      }
    }

    // Move player car
    if (carModelRef.current && gameStateRef.current.carBaseY > 0) {
      let maxBounds = GAME_CONFIG.roadWidth / 2 - GAME_CONFIG.kerbWidth - 0.1;
      let carHalfWidth = 1;
      try {
        const box = new THREE.Box3().setFromObject(carModelRef.current);
        carHalfWidth = (box.max.x - box.min.x) / 2;
        maxBounds = (GAME_CONFIG.roadWidth / 2) - GAME_CONFIG.kerbWidth - carHalfWidth - 0.1;
      } catch (e) {
        // Use fallback values
      }

      if (gameStateRef.current.moveLeft && carModelRef.current.position.x > -maxBounds) {
        carModelRef.current.position.x -= GAME_CONFIG.carMoveSpeed;
      }
      if (gameStateRef.current.moveRight && carModelRef.current.position.x < maxBounds) {
        carModelRef.current.position.x += GAME_CONFIG.carMoveSpeed;
      }
      carModelRef.current.position.x = Math.max(-maxBounds, Math.min(maxBounds, carModelRef.current.position.x));

      gameStateRef.current.playerBox.setFromObject(carModelRef.current);
    }

    // Camera follow
    if (carModelRef.current) {
      const targetCameraX = carModelRef.current.position.x * 0.5;
      cameraRef.current.position.x += (targetCameraX - cameraRef.current.position.x) * 0.1;
      cameraRef.current.lookAt(carModelRef.current.position.x, gameStateRef.current.carBaseY + 1, carModelRef.current.position.z + 5);
    }

    // Collision detection
    if (carModelRef.current) {
      // Point collection
      gameStateRef.current.points.forEach(point => {
        if (!point.visible) return;
        gameStateRef.current.pointBox.setFromObject(point);
        if (gameStateRef.current.playerBox.intersectsBox(gameStateRef.current.pointBox)) {
          const newScore = gameStateRef.current.score + GAME_CONFIG.pointValue;
          updateScore(newScore);
          point.visible = false;
        }
      });

      // Enemy collision - Check both cars
      if (enemyCar1Ref.current && enemyCar1Ref.current.parent) {
        gameStateRef.current.enemyBox1.setFromObject(enemyCar1Ref.current);
        const expandedPlayerBox = gameStateRef.current.playerBox.clone().expandByScalar(0.5);
        if (expandedPlayerBox.intersectsBox(gameStateRef.current.enemyBox1)) {
          gameStateRef.current.isGameOver = true;
          setGameOver(true);
        }
      }

      if (enemyCar2Ref.current && enemyCar2Ref.current.parent) {
        gameStateRef.current.enemyBox2.setFromObject(enemyCar2Ref.current);
        const expandedPlayerBox = gameStateRef.current.playerBox.clone().expandByScalar(0.5);
        if (expandedPlayerBox.intersectsBox(gameStateRef.current.enemyBox2)) {
          gameStateRef.current.isGameOver = true;
          setGameOver(true);
        }
      }
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [resetPointPosition, updateScore]);

  const handleRestart = useCallback(() => {
    gameStateRef.current.isGameOver = false;
    gameStateRef.current.score = 0;
    setScore(0);
    setGameOver(false);

    if (carModelRef.current) {
      carModelRef.current.position.set(0, gameStateRef.current.carBaseY, 0);
    }

    if (enemyCar1Ref.current) {
      const leftLaneX = -GAME_CONFIG.roadWidth / 4;
      enemyCar1Ref.current.position.set(leftLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 0.8);
    }

    if (enemyCar2Ref.current) {
      const rightLaneX = GAME_CONFIG.roadWidth / 4;
      enemyCar2Ref.current.position.set(rightLaneX, gameStateRef.current.carBaseY, GAME_CONFIG.roadLength * 1.2);
    }

    gameStateRef.current.points.forEach(point => resetPointPosition(point, true));

    // Reset scenery positions
    gameStateRef.current.roadLines.forEach((line, i) => {
      line.position.z = (GAME_CONFIG.roadLength * 1.5 / 2) - (line.geometry.parameters.height / 2) - i * (line.geometry.parameters.height + 4);
    });

    const numBuildings = Math.floor(GAME_CONFIG.roadLength * 1.5 / GAME_CONFIG.buildingSpacing);
    gameStateRef.current.buildings.forEach((building, i) => {
      const zPos = (GAME_CONFIG.roadLength * 1.5 / 2) - (GAME_CONFIG.buildingSpacing / 2) - (i % (numBuildings / 2)) * GAME_CONFIG.buildingSpacing;
      const sideSign = (i % 2 === 0) ? -1 : 1;
      const xOffset = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 1 + Math.random() * 5 + building.geometry.parameters.width / 2;
      building.position.set(sideSign * xOffset, building.geometry.parameters.height / 2, zPos);
    });

    const numLights = Math.floor(GAME_CONFIG.roadLength * 1.5 / GAME_CONFIG.lightSpacing);
    gameStateRef.current.streetLights.forEach((light, i) => {
      const zPos = (GAME_CONFIG.roadLength * 1.5 / 2) - (GAME_CONFIG.lightSpacing / 2) - (i % (numLights / 2)) * GAME_CONFIG.lightSpacing;
      const sideSign = (i % 2 === 0) ? -1 : 1;
      const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.8;
      light.position.set(sideSign * xPos, 0, zPos);
    });

    gameStateRef.current.trafficLights.forEach((light, i) => {
      const zPos = GAME_CONFIG.roadLength * 0.4;
      const sideSign = (i % 2 === 0) ? -1 : 1;
      const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.5;
      light.position.set(sideSign * xPos, 0, zPos);
    });
  }, [resetPointPosition]);

  const handleKeyDown = useCallback((event) => {
    if (gameStateRef.current.isGameOver) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      gameStateRef.current.moveLeft = true;
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      gameStateRef.current.moveRight = true;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      gameStateRef.current.moveLeft = false;
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      gameStateRef.current.moveRight = false;
    }
  }, []);

  const handleLeftButtonDown = useCallback((e) => {
    if (!gameStateRef.current.isGameOver) {
      e.preventDefault();
      gameStateRef.current.moveLeft = true;
    }
  }, []);

  const handleLeftButtonUp = useCallback((e) => {
    e.preventDefault();
    gameStateRef.current.moveLeft = false;
  }, []);

  const handleRightButtonDown = useCallback((e) => {
    if (!gameStateRef.current.isGameOver) {
      e.preventDefault();
      gameStateRef.current.moveRight = true;
    }
  }, []);

  const handleRightButtonUp = useCallback((e) => {
    e.preventDefault();
    gameStateRef.current.moveRight = false;
  }, []);

  const handleWindowResize = useCallback(() => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  useEffect(() => {
    initScene();

    // Event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleWindowResize);

    // Start animation loop
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleWindowResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [initScene, handleKeyDown, handleKeyUp, handleWindowResize, animate]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-blue-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * {
          font-family: 'Press Start 2P', cursive, sans-serif;
        }
        body {
          margin: 0;
          overflow: hidden;
          overscroll-behavior: none;
          touch-action: none;
        }
      `}</style>
      
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 bg-black text-white flex flex-col justify-center items-center text-2xl z-50 gap-4">
          <div className="text-base">Loading Game...</div>
          <div className="text-sm">{loadingProgress}%</div>
        </div>
      )}

      {/* Game Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* UI Container */}
      <div className="absolute top-2 left-2 text-white text-xl z-40 pointer-events-none"
           style={{ textShadow: '1px 1px 3px black' }}>
        <div className="mb-1">Score: {score}</div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="fixed inset-0 flex flex-col justify-center items-center text-red-500 text-4xl font-bold text-center z-50 gap-5"
             style={{ textShadow: '2px 2px 5px black' }}>
          <div>GAME OVER!</div>
          <button 
            onClick={handleRestart}
            className="bg-green-600 text-white px-5 py-3 border-none rounded-lg text-base cursor-pointer transition-colors duration-300 hover:bg-blue-700"
            style={{ boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.5)' }}
          >
            Restart
          </button>
        </div>
      )}

      {/* Mobile Controls */}
      <div 
        className="fixed bottom-5 left-5 w-20 h-20 bg-white bg-opacity-30 border-2 border-black border-opacity-50 rounded-full z-40 flex justify-center items-center text-3xl text-black text-opacity-70 cursor-pointer select-none active:bg-white active:bg-opacity-50"
        onPointerDown={handleLeftButtonDown}
        onPointerUp={handleLeftButtonUp}
        onPointerLeave={handleLeftButtonUp}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          MozUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        ◀
      </div>

      <div 
        className="fixed bottom-5 right-5 w-20 h-20 bg-white bg-opacity-30 border-2 border-black border-opacity-50 rounded-full z-40 flex justify-center items-center text-3xl text-black text-opacity-70 cursor-pointer select-none active:bg-white active:bg-opacity-50"
        onPointerDown={handleRightButtonDown}
        onPointerUp={handleRightButtonUp}
        onPointerLeave={handleRightButtonUp}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          MozUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        ▶
      </div>
    </div>
  );
};

const Index = () => {
  return <CarRacingGame />;
};

export default Index;
