#!/usr/bin/env python3

res = "(function() {\n\n"

res += open("src/frame.js").read()
res += open("src/atlas.js").read()
res += open("src/sprite.js").read()
res += open("src/spritebatch.js").read()

res += "\n\n})();"

open("spritegl.js", "w").write(res);
