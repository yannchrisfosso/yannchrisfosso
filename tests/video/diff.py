# Compare deux captures : écart moyen des pixels (0 = identiques).
import sys
from PIL import Image, ImageChops, ImageStat
a, b = (Image.open(p).convert("L") for p in sys.argv[1:3])
print(round(ImageStat.Stat(ImageChops.difference(a, b)).mean[0], 2))
