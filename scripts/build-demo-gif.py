"""Encode the screenshots captured by verify-browser.mjs; never generate app evidence."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / '.artifacts/m3/frames.json').read_text())
frames = []
for item in manifest:
    with Image.open(item['path']) as screenshot:
        frames.append(screenshot.convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT))
output = root / 'docs/gifs/m3-skill-tree-explorer.gif'
output.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(output, save_all=True, append_images=frames[1:], duration=[item['duration'] for item in manifest], loop=0, optimize=False, disposal=2)
print(f'Created {output.relative_to(root)} ({len(frames)} frames, {output.stat().st_size:,} bytes)')
