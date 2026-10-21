# Visual styles for a phone physics game with no 3D artist

**The core idea:** the low-poly look comes from flat, untextured colours, not from simple shapes. Simple primitives (blocks, balls, planks, ropes) look polished when real material response, lighting and a camera lens do the work. Every style below is built on that.

## 1. Toy / tabletop miniature
- **Why it hides the lack of models:** real toys are simple shapes, so a glossy plastic cube with a reflection and a soft contact shadow reads as a real object.
- **Tech:**
  - three.js `MeshPhysicalMaterial`: clearcoat for plastic, sheen for felt, plus wood grain textures.
  - An HDRI environment for lighting.
  - Soft ambient occlusion with [N8AO](https://github.com/N8python/n8ao), which has a half-resolution / "performance" mode.
  - A mild tilt-shift or depth-of-field pass.
- **Mobile risk:** medium. HDRI lighting is cheap and AO at half resolution is fine. Depth of field costs a lot, so use it sparingly. Avoid `transmission` (real refraction), because it renders the whole scene again every frame ([three.js forum](https://discourse.threejs.org/t/meshphysicalmaterial-can-i-measure-how-much-more-expensive-it-is/60398)).
- **References:**
  - [Boom Blox](https://www.vgchartz.com/game/13684/boom-blox/reviews/1154/): textures "as minimal as you can get", and the Havok physics carried the game.
  - [Automatoys](https://apps.apple.com/cd/ipad/story/id1642723111): a mobile diorama ball-roller.
  - Tiny Glade, for the diorama mood only. It uses ray-traced global illumination ([forum](https://forum.quartertothree.com/t/tiny-glade-deserves-its-own-topic-now/162584?page=2)), which a phone browser cannot copy.

## 2. Clay / plasticine
- **Why:** clay is supposed to look handmade and imperfect, so rounded capsules and blobs look intentional.
- **Tech:**
  - Rounded geometry with a high-roughness surface and a noise normal map for fingerprints.
  - Fake subsurface glow through wrap lighting, or simply `MeshMatcapMaterial`, where the lighting is baked into a sphere texture so no lighting is computed at runtime ([docs](https://threejs.org/docs/pages/MeshMatcapMaterial.html), [matcap library](https://github.com/nlucis/matcaps)).
  - Squash and stretch on impact.
  - Metaballs / marching cubes for merging blobs.
- **Mobile risk:** low with matcaps. High with full-screen SDF raymarching.
- **References:**
  - [Claybook](https://www.gdcvault.com/play/1025316/Advanced-Graphics-Techniques-Tutorial-GPU): SDF clay plus a GPU fluid simulation, the "physics as art" benchmark, but console-class hardware.
  - [cjnwan/clay](https://github.com/cjnwan/clay): a three.js metaballs physics toy.

## 3. Paper-craft / cardboard (2.5D)
- **Why:** flat layered cut-outs with paper grain, torn alpha edges and soft drop shadows. You get texture and depth with almost no geometry.
- **Tech:** textured quads, a noise alpha mask for edges, a shadow-casting directional light, and cardboard and paper textures from CC0 libraries.
- **Mobile risk:** very low.
- **References:**
  - [Lumino City](https://store.steampowered.com/app/205020): built from real card models and photographed.
  - [Paper Trail (2024)](https://www.gematsu.com/2024/03/puzzle-adventure-game-paper-trail-launches-may-21-for-ps5-xbox-series-ps4-xbox-one-switch-pc-ios-and-android): folding as the mechanic; shipped on mobile.
- **Best fit:** puzzles in the Cut the Rope mould. Tearing, folding and crumpling become the "destruction".

## 4. Glass / neon / abstract
- **Why:** emissive edges plus bloom on dark backgrounds. Geometry is meant to be abstract.
- **Tech:** bloom, env-map refraction (a cheap fake) instead of `transmission`, and additive particles.
- **Mobile risk:** medium. Bloom is fine at reduced resolution. Real transmission has made mobile apps fragment-bound ([forum](https://discourse.threejs.org/t/issue-with-optimizing-my-gltf-file-fps-low/65775)).
- **References:** Monument Valley, Mini Metro (aesthetic only). This suits light and laser physics levels.

## 5. Cel / toon with outlines
- **Tech:** `MeshToonMaterial` with a gradient map, plus inverted-hull or depth/normal post-process outlines. Ready-made in Godot: [Complete Toon Shader](https://godotshaders.com/shader/complete-toon-shader/) and [free packs](https://phonix-cool.itch.io/shader-pack).
- **Mobile risk:** low.
- **Downside:** with simple meshes it can drift back toward the "cheap cartoon" look the user dislikes.

## Assets: what is *not* low-poly
- **[Poly Haven](https://polyhaven.com/faq):** CC0, with no sign-up.
  - HDRIs and textures of 8k or more.
  - Photo-scanned glTF props (barrels, balls, chairs, a marble bust).
  - Downscale textures to 1k and compress them for phones.
- **ambientCG:** CC0 PBR textures of wood, paper, plastic and fabric. Ideal for primitives.
- **Kenney, KayKit, Quaternius:** chunky low-poly, exactly the disliked look. Quaternius may have [moved from CC0 to its own licence](https://app.cinevva.com/es/guides/sketchfab-polyhaven-kenney) (a secondhand report; verify before using). Use these only as base meshes or skip them.

## Procedural and physics-visual tech
- **Destruction:** [three-pinata](https://github.com/dgreenheck/three-pinata) (MIT) does runtime Voronoi fracture with separate outer and inner materials and ships a Rapier example ([demo](https://three-pinata-demo.vercel.app/)). Meshes must be watertight, and primitives are. Wood or ceramic shards get a different inside texture, which looks very satisfying.
- **Materials:** noise-based wood, marble and water written as shaders, with no texture files needed.
- **Fluids:**
  - Screen-space fluid rendering ([NVIDIA slides](https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf)) or metaballs on top of particles.
  - 2D grid-based fluid [runs on touch devices](https://docsearch.algolia.com/mcp/docs/repo/paveldogreat/webgl-fluid-simulation).
  - GPU particle fluid (SPH) needs WebGPU compute ([Codrops](https://tympanus.net/codrops/?p=84103)).
- **Gaussian splats as a backdrop:** [Spark](https://github.com/sparkjsdev/spark) for three.js suggests about 1–2M splats on Android and 1–3M on iPhone ([perf guide](https://sparkjs.dev/docs/performance/)). [Spark 2.0](https://radiancefields.com/world-labs-previews-spark-2.0) adds level of detail and streaming.
  - Feasible as a static photographed backdrop. The user could scan their own kitchen table.
  - Splats ignore dynamic shadows, and sorting them competes with the physics for GPU time. Risk: medium-high. Treat it as a later experiment.

## Engine note
Godot's web export supports only the Compatibility renderer on WebGL2, with no WebGPU ([docs 4.5](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html)). Screen-space effects like SSAO are reportedly missing there ([bugnet](https://bugnet.io/blog/fix-godot-compatibility-renderer-looks-different)). For the "polished materials" look in a phone browser, three.js has the richer post-processing. A native Godot APK would use the Mobile renderer instead.

## Ranked top 3 for a broad-audience phone physics/destruction game
1. **Toy / tabletop with physical materials.** Lacquered wooden blocks, glossy plastic, felt table, HDRI light, soft AO, slight tilt-shift. It maps directly onto Angry Birds / gorodki / Boom Blox-style destruction, and Voronoi shards with a wood-grain interior make the payoff. Simple primitives are the content, so no artist is needed. Mobile is OK with a budget: half-resolution AO, no transmission, and the device pixel ratio capped at 1.5–2.
2. **Clay / plasticine.** Friendly for all ages, cheap to render with matcaps, and squash and stretch sells the physics. It extends naturally to blobby "liquid" mechanics with metaballs. Slightly harder than #1 to make destruction feel crisp.
3. **Paper / cardboard 2.5D.** The cheapest on phones and ideal for Cut the Rope-style puzzles, where tearing, folding, wind and light shadows are the mechanics. It is less suited to 3D rigid-body demolition.

A glass/neon look can be added on top of any of these as a themed level set for light or electricity physics, rather than used for the whole game.
