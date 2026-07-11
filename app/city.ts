import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MAP, CELL, BLOCK, SIDEWALK, SIDEWALK_HEIGHT } from "./map";

const BUILDING_W = 16;
const BUILDING_D = 16;

const HEIGHT_BASE = 10;
const HEIGHT_CATEGORIES = [
  { min: 0, max: 6 },
  { min: 8, max: 18 },
  { min: 22, max: 38 },
];

const BUILDING_GRAYS = [
  new Color3(0.25, 0.25, 0.28),
  new Color3(0.30, 0.28, 0.30),
  new Color3(0.22, 0.22, 0.25),
  new Color3(0.35, 0.33, 0.35),
  new Color3(0.28, 0.30, 0.28),
];

export function buildCity(scene: Scene) {
  const rows = MAP.length;
  const cols = MAP[0].length;
  const totalW = cols * CELL;
  const totalD = rows * CELL;

  const roadMat = new StandardMaterial("roadMat", scene);
  roadMat.diffuseColor = new Color3(0.08, 0.08, 0.09);
  roadMat.specularColor = Color3.Black();

  const sidewalkMat = new StandardMaterial("sidewalkMat", scene);
  sidewalkMat.diffuseColor = new Color3(0.55, 0.55, 0.55);
  sidewalkMat.specularColor = new Color3(0.02, 0.02, 0.02);

  const swSize = BLOCK + SIDEWALK * 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * CELL - totalW / 2 + CELL / 2;
      const cz = row * CELL - totalD / 2 + CELL / 2;

      if (MAP[row][col] === "road") {
        const road = MeshBuilder.CreateGround(
          `road_${col}_${row}`,
          { width: CELL, height: CELL },
          scene,
        );
        road.position = new Vector3(cx, 0.005, cz);
        road.material = roadMat;
      } else {
        // sidewalk platform
        const sw = MeshBuilder.CreateBox(
          `sw_${col}_${row}`,
          { width: swSize, height: SIDEWALK_HEIGHT, depth: swSize },
          scene,
        );
        sw.position = new Vector3(cx, SIDEWALK_HEIGHT / 2, cz);
        sw.material = sidewalkMat;

        // building centered on lot, height from random category
        const cat = HEIGHT_CATEGORIES[Math.floor(Math.random() * HEIGHT_CATEGORIES.length)];
        const bh = HEIGHT_BASE + cat.min + Math.random() * (cat.max - cat.min);

        const bldg = MeshBuilder.CreateBox(
          `bldg_${col}_${row}`,
          { width: BUILDING_W, height: bh, depth: BUILDING_D },
          scene,
        );
        bldg.position = new Vector3(cx, SIDEWALK_HEIGHT + bh / 2, cz);

        const bMat = new StandardMaterial(`bMat_${col}_${row}`, scene);
        bMat.diffuseColor = BUILDING_GRAYS[Math.floor(Math.random() * BUILDING_GRAYS.length)];
        bldg.material = bMat;
      }
    }
  }
}
