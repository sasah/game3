# Engines and delivery for a phone-tested physics game (verified 2026-10-21)

## 1. Godot 4: current state

- **Version.** The latest stable release is **4.7.2** (2026-08-18). 4.8-beta1 came out 2026-10-15 ([archive](https://godotengine.org/download/archive/)). 4.8 updates Jolt to 5.6.0 and adds a button that sets up the Android SDK ([4.8b1](https://godotengine.org/article/dev-snapshot-godot-4-8-beta-1/)).
- **Web export** ([docs 4.7](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)):
  - Single-threaded is the default since 4.3. It needs no COOP/COEP headers, so it works on GitHub Pages.
  - Rendering is **WebGL2 only, through the Compatibility renderer**. Forward+ and Mobile do not run on the web, and there is **no WebGPU**.
  - **C# does not export to the web.** GDScript is required.
  - The docs say native builds beat web builds "by a significant margin". Safari has WebGL2 quirks.
  - A PWA option is available (offline play, home-screen icon).
- **Tested in this container:**
  - I downloaded the 4.7.2 editor (78 MB zip). I fetched only the web template (10 MB) out of the full 1.28 GB `export_templates.tpz` using HTTP range requests. 4.7 also adds a template downloader that fetches one platform at a time ([4.7](https://godotengine.org/releases/4.7/)).
  - I created a 2D RigidBody project as text files. `--headless --import` took 6.5 s and `--export-release Web` took 5 s.
  - The build boots in headless Chromium: "WebGL 2.0 ... Compatibility, single-threaded".
  - Another Godot web build that was already being served on port 8765 in this container reported "physics=Jolt Physics web=true", with a falling box tower.
- **Web download size (measured).** `godot.wasm` is **39.5 MB raw, 10.1 MB gzipped**, plus 280 KB of JS. The empty project's `.pck` is 2.4 KB.
- **Physics.**
  - **Jolt** is the default for new 3D projects since 4.6 ([4.6](https://godotengine.org/releases/4.6/)).
  - 2D still uses GodotPhysics2D. The Rapier add-on covers 2D and 3D ([repo](https://github.com/appsinacup/godot-rapier-physics)). On the web it needs GDExtension plus Thread Support, which means COOP/COEP headers. GitHub Pages can't send those, so it would need the `coi-serviceworker` hack ([discussion](https://github.com/orgs/community/discussions/13309)).
- **Android from CI** ([docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html)):
  - Needs JDK 17+, plus build-tools 35.0.1 and android-35. NDK r28b and CMake are only for Gradle builds.
  - The debug keystore is passed through the `GODOT_ANDROID_KEYSTORE_DEBUG_PATH/USER/PASSWORD` environment variables.
  - GitHub's ubuntu-24.04 runner already has the Android SDK and JDK 17 ([runner image](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)).
  - This container has JDK 21, and dl.google.com is reachable. There is no emulator, so APKs can't be tested here.
  - Ready-made CI: Docker image `barichello/godot-ci:4.7.2`, about 2.6 GB, updated 2026-08-18 ([repo](https://github.com/abarichello/godot-ci)); [firebelley/godot-export](https://github.com/firebelley/godot-export); [chickensoft setup-godot](https://github.com/chickensoft-games/setup-godot) with template caching.
  - APK size: the release template is 104.8 MB with all CPU architectures. arm64-only exports are reported at about 20–40 MB ([forum](https://forum.godotengine.org/t/game-size-too-big-compared-to-apk/39416)).
- **iOS** needs macOS with Xcode and an Apple Team ID ([docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html)). Confirmed.

## 2. Updating a sideloaded APK

- **Simplest: [Obtainium](https://f-droid.org/en/packages/dev.imranr.obtainium.fdroid/)** (1.6.10, July 2026). It watches GitHub Releases and offers one-tap updates. I didn't check whether it can read private repos, so a public releases repo is the safe choice.
- **Content patches without reinstalling:** `ProjectSettings.load_resource_pack()` can load a `.pck` downloaded to `user://`. Files at the same path, including GDScript, are replaced. Load it in an autoload's `_init`, the engine version must match, and patches should be signed ([docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_pcks.html)).
- **Firebase App Distribution** works but needs a Firebase project and a tester app. Too much setup for one tester.
- **Risk:** Google's developer verification for sideloaded apps took effect on 2026-10-01 in Brazil, Indonesia, Singapore and Thailand, with global rollout planned from 2027. There will be a hobbyist account type limited to a small number of devices ([Android Authority](https://androidauthority.com/android-sideloading-developer-verification-first-wave-rollout-3717921)).

## 3. Web alternatives (npm versions checked today)

| Stack | Rendering | Physics | Notes for an AI agent |
|---|---|---|---|
| **three 0.186.1** | `WebGPURenderer` with automatic WebGL2 fallback ([manual](https://threejs.org/manual/en/webgpurenderer)); PBR, shadows, post-processing, compute particles | none built in: Rapier 0.21 (2D/3D, 2026-09), jolt-physics 1.1.0; cannon-es is stale (2022) | Plain JS, huge example base. I already used it with you. |
| **Babylon.js 9.31.2** (2026-10-20) | PBR, clustered lights on WebGPU and WebGL2, node particles ([9.0](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0)) | **Havok** built in (`@babylonjs/havok` 1.3.14) | Everything in one package, so the fewest dependency choices to get right. |
| **PlayCanvas 2.23.3** | WebGL2 and WebGPU | ammo.js (older) | Can be used from code alone ([docs](https://developer.playcanvas.com/user-manual/engine/standalone/)), but its ecosystem expects the editor. |
| **2D: PixiJS 8.22 / Phaser 4.2.1** | sprites, filters, 2D lighting via shaders | **Box2D v3** (`box2d3-wasm` 5.2.0), planck 1.5.1, Rapier2D; Matter.js 0.20 (2024) is weaker at stacking | Smallest downloads. Fits Cut the Rope / Angry Birds-style games best. |
| **Bevy 0.20 + avian2d 0.8** | WebGPU and WebGL2 | Avian | Rust: slow compiles, large wasm. |

WebGPU status: on by default in Safari / iOS 26, and in Chrome 121+ on Android 12+ with Qualcomm or ARM GPUs. Firefox on Android is still in progress ([gpuweb](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)).

## 4. Unity and Unreal

- **Unity:** GameCI can build on Linux runners. The Personal license file (`.ulf`) has to be created once in Unity Hub on a desktop ([GameCI](https://game.ci/docs/github/activation)). Scenes and prefabs are YAML files that are hard to write correctly by hand. Unity 6 does run in mobile browsers ([Unity](https://unity.com/blog/engine-platform/web-runtime-updates-enhance-browser-experience)). **Possible, but awkward for an agent.**
- **Unreal:** It has no web export. Engine builds need roughly 300 GB to 2 TB of disk ([ludus](https://pkg.go.dev/github.com/jpvelasco/ludus@v0.9.1)). **Not workable here.**

## 5. GitHub Actions and Pages

- **`sasah/game3` is PRIVATE and has no Pages site.** GitHub Free gives Pages only for public repos; GitHub Pro adds it for private ones ([plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)). The options are making the repo public, a separate public "builds" repo, or Pro. Private repos get 2,000 free Actions minutes a month ([pricing](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/)).
- **Pages limits** ([docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)):
  - 1 GB per site, 100 GB/month soft bandwidth limit, 10-minute deploy timeout. Git itself rejects files over 100 MB.
  - No custom headers.
  - GitHub Pages gzips files on the fly, and `.wasm` is served as `application/wasm`. Godot's 10 MB gzipped wasm is fine there.
- **Per-branch preview links:**
  - Pages has none built in. [rossjrw/pr-preview-action](https://github.com/rossjrw/pr-preview-action) puts each PR in its own subfolder.
  - Cloudflare Pages makes a preview link for every branch automatically and supports custom headers, but caps each file at **25 MiB** ([limits](https://developers.cloudflare.com/pages/platform/limits)). Godot's 39.5 MB wasm doesn't fit.

## Recommendation for this user

| | (a) Three.js / Babylon / Pixi web | (b) Godot web export | (c) Godot APK |
|---|---|---|---|
| Phone workflow | **Best.** Open a link; 1–3 MB, loads in seconds | Open a link; about 10 MB on first load, then cached; PWA possible | Install the APK, update through Obtainium; Android only; verification risk |
| Graphics ceiling | **Highest on the web** (WebGPU, PBR, post-processing) | WebGL2 Compatibility only: solid in 2D, limited in 3D | Highest overall (Forward+ / Mobile renderers) |
| Physics | Excellent (Box2D v3, Rapier, Havok) | Jolt for 3D; 2D physics is weaker; Rapier add-on is awkward on the web | Same as (b); Rapier works without workarounds |
| Ease for AI agent | **Best**: plain code, quick screenshot tests | Good: text scenes/scripts, 5 s headless export, verified here | Same as (b), but no emulator to test on |
| CI effort | Minimal | Low (godot-ci + Pages) | Medium (keystore, Releases, Obtainium) |

**Verdict:**

1. Keep the open-a-link workflow.
2. The broad-audience physics hits are 2D, and 2D is also the cheapest way past the low-poly look: clean vector or hand-drawn-style art with shader lighting and particles. So **start with (a): a 2D renderer (Pixi or Three in orthographic mode) plus Box2D v3 or Rapier2D, hosted on Pages.** Use Babylon with Havok if the game turns out to be 3D.
3. **Choose (b) instead if an app-store or APK build is likely later.** A Godot project can produce both a web build and an APK, and the toolchain is proven to work in this container. Treat (c) as an add-on, not the main testing loop.
4. Before any of this, settle hosting for the private repo (public repo, separate builds repo, or Pro).
