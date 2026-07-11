import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

const BLOCK_SIZE = 4;
const STREET_WIDTH = 2;
const GRID_COLS = 5;
const GRID_ROWS = 3;
const MOVE_SPEED = 8;

export const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

export function createScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // FPS Camera
  const camera = new UniversalCamera(
    "camera",
    new Vector3(0, 1.6, 0),
    scene,
  );
  camera.angularSensibility = 5000;
  camera.applyGravity = false;
  camera.speed = 0;

  // Lights
  const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.7;

  const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, 1), scene);
  dirLight.intensity = 0.6;

  // --- Ground ---
  const ground = MeshBuilder.CreateGround("ground", { width: 60, height: 60 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.7, 0.7, 0.7);
  ground.material = groundMat;

  // --- Streets ---
  const cellSize = BLOCK_SIZE + STREET_WIDTH;
  const totalWidth = GRID_COLS * BLOCK_SIZE + (GRID_COLS + 1) * STREET_WIDTH;
  const totalDepth = GRID_ROWS * BLOCK_SIZE + (GRID_ROWS + 1) * STREET_WIDTH;

  const streetMat = new StandardMaterial("streetMat", scene);
  streetMat.diffuseColor = new Color3(0.1, 0.1, 0.1);

  // Horizontal streets
  for (let r = 0; r <= GRID_ROWS; r++) {
    const z = -totalDepth / 2 + STREET_WIDTH / 2 + r * cellSize;
    const street = MeshBuilder.CreateGround(`hStreet${r}`, { width: totalWidth, height: STREET_WIDTH }, scene);
    street.position = new Vector3(0, 0.01, z);
    street.material = streetMat;
  }

  // Vertical streets
  for (let c = 0; c <= GRID_COLS; c++) {
    const x = -totalWidth / 2 + STREET_WIDTH / 2 + c * cellSize;
    const street = MeshBuilder.CreateGround(`vStreet${c}`, { width: STREET_WIDTH, height: totalDepth }, scene);
    street.position = new Vector3(x, 0.01, 0);
    street.material = streetMat;
  }

  // --- Buildings ---
  const buildingMat = new StandardMaterial("buildingMat", scene);
  buildingMat.diffuseColor = new Color3(0.5, 0.5, 0.5);

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const height = 4 + Math.random() * 11; // 4–15
      const building = MeshBuilder.CreateBox(
        `building_${col}_${row}`,
        { width: BLOCK_SIZE * 0.8, height, depth: BLOCK_SIZE * 0.8 },
        scene,
      );

      const x = -totalWidth / 2 + STREET_WIDTH + BLOCK_SIZE / 2 + col * cellSize;
      const z = -totalDepth / 2 + STREET_WIDTH + BLOCK_SIZE / 2 + row * cellSize;

      building.position = new Vector3(x, height / 2, z);
      building.material = buildingMat;
    }
  }

  // WASD input
  const keyMap: Record<string, keyof typeof moveState> = {
    w: "forward", W: "forward",
    a: "left", A: "left",
    s: "backward", S: "backward",
    d: "right", D: "right",
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const dir = keyMap[e.key];
    if (dir) moveState[dir] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const dir = keyMap[e.key];
    if (dir) moveState[dir] = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  // Render loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (moveState.forward || moveState.backward || moveState.left || moveState.right) {
      const forward = camera.getDirection(Vector3.Forward());
      forward.y = 0;
      forward.normalize();
      const right = camera.getDirection(Vector3.Right());
      right.y = 0;
      right.normalize();

      const move = Vector3.Zero();
      if (moveState.forward) move.addInPlace(forward);
      if (moveState.backward) move.subtractInPlace(forward);
      if (moveState.right) move.addInPlace(right);
      if (moveState.left) move.subtractInPlace(right);
      move.normalize();

      camera.position.addInPlace(move.scale(MOVE_SPEED * dt));
    }

    scene.render();
  });

  const cleanup = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
  };

  return { engine, camera, cleanup };
}
