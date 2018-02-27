#!/usr/bin/env python3

import os.path

thisDir = os.path.dirname(__file__)

res = "(function() {\n\n"

res += open(thisDir + "/src/sprite.js").read()
res += open(thisDir + "/src/camera.js").read()
res += open(thisDir + "/src/frame.js").read()
res += open(thisDir + "/src/atlas.js").read()
res += open(thisDir + "/src/spritebatch.js").read()

res += "\n\n})();"

open(thisDir + "/spritegl.js", "w").write(res);
