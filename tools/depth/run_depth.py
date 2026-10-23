import sys, time, numpy as np, onnxruntime as ort
from PIL import Image
model, src, out = sys.argv[1:4]
img = Image.open(src).convert('RGB')
W, H = 1036, 686  # multiples of 14, close to the 1536x1024 aspect
x = np.asarray(img.resize((W, H), Image.BICUBIC), dtype=np.float32) / 255.0
x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
x = x.transpose(2, 0, 1)[None].astype(np.float32)
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
t0 = time.time()
d = sess.run(None, {sess.get_inputs()[0].name: x})[0].squeeze()
print('inference', round(time.time() - t0, 1), 's', d.shape, float(d.min()), float(d.max()))
d = (d - d.min()) / (d.max() - d.min())
Image.fromarray((d * 255).astype(np.uint8)).resize(img.size, Image.BICUBIC).save(out)
np.save(out.replace('.png', '.npy'), d)
