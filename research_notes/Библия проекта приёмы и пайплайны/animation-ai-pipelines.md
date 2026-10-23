# Low-budget character animation and AI asset pipelines for a 2.5D painted-background web game (state as of Oct 2026)

Scope note: the project is a hobby phone-browser game (three.js / WebGL2), backgrounds are isometric oil- or engraving-style paintings from an OpenAI gpt-image-2.5-family model, and characters are currently camera-facing 2D cards with front/back views, mirroring, a bob instead of a walk, and 4-frame idle sheets with crossfades. OpenAI Sora video was shut down 2026-09-24 (given in the brief, not re-verified). Prices below were read in Oct 2026 unless marked otherwise. Many 2026 prices only exist on vendor pages or resellers; I flag where sources conflict.

---

## 1. Traditional low-budget methods: what works over a realistic painting, and why

### Takeaway
The best-documented way to put moving characters into painted or pre-rendered isometric backgrounds is real-time 3D characters lit to match the backdrop (Pillars of Eternity, Disco Elysium). Over a realistic painting this beats flipbook or cut-out 2D, because the character turns in any direction, keeps its proportions and takes the scene's light, occlusion and shadow color, all for free. Cut-out or skeletal 2D (Spine, Rive, Live2D) looks good from one fixed viewing angle but scales badly to 8 walking directions. Flipbook sprites need many directions times many frames, which AI generation still cannot make consistent (see section 2).

### Cited Findings
**3D characters over 2D backgrounds (Pillars of Eternity, Obsidian):**
- Pillars backgrounds are rendered from Maya as 2D images in four passes: final, depth, normal and albedo. "These passes are combined together in Unity for per-pixel occlusion of 3D objects, and for real-time dynamic lighting." The illusion "comes together only when an orthographic camera is placed at the perfect angle." — [Obsidian, Update #79 Graphics and Rendering](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- Pillars characters are 3D skinned meshes with normal, specular and albedo maps plus a tint map. There are separate shaders for metal, for cloth (no shininess) and for emissive surfaces. — [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- Lighting match in Pillars:
  - Two directional lights: a key light matched to the sun (moonlight at night) and a fill light so the character's back is not black.
  - Deferred point lights light both the 2D background and the 3D characters.
  - An ambient system samples color from the 2D background as cheap global illumination.
  - A low-resolution map controls how much sunlight reaches the character, and the same map drives the dynamic shadow map to avoid double shadows.
  - The dynamic shadow is tinted to match the painted shadow color, "which often has a blue hue". Optional bloom applies to both background and characters.
  - Source: [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- Obsidian said the team spent months working out how to get the look of the Infinity Engine games with this approach. A later Deadfire update describes the shader match between 3D assets and backgrounds as close to, but not exactly, matching. — [GameBanshee: Obsidian on modernizing the isometric RPG](https://gamebanshee.com/kdh63); [Wikipedia: Pillars of Eternity](https://en.wikipedia.org/wiki/Pillars_of_Eternity)

**Disco Elysium (ZA/UM):**
- Backgrounds are hand-painted over renders and "use rendered heightmaps". Everything animated, pickable or time-limited (NPCs, vegetation, collectables, particles) "will be added to the game in realtime instead of being painted into the background". Plants are hand-painted on transparent backgrounds "since the camera angle is always the same". — [Disco Elysium devblog, "From Render to Paintover" (2019-01-23)](https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover)
- The artbook says the character pipeline changed 3–4 times. An early plan to hand-paint character normal maps was judged "not sustainable in the long run", and the team moved to sculpted models. — [Disco Elysium Artbook (Scribd copy)](https://www.scribd.com/document/734363544/Disco-Elysium-Artbook)
- The engine is Unity. — [Wikipedia: Disco Elysium](https://en.wikipedia.org/wiki/Disco_Elysium)
- Art director Rostov: "Hand painting the entire game was an obvious choice." — [MCV/Develop](https://mcvuk.com/business-news/we-knew-immediately-that-we-needed-to-make-a-game-with-a-striking-and-unique-look-to-accompany-the-writing-a-look-that-would-balance-the-mundane-with-the-unfamiliar-and-strange-the-art/)
- A secondary account describes a Photoshop → Maya (character animation) → Unity pipeline with orthographic cameras and custom shaders (lower authority). — [Foro3D, May 2026](https://foro3d.com/en/2026/mayo/el-lienzo-animado-asi-se-construyo-la-estetica-de-disco-elysium.html)

**Pre-rendered 3D-to-2D sprites (Dead Cells-style):**
- Dead Cells mixes 3D-modelled characters with 2D pixel output and normal-mapped sprites for lighting. Dan Moran's breakdown and the open "PixelArtPipeline" code show the approach. Note it is 2018 material. — [80.lv case study (2018-09-11)](https://80.lv/articles/case-study-dead-cells-character-art-pipeline/)
- A community summary of the method: model and animate in 3D, render at low resolution into a sprite sheet, then hand-correct the frames. — [Unity Discussions: 3D to 2D animations](https://discussions.unity.com/t/3d-to-2d-animations/764304)

**Flipbook direction and frame conventions:**
- The Infinity Engine (Baldur's Gate) BAM creature format supports 0, 1, 8 or 16 orientations. With mirroring, a 16-direction creature stores 9 cycles (16/2+1), and the engine generates the "east" side by mirroring. The fewest views needed for standing is a 16-state BAM, or 8 BAMs with engine mirroring. This is community documentation, not an official spec. — [Gibberlings3 forum](https://www.gibberlings3.net/forums/topic/32409-mdr-bam-files-how-to-add-dragon-animation-sequences/); [Beamdog forum: how are monsters created](https://forums.beamdog.com/discussion/87996/how-are-monsters-created-for-a-mod)
- Modern isometric asset packs ship 8-direction walks with very different frame counts: 3 walk frames per direction in some, 9 in others, and some are pre-rendered from 3D with a separate shadow layer. — [noherodev 8-dir sprite base](https://noherodev.itch.io/8dir-sprite-base); [OpenGameArt 8-directional sprite sets](https://opengameart.org/content/8-directional-sprite-sets)
- Common AI sprite-tool grid layouts are 4×2 for an 8-frame walk and 4×4 for a 16-frame loop. — [Sorceress guide (vendor)](https://sorceress.games/blog/how-to-make-a-sprite-sheet-in-2-minutes-with-ai-in-2026)

**Cut-out / skeletal 2D tools (prices and terms in 2026):**
- **Spine:**
  - Essential costs $69 on sale (list $99) and Professional $379 on sale (list $449). Both are perpetual.
  - Essential has no meshes or IK, and it "cannot save or export projects that use Professional features".
  - Enterprise (required at ≥$500k annual revenue, counting investment) costs $2,499 base plus $379/user per year.
  - The editor licence allows integrating the Spine Runtimes into your product.
  - Source: [Esoteric Software purchase page](https://esotericsoftware.com/spine-purchase)
- **Spine on three.js:** spine-ts has an official THREE.JS backend (spine-threejs). Users who integrate the runtimes must hold a Spine licence. — [spine-web-runtimes mirror](https://github.com/XfLoops/spine-web-runtimes); [npm spine-ts-threejs](https://npmjs.com/package/spine-ts-threejs)
- **Darkest Dungeon:** modders import the base game's hero skeleton files into Spine and edit them, which implies the game ships Spine skeletal animation. Red Hook has not confirmed this in an official source I found. — [Steam community thread](https://steamcommunity.com/app/262060/discussions/4/1727575977545379683)
- **Hollow Knight** is "traditional 2D frame-by-frame animation", each creature animated by hand. That is the expensive opposite end. — [PlayStation Store listing](https://www.playstation.com/en-ph/games/hollow-knight-voidheart-edition/); [Nintendo AU Team Cherry interview](https://www.nintendo.com.au/the-metamorphosis-of-hollow-knight-with-team-cherry-aussie-developer-interview)
- **Live2D:**
  - Individuals and small businesses with annual sales under ¥10 million are exempt from the SDK Publication License fee, except for "Expandable Applications" such as avatar systems. Larger publishers pay initial and annual fees plus a revenue share.
  - One help page says each work needs a contract, which conflicts with the exemption, so verify.
  - Source: [Live2D help center](https://help.live2d.com/en/other/other_14/)
  - Cubism PRO had 20% sales in March and July 2026. — [koubo.jp](https://koubo.jp/article/99033)
  - Cubism FREE reportedly caps at 30 parameters (third-party claim). — [Viverse](https://news.viverse.com/post/vtuber-model-pricing-2026)
- **Rive:**
  - Free tier, Cadet about $9/seat/month billed annually ($17 monthly, max 3 seats), Voyager $32/seat/month annually ($49 monthly). Sources conflict. — [frontdeskreview](https://frontdeskreview.com/software/design-tools/rive.md); [comparetiers](https://comparetiers.com/tools/rive)
  - The web runtime is the open rive-wasm JS/WASM library (MIT per a mirror; check the official LICENSE). — [rive-app/rive-wasm](https://github.com/rive-app/rive-wasm); [Gitee mirror](https://gitee.com/bukuta/rive-wasm)
- **DragonBones** is described as a free, openly documented alternative to Spine. I found no 2026 source on whether it is still developed, so treat it as legacy. — [abratabia skeletal animation guide](https://www.abratabia.com/game-animation/skeletal-animation.php)

### Inferences
- **Why 3D wins over a realistic painting:**
  - A realistic oil painting has continuous light, atmospheric perspective and soft contact shadows. A 3D character can take the painting's key-light direction, ambient color and tinted shadow (the Pillars recipe).
  - A flat card or cut-out puppet carries its own baked lighting, which fights the scene as soon as it walks under a tree or turns away from the sun.
  - 3D also removes the direction problem: one model covers all 8 or 16 headings and turning on the spot.
- **Why cut-out/skeletal 2D is weak here:**
  - Spine, Rive and Live2D excel at one fixed view: side-scrollers, Darkest Dungeon-style lineups, VTuber front views.
  - For isometric walking in 8 directions you need a separate rig and art per direction, or at least 5 with mirroring. That multiplies the art the non-artist owner must generate and keep consistent.
  - Spine's editor is a GUI tool that an AI coding agent cannot drive directly, though its JSON export format could in principle be generated by script (my inference, not verified).
- **Flipbook budget:** a classic isometric 8-direction walk at 8 frames is 64 unique frames per character, or about 40 with mirroring (5 drawn directions × 8). Mirroring breaks asymmetric costumes such as a pipe in one hand or a sash.
- **"2.5D cards" (the current approach)** are fine for idles, for small or distant figures, and for ambient creatures. They are weakest for long walks across the screen and for turning.
- **Pre-rendering 3D to sprites (Dead Cells)** only makes sense if the runtime cannot afford skinned meshes. Three.js on a 2026 phone can draw a handful of low-poly skinned characters, so rendering 3D directly is simpler than baking 8 directions × N frames. Baking is still a valid fallback for crowds or very weak phones.

### Gaps
- I found no authoritative per-animation frame counts for Baldur's Gate walk cycles, nor official numbers for Pillars or Disco animation sets. Pillars and Disco use real-time 3D, so frame counts do not apply to them.
- Fallout's 6 hex facings and Diablo II's 8 facings are from general knowledge and were not verified in this pass.
- Red Hook's use of Spine is inferred from modding forums only.
- DragonBones' 2026 maintenance status is unverified.
- I did not verify Godot Skeleton2D details; it is irrelevant for a three.js runtime anyway.

---

## 2. AI pipelines 2024–2026: sprite sheets, video-to-sprite, pose-driven, AI mocap, image-to-3D with auto-rig and animation; prices, terms, formats, three.js integration

### Takeaway
For this project the cheapest route to graceful motion is image-to-3D plus auto-rig plus preset animations, with each character costing about $1–2 in API credits.
- Meshy is cheap, but its rigging is humanoid-only.
- Tripo is about the same price and also rigs quadrupeds, birds, serpentine and aquatic creatures, which covers the cat, pig, frog and birds.
- Image models such as gpt-image-2.5 are good at consistent multi-cell sheets (idles), but they reliably fail walk cycles.
- Image-to-video (Kling, Veo, Runway, Wan) with frame extraction can give walk or gesture flipbooks for one direction at roughly $0.05–0.12 per second. It needs background removal, loop fixing and per-direction re-runs.

### Cited Findings
**Image models for sprite sheets (gpt-image-2.5 family):**
- GPT Image 2.5 handles grids and multi-panel layouts well, repeating one character across cells with consistent proportions and palette. Walk cycles are hard: stride length and costume details drift and the frames do not loop.
  - The cause given is that the model lacks "a working sense of weight and contact over time"; it "does not replace an animator".
  - Advice: generate the layout at 1K to check the grid, regenerate at 2K or 4K, and generate sequences against a fixed reference rather than chaining frames.
  - Source: [Vidcella, "GPT Image 2.5 Is Good at Sprite Sheets and Bad at Walk Cycles" (2026)](https://vidcella.ai/posts/gpt-image-2-5-sprite-sheets)
- A developer comparison of 7 approaches found:
  - API output often comes back on solid white or grey instead of transparent, so an alpha cleanup step is needed.
  - Grid cells drift by 1–2 px, so slice using measured boundaries.
  - Per-frame generation showed left/right limb swaps in about 40% of frames.
  - Source: [Dre Dyson, sprite sheets with gpt-image-2](https://dredyson.com/i-tested-every-solution-for-developing-sprite-sheets-with-gpt-image-2-heres-what-actually-works-a-complete-comparative-analysis-of-7-approaches-prompting-strategies-and-workarounds-that-actually-produce-consistent-frame-by-frame-results/)
- Single-reference 4×4 sheets are a common workflow. — [Indie Hackers: GPT Image 2.5 full sprite sheet from one reference](https://www.indiehackers.com/post/gpt-image-2-5-a-full-sprite-sheet-from-one-reference-110562d19f)
- For consistency across many generations, guides recommend a small "character bible" (front, full body, three-quarter, expressions), with each reference given a single job. — [Atlas Cloud, GPT Image 2.5 character consistency](https://www.atlascloud.ai/blog/tips/gpt-image-2.5-childrens-book)
- Chong-U reported that still-image sheets "wouldn't get it right" for walk cycles. Generating a video (with Sora 2, now shut down) and extracting frames worked better. — [Chong-U on X](https://x.com/chongdashu/status/2032041412590551293)
- Critics point out that slicing code cannot fix design drift between independently generated frames. — [Gamelabs Studio](https://gamelabstudio.co/blog/why-ai-cant-make-game-ready-spritesheets)
- Vendor sprite tools take one transparent image and apply a walk preset, text, keyframes or a reference video, then export an atlas. These are vendor claims. — [Ludo.ai walk-cycle docs](https://ludo.ai/docs/sprite-generator/walk-cycle); [Sorceress](https://sorceress.games/blog/how-to-make-a-sprite-sheet-in-2-minutes-with-ai-in-2026)
- Tripo's API resells image models including `chat_image_2.5_flare` and `chat_image_2.5_sunburst` at 10 credits at ≤1K and 15 at 4K, rising to 30–50 at "max" quality. — [Tripo developer pricing](https://developers.tripo3d.ai/en/pricing)
- Meshy's API lists GPT Image models at 9 credits (text-to-image) and 12 (image-to-image). — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)

**Video-to-sprite (image-to-video, frame extraction):**
- Video extraction workflow notes: the extraction fps does not need to match the source; lower fps suits snappy actions. Background removal is "a recurring headache" because hair and clothing get cut. Frames must share size, spacing and baseline. — [NeatForge guide](https://neatforge.com/guides/how-to-create-sprite-sheets-from-video-for-game-devs/); [aispritesheet blog](https://www.aispritesheet.com/blog/how-to-turn-one-character-image-into-a-walking-animation)
- **Kling** prices (third-party; check kling.ai):
  - Kling 3.0 about $0.075/s, billed for a minimum of 3 s and a maximum of 15 s (March 2026 snapshot). — [EvoLink](https://evolink.ai/blog/kling-3-api-pricing-integration-guide)
  - A reseller lists Kling 3.0 from $0.0756/s (Pro $0.1008/s, 4K $0.378/s) and Kling 4.0 from $0.1134/s (Pro $0.1701/s). It says Kling 4.0 launched 2026-10-15. — [Unifically](https://unifically.com/ja/models/kling)
  - An aggregator range is $0.08–0.17/s. — [Costbench](https://costbench.com/software/ai-media-apis/kling-api/)
- **Veo 3.1** on the Gemini API (aggregator, read 2026-09-11):
  - Standard $0.40/s at 720p/1080p and $0.60/s at 4K.
  - Fast $0.10, $0.12 and $0.30/s at those resolutions.
  - Lite $0.05/s at 720p and $0.08/s at 1080p. No free tier.
  - Source: [benchlm.ai](https://benchlm.ai/md/media-pricing/veo.md)
  - Users report billing that does not match the UI for Lite. — [Google AI dev forum](https://discuss.ai.google.dev/t/misleading-ui-for-veo-3-1/147250)
- **Runway:** Gen-4 Turbo costs 5 credits/s at $0.01 per API credit, about $0.05/s or $0.25 per 5 s clip. Gen-4.5 costs about 12 credits/s ($0.12/s). The API and web app keep separate credit balances. Third-party figures. — [Creatify, Runway pricing 2026](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay)
- **Luma:** Ray3.2 is about $0.24/s at 1080p SDR per one tracker; another tracker lists other rates; some Ray3.2 access is quote-only. Sources conflict. — [WaveSpeed: Luma pricing](https://wavespeed.ai/blog/cost-and-billing/luma-ai-pricing/); [Perkstack tracker](https://perkstack.co/blog/cheapest-luma-ray-2-api)
- **Wan (open weights):**
  - Wan 2.1 and 2.2 are open weights under Apache 2.0. Wan 2.5 was API-only at launch. Wan 2.6's open status is contradictory. — [MindStudio, Wan 2.5](https://www.mindstudio.ai/blog/what-is-wan-2-5-image); [Vivideo](https://vivideo.ai/it/modelli-ai/wan-video)
  - **Wan2.2-Animate-14B** (Apache 2.0, released 2025-09-19) takes one character image plus one driving video. It either animates the character with the video's body motion and facial expression, or swaps the character into the video. Output is 480p or 720p, multi-GPU is recommended for 720p, and replacement mode includes a relighting LoRA. — [Comfy.org workflow](https://comfy.org/workflows/use-cases/ai-character-replacement/); [Unifically Wan 2.2 Animate](https://unifically.com/blogs/wan-2.2-animate)

**AI motion capture from video (to drive 3D rigs):**
- Rokoko Vision is reportedly free for single-camera capture with FBX export; dual-camera is about $240/year. DeepMotion has a free tier of about 60 s of animation per period and paid plans up to about $83/month. Roundup figures. — [fast.io roundup 2026](https://fast.io/resources/best-ai-animation-tools-2026/)
- Move.ai tiers per an aggregator: Free, Starter $18/month, Standard $46, Plus $225, Advanced $490. Another site says the pricing is not disclosed. — [aigregator](https://aigregator.com/tools/move-ai/llms.txt); [NeuronFeed](https://neuronfeed.com/compare/move-ai-vs-deepmotion)
- Both Meshy and Tripo now offer text-to-motion:
  - Meshy charges 10 credits ("prime") or 3 ("swift") per request and rejects quadruped rigs. — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing); [Meshy Animation API](https://docs.meshy.ai/en/api/animation)
  - Tripo added text-prompt animation. — [Spatial Insiders](https://spatialinsiders.com/stories/tripo-rigging-animation-text-to-motion)

**Image-to-3D with auto-rig and animation (API, 2026):**
- **Meshy API costs** (credits per request; [Meshy API pricing](https://docs.meshy.ai/en/api/pricing)):
  - Image-to-3D with meshy-7.1 or meshy-6: 20 credits mesh-only, 30 with 2K/4K texture, 35 with 8K.
  - meshy-6-lite and the t2 models: 5 credits mesh-only, 15 textured.
  - Multi-image-to-3D costs the same as image-to-3D.
  - Rigging 5 credits; animation 3 credits per action, up to 10 actions per request.
  - Remesh 5, UV unwrap 5, Convert 1, Resize 1.
  - `lowpoly` retires 2026-10-30.
- **Meshy plans** ([meshy.ai/pricing](https://www.meshy.ai/pricing)):
  - Free: 100 credits/month, CC BY 4.0, no API.
  - Pro: $20/month ($10 first month) for 1,000 credits, API access, private licence, 10 concurrent tasks.
  - Premium: $40 for 3,000 credits. Ultra: $100 for 8,000. Annual billing gives 20% off.
  - Paid plans have "Over 500" animations ("600+ motions"); Free has 20.
  - Download formats: .fbx, .obj, .usdz, .glb, .stl, .blend.
- **Meshy rigging limits** ([Rigging docs](https://docs.meshy.ai/en/api/rigging-and-animation)):
  - Works well only with standard humanoid (bipedal) characters with a clear limb structure. Untextured and non-humanoid assets are not suitable.
  - Input is GLB with the face toward +Z. Generated-model inputs are limited to ≤320k faces (remesh to ≤300k).
  - Output is rigged FBX and GLB, with walking and running included free.
  - The API returns 402 on the free plan.
- **Meshy Animation API** ([Animation docs](https://docs.meshy.ai/en/api/animation)):
  - 1–10 `action_ids` merge into one GLB/FBX/USDZ with one clip per action. Categories: WalkAndRun, BodyMovements, DailyActions, Fighting, Dancing.
  - `change_fps` accepts 24, 25, 30 or 60.
  - Library previews are under a `biped` path, and text-to-motion requires a biped.
- **Meshy licensing:** the free plan is CC BY 4.0 (commercial use allowed with credit to Meshy). Paid plans give private ownership, provided the inputs do not infringe copyright. — [Meshy help: commercial use](https://intercom.help/meshy/en/articles/16102098-can-i-use-meshy-assets-commercially)
- **Tripo API** ([Tripo developer pricing](https://developers.tripo3d.ai/en/pricing)):
  - 1 credit = $0.01. Top-ups start at $1.
  - Image-to-3D or multiview-to-3D: 20 credits untextured, 30 with standard texture ($0.30).
  - Add-ons: HD texture +10, quad mesh +5, smart low-poly +10.
  - Rig check free, auto rig 25 credits ($0.25), animation retarget 10 credits ($0.10) per animation. Retopology 10–40 credits.
  - The $250 bundle's "≈250 models" wording contradicts the table.
- **Tripo rig types** ([Tripo rig docs](https://developers.tripo3d.ai/en/models/rig)):
  - Biped (default), quadruped, hexapod, octopod, avian, serpentine, aquatic.
  - Skeleton specs: Tripo or Mixamo; rig model v3.0 adds ActorCore, Unity, Unreal and VRM (biped only).
  - Rig model versions: v1.0 (biped, 90+ presets), v2.5-20260210 (non-humanoid creatures), v3.0-20260909 (recommended for humanoids, must be set explicitly).
  - Input GLB/FBX/OBJ/STL; output rigged GLB (default) or FBX. About 30 s per task; 10 parallel animation tasks.
  - The developer home page claims 100+ preset motions and batches of up to 5. — [Tripo Developers](https://developers.tripo3d.ai/en)
- **Tripo licensing:** paid users have full commercial rights. Free-tier terms conflict: some sources say CC BY 4.0 public models, while Tripo's help page says Tripo retains rights to free-user outputs (ToS §5.2.1). — [Tripo help: commercial use](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially); [aifreeapi summary](https://www.aifreeapi.com/en/posts/tripo-3d)
- **Hyper3D Rodin** is pricier: about $0.80/request via a reseller, or $1.50/credit direct; the Business plan with API is about $120/month ($96 annual). Sources conflict. — [EmpirioLabs](https://empiriolabs.ai/models/hyper3d-gen2); [Costbench Rodin](https://costbench.com/software/ai-3d-generation/rodin-hyper3d/)
- **Open-weight image-to-3D:**
  - **TRELLIS.2-4B** (Microsoft, Dec 2025): MIT licence, PBR output, about 3 s at 512³ on an H100. Needs a Linux NVIDIA GPU with 16–24 GB+ (sources differ). Meshes can have small holes. No rigging. — [HF model card](https://huggingface.co/microsoft/TRELLIS.2-4B); [ComfyUI wiki](https://comfyui-wiki.com/en/news/2025-12-18-microsoft-trellis2-3d-generation)
  - **Hunyuan3D 2.0 and 2.1:** the Tencent community licence explicitly excludes the EU, UK and South Korea. 2.1 (June 2025) is open with PBR. — [Hunyuan3D-2 LICENSE](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE); [hunted.space](https://hunted.space/product/hunyuan3d-2-1)
  - **Hunyuan3D 3.0** was unveiled through Tencent Cloud API (1536³) with no confirmed open weights (low-authority source). — [ToolNavs](https://toolnavs.com/ko/article/275-hunyuan3d-30-is-coming-ai-triple-accuracy-and-15363-resolution-3d-dit-reconstruc)
  - **Stable Fast 3D and SPAR3D** fall under the Stability AI Community License: free under $1M annual revenue, enterprise licence above that. — [Stability license](https://stability.ai/license); [HF stable-fast-3d](https://huggingface.co/stabilityai/stable-fast-3d); [The Decoder on SPAR3D](https://the-decoder.com/?p=20394)
- **Free rigging and animation libraries:**
  - **Mixamo** still works in 2026 and is free with an Adobe account, but is in maintenance mode (a multi-day outage in June 2025). It is royalty-free for games per Adobe's 2021 FAQ, humanoid only, and exports FBX/DAE (convert to GLB). — [Cinevva guide (competitor-authored)](https://app.cinevva.com/guides/free-character-animations-rigging)
  - **AccuRIG 2.0** (Reallusion, July 2025) is free, with in-app access to 4,500+ ActorCore motions (ActorCore motions are mostly paid). It exports FBX, USD or iAvatar, not GLB. — [80.lv](https://80.lv/articles/reallusion-launches-free-rigging-tool-accurig-2-0); [Reallusion forum](https://discussions.reallusion.com/t/new-release-accurig-2-debuts-direct-in-app-access-to-4-500-actorcore-motions/14516); [CG Channel](https://www.cgchannel.com/?p=168596)
  - Quaternius' Universal Animation Library (CC0) is suggested as a free fallback. — [Cinevva guide](https://app.cinevva.com/guides/free-character-animations-rigging)

**three.js integration (official docs):**
- GLB loads through `GLTFLoader`. Clips play via `AnimationMixer` and `AnimationAction`. `crossFadeTo`/`fadeIn` blend idle, walk and gesture; `timeScale` sets playback speed. — [three.js AnimationMixer](https://threejs.org/docs/#api/en/animation/AnimationMixer); [AnimationAction](https://threejs.org/docs/#api/en/animation/AnimationAction); [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- Several copies of one skinned character need `SkeletonUtils.clone`, because a plain `.clone()` does not rebind the skeleton. — [three.js SkeletonUtils](https://threejs.org/docs/#examples/en/utils/SkeletonUtils)
- `MeshToonMaterial` with a `gradientMap` gives banded, painterly-friendly shading. — [three.js MeshToonMaterial](https://threejs.org/docs/#api/en/materials/MeshToonMaterial)
- The Kuwahara filter is the classic real-time "oil paint" post effect: it smooths detail and keeps edges. I found only an engine-marketplace listing in this pass. — [Fab listing](https://www.fab.com/listings/64ff24ae-769e-4345-ade8-370e06bcac27?lang=de)

### Inferences
- **Cost per character with 10 clips:**
  - Meshy: 30 (image-to-3D, textured) + 5 (rig) + 30 (10 actions) = 65 credits, about $1.30 at Pro's $0.02/credit.
  - Tripo: 30 + 25 + 100 = 155 credits, $1.55.
  - About 15 characters therefore cost $20–25 per platform, plus retries.
  - Practically, one month of Meshy Pro ($20) or a $50 Tripo top-up covers the whole cast. A free plan does not, because the Meshy API needs a paid plan and free-tier licensing is murky.
- **Creatures need Tripo:** Meshy rigging is humanoid-only, while Tripo can rig a cat, pig, frog (quadruped) and birds (avian). It is unverified whether Tripo has quadruped retarget presets such as a cat washing or a frog jumping. Plan for 2D cards or flipbooks for those micro-animations, or simple procedural animation (squash/jump arcs, wing flaps) in code.
- **Multi-image input:** the existing front and back sprites can go into multi-image-to-3D (Meshy and Tripo both support it), which should improve the reconstruction of the back.
- **Texture style:** generated textures will look like the source sprite but lit flatly. To fit the Kuindzhi oil look, use an unlit or toon-ramp material, multiply in the scene's ambient color sampled from the painting (the Pillars recipe), and optionally run a light screen-space Kuwahara or paper-grain pass on the character layer only.
- **Video-to-sprite fits small gestures:** a cat washing, a pipe smoke puff, a frog jump, a bird take-off are all cases where one camera direction suffices. Wan2.2-Animate (open, Apache 2.0) can drive a painted character from the owner's own phone video of a gesture, but it needs a rented GPU. Kling, Veo Fast/Lite or Runway Turbo at $0.05–0.12/s are cheapest per clip; a 5 s clip costs about $0.25–0.60.
- **Mocap is optional:** Rokoko Vision (free) or DeepMotion (free tier) can turn the owner's phone video into FBX for a specific gesture such as smoking a pipe or sitting on a bench. Retarget it onto the Meshy or Tripo rig if the presets lack a needed action.

### Gaps
- **Hailuo/MiniMax:** no API pricing found.
- **Plask:** no 2026 status found.
- **Wan 2.5/2.6:** open-weight status unresolved.
- **Hunyuan3D 2.5/3.0:** licence text not found.
- **Kling:** no official page fetched; all figures are third-party.
- **First/last-frame (looping) support:** not verified on each video API, though Kling and Veo are widely reported to support start/end frames.
- **Preset coverage:** I could not confirm whether Meshy's or Tripo's preset lists include "smoke pipe", "sit on bench" or "talk with gestures". The Meshy docs name only categories, so browse the library before buying.
- **Tripo free-tier and ToS:** the ToS text was not retrieved.
- **Animal clips:** I found no source on quadruped animation quality.
- **ControlNet/OpenPose and animate-anyone-style models:** no specific 2026 source found beyond Wan2.2-Animate.

---

## 3. Depth estimation and related tools for painted scenes (what runs in-browser or on CPU)

### Takeaway
Depth Anything V2-Small and V3 Small/Base (Apache 2.0) are the right tools to make depth or occlusion maps for generated paintings. Run them offline in Python or in the browser via Transformers.js; the larger DA3 models are non-commercial. For cutouts, BiRefNet (MIT, ONNX/Transformers.js) is the clean commercial choice; RMBG-2.0 is non-commercial without a Bria contract.

### Cited Findings
- **Depth Anything 3** (ByteDance Seed, released 2025-11-14) has a per-model licence split ([GitHub](https://github.com/ByteDance-Seed/Depth-Anything-3)):
  - Apache 2.0: DA3-SMALL (0.08B), DA3-BASE (0.12B), DA3METRIC-LARGE (0.35B, monocular metric depth) and DA3MONO-LARGE (0.35B).
  - CC BY-NC 4.0: DA3-LARGE, GIANT (1.15B) and NESTED (1.40B).
  - The family supports multi-view depth, camera pose and Gaussian estimation. Prefer the "-1.1" checkpoints.
- Depth Anything V2 Small runs in the browser through Transformers.js (`onnx-community/depth-anything-v2-small`) in Xenova's real-time demo. — [HF Space: webgpu-realtime-depth-estimation](https://huggingface.co/spaces/Xenova/webgpu-realtime-depth-estimation/blob/main/index.html)
- Distill-Any-Depth Base (97.5M parameters) has a Transformers.js ONNX build: fp16 for WebGPU, q8 for WASM/CPU, q4f16 for low memory. — [HF: distill-any-depth-base-onnx](https://huggingface.co/Ko033/distill-any-depth-base-onnx)
- Transformers.js runs models through ONNX Runtime in the browser. — [Transformers.js docs](https://huggingface.co/docs/transformers.js/v3.8.1/index)
- Apple Depth Pro uses an Apple licence (tagged Apple-ASCL, later "AMLR"). Verify the terms before commercial use. — [HF DepthPro commit](https://huggingface.co/kp-forks/DepthPro/commit/ccd1350a774eb2248bcdfb3be430e38f1d3087ef)
- BiRefNet is MIT with a Transformers.js ONNX build. RMBG-2.0 (Bria, built on BiRefNet) is non-commercial, and commercial use needs a Bria agreement. — [onnx-community/BiRefNet_512x512-ONNX](https://huggingface.co/onnx-community/BiRefNet_512x512-ONNX/blob/b0b30aff33d009f6bcd7dacdc3cdcf2f8f42175b/README.md); [Bria RMBG-2.0 announcement](https://bria.ai/introducing-the-rmbg-v2-0-model-the-next-generation-in-background-removal-from-images); [RMBG-2.0 HF discussion](https://huggingface.co/briaai/RMBG-2.0/discussions/51)
- The Pillars approach used a depth pass for "per-pixel occlusion of 3D objects" over a 2D background. — [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- Disco Elysium backgrounds "use rendered heightmaps". — [ZA/UM devblog](https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover)

### Inferences
- **Depth replaces the 3D render passes we lack.** A generated painting has no depth pass. Estimating one with DA3-Base/Small or DA-V2-Small, then hand-correcting it into coarse bands or simple occluder planes, recreates Pillars-style occlusion: a character walks behind a fence or a hut corner.
- **Use depth coarsely.** For a fixed isometric camera, depth is best used as a few manually cut foreground occluder layers. Inpaint behind them with gpt-image (edit/inpaint) to build clean background plates, rather than doing per-pixel depth testing. Raw monocular depth on a stylised painting is noisy, especially for engraving hatching.
- **Run all of this at build time.** Do it offline in the agent's Python environment and ship only PNG/WebP layers. Running depth or matting at runtime on a phone browser wastes battery and download size.
- **Background removal for video frames:** BiRefNet, run offline on CPU or GPU, is the default for frames extracted from image-to-video. Generating on a flat chroma background makes the matte easier.

### Gaps
- Licences for MoGe-2 and Marigold were not verified in this pass. MoGe is believed MIT and Marigold Apache, from general knowledge; confirm on GitHub.
- I found no measurements of WebGPU depth or matting speed on phones.
- Upscalers (Real-ESRGAN etc.) were not researched in this pass.

---

## 4. Practical consistency tricks (palette, lighting, outlines, shadows, foot sliding, turning)

### Takeaway
Most of the "it belongs in the painting" feeling comes from matching light and shadow, not from animation fidelity. Pillars of Eternity documents the cheapest effective set of tricks:
- key light matched to the painted sun, plus a fill light
- ambient color sampled from the background
- shadows tinted to the painted shadow hue
- shared post effects over both background and characters

For motion, ground contact matters most: contact shadow, playback speed matched to stride so feet do not slide, and short crossfades for turning.

### Cited Findings
- Key light matched to the sun, fill light so backs are not black, ambient color sampled from the 2D background, dynamic shadow tinted to the painted shadow color (often blue), a sunlight-occlusion map shared between character lighting and shadows to avoid double shadows, and bloom applied to both layers. — [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- An orthographic camera at the exact painted angle is required for the illusion. — [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-)
- Disco Elysium uses a fixed camera angle, so foliage and props are hand-painted on transparent layers and composited in real time. — [ZA/UM devblog](https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover)
- Dead Cells-style lighting renders a normal map alongside each sprite frame so 2D sprites react to scene lights; the shader also applies to hand-drawn sprites. — [80.lv](https://80.lv/articles/case-study-dead-cells-character-art-pipeline/)
- For AI sheets: start from a clean, readable base pose, keep a fixed grid, cell size and baseline, and test the loop in-engine. Video-extracted frames need alignment to a common baseline. — [aispritesheet blog](https://www.aispritesheet.com/blog/how-to-turn-one-character-image-into-a-walking-animation); [NeatForge](https://neatforge.com/guides/how-to-create-sprite-sheets-from-video-for-game-devs/)
- `AnimationAction.timeScale` and `crossFadeTo` in three.js allow speed-matching and blended transitions. — [three.js AnimationAction](https://threejs.org/docs/#api/en/animation/AnimationAction)
- Meshy can resample animations to 24, 25, 30 or 60 fps (`change_fps`). — [Meshy Animation API](https://docs.meshy.ai/en/api/animation)

### Inferences
These are practical rules derived from the findings above plus standard game-animation practice; they are not individually sourced.
- **Palette locking:** extract a 12–24 colour palette from each painting and apply it to characters.
  - 3D characters: as a LUT or gradient map in the fragment shader, or by posterising toward the palette.
  - 2D cards: palette-transfer at build time in Python.
  - Engraving scenes: map luminance to hatching or dither textures for both layers.
- **Lighting direction:** store a per-scene "sun vector" and "shadow tint" in the scene JSON, and use them for the 3D key light, card rim highlights (one-sided rim on the sun side) and the shadow blob color. The painting decides, the character follows.
- **Ambient match:** sample the background under the character's feet (a mip-blurred painting texture) every frame and multiply it into the character color, as Pillars did. This also darkens characters automatically under trees.
- **Outlines and rim:** a thin dark, slightly warm outline (inverted-hull or screen-space) helps engraving-style scenes. For oil scenes prefer no outline, a soft rim from the sky colour and slight edge blur, so the figure does not look pasted on.
- **Contact shadows:** use an elliptical soft blob, tinted to the scene shadow colour and multiply-blended, plus an optional depth-aware short cast shadow. This matters more than anything else for "standing on the ground".
- **Foot sliding:**
  - For 3D clips, measure the root displacement per cycle (stride length L over cycle duration T). Set `timeScale = currentSpeed / (L/T)`, or set movement speed to L/T. Keep path speed constant, and blend idle to walk over 0.2–0.3 s.
  - For 2D flipbooks, tie frame advance to distance travelled, not to time.
- **Turning on the spot:**
  - 3D: rotate toward the target heading at a capped angular speed (about 360–540°/s) before or while starting the walk. Many preset libraries also include turn clips.
  - Cards: switch facing via a quick 2–3 frame squash or crossfade, and never mirror asymmetric props.
- **Isometric speed:** screen-space speed in an isometric projection differs along the diagonal and vertical axes. Compute motion in ground-plane world units and project it, so the walk speed stays matched in every direction.
- **Parallax and occluders:** cut foreground elements (tree trunks, fence posts, hut corners) from the painting into separate layers with depth order. Characters walking behind them sell the 2.5D illusion far more than extra animation frames.

### Gaps
- I found no published numbers for "ideal" crossfade times or turn speeds for this genre; the values above are rules of thumb.
- I did not find a three.js-specific painterly character shader write-up from a reliable source in this pass.

---

## 5. Best "graceful for least effort" approach for an AI-agent developer, and the recommended hybrid

### Takeaway
The recommended hybrid has four parts:
- **People:** 3D via Meshy or Tripo (image-to-3D, auto-rig, preset clips, GLB into three.js), with a toon or unlit material, painting-sampled ambient light and tinted contact shadows, as in Pillars.
- **Animals:** Tripo-rigged 3D (quadruped or avian) or 2D cards.
- **Static or seated NPC micro-idles:** keep the existing 2D card plus 4-frame sheets (pipe smoking, cat washing), which already work.
- **One-direction ambient gestures:** image-to-video to flipbook (frog jump, bird take-off) where 3D is overkill.

This minimises art the owner must produce, and everything is scriptable by an AI agent through REST APIs. The costs are tens of dollars, not hundreds.

### Cited Findings
- The real-time 3D-over-painting approach is proven in shipped isometric games (Pillars, Disco Elysium), with documented lighting-match techniques. — [Obsidian Update #79](https://eternity.obsidian.net/news/update--79-graphics-and-rendering-); [ZA/UM devblog](https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover)
- Meshy gives image-to-3D for 30 credits, rig for 5, animation for 3 per action, with a 500–600+ motion library on paid plans. Pro is $20/month for 1,000 credits with API access and a private licence. Rigging is humanoid-only and outputs GLB/FBX. — [Meshy API pricing](https://docs.meshy.ai/en/api/pricing); [Meshy plans](https://www.meshy.ai/pricing); [Meshy rigging docs](https://docs.meshy.ai/en/api/rigging-and-animation)
- Tripo gives image-to-3D for $0.30, auto-rig for $0.25 and retarget for $0.10 per animation. It rigs quadruped, avian and other creature types and outputs GLB/FBX. — [Tripo pricing](https://developers.tripo3d.ai/en/pricing); [Tripo rig docs](https://developers.tripo3d.ai/en/models/rig)
- Image models are good at sheets but bad at walk cycles; video-based extraction works better for walks but needs cleanup. — [Vidcella](https://vidcella.ai/posts/gpt-image-2-5-sprite-sheets); [Chong-U on X](https://x.com/chongdashu/status/2032041412590551293); [NeatForge](https://neatforge.com/guides/how-to-create-sprite-sheets-from-video-for-game-devs/)
- Spine costs $69–379 for a GUI editor, and Professional is needed for meshes and IK. — [Esoteric Software](https://esotericsoftware.com/spine-purchase)

### Inferences
**Ranking for this project (grace per unit of effort for a non-artist plus an AI agent):**
1. **3D characters from Meshy or Tripo with preset clips, over the painting.** Walking in any direction, turning, sitting and talking-gesture clips come for free. The risks are an "AI 3D" texture look and hands or face mush at close range. Mitigate by keeping characters small on screen (an isometric camera helps), using toon or unlit shading, the palette LUT and a soft rim. Budget about $1.50 per character with 10 clips, plus retries.
2. **Existing 2D cards with AI idle sheets** for stationary NPCs and close-ups (a man smoking, a cat washing). They are cheap, style-perfect because they come from the same image model as the backgrounds, and already working.
3. **Image-to-video to flipbook** for single-direction ambient creature moments (frog jump into water, bird flutter, smoke puff). Use Kling 3.0/4.0, Veo 3.1 Fast/Lite or Runway Gen-4 Turbo at about $0.05–0.12/s, then BiRefNet matting and a manual loop point. Avoid it for multi-direction walks: 8 directions × separate generations will drift.
4. **Spine or Rive cut-out puppets:** only worth it for one-view close-up dialogue portraits, such as a talking-head inset with blinking and mouth shapes. Rive's web runtime is free (MIT), and its editor plans start at about $9/seat/month.
5. **Flipbook 8-direction walks from image models:** not recommended. About 40–64 consistent frames per character is beyond the current reliability of gpt-image-2.5.

**Concrete pipeline for the agent:**
1. Generate a clean T- or A-pose full-body reference (front plus back) in the game's style, on a flat background.
2. Run Meshy multi-image-to-3D (or Tripo multiview) to get a textured GLB, then remesh to about 10–30k triangles.
3. Auto-rig: Meshy for humans; Tripo v2.5 for animals, using a free rig check first.
4. Request one merged GLB with about 10 clips (idle, walk, turn, sit-down, sit-idle, talk-gesture, look-around, point, plus a smoking or drinking clip if the library has one), resampled to 30 fps.
5. Compress with glTF-Transform (meshopt/Draco, KTX2/WebP textures).
6. In three.js: `GLTFLoader`, then `SkeletonUtils.clone` per instance, `AnimationMixer` with crossfades and speed-matched `timeScale`.
7. Shading: `MeshToonMaterial` or a custom unlit shader with the scene palette LUT, ambient sampled from the painting, sun-side rim, and a tinted blob shadow. Add depth-ordered occluder layers cut from the painting.
8. Keep the 2D sheets for idles and ambient life; use video-to-flipbook only for one-off creature beats.

**When to pay:** a single month of Meshy Pro ($20) or a $50 Tripo top-up is enough to test 3–5 characters end-to-end before committing. Buying both is reasonable: Meshy for humans with the larger motion library, Tripo for animals.

**Licensing:** on paid tiers, Meshy and Tripo both grant private, commercially usable outputs. Avoid the free tiers: Meshy free is CC BY 4.0 with no API, and Tripo's free terms conflict. Avoid Hunyuan3D for distribution in the EU, UK or South Korea, and non-commercial depth or matting models (DA3-Large/Giant, RMBG-2.0) if the game is ever sold.

### Gaps
- No hands-on quality comparison of Meshy vs Tripo for stylised 19th-century costumes (long coats, sheepskin hats, skirts). Cloth skinning on long garments is a known weak point of auto-rigs, but I found no source quantifying it.
- No phone-performance benchmarks for several skinned characters in three.js; an in-project test is needed.
- No source confirms how well AI-generated 3D textures survive palette or toon processing next to Kuindzhi-style paintings; this needs a visual prototype.
