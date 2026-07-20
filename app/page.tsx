"use client";

import { useEffect, useRef, useCallback } from "react";
import type { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { createScene, moveState } from "./scene";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<UniversalCamera | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lookRef = useRef({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const { engine, camera, cleanup } = createScene(canvasRef.current);
    cameraRef.current = camera;
    cleanupRef.current = cleanup;
    return () => {
      cleanup();
      engine.dispose();
    };
  }, []);

  // Desktop pointer lock + mouse look
  const handleCanvasClick = useCallback(() => {
    canvasRef.current?.requestPointerLock();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvasRef.current || !cameraRef.current) return;
      const sensitivity = 0.003;
      cameraRef.current.cameraRotation.y += e.movementX * sensitivity;
      cameraRef.current.cameraRotation.x += e.movementY * sensitivity;
      cameraRef.current.cameraRotation.x = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, cameraRef.current.cameraRotation.x),
      );
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Mobile directional pad
  const dirProps = (dir: keyof typeof moveState) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); moveState[dir] = true; },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); moveState[dir] = false; },
    onPointerLeave: (e: React.PointerEvent) => { e.preventDefault(); moveState[dir] = false; },
    onPointerCancel: (e: React.PointerEvent) => { e.preventDefault(); moveState[dir] = false; },
  });

  // Mobile look
  const handleLookDown = (e: React.PointerEvent) => {
    e.preventDefault();
    lookRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent) => {
    if (!lookRef.current.active || !cameraRef.current) return;
    e.preventDefault();
    const dx = e.clientX - lookRef.current.lastX;
    const dy = e.clientY - lookRef.current.lastY;
    lookRef.current.lastX = e.clientX;
    lookRef.current.lastY = e.clientY;
    const sensitivity = 0.002;
    cameraRef.current.cameraRotation.y += dx * sensitivity;
    cameraRef.current.cameraRotation.x += dy * sensitivity;
    cameraRef.current.cameraRotation.x = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, cameraRef.current.cameraRotation.x),
    );
  };

  const handleLookUp = (e: React.PointerEvent) => {
    e.preventDefault();
    lookRef.current.active = false;
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onClick={handleCanvasClick}
      />

      {/* D-Pad */}
      <div
        className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 select-none"
        style={{ touchAction: "none" }}
      >
        <div />
        <button className="w-12 h-12 rounded text-lg" style={{ background: "rgba(255,255,255,0.25)", color: "white" }} {...dirProps("forward")}>
          ↑
        </button>
        <div />
        <button className="w-12 h-12 rounded text-lg" style={{ background: "rgba(255,255,255,0.25)", color: "white" }} {...dirProps("left")}>
          ←
        </button>
        <div className="w-12 h-12" />
        <button className="w-12 h-12 rounded text-lg" style={{ background: "rgba(255,255,255,0.25)", color: "white" }} {...dirProps("right")}>
          →
        </button>
        <div />
        <button className="w-12 h-12 rounded text-lg" style={{ background: "rgba(255,255,255,0.25)", color: "white" }} {...dirProps("backward")}>
          ↓
        </button>
        <div />
      </div>

      {/* LOOK */}
      <button
        className="absolute bottom-4 right-4 w-20 h-20 rounded-full select-none text-sm font-bold"
        style={{ background: "rgba(255,255,255,0.25)", color: "white", touchAction: "none" }}
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
      >
        LOOK
      </button>
    </div>
  );
}
