# Omarchy Beat

Slash every beat. Omarchy Beat is a rhythm game for the browser and for VR headsets. Each Omarchy theme is a world. The music streams from Omarchy Radio, and the game builds the block map from the audio of each track.

Play it at https://bjarneo.github.io/omarchy-beat/.

## Controls

In the lobby:

- Press `↑` and `↓` to select a track.
- Press `Enter` to play. Press `Shift+Enter` to start a VR session.
- Press `T` to go to the next world. Press `Shift+T` to go to the previous world.
- Press `1` to `5`, or select a number in the top bar, to set the difficulty: Easy, Normal, Hard, Expert or Expert+.

In the browser:

- Move the mouse through each block in the direction of its arrow.
- The left half of the screen is the left claw. The right half is the right claw.
- Keep the mouse away from the mines.
- Press `Esc` or `P` to pause, or select `pause` at the top left.
- Press `Q` to stop the track and go back to the lobby, or select `stop` at the top left. `Q` also works when the track is paused.
- On the results screen, press `Esc` or `Q` to go back to the lobby.

In VR:

1. Open the page in the browser of the headset.
2. Select `Enter VR`.
3. Cut each block with the claw of the same color.
4. After each track, slash `RETRY`, `NEXT` or `EXIT`.

## Difficulty

| Level | Blocks | Speed | Misses |
| --- | --- | --- | --- |
| Easy | Strong beats only, many any-direction dots | Slow | Drain less battery |
| Normal | Most beats, some doubles and mines | Medium | Normal drain |
| Hard | Half beats on loud sections, more mines | Fast | Normal drain |
| Expert | Half beats on most sections, doubles on strong beats, side cuts, blocks on every row | Faster | Drain 25% more battery |
| Expert+ | Quarter-beat streams on the loudest parts, the most mines, a tighter hit window | Fastest | Drain 50% more battery |

Turn off `no fail` in the top bar to end the track when the battery is empty.

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

- Worlds use the colors of the themes in `omacom/omarchy` on the `quattro` branch. The sky is the omarchy.org pixel field in the field colors of each theme.
- Tracks stream from https://radio.omarchy.org.
- three.js 0.170.0 loads from jsDelivr.
