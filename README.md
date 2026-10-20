# Omarchy Beat

Slash every beat. Omarchy Beat is a rhythm game for the browser and for VR headsets. Each Omarchy theme is a world. The music streams from Omarchy Radio, and the game builds the block map from the audio of each track.

Play it at https://bjarneo.github.io/omarchy-beat/.

## Controls

In the lobby:

- Press `↑` and `↓` to select a track.
- Press `Enter` to play. Press `Shift+Enter` to start a VR session.
- Press `T` to go to the next world. Press `Shift+T` to go to the previous world.
- Select `1`, `2` or `3` in the top bar to set the difficulty.

In the browser:

- Move the mouse through each block in the direction of its arrow.
- The left half of the screen is the left claw. The right half is the right claw.
- Keep the mouse away from the mines.
- Press `Esc` or `P` to pause.

In VR:

1. Open the page in the browser of the headset.
2. Select `Enter VR`.
3. Cut each block with the claw of the same color.
4. After each track, slash `RETRY`, `NEXT` or `EXIT`.

## Run locally

The game is a static site with no build step. Serve the folder over HTTP:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. WebXR needs HTTPS or `localhost`.

## Files

- `index.html`, `styles.css` and `app.js` contain the lobby, pause, results and VR screens.
- `claw-engine.js` contains the three.js and WebXR engine, the beat analysis and the block map generator.
- `omarchy-fx.js` contains the wordmark and the text effects for the results screen.
- `assets/js/wte/` contains the ttfx WASM build from `bjarneo/omarchy-site`, pinned at commit `e75213b`.
- `vendor/preact-htm.js` is htm 3.1.1 with Preact. Both use the MIT License.

## Sources

- Worlds use the themes in `omacom/omarchy` on the `quattro` branch. The wallpapers load from `raw.githubusercontent.com`.
- Tracks stream from https://radio.omarchy.org.
- three.js 0.170.0 loads from jsDelivr.
