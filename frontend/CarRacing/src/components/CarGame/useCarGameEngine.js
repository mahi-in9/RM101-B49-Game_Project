// useCarGameEngine.js
import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GAME_CONFIG, ASSETS } from "./GameConstants";
import * as SceneHelpers from "./SceneHelpers";

export const useCarGameEngine = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const carModelRef = useRef(null);
  const enemyCar1Ref = useRef(null);
  const enemyCar2Ref = useRef(null);
  const animationIdRef = useRef(null);

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
    pointBox: new THREE.Box3(),
    paused: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // --- Controls Handlers ---
  const handleInput = useCallback((action, isActive) => {
    if (gameStateRef.current.isGameOver) return;
    if (action === "left") gameStateRef.current.moveLeft = isActive;
    if (action === "right") gameStateRef.current.moveRight = isActive;
  }, []);

  const handleRestart = useCallback(() => {
    gameStateRef.current.isGameOver = false;
    gameStateRef.current.score = 0;
    setScore(0);
    setGameOver(false);

    const {
      carBaseY,
      points,
      roadLines,
      buildings,
      streetLights,
      trafficLights,
    } = gameStateRef.current;

    // Reset Player
    if (carModelRef.current) carModelRef.current.position.set(0, carBaseY, 0);

    // Reset Enemies
    if (enemyCar1Ref.current) {
      enemyCar1Ref.current.position.set(
        -GAME_CONFIG.roadWidth / 4,
        carBaseY,
        GAME_CONFIG.roadLength * 0.8
      );
    }
    if (enemyCar2Ref.current) {
      enemyCar2Ref.current.position.set(
        GAME_CONFIG.roadWidth / 4,
        carBaseY,
        GAME_CONFIG.roadLength * 1.2
      );
    }

    // Reset Environment
    points.forEach((point) => SceneHelpers.resetPointPosition(point, true));

    roadLines.forEach((line, i) => {
      const lineHeight = line.geometry?.parameters?.height || 4;
      line.position.z =
        (GAME_CONFIG.roadLength * 1.5) / 2 -
        lineHeight / 2 -
        i * (lineHeight + 4);
    });

    // Simple reset for demo purposes - ideally strictly calculate positions
    const buildingSpacing = GAME_CONFIG.buildingSpacing;
    const numBuildings = buildings.length / 2;
    buildings.forEach((building, i) => {
      // Re-distribute strictly if needed, or just let them loop naturally
      building.position.z =
        (GAME_CONFIG.roadLength * 1.5) / 2 -
        (i % numBuildings) * buildingSpacing;
    });
  }, []);

  // --- Main Initialization ---
  useEffect(() => {
    const initScene = () => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xa0d7e6);
      scene.fog = new THREE.Fog(
        0xa0d7e6,
        GAME_CONFIG.roadLength * 0.4,
        GAME_CONFIG.roadLength * 0.9
      );
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(0, 3, -7);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputEncoding = THREE.sRGBEncoding;
      rendererRef.current = renderer;

      if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

      // Loading Manager
      const loadingManager = new THREE.LoadingManager();
      loadingManager.onLoad = () => {
        setIsLoading(false);
        setLoadingProgress(100);
      };
      loadingManager.onProgress = (url, loaded, total) =>
        setLoadingProgress(Math.round((loaded / total) * 100));

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(50, 100, 50);
      dirLight.castShadow = true;
      // Configure shadow map properties (omitted for brevity, assume high quality)
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.far = 200;
      dirLight.shadow.camera.left = -50;
      dirLight.shadow.camera.right = 50;
      dirLight.shadow.camera.top = 50;
      dirLight.shadow.camera.bottom = -50;
      scene.add(ambientLight, dirLight);

      // Environment
      new RGBELoader(loadingManager)
        .setPath(ASSETS.hdrPath)
        .load(ASSETS.hdrName, (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = texture;
        });

      // --- Build Static World ---
      const setupStaticWorld = () => {
        // Ground & Road
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(
            GAME_CONFIG.roadWidth * 5,
            GAME_CONFIG.roadLength * 1.5
          ),
          new THREE.MeshStandardMaterial({ color: 0x55aa55, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        scene.add(ground);

        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(
            GAME_CONFIG.roadWidth,
            GAME_CONFIG.roadLength * 1.5
          ),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
        );
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        scene.add(road);

        // Lines
        const lineLength = 4,
          lineGap = 4;
        const numLines = Math.floor(
          (GAME_CONFIG.roadLength * 1.5) / (lineLength + lineGap)
        );
        const lineGeo = new THREE.PlaneGeometry(0.4, lineLength);
        const lineMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x222222,
          emissiveIntensity: 0.1,
        });

        for (let i = 0; i < numLines; i++) {
          const line = new THREE.Mesh(lineGeo, lineMat);
          line.rotation.x = -Math.PI / 2;
          line.position.set(
            0,
            0.005,
            (GAME_CONFIG.roadLength * 1.5) / 2 -
              lineLength / 2 -
              i * (lineLength + lineGap)
          );
          gameStateRef.current.roadLines.push(line);
          scene.add(line);
        }

        // Kerbs
        const kerbTexture = SceneHelpers.createKerbTexture();
        kerbTexture.wrapS = THREE.RepeatWrapping;
        kerbTexture.repeat.set((GAME_CONFIG.roadLength * 1.5) / 4, 1);
        const kerbGeo = new THREE.BoxGeometry(
          GAME_CONFIG.kerbWidth,
          GAME_CONFIG.kerbHeight,
          GAME_CONFIG.roadLength * 1.5
        );
        const kerbMat = new THREE.MeshStandardMaterial({
          map: kerbTexture,
          roughness: 0.7,
        });

        const kLeft = new THREE.Mesh(kerbGeo, kerbMat);
        kLeft.position.set(
          -(GAME_CONFIG.roadWidth / 2) - GAME_CONFIG.kerbWidth / 2,
          GAME_CONFIG.kerbHeight / 2,
          0
        );
        const kRight = new THREE.Mesh(kerbGeo, kerbMat);
        kRight.position.set(
          GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth / 2,
          GAME_CONFIG.kerbHeight / 2,
          0
        );
        gameStateRef.current.kerbs.push(kLeft, kRight);
        scene.add(kLeft, kRight);
      };
      setupStaticWorld();

      // --- Build Dynamic Scenery ---
      const numBuildings = Math.floor(
        (GAME_CONFIG.roadLength * 1.5) / GAME_CONFIG.buildingSpacing
      );
      for (let i = 0; i < numBuildings; i++) {
        const bLeft = SceneHelpers.createBuilding();
        const bRight = SceneHelpers.createBuilding();
        const zPos =
          (GAME_CONFIG.roadLength * 1.5) / 2 - i * GAME_CONFIG.buildingSpacing;
        const xOff =
          GAME_CONFIG.roadWidth / 2 +
          GAME_CONFIG.kerbWidth +
          3 +
          Math.random() * 5;
        bLeft.position.set(-xOff, bLeft.position.y, zPos);
        bRight.position.set(xOff, bRight.position.y, zPos);
        gameStateRef.current.buildings.push(bLeft, bRight);
        scene.add(bLeft, bRight);
      }

      // Lights & Traffic
      const numLights = Math.floor(
        (GAME_CONFIG.roadLength * 1.5) / GAME_CONFIG.lightSpacing
      );
      for (let i = 0; i < numLights; i++) {
        const lLeft = SceneHelpers.createStreetLight();
        const lRight = SceneHelpers.createStreetLight();
        const zPos =
          (GAME_CONFIG.roadLength * 1.5) / 2 - i * GAME_CONFIG.lightSpacing;
        const xPos = GAME_CONFIG.roadWidth / 2 + GAME_CONFIG.kerbWidth + 0.8;
        lLeft.position.set(-xPos, 0, zPos);
        lLeft.rotation.y = Math.PI / 2;
        lRight.position.set(xPos, 0, zPos);
        lRight.rotation.y = -Math.PI / 2;
        // Fix internal parts position relative to rotation (simplified)
        lLeft.children[1].position.x = -1.5 / 2;
        lLeft.children[2].position.x = -1.5;
        lRight.children[1].position.x = -1.5 / 2;
        lRight.children[2].position.x = -1.5;
        gameStateRef.current.streetLights.push(lLeft, lRight);
        scene.add(lLeft, lRight);
      }

      // Points
      const pointGeo = new THREE.SphereGeometry(
        GAME_CONFIG.pointRadius,
        16,
        16
      );
      const pointMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xaaaa00,
      });
      for (let i = 0; i < GAME_CONFIG.numPoints; i++) {
        const p = new THREE.Mesh(pointGeo, pointMat);
        SceneHelpers.resetPointPosition(p, true);
        gameStateRef.current.points.push(p);
        scene.add(p);
      }

      // --- Load Models ---
      const loader = new GLTFLoader(loadingManager);
      const dracoLoader = new DRACOLoader().setDecoderPath(ASSETS.dracoUrl);
      loader.setDRACOLoader(dracoLoader);

      loader.load(ASSETS.carUrl, (gltf) => {
        // Player
        const car = gltf.scene.clone();
        car.scale.set(0.8, 0.8, 0.8);
        const box = new THREE.Box3().setFromObject(car);
        gameStateRef.current.carBaseY = -box.min.y + 0.01;
        car.position.set(0, gameStateRef.current.carBaseY, 0);
        car.rotation.y = Math.PI;
        car.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
        carModelRef.current = car;
        scene.add(car);

        // Enemies
        const createEnemy = (color, xOffset, zStart) => {
          const enemy = gltf.scene.clone();
          enemy.scale.set(0.8, 0.8, 0.8);
          enemy.position.set(xOffset, gameStateRef.current.carBaseY, zStart);
          enemy.traverse((n) => {
            if (n.isMesh) {
              n.castShadow = true;
              if (n.material) {
                n.material = n.material.clone();
                n.material.color.setHex(color);
              }
            }
          });
          return enemy;
        };

        const e1 = createEnemy(
          0xcc0000,
          -GAME_CONFIG.roadWidth / 4,
          GAME_CONFIG.roadLength * 0.8
        );
        enemyCar1Ref.current = e1;
        scene.add(e1);

        const e2 = createEnemy(
          0x0066cc,
          GAME_CONFIG.roadWidth / 4,
          GAME_CONFIG.roadLength * 1.2
        );
        enemyCar2Ref.current = e2;
        scene.add(e2);
      });
    };

    initScene();

    // Loop
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current) return;
      animationIdRef.current = requestAnimationFrame(animate);

      if (gameStateRef.current.paused || gameStateRef.current.isGameOver) {
        if (!gameStateRef.current.paused)
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        return;
      }

      const { driveSpeed, roadLength, roadWidth, carMoveSpeed, enemyCarSpeed } =
        GAME_CONFIG;
      const recycleDist = roadLength / 2;
      const deltaZ = driveSpeed;

      const moveObj = (obj, limit, resetFn) => {
        obj.position.z -= deltaZ;
        if (obj.position.z < limit) resetFn(obj);
      };

      // Move Environment
      gameStateRef.current.roadLines.forEach((l) =>
        moveObj(l, -recycleDist, (o) => (o.position.z += roadLength * 1.5))
      );
      gameStateRef.current.streetLights.forEach((l) =>
        moveObj(l, -recycleDist, (o) => (o.position.z += roadLength * 1.5))
      );
      gameStateRef.current.buildings.forEach((b) =>
        moveObj(
          b,
          -recycleDist,
          (o) => (o.position.z += roadLength * 1.5 + Math.random() * 20)
        )
      );
      gameStateRef.current.points.forEach((p) => {
        if (!p.visible) return;
        p.position.z -= deltaZ;
        p.rotation.y += 0.05;
        if (p.position.z < -recycleDist) SceneHelpers.resetPointPosition(p);
      });

      // Enemies
      const updateEnemy = (ref, startZ, startX) => {
        if (!ref.current) return;
        ref.current.position.z -= enemyCarSpeed + driveSpeed;
        if (ref.current.position.z < -recycleDist) {
          ref.current.position.z = startZ + Math.random() * 50;
          ref.current.position.x = startX + (Math.random() - 0.5) * 2;
        }
      };
      updateEnemy(enemyCar1Ref, roadLength * 0.8, -roadWidth / 4);
      updateEnemy(enemyCar2Ref, roadLength * 1.2, roadWidth / 4);

      // Player Movement
      if (carModelRef.current) {
        const bounds = roadWidth / 2 - 1.5; // Approx half car width + kerb
        if (gameStateRef.current.moveLeft)
          carModelRef.current.position.x = Math.max(
            -bounds,
            carModelRef.current.position.x - carMoveSpeed
          );
        if (gameStateRef.current.moveRight)
          carModelRef.current.position.x = Math.min(
            bounds,
            carModelRef.current.position.x + carMoveSpeed
          );

        // Camera Follow
        const cam = cameraRef.current;
        cam.position.x +=
          (carModelRef.current.position.x * 0.5 - cam.position.x) * 0.1;
        cam.lookAt(
          carModelRef.current.position.x,
          gameStateRef.current.carBaseY + 1,
          carModelRef.current.position.z + 5
        );

        gameStateRef.current.playerBox.setFromObject(carModelRef.current);
      }

      // Collisions
      // 1. Points
      gameStateRef.current.points.forEach((p) => {
        if (!p.visible) return;
        gameStateRef.current.pointBox.setFromObject(p);
        if (
          gameStateRef.current.playerBox.intersectsBox(
            gameStateRef.current.pointBox
          )
        ) {
          gameStateRef.current.score += GAME_CONFIG.pointValue;
          setScore(gameStateRef.current.score); // React State update
          p.visible = false;
        }
      });

      // 2. Enemies
      const checkCrash = (enemyRef, boxRef) => {
        if (!enemyRef.current) return false;
        boxRef.setFromObject(enemyRef.current);
        // Shrink player box slightly for forgiveness
        const playerHitbox = gameStateRef.current.playerBox
          .clone()
          .expandByScalar(-0.1);
        if (playerHitbox.intersectsBox(boxRef)) return true;
        return false;
      };

      if (
        checkCrash(enemyCar1Ref, gameStateRef.current.enemyBox1) ||
        checkCrash(enemyCar2Ref, gameStateRef.current.enemyBox2)
      ) {
        gameStateRef.current.isGameOver = true;
        setGameOver(true);
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      // Dispose scene objects here if strictly necessary for memory
    };
  }, []); // Empty dependency array = run once

  return {
    mountRef,
    score,
    gameOver,
    isLoading,
    loadingProgress,
    handleInput,
    handleRestart,
  };
};
