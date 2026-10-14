# Repository instructions

## Build, run, and checks

- Open `index.html` directly in a browser; no build or dependency installation is required.
- To serve the static files locally, run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`.
- There is no configured test runner, test suite, or lint command. Check JavaScript syntax with `node --check game.js`.
- For a browser smoke check, verify keyboard and touch movement, jumping, shard collection, reaching the goal, and restarting.

## Architecture

- This is a dependency-free, vanilla HTML/CSS/JavaScript canvas game.
- `index.html` defines the HUD, canvas, status text, restart button, and touch controls. Its element IDs and touch-button `data-key` values are queried by `game.js`; keep both sides in sync when changing the UI.
- `style.css` owns the responsive page and HUD layout. The canvas drawing surface scales to its CSS size and device pixel ratio in `game.js`; the game world and camera are maintained in world coordinates.
- `game.js` is a strict-mode IIFE containing game state, keyboard/pointer input, physics and collision updates, drawing, and the animation loop. `update()` advances state; `drawBackground()` and `drawWorld()` render it.
- `README.md` documents how to launch and play the game.

## Project-specific conventions

- Keep the game framework-free and runnable as static files; the deferred script in `index.html` loads `game.js`.
- Keep player-facing copy in Japanese, consistent with the page language and existing UI.
- Keyboard and touch controls feed the same movement/jump state. Preserve press/release behavior for pointer controls and reset input/state consistently.
- Shard placement and the `TOTAL_SHARDS` game constant live in `game.js`; the HUD total is currently written in `index.html` as well. Update both when changing the number of shards.
- Canvas dimensions, ground height, and platform positions depend on the viewport. Keep resize handling and camera/world-coordinate rendering aligned when changing level geometry.
