import StartGame from "./game/main";

document.addEventListener("DOMContentLoaded", () => {
  const game = StartGame("game-container");
  // Dev-only handle for browser debugging (Playwright `page.evaluate`).
  if (import.meta.env.DEV) {
    (window as unknown as { __game: unknown }).__game = game;
  }
});
