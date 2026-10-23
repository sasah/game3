# Cinematic presentation on a small budget: techniques for making a narrative web game feel premium

Scope: presentation techniques (juice, staging, cinematography, pacing, UI, transitions) that make small and mid-size narrative games feel cinematic and atmospheric. For each one: an example, why it works, and the cost in a phone-browser game. Project context checked in the repo: the current prototype `/home/user/game3/prototypes/iso/` is built on **three.js** (`import * as THREE from 'three'` in `src/main.js`, `src/atmosphere.js`). It already uses **Cormorant Garamond** from Google Fonts (`index.html`) and already has **depth maps** for the paintings (`img/depth-kuindzhi.png`, `img/depth-engraving.png`). The cost notes below assume that stack.

Cost tags used in the Inferences sections:
- **[CHEAP]**: CSS/JS or a few lines of shader, hours.
- **[MEDIUM]**: a custom shader or a small system, 1–3 days.
- **[EXPENSIVE]**: content-heavy work, such as many hand-made assets, voice, or animation.

---

## 1. Cinematography in 2D/2.5D: framing, scale, camera moves, letterboxing, dialogue shot rhythm, theatrical staging

### Takeaway
The best low-budget narrative games mostly don't imitate film cameras. They lock the camera and stage each screen like a theatre set or a painting, then spend their few camera moves on special moments: pull-backs, walls opening, zooms. A fixed isometric view over a painting can follow this model directly. Each screen gets composed as a picture, and camera motion is saved for punctuation.

### Cited Findings
**Kentucky Route Zero (Cardboard Computer): theatre, not cinema**
- In KRZ, camera angles "are usually tightly fixed and choreographed" and the range of movement is limited to give a stage-like feel. The text-driven interface sits on top of that staging. — [Ruckus essay](https://ruckus.cargo.site/A-View-of-Home-in-Cardboard-Computer-s-Kentucky-Route-Zero)
- Edge's review: KRZ takes more presentational cues from theatre than from cinema. It has clearly delineated acts and scenes and elaborate transitions, and its scene changes often feel like a traditional set change. — [Edge via PressReader](https://www.pressreader.com/australia/edge/20200130/281496458263694)
- Rhizome describes the art direction as a blend of Brechtian staging and De Stijl modernism. — [Rhizome](https://old.rhizome.org/editorial/2013/aug/27/kentucky-route-zero-adventure-appalachian-limbo)
- Jake Elliott's GDC 2013 talk covered theatrical elements such as backdrop sets, lighting, "backstage" areas and show curtains, plus linearity and pacing. (Only a search snippet was available; the page itself failed to load.) — [Vice, "Notes from GDC: Kentucky Route Zero and the theatre of games"](https://news.vice.com/en/article/aeepwk/notes-from-gdc-kentucky-route-zero-and-the-theatre-of-games)
- KRZ has been called an "interactive screenplay". The developers studied theatre scripts, and that study shaped characterization, dialogue, environment design and their treatment of space, lighting and movement. At the end of Act II, "the walls of the house pull away to reveal the forest beyond." — [Wikipedia: Kentucky Route Zero](https://en.wikipedia.org/wiki/Kentucky_Route_Zero)
- The developers chose "always-moving-forward conversations instead of typical adventure/RPG conversations that take a hub-and-spoke shape," and said: "Often the best solution to a problem is actually the least technically challenging!" — [Funambulism interview, 2013](https://funambulism.com/2013/07/23/interview-cardboard-computer-on-kentucky-route-zero/)

**Pentiment (Obsidian): framing control through restriction**
- Player movement was restricted to tracks, which gave control over camera framing and depth. Walking "up" into a scene was hard to show clearly, so they avoided those layouts instead of scaling characters for distance. Scenes almost always face "north" so that transitions feel natural, because a 2D camera can't rotate. Early scene tests imitated how a scene would look in a book. Hannah Kennedy: "we decided early that restricting player movement to tracks was the right call." — [Game Developer, Deep Dive: the art of Pentiment](https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment)
- Period illustrations almost always show people in three-quarter view, and the team had to account for that. — [Gamereactor interview](https://www.gamereactor.eu/the-history-behind-pentiment-and-the-creation-of-its-artistic-style-1191273/)

**Disco Elysium: each isometric screen as a painting**
- According to coverage of the Noclip documentary, art director Aleksander Rostov said "the isometric image is wonderful in its flatness." A fixed top-down view avoids the problems of full 3D and lets each screen be designed as one picture, with classical painting principles steering the player's attention. — [Shazoo (RU)](https://shazoo.ru/2026/02/04/179176/izometriia-kak-xolst-art-direktor-disco-elysium-obieiasnil-vizualnyi-uspex-igry); [Softonic](https://en.softonic.com/articles/the-art-director-of-disco-elysium-confirms-why-they-chose-that-style-for-the-game-so-that-it-could-be-like-a-painting)

**Puppet theatre as a frame (Puppeteer, Bunraku)**
- Sony Japan Studio's *Puppeteer* was built as a working theatre. Sets shift behind the on-stage actors while the camera stays fixed, an idea drawn from Bunraku. (This comes from a search summary citing a Eurogamer preview; the primary preview was not fetched.) — [Wikipedia: Puppeteer](https://en.wikipedia.org/wiki/Puppeteer)
- In Bunraku, one narrator (tayū) sits on a raised platform and voices every character, male and female, changing voice and intonation, with shamisen accompaniment. — [UNESCO: Ningyo Johruri Bunraku](https://ich.unesco.org/en/RL/00064)

**Dialogue staging**
- Oxenfree's "walk and talk": dialogue appears as speech bubbles, usually two or three options, and the player can keep moving. Bubbles are timed. The player can interrupt, wait, or stay silent, and silence is a valid choice. Sean Krankel's starting brief was Telltale-style branching where movement is never interrupted by cutscenes. — [Wikipedia: Oxenfree](https://en.wikipedia.org/wiki/Oxenfree); [Giant Bomb, "Convo Interruptus"](https://www.giantbomb.com/profile/darth_navster/blog/convo-interruptus-how-oxenfree-breaks-new-ground-f/113461/)
- Criticism: conversations can outlast the sparse areas, which forces the player to interrupt or pace around. — [GameRevolution review](https://www.gamerevolution.com/review/69787-oxenfree-review)
- Hades: the character portraits "make up Hades' dialogue sequences" (art director Jen Zee, with Joanne Tran and Paige Carter). — [Kotaku, The Art of Hades](https://kotaku.com/the-art-of-hades-1845443438). The script has more than 22,000 lines of dialogue, produced by a studio of fewer than 20 people. — [GDC Vault, "Breathing Life into Greek Myth: The Dialogue of Hades"](https://gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth)

### Inferences (technique catalogue for this project)
1. **Tiny figure in a huge painting, then push in.** [CHEAP] Open each location fully zoomed out so the investigator is a speck under the Kuindzhi sky, hold 2–3 s, then ease (cubic in-out) to play zoom. Scale sells loneliness and awe at the cost of a single camera tween. Pull back to the wide shot again when leaving or at the chapter's end, so each location has a book-end.
2. **Stage, not camera (KRZ, Puppeteer).** [CHEAP] Treat each painting as a fixed stage. Make "set changes" the transitions: a curtain wipe, flats sliding sideways, or the painting's edges peeling like KRZ's walls. This fits vertep and puppet staging and avoids expensive camera work.
3. **Restrict movement to authored paths (Pentiment).** [CHEAP] Walkable tracks or zones drawn over the painting stop the player from wandering into areas where AI-painting perspective breaks. They also guarantee good framing at every point of interest.
4. **Point-of-interest zoom as a "close-up".** [CHEAP→MEDIUM] When a clue is tapped, zoom about 1.5–2.5× toward it and tighten the vignette. Add a background blur driven by the existing depth map for a shallow-focus "insert shot" (medium cost if it's a depth-weighted blur in a shader).
5. **Dolly zoom ("Vertigo") in 2.5D.** [MEDIUM] With a depth map, scale the far layers in the opposite direction to the camera zoom, or animate parallax strength while zooming. Save it for one supernatural reveal per chapter. The prototype already has depth maps, so this is one shader uniform.
6. **Letterbox bars as a signal that the director has taken over.** [CHEAP] CSS bars slide in (about 0.4 s) when a scripted beat starts and out when control returns. Players read letterboxing as a cue that something is about to happen, which is a cheap way to build anticipation.
7. **Shot / reverse-shot in visual-novel dialogue.** [CHEAP] Alternate portrait sides for speakers. On a key line, scale the active portrait up about 8–12% and darken the other one (a close-up). On a shock line, cut instantly with no tween. Rhythm comes from mixing tweened lines with hard cuts and pauses.
8. **Three-quarter-view portraits** follow 19th-century portrait convention, as Pentiment followed its period's convention. [CHEAP] This is a prompt instruction for the AI portraits.
9. **Forward-moving conversations (KRZ) instead of hub-and-spoke question lists.** [CHEAP, writing] This keeps dialogue scenes moving like a scene rather than a menu.
10. **Single narrator voicing everyone, Bunraku/vertep style.** [MEDIUM] For reconstruction scenes, one narrator voice (the beekeeper-narrator figure) can carry all the puppets. That saves a cast of voices and stays true to the folk-theatre frame.
11. **Shadow play lit by the player's own candle.** [MEDIUM] For reconstructions, place a paper screen and have the candle (the player's tool) act as the light behind it. Silhouettes cut from the painting, or simple rigid puppets, move between the light and the screen. The core mechanic then becomes the staging device.

### Gaps
- I found no developer source on KRZ's specific camera pull-back shots, apart from the Act II "walls pull away" moment. The Vice GDC write-up could only be read as a snippet.
- Pentiment's page-turn transitions are well known from play but were not confirmed in the sources fetched. A book historian (Allie Alvis) reportedly advised on parchment textures and "how books move when opened" ([sharpweb.org](https://sharpweb.org/sharpnews/?p=2684), snippet only).
- Darkest Dungeon's camera zoom on attacks and crits: I found no developer statement. A GDC session titled "Critical Combat Presentation Tools for Darkest Dungeon II" exists, but its page returned 403 ([GDC schedule](https://schedule.gdconf.com/session/independent-games-summit-critical-combat-presentation-tools-for-darkest-dungeon-ii/901432)).
- Inside/Limbo's continuous, cut-free camera: no primary source found; search results kept matching the unrelated *Limbo* films.
- Vertep structure (two-tier box, sacred upper tier and comic secular lower tier, rod puppets moving in slots): not researched here. The lore researcher should confirm it before it's used as a staging spec.
- Not researched: Sable, Journey, Tunic, Night in the Woods, *Virginia* (a Twin Peaks-inspired game known for hard film cuts), "Mothmother" (I couldn't identify it).

---

## 2. Lighting and colour as emotion: colour scripts, grading, light as guidance, warm candle vs cold moon, Kuindzhi in shaders

### Takeaway
Small teams get much of their emotional range from planned colour: a colour script per chapter, a very limited palette, and colour or light used only where attention should go. Kuindzhi's own "special effect" was a contrast trick, not a pigment trick. A near-monochrome cold green-silver against warm dark browns, shown in a darkened room under one lamp, was enough for viewers to believe the canvas was lit from behind. That maps directly onto a phone screen in a dark room.

### Cited Findings
**Colour scripts**
- Ralph Eggleston's *Toy Story* colour scripts were pastel strips mapping colour and mood across the film. John Lasseter noticed "the colors got more intense when the emotions were more intense, and when things got somber, it got very muted," and had every later Pixar film made with a colour script. — [Hyperallergic, The Art of Pixar](https://hyperallergic.com/610771/the-art-of-pixar-chronicle-books/); [MoMA audio guide](https://www.moma.org/audio/playlist/192/2581)
- Firewatch (Jane Ng, GDC 2015): Olly Moss's poster was essentially the only visual target. The palette used bold colours in distinct layers to build depth and distance. A colour script tied to narrative moments kept things consistent, and tense or mysterious moments avoid cheerful, busy palettes. The sky is the largest source of colour outdoors and can fill half the screen. Fog supplements lighting to add depth. Story-relevant objects get more texture detail. Ng's advice was to embrace limitations. — [Thumbsticks, GDC 2015: The Art of Firewatch](https://www.thumbsticks.com/gdc-2015-the-art-of-firewatch)

**Restraint and colour as reward**
- Inside: "The game is dark, with color used sparingly to highlight both the player and certain parts of the environment." — [Wikipedia: Inside](https://en.wikipedia.org/wiki/Inside_(video_game))
- Limbo: reviewers linked its "monochrome approach, coupled with film grain filter, focusing techniques and lighting" to film noir. — [Wikipedia: Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game))
- Gris restores colour to the world area by area, with full colour returning only after the final duet. The team took inspiration from Iwagumi-style aquariums to make the early, colourless areas appealing. — [Wikipedia: Gris](https://en.wikipedia.org/wiki/Gris_(video_game))
- Playdead's GDC 2016 rendering talk covered local shadowed volumetrics, water rendering, and "properly using dithering" so subtle details aren't lost to colour banding. — [GDC Vault: Low Complexity, High Fidelity – INSIDE Rendering](https://gdcvault.com/play/1023002/Low-Complexity-High-Fidelity-INSIDE)

**Light as a revelation mechanic**
- KRZ Act I: "If the lamplight is turned off during the travel, ghostly visions of miners can be seen wandering the caves." — [Wikipedia: Kentucky Route Zero](https://en.wikipedia.org/wiki/Kentucky_Route_Zero)

**Painterly references**
- Disco Elysium's painterly look drew on Jenny Saville, Alex Kanevsky, Ilya Repin and Mikhail Vrubel. The aim was a look that balances "the mundane with the unfamiliar and strange." — [MCV/Develop](https://www.mcvuk.com/business-news/we-knew-immediately-that-we-needed-to-make-a-game-with-a-striking-and-unique-look-to-accompany-the-writing-a-look-that-would-balance-the-mundane-with-the-unfamiliar-and-strange-the-art)

**Kuindzhi, "Moonlit Night on the Dnieper" (1880)**
- It was the only painting in its exhibition at the Society for the Encouragement of Artists in St Petersburg. Window curtains were lowered, and an artificial light was centred on the canvas. Some viewers believed it was lit from behind and looked for the light source. The horizon is very low, so the sky fills much of the canvas. — [Wikipedia (EN)](https://en.wikipedia.org/wiki/Moonlit_Night_on_the_Dnieper)
- Technique, from the Russian article:
  - Mainly two colours, black and "phosphoric green."
  - A cold silver-green set against warm dark browns: warm tones bring things closer and cold tones push them away.
  - Small dark hatching strokes over the silver areas create a sense of vibration and flicker.
  - Glazes in the distance deepen the space, and the foreground is sketchy, with the underpainting showing in places.
  - The art historian Manin notes that Kuindzhi "used the property of warm colours to flare up under lamplight and of cold ones to be absorbed by it." Relief areas (hut windows, the moon, the moon path) caught the lamp more strongly, including "ridges of the moon path scratched with a dry brush."
  - He used bitumen-based paints, which darken over time, and Kramskoy worried about their durability.
  - Kramskoy described "a physiological irritation of the eye, as if from real light."
  - One viewer said: "Просто дьявольщина какая-то" ("simply some kind of devilry").
  - Source: [Wikipedia (RU): Лунная ночь на Днепре](https://ru.wikipedia.org/wiki/Лунная_ночь_на_Днепре)

### Inferences (technique catalogue)
1. **Chapter colour script before generating any paintings.** [CHEAP, planning] Make one row of 8–15 thumbnails per chapter: comic beats warmer and busier, eerie beats colder and emptier, the climax at maximum contrast. Use the strip as a prompt guide for the AI paintings and as a list of per-scene LUTs. This is the Pixar/Firewatch method at zero engineering cost.
2. **Kuindzhi "lamp in a dark room" screen.** [CHEAP] On a phone, the device in a dark room already plays the role of the curtained hall. Make every non-painting pixel near-black (UI chrome, margins). Allow bloom only on the moon and the moon path, and keep the rest below the bloom threshold. Contrast against the surrounding black is what makes the painting look self-lit.
3. **Two-hue gradient map (limited palette).** [CHEAP] Use a luminance-to-colour gradient map: black, then deep green-blue, then "phosphoric" silver-green for the moon world, mixed partially over the AI painting to unify mismatched generations. In three.js it's a 1D LUT texture lookup, or the LUT effect in pmndrs/postprocessing (see §6).
4. **Warm near, cold far.** [CHEAP with depth map] Grade by depth: near pixels get a warm, brown shadow tint and far pixels a cold silver tint. This is Kuindzhi's own depth trick, and the existing depth maps make it one `mix()` call.
5. **Moon-path flicker.** [MEDIUM] Copy Kuindzhi's small dark strokes over silver: over the bright water mask, animate a sparse field of dark ticks and bright glints with scrolling noise and a threshold. It gives living, shimmering water without simulating water.
6. **Impasto catching the candle.** [MEDIUM] Derive normals from the depth map (or a separate height map). When the candle moves, only the raised areas (window frames, moon disc, path ridges) brighten. This is Manin's observation about lamp-lit relief, in shader form.
7. **Candle vs moon, two-light model.** [CHEAP→MEDIUM] The moon is a global cold grade. The candle is a local warm radial falloff with a noise-driven flicker in radius and intensity, plus a slight warm bloom. Inside the candle circle, saturation and warmth rise and hidden traces appear (KRZ's lamp in reverse: here light reveals the ghosts). Outside the circle, the cold grade deepens slightly so the candle feels precious.
8. **Colour withheld, then returned (Gris, Inside).** [CHEAP] Desaturate a location while a mystery is unsolved and restore one colour (for example the red of a kerchief or blood) when the key clue is found. Colour becomes a reward and a story beat.
9. **Guide attention with light and detail, not arrows (Firewatch, Disco).** [CHEAP] Lift exposure 10–20% on points of interest through a mask, and give them the most detailed part of the painting. The darkest areas are where nothing interactive should be.
10. **Dither every dark gradient.** [CHEAP, important] Night skies on phone screens band badly, especially after compression. Add a blue-noise or triangular dither as the last step (Inside's lesson). It's one line of shader and removes the cheap look.
11. **Engraving variant.** [MEDIUM] For the engraving style, a hatching or line-density shader where candlelight "inks in" extra hatching detail would echo Limbo's noir-by-limitation.

### Gaps
- No primary source on Firewatch's per-time-of-day palettes or fog implementation; the Thumbsticks write-up is the best available.
- No primary interview on Gris's per-chapter colour order (which colour comes first, and why).
- Pigment-chemistry claims about Kuindzhi (for example, links to Mendeleev's paint research) were not confirmed. The RU article mentions Mendeleev only as an essayist who wrote about the painting. Avoid repeating the "Mendeleev made his paints" legend.

---

## 3. Emotional pacing and dread: anticipation, silence, the uncanny, breaking the frame, Lynchian logic, comedy timing, cheap supernatural staging

### Takeaway
Dread on a budget mostly comes from information and sound, not visuals. Tell the player the bomb is under the table (Hitchcock). Take the music away. Use sounds with no visible source. Show less. Comedy and horror share one tool, timing, and in games the player controls the timing, so the designer has to take it back with pauses, held beats and click-gated punchlines.

### Cited Findings
**Suspense vs surprise**
- Hitchcock to Truffaut: a bomb that explodes without warning gives "fifteen seconds of surprise"; showing the bomb and the clock first gives "fifteen minutes of suspense." "Whenever possible the public must be informed," except when the twist itself is the payoff. — [No Film School](https://nofilmschool.com/alfred-hitchcock-and-francois-truffaut-explain-surprise-vs-suspense). David Bordwell notes Hitchcock had been making the same point since the 1930s. — [Bordwell blog](https://www.davidbordwell.net/blog/2013/11/)

**Sound-led horror (Playdead, Martin Stig Andersen)**
- Limbo uses "minimalist ambient sounds" for an "eerie, haunting environment." Movement sounds have "an eerie clarity without the presence of a conventional soundtrack to cover them." Andersen specialised in acousmatic music (sound with no apparent visual source). He built the score mostly from environmental effects, avoided easily recognisable sounds, and distorted sounds so players could interpret them. He used short "grains" instead of long loops so repetition wasn't noticeable. He argued that without music "to take them by the hand," scared players feel more scared. — [Wikipedia: Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game))
- Inside is "mostly silent," with occasional musical cues. The boy's breathing shifts between calm and panicked depending on the situation. Andersen worked with the designers on structure and pacing so certain scenes build tension through music, and some puzzles hang on audio-visual cues. He routed sound through a human skull for a "bone-conducting," "sombre, chill" quality. — [Wikipedia: Inside](https://en.wikipedia.org/wiki/Inside_(video_game)); [PC Gamer](https://www.pcgamer.com/uk/inside-used-a-real-life-human-skull-to-create-its-music-and-sound)

**Frozen moments plus sound first (Obra Dinn, Golden Idol)**
- Obra Dinn: the pocket watch plays audio of the final moments before a death, then drops the player into a scene frozen at that moment. Pope reported finishing music for all 49 flashback sequences: 20 songs, plus first-pass audio for every flashback. — [Wikipedia: Return of the Obra Dinn](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn); [COGconnected dev update](https://cogconnected.com/2018/05/developer-gives-update-return-obra-dinn/). Kotaku says the score "accentuates the drama" and is "tightly integrated into the game in some pleasing ways." — [Kotaku review](https://kotaku.com/return-of-the-obra-dinn-the-kotaku-review-1829797772)
- The Case of the Golden Idol builds each case around a frozen tableau of the moment of death, which players search freely for suspect, motive and timeline. The developers cite Obra Dinn as an inspiration. — [GodIsAGeek](https://godisageek.com/2023/05/the-case-of-the-golden-idol-is-coming-to-nintendo-switch/); [Thinky Games](https://thinkygames.com/features/how-the-case-of-the-golden-idol-developers-made-one-of-the-decades-best-detective-games-twice/)

**Narrator as a mood instrument (Darkest Dungeon)**
- Chris Bourassa chose Wayne June after hearing his Lovecraft audiobook readings. The script was written for June's cadence, tenor and tone, and the bulk of the story runs through the narrator. June delivers the Gothic flavour without sliding into camp. — [GameSpot, "The Gothic Sensibilities of Darkest Dungeon"](https://www.gamespot.com/articles/the-gothic-sensibilities-of-darkest-dungeon/1100-6424880/). After June's death in January 2025, Bourassa refused to recreate his voice with AI. — [80.lv](https://80.lv/articles/darkest-dungeon-creator-won-t-replace-late-narrator-with-ai-despite-his-permission/)
- Players say the narrator "lifts you up after a nice critical hit" and reminds you not to get overconfident. This is player opinion, not a developer statement. — [Steam discussion](https://steamcommunity.com/app/262060/discussions/0/2217311444335542893)

**Lynch / Twin Peaks lineage**
- Jake Elliott on KRZ: "Tamas and I are always talking about David Lynch, and he's a huge influence on us as far as tone." The game also draws on García Márquez, Flannery O'Connor and Southern Gothic writers. — [Wikipedia: Kentucky Route Zero](https://en.wikipedia.org/wiki/Kentucky_Route_Zero)
- Deadly Premonition: Agent York is a version of Dale Cooper. His imaginary friend "Zach," whom he constantly addresses, stands in for Cooper's tape-recorder "Diane," and the "Pot Lady" stands in for the Log Lady. It has dream rooms and other surreal set pieces. Reception was famously split (IGN 2/10 vs Destructoid 10/10). — [CGMagazine](https://www.cgmagonline.com/2014/10/07/ode-twin-peaks-game-world-sort/); [Destructoid](https://www.destructoid.com/the-eternal-influence-of-twin-peaks/)
- Disco Elysium's stated visual aim of balancing "the mundane with the unfamiliar and strange" is the same balance. — [MCV/Develop](https://www.mcvuk.com/business-news/we-knew-immediately-that-we-needed-to-make-a-game-with-a-striking-and-unique-look-to-accompany-the-writing-a-look-that-would-balance-the-mundane-with-the-unfamiliar-and-strange-the-art)

**Comedy timing**
- Zoe Quinn (GDC 2015): the three main challenges of game comedy are timing, delivery and subjectivity. Traditional comedy relies on authorial control of timing, and games hand that control to the player. Jokes also wear out across repeated playthroughs and playtests. — [Thumbsticks](https://www.thumbsticks.com/gdc-2015-zoe-quinn-on-comedy-in-videogames/)
- Tim Schafer (GDC 2010 panel): adventure games are like a play in which the player is a drunk actor improvising while the cast works around them. The answer is to anticipate the player's actions. — [AV Club](https://avclub.com/avc-at-gdc-10-the-comedy-in-games-panel-1798219354)
- An Independent Games Summit talk, "Comedy Through Patterns," argues that comedy comes from structure, not just writing. — [GDC Vault](https://gdcvault.com/play/1035068/Independent-Games-Summit-Comedy-Through)

### Inferences (technique catalogue)
1. **Sound before image.** [CHEAP] Every supernatural beat starts with audio only, held 1–3 s on a still or darkened frame (a scrape behind the hut, a woman's laugh from the pond), before anything is shown. This is Obra Dinn's structure, and AI paintings need no animation for it.
2. **Music dropout.** [CHEAP] Cut the ambient bed and music to near-silence 1–2 s before a reveal. Silence is the stinger, and the following sound lands harder. Following Andersen, keep long stretches with no score at all, only sounds whose source can't be seen.
3. **Inform, then wait (Hitchcock).** [CHEAP, writing] Let the player know something the investigator doesn't: a tail visible in the candle circle, a figure in the far window during a comic conversation. Comic dialogue played over a visible threat gives the comic-and-eerie tone in one shot.
4. **The wrong detail (uncanny).** [CHEAP] On a second visit, change one thing in an otherwise identical painting: a scarecrow turned, an extra figure in the window, an extra cherry tree. AI painting supports this through inpainting. It's the cheapest scare available and it rewards attention, which suits a detective game.
5. **Lynchian dream logic.** [CHEAP→MEDIUM] Reuse locations in impossible ways: the same tavern painting with a colour-inverted LUT, reversed audio for one character's line (Twin Peaks' Red Room trick, applied in the browser with `AudioBuffer` reversal), a door that leads back to the room you're in. Keep the mundane mundane (vareniki, quarrels over a pig) right next to it.
6. **Breaking the frame.** [CHEAP] Let a portrait look at the player instead of the speaker. Let the narrator answer the player's hesitation. Let the UI journal pick up an entry the player didn't write. Let the chapter title card misspell itself. Use these rarely, at most one per chapter.
7. **Narrator as the comic and eerie hinge.** [MEDIUM, writing; EXPENSIVE if voiced] A Darkest Dungeon-style narrator, written for one voice, ties the comic and eerie registers together. The text-only version is cheap, and a Gogolian beekeeper-narrator fits Evenings' own framing (the lore researcher should confirm).
8. **Comedy timing in text.** [CHEAP] Give the typewriter inline pause tags (`{p:600}`) before punchlines, gate the punchline behind its own tap, use a rule-of-three escalation, and cut to a blank reaction portrait after the joke (the Twin Peaks deadpan beat). Use speed changes as delivery: a pompous official's text types slowly and grandly, a gossip's types fast.
9. **Alternate the beats deliberately.** [CHEAP, planning] In the colour script, mark each beat C (comic) or E (eerie). Avoid more than two of the same kind in a row, and put a small comic release right after every big scare so the next one can land.
10. **Withhold the monster.** [CHEAP] Show supernatural beings only as silhouette, shadow-play cut-outs, or a candle-revealed trace. Never give them a full painted render. It's cheaper and scarier.
11. **Frozen tableau for reconstructions (Obra Dinn, Golden Idol).** [CHEAP with AI paintings] One still painting of the moment, explored with the camera and candle, then narrated. This makes the lack of animation a stylistic choice instead of a budget limit.

### Gaps
- I couldn't find the specific source for Obra Dinn's "musical sting when you pull out the watch." Reviews mention it, but I couldn't tie the claim to one URL with confidence.
- No source fetched on David Lynch's sound practice (for example, Alan Splet's room tones). It would be useful if the report wants to argue "Lynch = sound."
- No quantitative data on how much comic relief improves horror pacing; the guidance above is craft wisdom.

---

## 4. UI/UX that feels premium on mobile: diegetic UI, typography, micro-animations, haptics, transitions, the opening sequence, chapter title cards

### Takeaway
Premium narrative UI works by making type and interface part of the world. Pentiment uses five custom period hands whose letters are drawn stroke by stroke. Disco Elysium uses a single tall, Twitter-like column with a typewriter whirr. Alan Wake 2 turns its menu into a "Mind Place." For a Cyrillic period game, a 19th-century book face plus a hand-written face, letter-by-letter "inking," and a case file styled as a period document give most of that effect cheaply. Haptics on the iPhone web are fragile, so treat them as optional.

### Cited Findings
**Typography as character (Pentiment)**
- Lettermatic drew five fonts (more than 2,700 glyphs, many by hand in ink): Scribe Script (cursive), Humanist Script (legible, and available for all voices via accessibility settings), Monastic Script (blackletter with ink bleed and stroke overlaps), Printer Type (early metal type), and Peasant Script (drawn with analog tools and a non-dominant hand, with three versions of each letter). The fonts signal education and social standing. Dialogue is written one letter at a time, and Brett Klooster's toolset renders letters stroke by stroke using Lettermatic's ductus diagrams. Repeated letters use alternates so they don't look identical. Kennedy: "the fonts in the game play such a huge role in representing the character's voice and personality." Sawyer: "Fonts play an incredibly important role in Pentiment." — [Lettermatic case study](https://lettermatic.com/custom/pentiment)
- Accessibility (easier typefaces, text-to-speech) was added for a text-heavy game, and the story is split into three time periods (1518, 1525, 1543). — [Wikipedia: Pentiment](https://en.wikipedia.org/wiki/Pentiment_(video_game))

**Dialogue UI (Disco Elysium)**
- Robert Kurvitz said the team treated Twitter as its main competition for holding attention with text. Dialogue rises in a narrow column like a feed, because skimmers take in the gist. — [Kotaku](https://kotaku.com/disco-elysiums-dialogue-system-is-as-addictive-as-any-s-1841046831)
- It's a tall text box on the right. New text arrives with a swift swipe animation and a typewriter whirr. Skill-gated options appear in [brackets] in the skill's colour. — [UAL case study](https://tommartin.myblog.arts.ac.uk/?p=168)

**Diegetic menus (Alan Wake 2)**
- The "Mind Place" is described by Remedy as a "3D menu," a visual representation of Saga's thoughts with a pin board of clues. In the "Writer's Room," editing the novel outline reshapes the space around Alan. — [Wikipedia: Alan Wake 2](https://en.wikipedia.org/wiki/Alan_Wake_2)

**Book as interface (Obra Dinn)**
- The player is "given a logbook that includes a drawing of all the crew members, the crew roster, and a plan of the ship," and "with each death, the logbook automatically fills in basic information." GameSpot's reviewer praised its "book-based interface." — [Wikipedia: Return of the Obra Dinn](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)

**Cyrillic period type**
- Old Standard (Alexey Kryukov) is inspired by "a typeface most commonly used in books printed in the late XIXth and early XXth century." The name contrasts it with the Soviet "Obyknovennaya Novaya." It includes a full set of historical Cyrillic characters (Unicode 5.1), and later versions add Cyrillic small caps, which "were already in use a century ago in fine books which used font faces very similar to Old Standard." It is licensed under the SIL OFL 1.1. — [CTAN: oldstandard docs](https://ctan.org/tex-archive/fonts/oldstandard/doc); [FONTLOG](https://mirror.ircam.fr/pub/CTAN/fonts/oldstandard/doc/FONTLOG.txt)
- The current prototype already loads Cormorant Garamond (in `/home/user/game3/prototypes/iso/index.html`).

**Haptics in the phone browser**
- iOS Safari has no Vibration API, and Apple had given no sign of adding it as of 2026. — [kimsal.com, 2026](https://kimsal.com/blog/2026/03/20/a-bit-of-feedback/)
- Workaround: a hidden `<input type="checkbox" switch>` with a label. Calling `click()` on the label makes Safari fire the Taptic Engine. Reports date this to iOS 18 or Safari 17.4. — [azukiazusa.dev](https://azukiazusa.dev/en/blog/ios-safari-web-haptics). Libraries such as web-haptics use `navigator.vibrate()` on Android Chrome and the switch trick on iOS (iPhone 7+ with System Haptics enabled). — [web_haptics docs](https://pub.dev/documentation/web_haptics/latest/)
- One unverified tool page claims Apple patched the trick in iOS 26.5. — [rapidtoolset](https://rapidtoolset.com/en/tool/ios-haptics-tester)

**Structure and title cards**
- KRZ uses clearly delineated acts and scenes with elaborate transitions. — [Edge via PressReader](https://www.pressreader.com/australia/edge/20200130/281496458263694). It was released in five acts plus interludes (2013–2020). — [Wikipedia](https://en.wikipedia.org/wiki/Kentucky_Route_Zero)

### Inferences (technique catalogue)
1. **Type pairing.** [CHEAP] Use Old Standard TT (19th-century Russian book face, OFL, on Google Fonts) for narration, title cards and the case file. Keep Cormorant Garamond for UI and dialogue, or for display. Add one hand-written Cyrillic face for notes and letters. Pentiment's lesson: map fonts to social class. A clerk's copperplate for the assessor, a rough scrawl for peasants, a church-style face for the deacon. Even 2–3 fonts give "voice without voice acting." Always offer a single legible override, as Pentiment does.
2. **Ink-in text.** [CHEAP→MEDIUM] Reveal text letter by letter with a short opacity and blur ramp per glyph, plus a faint ink-bleed SVG filter (`feTurbulence` + `feDisplacementMap`) that settles as it appears. Use a quill scratch for writers and a soft paper sound for others (Disco's whirr equivalent). Medium cost only for true stroke-order animation.
3. **Diegetic case file.** [CHEAP] Make the journal a period document: a ledger or census sheet on aged paper with wax seals, blots and marginal sketches of clues. A confirmed deduction gets a seal stamp with a dull thud, a 120 ms hold, and a haptic tick. Obra Dinn's confirmed-fate moment and Disco's thought cabinet are the references.
4. **One-hand portrait layout.** [CHEAP] On phones, adapt Disco's column to a bottom sheet. Portrait above, text in a narrow column, choices as large tap targets in the thumb zone. New lines push old ones up with a short swipe tween.
5. **Micro-animations.** [CHEAP] The candle button flickers in idle (scale ±2%, glow noise), buttons get a 60–90 ms press "sink," clue icons breathe, page corners lift on hover or press, and dust motes drift over menus. Each is a CSS keyframe.
6. **Haptics as progressive enhancement.** [CHEAP] `navigator.vibrate(10–20)` on Android for taps, a longer pulse on deductions and scares. On iOS, use the switch trick if it still works and fail silently otherwise. Keep a settings toggle. Don't design anything that depends on haptics.
7. **Transitions as art.** [CHEAP] Use page turns, curtain wipes, ink spreading across the screen (a noise-threshold dissolve), or a candle being blown out to black. Hide asset loading behind these transitions and the chapter title cards, so loading itself is a staged beat.
8. **Chapter title cards ("Вечер первый…").** [CHEAP] Black screen, title card set in Old Standard with a drop cap and an engraved ornament, a 2–3 s hold, then the narrator's epigraph line (Gogol-style). One sting of bandura or lirnyk music, or just a crow, works like KRZ's act cards.
9. **First five minutes.** [CHEAP, design] (a) A pure-black start with a sound (dogs, wind, a distant hopak). (b) A title card. (c) An extreme wide shot of the Kuindzhi night with the tiny investigator, then a push-in. (d) The first interaction is lighting the candle, which reveals the first trace within 60 s. (e) A comic dialogue beat (the village head). (f) The first eerie wrong-detail beat. That's four of the game's moods in five minutes, before any menu or tutorial text (Limbo's no-tutorial-text principle, [Wikipedia: Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game))).
10. **Parallax menu.** [CHEAP with depth map] The title screen is the painting with gentle depth-map parallax, driven by touch drag or a slow idle sway (see §6).

### Gaps
- I didn't verify which other Google Fonts Cyrillic faces would suit church or hand-written registers (for example Ponomar or Triodion for Church Slavonic, or a script face). That needs a font-specific check, including Ukrainian letters і, ї, є, ґ.
- I didn't confirm whether the iOS switch-haptic trick still works on the newest iOS; only one unverified claim says it was patched.
- No primary source found on Alan Wake 2's on-screen projected typography; only the Mind Place and Writer's Room are confirmed.
- I found no hard data on how much loading or transition art affects mobile retention.

---

## 5. Trailer-worthy and screenshot moments: what makes players share, and 2–3 signature set pieces per chapter

### Takeaway
Shareable moments in small narrative games tend to be single strong images: a key-art-like composition, a transformation (walls fall away, colour returns, the light reveals something), or a frozen tableau. Plan them first, Firewatch-style, by making the key image before the level. Kuindzhi is a historical precedent: one painting, staged with a single lamp in a dark room, produced queues in the street.

### Cited Findings
- Firewatch: Olly Moss's poster was the team's main visual target, and Ng credited it with capturing the emotional tone. — [Thumbsticks](https://www.thumbsticks.com/gdc-2015-the-art-of-firewatch)
- Kuindzhi's 1880 single-painting show had queues and group admissions, and visitors looked behind the canvas for the lamp. Repin described "a continuous mass of carriages." — [Wikipedia EN](https://en.wikipedia.org/wiki/Moonlit_Night_on_the_Dnieper); [Wikipedia RU](https://ru.wikipedia.org/wiki/Лунная_ночь_на_Днепре)
- KRZ's set-piece transformation: walls pulling away to reveal the forest (end of Act II). — [Wikipedia](https://en.wikipedia.org/wiki/Kentucky_Route_Zero)
- Gris's colour-restoration beats and the sung climax, where the mother's statue reforms through song. — [Wikipedia: Gris](https://en.wikipedia.org/wiki/Gris_(video_game))
- Obra Dinn's and Golden Idol's frozen death tableaux. — [Wikipedia: Obra Dinn](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn); [GodIsAGeek](https://godisageek.com/2023/05/the-case-of-the-golden-idol-is-coming-to-nintendo-switch/)
- Disco Elysium's approach of treating each screen as a painting (Noclip coverage). — [Softonic](https://en.softonic.com/articles/the-art-director-of-disco-elysium-confirms-why-they-chose-that-style-for-the-game-so-that-it-could-be-like-a-painting)

### Inferences (signature set-piece recipe per chapter)
For each "Evening," plan three set pieces, each built from tools the game already has.
1. **The Reveal Shot (awe).** A Kuindzhi moment. The screen goes near-black, then the moon breaks through clouds (cloud-shadow shader), the moon path ignites with bloom and flicker, and the camera pulls back to the tiny figure. Designed as the chapter's key art and thumbnail. [CHEAP: a camera tween, a uniform ramp, one stinger]
2. **The Transformation (shock or wonder).** The candle reveals that a familiar place is different. Ghost footprints or a second set of shadows appear, colour drains or returns, or the painting's walls lift (KRZ). The screenshot is the before-and-after. [MEDIUM: mask reveal + LUT swap]
3. **The Theatre (comic and eerie).** The reconstruction as vertep or shadow play: curtain, a frozen-tableau stage, puppets, one narrator voice, the candle as the stage light. It's the most memorable thing to share, because it's what no other detective game does. [MEDIUM: puppet cut-outs + simple rigid tweens]
- **Built-in "postcard" capture.** [CHEAP] After a set piece, offer a "send a postcard" button. It renders the current frame with an engraved border and a caption in Old Standard ("Диканька, 1811. Вечер второй"), then hands it to the OS share sheet (Web Share API; browser support for file sharing wasn't verified here). Players share framed images more readily than raw screenshots, which is craft wisdom rather than measured data.
- **Trailer rule.** Each set piece should read in 3 s with sound off (image) and in 3 s with eyes closed (sound). If it fails either test, strengthen the composition or the stinger.

### Gaps
- I found no empirical data (studies or platform analytics) on which kinds of game moments get shared most. The recommendations are inferred from case studies.
- Journey, Sable and Tunic were not researched for this section.

---

## 6. Practical cheap tricks: post-processing stack, camera shake and sway, hit-stop and slow motion, focus pulls, title animations, parallax, sound sync

### Takeaway
Most "juice" is a small set of parameters: trauma-based shake on Perlin noise, a few pixels of camera kick, hit-stop under 120 ms, and one merged post-processing pass (vignette, grain, LUT, selective bloom), plus depth-map parallax for a living painting. All of it is available as open-source three.js and WebGL code, so the work is in choosing restrained values and knowing when to use them.

### Cited Findings
**Juice references**
- Nuclear Throne, one pistol shot (Jan Willem Nijman via RPS): the camera is kicked back 6 px from the aim point, 4 is added to screenshake, and weapon kick is 2, so the gun sprite shifts back and slides into place. — [infovore.org, "Making Game Feel"](https://infovore.org/?p=5275)
- A step-by-step recreation of Nijman's "The Art of Screenshake" lists techniques including Hit Pause, Permanence, Camera Lerp, Screenshake, Weapon Recoil and bigger bullets. — [DK Liao devlog](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog)
- Squirrel Eiserloh, "Math for Game Programmers: Juicing Your Cameras With Math" (GDC 2016). — [Game Developer](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)
  - Implementations of the trauma model: trauma is added in a 0–1 range and decays linearly. Visible shake equals trauma raised to a power, so small events barely register. Offsets come from a noise function, so the motion is smooth and continuous. — [Bevy 2D screen-shake example](https://bevy.org/examples/camera/2d-screen-shake/); [StraySpark Godot camera docs](https://www.strayspark.studio/docs/godot-camera-system/noise-and-shake)
- Hit-stop: a brief freeze on impact, where 60–120 ms is "plenty." — [DEV Community, Godot 4 shake + hit-stop](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh)
- The FEEL docs recommend choosing an intensity scale and giving each shake type a consistent meaning. — [More Mountains FEEL docs](https://feel-docs.moremountains.com/screen-shakes.html)

**Post-processing libraries (web)**
- pmndrs/postprocessing (for three.js) includes Bloom, Blur, Colour Grading (sepia, brightness/contrast, hue/saturation, LUT), Depth of Field, Vignette, Glitch (with Chromatic Aberration and Noise), God Rays, Shock Wave, Tone Mapping, SSAO, Scanline and more. Its EffectPass "automatically organizes and merges any combination of effects," minimising render operations compared with chaining passes. It is Zlib-licensed. — [GitHub: pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
- pixi-filters (if PixiJS is ever used) includes OldFilm, Godray, Bloom/AdvancedBloom, ColorMap, Adjustment, Shockwave, ZoomBlur, TiltShift, CRT, Glitch, Reflection, RGBSplit and SimplexNoise. Displacement and Noise are built into PixiJS. It is MIT-licensed, and v6 pairs with PixiJS v8. — [GitHub: pixijs/filters](https://github.com/pixijs/filters)
- Limbo's noir look came from monochrome plus a film-grain filter, focusing techniques and lighting. — [Wikipedia: Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game)). Inside's renderer used dithering against banding. — [GDC Vault](https://gdcvault.com/play/1023002/Low-Complexity-High-Fidelity-INSIDE)

**Animating a still painting**
- DepthFlow is an open-source parallax shader that animates still images from a depth map, with built-in vignette and depth-of-field post effects. — [GitHub: DepthFlow (fork)](https://github.com/RussPalms/DepthFlow_dev); [PyPI: depthflow](https://pypi.org/project/depthflow)
- jasonyingling/depth-map-generator runs Depth Anything in the browser (Transformers.js) and renders depth displacement with Three.js, fully client-side. — [GitHub](https://github.com/jasonyingling/depth-map-generator)
- The project already has depth maps for both styles (`/home/user/game3/prototypes/iso/img/depth-kuindzhi.png`, `depth-engraving.png`).

### Inferences (recommended mobile stack and values)
**Post-processing.** Use one merged `EffectPass`, ordered roughly as below.
1. **LUT / gradient map per scene** [CHEAP]. Crossfade between LUTs over 2–4 s on mood changes. This is the colour-script engine.
2. **Vignette** [CHEAP]. Keep it subtle by default and tighten it on point-of-interest zooms and scares. Doubles as Kuindzhi's dark room.
3. **Film grain / noise** [CHEAP]. Keep it low and animated, and slightly stronger in the engraving style. Grain also hides AI-painting artefacts and helps against banding.
4. **Selective bloom** [CHEAP→MEDIUM]. Use a high threshold so only the moon, moon path, candle and lit windows bloom. Halve the resolution on phones.
5. **Dither** as the last step [CHEAP, essential for night scenes].
6. **Chromatic aberration** [CHEAP]. Only on supernatural beats, as a short pulse rising from 0, never as a constant. Overuse reads as cheap.
7. **Depth of field** [MEDIUM]. Avoid real-time bokeh on low-end phones. Use a depth-weighted blur from the existing depth map, with focus "pulls" animated by tweening the focal depth (for example 0.6 s from the speaker to a clue).
8. **God rays** [MEDIUM]. Moonbeams through clouds or a barn's slats. Use them at only one or two set pieces per chapter.

**Camera.**
- **Idle sway** [CHEAP]: very low-amplitude Perlin drift (a few pixels, slow) so the painting feels filmed by a hand-held camera instead of shown as a JPEG.
- **Trauma shake** [CHEAP]: use Eiserloh's model, with trauma² or trauma³ and noise offsets plus a little rotation. For a detective game, use it rarely. Door slam: 0.2. Supernatural manifestation: 0.6. Never during reading.
- **Camera kick** [CHEAP]: a 3–6 px push toward a revealed clue, using Nuclear Throne's "kick, then slide back" pattern instead of a smooth zoom.
- **Hit-stop and hold** [CHEAP]: freeze all animation 80–120 ms on a key deduction or a scare (the "permanence" moment), then continue.
- **Slow motion** [CHEAP]: a global time scale of about 0.3 for 1–2 s on a scare, with a matching audio low-pass or playback-rate drop so sound and image slow together.

**Living painting.**
- **Depth parallax** [CHEAP–MEDIUM; already prepared]: driven by camera pan, touch drag and idle sway. Keep displacement small so AI-painting artefacts don't tear at depth edges.
- **Shader layers** [MEDIUM each]: water ripple masks, drifting fog bands (scrolling noise × depth, the Firewatch fog-for-depth idea), cloud shadows (large scrolling noise multiplying the painting), and candle flicker. The prototype's `atmosphere.js` particle layer (smoke, petals, moths, bats) is already this kind of "life."

**Title animation.** [CHEAP] Letters ink in one at a time (opacity, a 1 px blur clearing, ink-bleed displacement), a drop cap blooms, and an engraved ornament draws itself with an SVG `stroke-dashoffset`.

**Sound sync.** [CHEAP] Schedule visual beats on the Web Audio clock (`AudioContext.currentTime`) instead of `setTimeout`, so stingers, cuts and shake land on the same frame. Fire the stinger 0–50 ms before the visual cut. Duck ambience during dialogue.

**Budget rule of thumb.** On a phone, plan a full-screen post pass at about half resolution, at most one blur-type effect at a time, and bloom at quarter resolution. This is an inference; benchmark it on the target devices.

### Gaps
- "Juice It or Lose It" (Martin Jonasson and Petri Purho, about 2012): search returned only an unrelated diet book, so its technique list couldn't be cited from a primary source here.
- I couldn't retrieve the full list from Nijman's "The Art of Screenshake"; only the item names above (from the recreation devlog) are confirmed.
- No measured mobile GPU budgets for pmndrs/postprocessing effects were found; the stack above needs device testing.
- No source verified for DeviceOrientation (gyro) parallax permissions on iOS Safari, which require a user gesture; check before relying on tilt-driven parallax.
