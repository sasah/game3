# Feasibility report: Godot 4 and web self-testing from this container

Godot works fully from the command line here. I wrote two physics projects as plain text, ran them headless, exported one to Web and rendered it in headless Chromium. Three.js renders in the same browser and I can check the screenshots. Nothing was created or committed in `/home/user/game3` (git status is clean).

## 1. Environment
- Linux x86_64 (kernel 6.18), 4 CPUs, 15 GiB RAM, no swap, about 30 GB free disk.
- node v22.22.0, npm 10.9.4, Python 3.13.16, OpenJDK 21.0.12.
- Playwright 1.56.1 is installed globally (`NODE_PATH=$(npm root -g)`). Chromium binary: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## 2. Getting Godot
- **The GitHub route is blocked.** `api.github.com/repos/godotengine/godot/releases/latest` returns 403 ("GitHub access to this repository is not enabled for this session"). `godot-builds` and github.com release pages also return 403.
- **Workaround:** `git ls-remote --tags` still works and shows the latest stable is **4.7.2-stable**. The official mirror `downloads.godotengine.org` is reachable and redirects to `godot-releases.nbg1.your-objectstorage.com`.
- Editor zip: 77.9 MB, downloaded in 4.2 s, unzipped in 1.9 s to a 146 MB binary.
- `--headless --version` prints `4.7.2.stable.official.ed1daf0bf`.

## 3. Projects written as plain text
- **3D test:** `project.godot` (Jolt Physics, gl_compatibility), `main.tscn` (camera, sun, floor, 3 boxes) and `main.gd` (adds a 6-box tower and a 5 kg ball fired at 12 m/s).
  - `--import` took 8.2 s. A headless run of 241 physics frames took 4.2 s (it runs at real-time 60 Hz).
  - Positions change as expected: Tower2 moves from (2.00, 1.27) to (9.69, 0.25), so the tower is knocked down, and the falling boxes settle at y=0.30. The output prints `physics=Jolt Physics`.
- **2D rope test (Cut the Rope style):** a chain of 9 bodies joined by `PinJoint2D`, cut at frame 120. The candy swings (x from 180 to -111 to 112), and after the cut it falls (y from 175 to 2124). Run time 4.2 s.

## 4. Web export
- The full templates `.tpz` is **1.28 GB**, just over the ~1.2 GB limit, so I did not download it. The server supports byte ranges, so I wrote a Python range-reader (`zip_range.py`) that pulls single files out of the remote zip.
  - Reading the file list took 3.6 KB and 2.7 s.
  - `web_nothreads_release.zip`, `web_release.zip` and `version.txt` took 22 MB and 31.6 s.
- **Failure 1:** `--export-release` also requires the debug template (`web_nothreads_debug.zip`). Fetching it took 10 MB and 16 s.
- **Failure 2:** the export then failed with an **empty error message**. The cause was that `vram_texture_compression/for_mobile=true` needs `rendering/textures/vram_compression/import_etc2_astc=true` in `project.godot`. After adding that, the export succeeded in 6.3 s.
- **Output:** 39 MB in total, almost all of it `index.wasm` (39.5 MB, about 10.1 MB gzipped), plus `index.js` 280 KB and `index.pck` 8 KB.
- I used the single-threaded build, which needs no COOP/COEP headers. That means it should work on plain static hosting like GitHub Pages, which can't set those headers. The official docs call single-threaded the preferred default since 4.3 ([Godot docs](https://docs.godotengine.org/zh-cn/4.5/tutorials/export/exporting_for_web.html), [Godot blog](https://godotengine.org/article/progress-report-web-export-in-4-3/), [Cinevva](https://app.cinevva.com/news/2024-08-15-godot-4-3-web-export)).

## 5. Godot web build in headless Chromium
- Launch flags: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. WebGL2 works through the SwiftShader software renderer.
- The build boots. The console shows `OpenGL ES 3.0 (WebGL 2.0) - Compatibility`, `Emscripten 4.0.20, single-threaded`, `web=true`, `physics=Jolt Physics`.
- **The physics output matches the native run exactly, frame for frame** (FRAME 0 to 240 identical), so the simulation is deterministic across native and web.
- Screenshot: boxes, the knocked-down tower and shadows all render (215 distinct colours). Load plus 12 s wait took 13.4 s.

## 6. Three.js check
- three r170 loaded from jsdelivr through an importmap. It rendered a torus knot with shadows and physical materials, and the console logged "rendered 60 frames".
- The screenshot has 2501 distinct colours. The only error was a 404 for favicon. Total time 7.5 s.

## 7. Cleanup
- Deleted: export templates, `godot.zip`, the web export folder, and the http servers.
- Kept (about 140 MB in total):
- Godot also created `~/.local/share/godot/app_userdata` and `~/.local/share/godot/keystores`; I left those.

## Verdicts
- **Can Claude develop and build Godot (Web) entirely from this container? Yes.**
  - Writing scenes and scripts as text, importing, running headless, checking physics in logs, and exporting to Web all work with the CLI alone.
  - Setup cost per session is about 2 minutes: download the editor from the godotengine.org mirror (not GitHub) and range-extract about 30 MB of web templates.
  - Gotchas: debug templates are required, `import_etc2_astc` is required, and the export error message is blank.
  - Not tested: Android APK export. It would need the Android SDK and the ~105 MB `android_release.apk` template.
  - The web output is heavy for a phone: about 10 MB gzipped, against a few hundred KB for a Three.js page.
- **Can Claude visually check web builds? Yes, for both Godot and Three.js.**
  - Headless Chromium with SwiftShader WebGL2 renders correctly, captures console output and takes screenshots I can look at and count pixels in.
  - Limits: it's slow software rendering (not a performance benchmark), and it can't test touch feel or real phone GPUs.
