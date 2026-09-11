import { PhysicsSnakeApp } from "./physicsSnakeApp";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas");

if (!canvas) {
  throw new Error("Canvas element #renderCanvas was not found.");
}

new PhysicsSnakeApp(canvas).start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error.";
  document.body.innerHTML = `<div class="app-error">Failed to start scene: ${message}</div>`;
  console.error(error);
});
