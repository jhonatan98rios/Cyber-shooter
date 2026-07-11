// ponytail: 2D array, edit by hand to reshape the city
export type Cell = "road" | "block";

export const CELL = 32;
export const BLOCK = 20;
export const SIDEWALK = 2;
export const SIDEWALK_HEIGHT = 0.3;

export const MAP: Cell[][] = [
  ["road", "road",  "road",  "road",  "road",  "road",  "road"],
  ["road", "block", "block", "road",  "block", "block", "road"],
  ["road", "block", "block", "road",  "block", "block", "road"],
  ["road", "road",  "road",  "road",  "road",  "road",  "road"],
  ["road", "block", "block", "road",  "block", "block", "road"],
  ["road", "block", "block", "road",  "block", "block", "road"],
  ["road", "road",  "road",  "road",  "road",  "road",  "road"],
];
