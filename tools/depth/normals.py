# View-space normals from a calibrated orthographic depth map (same packing as MeshNormalMaterial).
import sys, numpy as np
from PIL import Image, ImageFilter
z_npy, out_png, view_w, near, far = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
z = np.load(z_npy)
H, W = z.shape
vz = near + z * (far - near)
px = view_w / W  # metres per pixel (square pixels in the ortho frame)
dzdx = np.gradient(vz, axis=1) / px
dzdy = -np.gradient(vz, axis=0) / px  # image rows go down, camera y goes up
# Surface z_cam = -vz; normal of (x, y, -vz(x, y)) is (-dvz/dx... ) up to sign; facing the camera = +z.
n = np.stack([dzdx, dzdy, np.ones_like(vz)], -1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
img = Image.fromarray(np.clip((n * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(1.2))
img.save(out_png)
