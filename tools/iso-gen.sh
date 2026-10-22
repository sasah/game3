#!/usr/bin/env bash
# Paints the holova's yard over its 3D blockout and makes the hero sprites (two styles).
# Run from the repo root in a session that has OPENAI_API_KEY. ~8 images.
set -euo pipefail
G="python3 tools/gen-image.py --quality high"
D=prototypes/iso/img

LAYOUT="Repaint this rough 3D blockout as a finished illustration. Keep EXACTLY the same elevated three-quarter isometric camera angle, the same composition and the same position, size and outline of every object, so the painting lines up with the blockout: the long whitewashed mazanka hut with a thick thatched hip roof in the centre (door and two small windows on its front wall facing the lower left, a small window on its right end), the smaller whitewashed komora storehouse with a thatched roof to the right, the wattle fence around the yard with clay jugs upside down on the stakes and a gap for a gate at the bottom, the dirt path from the hut door through the gate down to the pond, the well with a tall well-sweep (zhuravel) on the left, cherry trees in full white blossom where the white blobs are, three tall Lombardy poplars behind the hut, a haystack at the top right, a weeping willow and reeds at the pond in the lower left, a bench by the hut wall. Moonlit May night, the moon is to the front right: the whitewashed walls glow silver-white, warm candlelight in the two front windows, long soft shadows falling up and to the left, thin silver mist over the pond, dark blue-green grass. No people, no animals. Historical Poltava region around 1811. No text, no letters, no signature, no frame."
KUINDZHI="STYLE: a luminous academic oil painting in the manner of Arkhip Kuindzhi's 'Ukrainian Night' (1876): deep blue-green night palette, moonlit white walls glowing almost magically, dramatic contrast of light and deep shadow, soft visible brushwork."
ENGRAVING="STYLE: a 19th-century book illustration made as a fine steel engraving, like the illustrated editions of Gogol from the 1840s-1870s: delicate cross-hatching and stippling, rich tonal depth from line alone, warm sepia-black ink on slightly aged cream paper."
HIDDEN="Keep this image identical: same painting, composition, lighting and style, change nothing else. Add only subtle hidden traces, as if revealed by candlelight: a trail of dark wet bare footprints with drips of pond water and strands of green duckweed leading from the edge of the pond up the path, through the gate in the fence and across the yard to the door of the small storehouse (komora) on the right; a wreath of maple leaves hanging on the komora door; a clump of pond weed caught on the fence stakes by the gate. The traces have a faint cold greenish sheen."
HERO="Full-length character sprite on a fully transparent background, seen from slightly above (elevated three-quarter view, as in an isometric game), walking toward the lower left: a young former seminarian of the Kyiv bursa, now a poor copyist of the Poltava treasury chamber, about 24, lanky and thin, long dark hair tied at the neck, a thin youthful moustache, clever nervous face; a worn dark-green government clerk's frock coat over a white homespun shirt, wide dark trousers tucked into dusty boots, a leather satchel stuffed with papers on a strap across his chest, ink-stained fingers, holding a lit tallow candle stub in a small tin holder in front of him. Mid-stride. The whole figure from head to boots visible, nothing cut off, no ground shadow, no scenery, no text."
BACK="Keep exactly the same young man, face, hair, clothes, satchel, candle and style. Redraw him seen from behind, walking away toward the upper right, still seen from slightly above. Full figure head to boots on a fully transparent background, no ground shadow, no scenery."
TO_ENGRAVING="Keep exactly the same character, pose, clothes and proportions, but redraw him as a 19th-century steel engraving book illustration: delicate cross-hatching, sepia-black ink. Full figure on a fully transparent background, no paper texture outside the figure, no ground shadow, no scenery."

$G --edit $D/blockout/guide.png --out-file $D/yard-kuindzhi.webp --size 1536x1024 --prompt "$LAYOUT

$KUINDZHI"
$G --edit $D/blockout/guide.png --out-file $D/yard-engraving.webp --size 1536x1024 --prompt "$LAYOUT

$ENGRAVING"
$G --edit $D/yard-kuindzhi.webp --out-file $D/yard-kuindzhi-hidden.webp --size 1536x1024 --prompt "$HIDDEN"
$G --edit $D/yard-engraving.webp --out-file $D/yard-engraving-hidden.webp --size 1536x1024 --prompt "$HIDDEN"
$G --prompt "$HERO

$KUINDZHI" --size 1024x1536 --transparent --out-file $D/hero-kuindzhi-front.webp
$G --edit $D/hero-kuindzhi-front.webp --out-file $D/hero-kuindzhi-back.webp --size 1024x1536 --transparent --prompt "$BACK"
$G --edit $D/hero-kuindzhi-front.webp --out-file $D/hero-engraving-front.webp --size 1024x1536 --transparent --prompt "$TO_ENGRAVING"
$G --edit $D/hero-kuindzhi-back.webp --out-file $D/hero-engraving-back.webp --size 1024x1536 --transparent --prompt "$TO_ENGRAVING"
