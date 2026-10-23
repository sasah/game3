# Calibrate a relative depth estimate of a painting against the blockout's orthographic depth,
# then pack it into the same 24-bit RGB format the runtime reads.
import sys, numpy as np
from PIL import Image
da_npy, blockout_png, out_png = sys.argv[1:4]
e = np.asarray(Image.open(blockout_png).convert('RGB')).astype(np.float64)
zb = e[..., 0] / 255 + e[..., 1] / 255 / 255 + e[..., 2] / 255 / 65025  # 0..1 linear ortho depth
H, W = zb.shape
d = np.asarray(Image.fromarray((np.load(da_npy) * 65535).astype(np.uint16)).resize((W, H), Image.BICUBIC)).astype(np.float64) / 65535
# Depth Anything gives inverse-depth-like values (near = large). Fit zb ~ poly(d) robustly.
X = np.stack([np.ones_like(d), d, d * d], -1).reshape(-1, 3)
y = zb.reshape(-1)
keep = np.ones_like(y, bool)
for it in range(6):
    coef, *_ = np.linalg.lstsq(X[keep], y[keep], rcond=None)
    r = X @ coef - y
    s = np.std(r[keep])
    keep = np.abs(r) < 2.0 * s
    print(f'iter {it}: rms {s:.5f} kept {keep.mean():.3f}')
z = np.clip((X @ coef).reshape(H, W), 0, 0.99999)
print('coef', coef, 'median abs err (0..1 depth units)', np.median(np.abs(z - zb)))
enc = np.stack([z, (z * 255) % 1, (z * 65025) % 1], -1)
enc[..., 0] -= enc[..., 1] / 255
enc[..., 1] -= enc[..., 2] / 255
img = np.clip(np.round(enc * 255), 0, 255).astype(np.uint8)
Image.fromarray(img, 'RGB').save(out_png)
np.save(out_png.replace('.png', '.npy'), z)
