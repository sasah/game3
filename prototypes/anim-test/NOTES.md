# Animation test (2026-10-23)

## Sprite sheet — `sheet-smoke.webp`
gpt-image-2.5-flare edit of `prototypes/styles/img/golova-kuindzhi.webp`, 1536x1024, high, transparent.
4 frames of 384 px each. Feet x-extent per frame: 82–360 / 81–359 / 80–359 / 81–359, and every bottom edge is at y≈999,
so the feet line up within 2 px. Face, hat, coat and sash stay consistent. 47% of pixels have alpha<10.
Usage: 3,040 tokens.

## Video — not possible
`sora-2` and `sora-2-pro` are still listed by GET /v1/models. GET /v1/models/sora-2 reports `"shutdown_date": "2026-09-24"`.
POST /v1/videos (sora-2, 4 s, 720x1280, input_reference = sprite composited on #808080) → HTTP 404 with an empty body.
GET /v1/videos → HTTP 404 too. The OpenAI video-generation guide confirms the Videos API and Sora 2 were shut down
on 2026-09-24 with no replacement. Even before then, input images containing human faces were rejected.
No video or frames were produced. Cost: $0.
