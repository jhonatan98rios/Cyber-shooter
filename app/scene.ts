import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// ─── City Layout Constants ───────────────────────────────────────────────────
const BLOCK_SIZE = 10;
const STREET_WIDTH = 5;
const SIDEWALK_WIDTH = 1.5;
const SIDEWALK_HEIGHT = 0.3;
const GRID_COLS = 5;
const GRID_ROWS = 5;
const CELL_SIZE = BLOCK_SIZE + STREET_WIDTH;
const TOTAL_W = GRID_COLS * BLOCK_SIZE + (GRID_COLS + 1) * STREET_WIDTH;
const TOTAL_D = GRID_ROWS * BLOCK_SIZE + (GRID_ROWS + 1) * STREET_WIDTH;
const MOVE_SPEED = 8;

export const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// ─── Neon Palette ────────────────────────────────────────────────────────────
const NEON_COLORS: Color3[] = [
  new Color3(0, 1, 1),       // cyan
  new Color3(1, 0, 0.8),     // magenta
  new Color3(1, 0.9, 0),     // yellow
  new Color3(1, 0, 0.2),     // red
  new Color3(0, 1, 0.3),     // green
  new Color3(0.5, 0, 1),     // purple
  new Color3(1, 0.4, 0),     // orange
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blockCenter(col: number, row: number): Vector3 {
  const x = -TOTAL_W / 2 + STREET_WIDTH + BLOCK_SIZE / 2 + col * CELL_SIZE;
  const z = -TOTAL_D / 2 + STREET_WIDTH + BLOCK_SIZE / 2 + row * CELL_SIZE;
  return new Vector3(x, 0, z);
}

function randColor(): Color3 {
  return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
}

// ─── Procedural Textures ─────────────────────────────────────────────────────

function makeBuildingTexture(
  scene: Scene,
  baseColor: string,
  windowColor: string,
  density: number,
): DynamicTexture {
  const size = 128;
  const tex = new DynamicTexture("bldg", { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // window grid
  const grid = 8;
  const cell = size / grid;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (Math.random() < density) {
        ctx.fillStyle = windowColor;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
  }

  // horizontal accent lines
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  for (let r = 0; r <= grid; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cell);
    ctx.lineTo(size, r * cell);
    ctx.stroke();
  }

  tex.update();
  tex.updateSamplingMode(1); // NEAREST for PS1 look
  return tex;
}

function makeSignTexture(scene: Scene, text: string, neonColor: string): DynamicTexture {
  const w = 256;
  const h = 64;
  const tex = new DynamicTexture("sign", { width: w, height: h }, scene, false);
  const ctx = tex.getContext();

  // dark bg
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, w, h);

  // glow layer
  const c = ctx as CanvasRenderingContext2D;
  c.fillStyle = neonColor;
  c.globalAlpha = 0.2;
  c.font = "bold 38px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, w / 2 + 1, h / 2 + 1);

  // sharp text
  c.globalAlpha = 1;
  c.font = "bold 36px monospace";
  c.fillText(text, w / 2, h / 2);

  tex.update();
  tex.updateSamplingMode(1);
  return tex;
}

function makeBannerTexture(scene: Scene, colors: string[]): DynamicTexture {
  const w = 64;
  const h = 192;
  const tex = new DynamicTexture("banner", { width: w, height: h }, scene, false);
  const ctx = tex.getContext();

  const stripeH = h / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, i * stripeH, w, stripeH);
  }

  // border
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  tex.update();
  tex.updateSamplingMode(1);
  return tex;
}

function makeAsphaltTexture(scene: Scene): DynamicTexture {
  const s = 256;
  const tex = new DynamicTexture("asphalt", { width: s, height: s }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#111114";
  ctx.fillRect(0, 0, s, s);
  // noise grain
  for (let i = 0; i < 2000; i++) {
    const g = 10 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${g},${g},${g + 2})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  tex.update();
  return tex;
}

function makeSidewalkTexture(scene: Scene): DynamicTexture {
  const s = 128;
  const tex = new DynamicTexture("sidewalk", { width: s, height: s }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, 0, s, s);
  // slab lines
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 2;
  const slab = s / 4;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * slab, 0);
    ctx.lineTo(i * slab, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * slab);
    ctx.lineTo(s, i * slab);
    ctx.stroke();
  }
  tex.update();
  tex.updateSamplingMode(1);
  return tex;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export function createScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // night sky
  scene.clearColor = new Color4(0.02, 0.02, 0.06, 1);

  // fog
  scene.fogMode = Scene.FOGMODE_EXP;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.02, 0.02, 0.06);

  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = new UniversalCamera("cam", new Vector3(0, 1.6, 0), scene);
  camera.angularSensibility = 5000;
  camera.applyGravity = false;
  camera.speed = 0;
  camera.minZ = 0.1;

  // ── Lighting ─────────────────────────────────────────────────────────────
  // dim ambient
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.15;
  hemi.diffuse = new Color3(0.1, 0.1, 0.18);
  hemi.groundColor = new Color3(0.02, 0.02, 0.04);

  // ── Textures ─────────────────────────────────────────────────────────────
  const asphaltTex = makeAsphaltTexture(scene);
  const sidewalkTex = makeSidewalkTexture(scene);

  // ── Ground (streets) ─────────────────────────────────────────────────────
  const ground = MeshBuilder.CreateGround("ground", { width: TOTAL_W + 20, height: TOTAL_D + 20 }, scene);
  ground.position.y = -0.02;
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseTexture = asphaltTex;
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;

  // ── Sidewalks ────────────────────────────────────────────────────────────
  const swH = SIDEWALK_HEIGHT;
  const platformSize = BLOCK_SIZE + SIDEWALK_WIDTH * 2;

  const swMat = new StandardMaterial("swMat", scene);
  swMat.diffuseTexture = sidewalkTex;
  swMat.specularColor = new Color3(0.05, 0.05, 0.05);

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const bc = blockCenter(col, row);
      const platform = MeshBuilder.CreateBox(
        `sw_${col}_${row}`,
        { width: platformSize, height: swH, depth: platformSize },
        scene,
      );
      platform.position = new Vector3(bc.x, swH / 2, bc.z);
      platform.material = swMat;
      platform.receiveShadows = false;
    }
  }

  // ── Buildings ────────────────────────────────────────────────────────────
  const buildingBaseColors = ["#2a2a2e", "#252530", "#2e2e35", "#22222a"];
  const windowColors = ["#ffcc66", "#ffee88", "#ffaa44", "#ffdd77"];

  const allBuildingMeshes: Mesh[] = [];

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const bc = blockCenter(col, row);
      const distFromCenter = Math.sqrt(
        (col - GRID_COLS / 2 + 0.5) ** 2 + (row - GRID_ROWS / 2 + 0.5) ** 2,
      );
      const isCenter = distFromCenter < 1.5;
      const isEdge = distFromCenter > 2.5;

      // 1-4 buildings per block
      const numBldg = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : Math.random() < 0.8 ? 3 : 4;
      const maxH = isCenter ? 28 : isEdge ? 10 : 18;
      const minH = isCenter ? 8 : 3;

      for (let b = 0; b < numBldg; b++) {
        const bw = BLOCK_SIZE * (0.3 + Math.random() * 0.5);
        const bd = BLOCK_SIZE * (0.3 + Math.random() * 0.5);
        const bh = minH + Math.random() * (maxH - minH);

        // random offset within block, but keep inside platform
        const halfPlatform = platformSize / 2;
        const ox = (Math.random() - 0.5) * (platformSize - bw) * 0.85;
        const oz = (Math.random() - 0.5) * (platformSize - bd) * 0.85;

        const building = MeshBuilder.CreateBox(
          `bldg_${col}_${row}_${b}`,
          { width: bw, height: bh, depth: bd },
          scene,
        );
        building.position = new Vector3(bc.x + ox, swH + bh / 2, bc.z + oz);
        building.convertToFlatShadedMesh(); // PS1 flat shading

        // PBR for reflections
        const bMat = new PBRMaterial(`bMat_${col}_${row}_${b}`, scene);
        const bTex = makeBuildingTexture(
          scene,
          buildingBaseColors[Math.floor(Math.random() * buildingBaseColors.length)],
          windowColors[Math.floor(Math.random() * windowColors.length)],
          0.4 + Math.random() * 0.5,
        );
        bMat.albedoTexture = bTex;
        bMat.metallic = 0.15 + Math.random() * 0.25;
        bMat.roughness = 0.6 + Math.random() * 0.35;
        bMat.environmentIntensity = 0.3;
        building.material = bMat;

        allBuildingMeshes.push(building);

        // roof sign on tall buildings
        if (bh > 12 && Math.random() < 0.5) {
          const signW = bw * 0.7;
          const signH = 1.8;
          const neonC = randColor();
          const words = ["NEON", "CYBER", "2049", "DATA", "VOID", "GRID", "PULSE", "BYTE"];
          const word = words[Math.floor(Math.random() * words.length)];

          const signTex = makeSignTexture(
            scene,
            word,
            `rgb(${Math.floor(neonC.r * 255)},${Math.floor(neonC.g * 255)},${Math.floor(neonC.b * 255)})`,
          );

          // sign plane
          const signPlane = MeshBuilder.CreatePlane(
            `rsign_${col}_${row}_${b}`,
            { width: signW, height: signH },
            scene,
          );
          signPlane.position = new Vector3(
            bc.x + ox,
            swH + bh + signH / 2 + 0.1,
            bc.z + oz,
          );
          signPlane.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;

          const signMat = new PBRMaterial(`signMat_${col}_${row}_${b}`, scene);
          signMat.albedoTexture = signTex;
          signMat.emissiveTexture = signTex;
          signMat.emissiveColor = neonC;
          signMat.emissiveIntensity = 2.5;
          signMat.metallic = 0;
          signMat.roughness = 1;
          signPlane.material = signMat;

          // frame
          const frame = MeshBuilder.CreateBox(
            `frame_${col}_${row}_${b}`,
            { width: signW + 0.2, height: signH + 0.2, depth: 0.15 },
            scene,
          );
          frame.position = signPlane.position.clone();
          frame.rotation.y = signPlane.rotation.y;
          const frameMat = new StandardMaterial(`fMat_${col}_${row}_${b}`, scene);
          frameMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
          frame.material = frameMat;
        }

        // wall-mounted sign
        if (bh > 6 && Math.random() < 0.35) {
          const wsignW = bw * 0.5;
          const wsignH = 1.2;
          const neonC = randColor();
          const words = ["OPEN", "BAR", "777", "CLUB", "NET", "VIP", "SYS", "TECH"];
          const word = words[Math.floor(Math.random() * words.length)];

          const wsignTex = makeSignTexture(
            scene,
            word,
            `rgb(${Math.floor(neonC.r * 255)},${Math.floor(neonC.g * 255)},${Math.floor(neonC.b * 255)})`,
          );

          const signPlane = MeshBuilder.CreatePlane(
            `wsign_${col}_${row}_${b}`,
            { width: wsignW, height: wsignH },
            scene,
          );
          const side = Math.floor(Math.random() * 4);
          const wallY = swH + bh * (0.3 + Math.random() * 0.5);
          let wx = bc.x + ox, wz = bc.z + oz;
          let ry = 0;
          if (side === 0) { wz += bd / 2 + 0.05; ry = 0; }
          else if (side === 1) { wz -= bd / 2 + 0.05; ry = Math.PI; }
          else if (side === 2) { wx += bw / 2 + 0.05; ry = Math.PI / 2; }
          else { wx -= bw / 2 + 0.05; ry = -Math.PI / 2; }

          signPlane.position = new Vector3(wx, wallY, wz);
          signPlane.rotation.y = ry;

          const wsignMat = new PBRMaterial(`wsMat_${col}_${row}_${b}`, scene);
          wsignMat.albedoTexture = wsignTex;
          wsignMat.emissiveTexture = wsignTex;
          wsignMat.emissiveColor = neonC;
          wsignMat.emissiveIntensity = 2.5;
          wsignMat.metallic = 0;
          wsignMat.roughness = 1;
          signPlane.material = wsignMat;
        }
      }
    }
  }

  // ── Banners ──────────────────────────────────────────────────────────────
  const bannerColorSets: string[][] = [
    ["#ff00ff", "#00ffff", "#ff00ff"],
    ["#ffff00", "#ff0066", "#ffff00"],
    ["#00ff66", "#8800ff", "#00ff66"],
    ["#ff6600", "#ff00cc", "#ff6600"],
    ["#00ccff", "#ff0044", "#00ccff"],
  ];

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (Math.random() > 0.4) continue;
      const bc = blockCenter(col, row);
      const bannerW = 1.2;
      const bannerH = 5 + Math.random() * 8;

      const bTex = makeBannerTexture(
        scene,
        bannerColorSets[Math.floor(Math.random() * bannerColorSets.length)],
      );

      const banner = MeshBuilder.CreatePlane(
        `banner_${col}_${row}`,
        { width: bannerW, height: bannerH },
        scene,
      );
      const bx = bc.x + (Math.random() - 0.5) * BLOCK_SIZE * 0.7;
      const bz = bc.z + (Math.random() - 0.5) * BLOCK_SIZE * 0.7;
      const by = swH + bannerH / 2;
      banner.position = new Vector3(bx, by, bz);
      banner.rotation.x = 0.1; // slight tilt

      const bMat = new PBRMaterial(`bannerMat_${col}_${row}`, scene);
      bMat.albedoTexture = bTex;
      bMat.emissiveTexture = bTex;
      bMat.emissiveColor = new Color3(1, 1, 1);
      bMat.emissiveIntensity = 0.6;
      bMat.backFaceCulling = false;
      bMat.metallic = 0;
      bMat.roughness = 1;
      banner.material = bMat;
    }
  }

  // ── Giant Intersection Billboards ───────────────────────────────────────
  // pick 3-4 key intersections for massive overhead signs
  const giantSpots = [
    { col: 1, row: 1 },
    { col: 3, row: 1 },
    { col: 2, row: 2 },
    { col: 3, row: 3 },
  ];
  const giantWords = ["CYBERPUNK", "NEON CITY", "2049", "SYNTHWAVE"];

  for (let i = 0; i < giantSpots.length; i++) {
    const { col, row } = giantSpots[i];
    const x = -TOTAL_W / 2 + STREET_WIDTH / 2 + col * CELL_SIZE;
    const z = -TOTAL_D / 2 + STREET_WIDTH / 2 + row * CELL_SIZE;
    const neonC = NEON_COLORS[i % NEON_COLORS.length];

    const gTex = makeSignTexture(
      scene,
      giantWords[i],
      `rgb(${Math.floor(neonC.r * 255)},${Math.floor(neonC.g * 255)},${Math.floor(neonC.b * 255)})`,
    );

    // giant billboard spanning across intersection
    const gw = CELL_SIZE * 0.9;
    const gh = 3;
    const plane = MeshBuilder.CreatePlane(`giant_${i}`, { width: gw, height: gh }, scene);
    plane.position = new Vector3(x, 14 + i * 3, z);
    plane.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;

    const gMat = new PBRMaterial(`giantMat_${i}`, scene);
    gMat.albedoTexture = gTex;
    gMat.emissiveTexture = gTex;
    gMat.emissiveColor = neonC;
    gMat.emissiveIntensity = 3;
    gMat.backFaceCulling = false;
    gMat.metallic = 0;
    gMat.roughness = 1;
    plane.material = gMat;

    // thin support columns
    for (let s = 0; s < 2; s++) {
      const colX = x + (s === 0 ? -gw / 3 : gw / 3);
      const pole = MeshBuilder.CreateCylinder(
        `pole_${i}_${s}`,
        { height: plane.position.y - swH, diameter: 0.3 },
        scene,
      );
      pole.position = new Vector3(colX, plane.position.y / 2 + swH / 2, z);
      const poleMat = new StandardMaterial(`poleMat_${i}_${s}`, scene);
      poleMat.diffuseColor = new Color3(0.08, 0.08, 0.08);
      pole.material = poleMat;
    }
  }

  // ── Neon Point Lights at intersections ───────────────────────────────────
  const pointLights: PointLight[] = [];
  for (let col = 0; col <= GRID_COLS; col++) {
    for (let row = 0; row <= GRID_ROWS; row++) {
      if (Math.random() > 0.5) continue; // not every intersection
      const x = -TOTAL_W / 2 + STREET_WIDTH / 2 + col * CELL_SIZE;
      const z = -TOTAL_D / 2 + STREET_WIDTH / 2 + row * CELL_SIZE;
      const neonC = randColor();

      const pl = new PointLight(`pl_${col}_${row}`, new Vector3(x, 3 + Math.random() * 5, z), scene);
      pl.diffuse = neonC;
      pl.intensity = 0.6 + Math.random() * 0.8;
      pl.range = 14 + Math.random() * 10;
      pointLights.push(pl);
    }
  }

  // ── Post-Processing ──────────────────────────────────────────────────────
  const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [camera]);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.35;
  pipeline.bloomWeight = 0.65;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.4;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  // ACES filmic tone mapping for cinematic look
  pipeline.imageProcessing.toneMappingType = 1; // ACES

  // ── Input ────────────────────────────────────────────────────────────────
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

  // ── Render Loop ──────────────────────────────────────────────────────────
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
