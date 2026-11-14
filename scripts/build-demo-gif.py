"""Encode the screenshots captured by verify-browser.mjs; never generate app evidence."""
import json
import argparse
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--milestone', choices=['m3', 'm4', 'm5'], default='m3')
args = parser.parse_args()
sources = {'m3': [('frames.json', 'skill-tree-explorer')], 'm4': [('crud-frames.json', 'quest-crud'), ('panes-frames.json', 'quest-panes'), ('status-frames.json', 'status-xp')], 'm5': [('dashboard-frames.json', 'dashboard'), ('reset-frames.json', 'database-reset'), ('filters-frames.json', 'quest-filters'), ('final-frames.json', 'final-walkthrough')]}[args.milestone]
for source, label in sources:
    manifest = json.loads((root / '.artifacts' / args.milestone / source).read_text())
    frames = []
    for item in manifest:
        with Image.open(item['path']) as screenshot:
            frames.append(screenshot.convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT))
    output = root / 'docs/gifs' / f'{args.milestone}-{label}.gif'
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=[item['duration'] for item in manifest], loop=0, optimize=False, disposal=2)
    print(f'Created {output.relative_to(root)} ({len(frames)} frames, {output.stat().st_size:,} bytes)')
