# Depth from a painting

Estimates per-pixel depth of a generated painting with Depth Anything V2 (small, ONNX, CPU,
~3 s), calibrates it to the blockout's orthographic depth, and derives normals.

```sh
pip install onnxruntime
curl -L -o model.onnx https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
python3 -I tools/depth/run_depth.py model.onnx prototypes/iso/img/yard-kuindzhi.webp da.png      # relative depth (+ da.npy)
python3 -I tools/depth/fit_depth.py da.npy prototypes/iso/img/blockout/depth.png prototypes/iso/img/depth-kuindzhi.png
python3 -I tools/depth/normals.py prototypes/iso/img/depth-kuindzhi.npy prototypes/iso/img/normal-kuindzhi.png 26 1 140
```

The packed depth uses the same 24-bit RGB format as the blockout depth, so the runtime can use
either. `prototypes/iso/lab/parallax.html` shows the painting displaced by its own depth.
