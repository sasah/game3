#!/usr/bin/env bash
# Detail inset for the door/well corner of the yard (shown when the camera zooms in) and a cat
# with an idle sprite sheet. Run from the repo root in a session that has OPENAI_API_KEY.
set -euo pipefail
G="python3 tools/gen-image.py --quality high"
D=prototypes/iso/img
INSET="This image is an enlarged crop of a larger oil painting, so it looks soft. Repaint it as a sharp, finely detailed oil painting at full resolution while keeping EXACTLY the same composition, camera angle, the position, size and outline of every object, the same lighting, colours and style (Arkhip Kuindzhi, moonlit night). Add only fine detail: individual straw in the thatch, brush texture of the whitewash, woven withies of the wattle fence, blades of grass, petals of the cherry blossom, wood grain of the well. Do not add, remove or move any object. No people. No text, no frame."
$G --edit $D/insets/door-kuindzhi-src.webp --out-file $D/insets/door-kuindzhi.webp --size 1536x1024 --prompt "$INSET"
$G --edit $D/insets/door-kuindzhi-hidden-src.webp --out-file $D/insets/door-kuindzhi-hidden.webp --size 1536x1024 --prompt "$INSET Keep the wet bare footprints and duckweed traces on the path exactly where they are."
CAT="A small grey tabby village cat curled up asleep, seen from slightly above (elevated three-quarter view, as in an isometric game), lit by cool moonlight from the front right. Luminous oil painting in the manner of Arkhip Kuindzhi's 'Ukrainian Night'. The whole cat visible on a fully transparent background, no ground, no shadow, no scenery, no text."
$G --prompt "$CAT" --size 1024x1024 --transparent --out-file $D/cat-kuindzhi.webp
$G --edit $D/cat-kuindzhi.webp --out-file $D/cat-kuindzhi-sheet.webp --size 1536x1024 --transparent --prompt "Keep exactly the same cat, fur pattern, size, viewing angle, lighting and oil-painting style. Draw an animation sprite sheet: one horizontal row of 4 frames, evenly spaced, the cat in the same place and the same size in every frame: frame 1 curled up asleep; frame 2 still curled up but lifting its head with ears pricked; frame 3 licking a raised front paw; frame 4 head lowered again, eyes half closed, tail tip curled. Fully transparent background, no ground, no frame lines, no numbers, no text."
