# Pack the frames from render_tumble.py into one sprite sheet for scripts/flyby.js.
#
# usage: python3 pack_sheet.py <frames dir> <out.webp> [cols] [max side px]
#   defaults: 25 columns (600 frames -> 25 x 24 grid) and 160px frames,
#   which keeps the sheet under 4096px a side for older phones.
#
# Every frame is cropped to the same box (the union of all frames), so the
# craft doesn't jump around as it turns. Prints the frame size; copy it into
# the CRAFT list in scripts/flyby.js (frameW, frameH).
#
# Needs Pillow (pip install pillow).
import glob
import os
import sys

from PIL import Image

src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 25
max_side = int(sys.argv[4]) if len(sys.argv) > 4 else 160

frames = [Image.open(f).convert('RGBA') for f in sorted(glob.glob(os.path.join(src, 'f_*.png')))]
if not frames:
    raise SystemExit('no f_*.png frames in ' + src)
boxes = [f.getchannel('A').getbbox() for f in frames]
box = (min(b[0] for b in boxes), min(b[1] for b in boxes),
       max(b[2] for b in boxes), max(b[3] for b in boxes))
w, h = box[2] - box[0], box[3] - box[1]
scale = max_side / max(w, h)
fw, fh = round(w * scale), round(h * scale)
rows = -(-len(frames) // cols)

sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f.crop(box).resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
sheet.save(out, 'WEBP', quality=78, method=6)
print(f'{len(frames)} frames, frame {fw}x{fh}, sheet {sheet.size[0]}x{sheet.size[1]}, '
      f'{os.path.getsize(out) // 1024} KB -> {out}')
