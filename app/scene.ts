import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { buildCity } from "./city";
import { MAP, CELL } from "./map";

export const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

const MOVE_SPEED = 10;

export function createScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const rows = MAP.length;
  const cols = MAP[0].length;
  const totalW = cols * CELL;
  const totalD = rows * CELL;

  scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);

  scene.fogMode = Scene.FOGMODE_EXP;
  scene.fogDensity = 0.005;
  scene.fogColor = new Color3(0.1, 0.1, 0.15);

  // camera
  const camera = new UniversalCamera("cam", new Vector3(0, 1.6, totalD / 2 + 10), scene);
  camera.angularSensibility = 5000;
  camera.applyGravity = false;
  camera.speed = 0;
  camera.minZ = 0.1;

  // light
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  hemi.diffuse = new Color3(0.9, 0.9, 0.95);
  hemi.groundColor = new Color3(0.2, 0.2, 0.25);

  // ground under entire city
  const ground = MeshBuilder.CreateGround("ground", { width: totalW + 40, height: totalD + 40 }, scene);
  ground.position.y = -0.02;
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.12, 0.12, 0.10);
  ground.material = groundMat;

  // build city from map data
  buildCity(scene);

  // post-processing
  const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [camera]);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.6;
  pipeline.bloomWeight = 0.3;
  pipeline.bloomKernel = 32;
  pipeline.bloomScale = 0.2;

  // keyboard input
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
    pipeline.dispose();
  };

  return { engine, camera, cleanup };
}
