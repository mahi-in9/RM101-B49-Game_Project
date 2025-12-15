// SceneHelpers.js
import * as THREE from "three";
import { GAME_CONFIG } from "./GameConstants";

export const createKerbTexture = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 64;
  canvas.height = 16;
  const stripeWidth = 8;
  const colors = ["#ff0000", "#ffffff"];
  for (let i = 0; i < canvas.width / stripeWidth; i++) {
    ctx.fillStyle = colors[i % 2];
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }
  return new THREE.CanvasTexture(canvas);
};

export const createBuilding = () => {
  const height = Math.random() * 30 + 10;
  const width = Math.random() * 8 + 4;
  const depth = Math.random() * 8 + 4;
  const buildingGeo = new THREE.BoxGeometry(width, height, depth);
  const buildingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(
      Math.random() * 0.6 + 0.2,
      Math.random() * 0.6 + 0.2,
      Math.random() * 0.6 + 0.2
    ),
    roughness: 0.8,
    metalness: 0.1,
  });
  const building = new THREE.Mesh(buildingGeo, buildingMat);
  building.position.y = height / 2;
  building.castShadow = true;
  building.receiveShadow = true;
  return building;
};

export const createStreetLight = () => {
  const group = new THREE.Group();
  const poleHeight = 6;
  const poleRadius = 0.1;
  const poleGeo = new THREE.CylinderGeometry(
    poleRadius,
    poleRadius,
    poleHeight
  );
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.4,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.castShadow = true;
  pole.position.y = poleHeight / 2;
  group.add(pole);

  const armLength = 1.5;
  const armGeo = new THREE.BoxGeometry(
    armLength,
    poleRadius * 1.5,
    poleRadius * 1.5
  );
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0, poleHeight - poleRadius * 2, 0);
  group.add(arm);

  const lightFixtureGeo = new THREE.SphereGeometry(poleRadius * 2, 16, 8);
  const lightFixtureMat = new THREE.MeshStandardMaterial({
    color: 0xffffaa,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
  });
  const lightFixture = new THREE.Mesh(lightFixtureGeo, lightFixtureMat);
  lightFixture.position.set(0, poleHeight - poleRadius * 2, 0);
  group.add(lightFixture);

  group.userData.armLength = armLength;
  return group;
};

export const createTrafficLight = () => {
  const group = new THREE.Group();
  const poleHeight = 5;
  const poleRadius = 0.15;
  const poleGeo = new THREE.CylinderGeometry(
    poleRadius,
    poleRadius,
    poleHeight
  );
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.7,
    roughness: 0.5,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = poleHeight / 2;
  pole.castShadow = true;
  group.add(pole);

  const housingWidth = 0.5;
  const housingHeight = 1.2;
  const housingDepth = 0.3;
  const housingGeo = new THREE.BoxGeometry(
    housingWidth,
    housingHeight,
    housingDepth
  );
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.position.y = poleHeight - housingHeight / 2;
  housing.castShadow = true;
  group.add(housing);

  const lightRadius = housingWidth * 0.25;
  const lightGeo = new THREE.SphereGeometry(lightRadius, 16, 8);

  const createLight = (color, emissive, yOffset) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 1,
    });
    const mesh = new THREE.Mesh(lightGeo, mat);
    mesh.position.set(0, yOffset, housingDepth / 2 + 0.01);
    return mesh;
  };

  housing.add(createLight(0xff0000, 0xaa0000, housingHeight * 0.3));
  housing.add(createLight(0xffff00, 0xaaaa00, 0));
  housing.add(createLight(0x00ff00, 0x00aa00, -housingHeight * 0.3));

  return group;
};

export const resetPointPosition = (point, initial = false) => {
  const laneWidth =
    GAME_CONFIG.roadWidth / 2 -
    GAME_CONFIG.kerbWidth -
    GAME_CONFIG.pointRadius * 2;
  point.position.x = (Math.random() * 2 - 1) * laneWidth;
  point.position.y = GAME_CONFIG.pointRadius + 0.01;
  if (initial) {
    point.position.z =
      Math.random() * GAME_CONFIG.roadLength * 0.8 -
      GAME_CONFIG.roadLength * 0.4;
  } else {
    point.position.z =
      GAME_CONFIG.roadLength / 2 + Math.random() * GAME_CONFIG.roadLength * 0.5;
  }
  point.visible = true;
};
