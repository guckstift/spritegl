webgl.plugins.spritebatch = spritebatch;

var spriteStartCapacity = 16;
var spriteBlockLength = 11;
var spriteShader = undefined;

var spriteShaderVert = [
	"attribute float aVert;",
	"attribute vec2 aPos;",
	"attribute vec2 aSize;",
	"attribute vec2 aAnchor;",
	"attribute vec2 aTexCoordPos;",
	"attribute vec2 aTexCoordSize;",
	"attribute float aTexId;",
	"uniform vec2 uScreenSize;",
	"varying vec2 vTexCoord;",
	"varying float vTexId;",
	"void main() {",
	"	vec2 vert = vec2(mod(aVert, 2.0), floor(aVert / 2.0));",
	"	vec2 screenPos = (vert - aAnchor) * aSize + aPos;",
	"	vec2 clipPos = screenPos * vec2(+2.0, -2.0) / uScreenSize + vec2(-1.0, +1.0);",
	"	gl_Position = vec4(clipPos, 0.0, 1.0);",
	"	vTexCoord = aTexCoordPos + aTexCoordSize * vert;",
	"	vTexId = aTexId;",
	"}",
].join("\n");

var spriteShaderFrag = [
	"precision highp float;",
	"uniform sampler2D uTextures[8];",
	"varying vec2 vTexCoord;",
	"varying float vTexId;",
	"void main() {",
	"	for(float i=0.0; i<8.0; i++) {",
	"		if(i == vTexId) {",
	"			gl_FragColor = texture2D(uTextures[int(i)], vTexCoord);",
	"		}",
	"	}",
	"}",
].join("\n");

function spritebatch()
{
	return new SpriteBatch(this);
}

function SpriteBatch(gl)
{
	if(!spriteShader) {
		spriteShader = gl.shader(spriteShaderVert, spriteShaderFrag);
	}
	
	this.gl = gl;
	this.orderFunc = undefined;
	this.capacity = spriteStartCapacity;
	this.count = 0;
	this.textures = [];
	this.vertices = gl.buffer("byte", [0, 1, 2, 3]);
	this.spritebuf = gl.buffer("float", this.capacity * spriteBlockLength);
	this.sprites = Array(spriteStartCapacity);
}

SpriteBatch.prototype = {

	constructor: SpriteBatch,
	
	textureId: function(texture)
	{
		var id = this.textures.indexOf(texture);
		
		if(id === -1) {
			this.textures.push(texture);
			return this.textures.length - 1;
		}
		
		return id;
	},
	
	add: function(sprite)
	{
		if(sprite.batch === this) {
			return this;
		}
		
		var id = this.count;
		
		this.count ++;
		
		if(this.count > this.capacity) {
			this.capacity *= 2;
			this.spritebuf.resize(this.capacity * spriteBlockLength);
		}
		
		this.sprites[id] = sprite;
		this.sprites[id].batch = this;
		this.sprites[id].id = id;
		this.reorder(sprite);
		this.update(sprite);
		
		return this;
	},
	
	remove: function(sprite)
	{
		if(sprite.batch !== this) {
			return this;
		}
		
		var id = sprite.id;
		
		this.count --;
		
		if(this.count > id) {
			sprite = this.sprites[this.count];
			this.sprites[id] = sprite;
			this.sprites[id].id = id;
			this.reorder(sprite);
			this.update(sprite);
			this.sprites.splice(this.count, 1);
		}
		
		return this;
	},
	
	update: function(sprite)
	{
		var anchor = [
			(sprite.anchor[0] * sprite.frame.osize[0] - sprite.frame.pad[0]) / sprite.frame.size[0],
			(sprite.anchor[1] * sprite.frame.osize[1] - sprite.frame.pad[1]) / sprite.frame.size[1],
		];
		
		this.spritebuf.set(
			sprite.id * spriteBlockLength, [
			sprite.pos[0],
			sprite.pos[1],
			sprite.frame.size[0],
			sprite.frame.size[1],
			anchor[0],
			anchor[1],
			sprite.frame.texcoordpos[0],
			sprite.frame.texcoordpos[1],
			sprite.frame.texcoordsize[0],
			sprite.frame.texcoordsize[1],
			this.textureId(sprite.frame.texture),
		]);
		
		return this;
	},
	
	reorder: function(sprite)
	{
		if(this.orderFunc) {
			while(
				sprite.id < this.count - 1 &&
				this.orderFunc(sprite, this.sprites[sprite.id + 1]) > 0
			) {
				var tmp = this.sprites[sprite.id + 1];
				
				this.sprites[sprite.id + 1] = sprite;
				this.sprites[sprite.id] = tmp;
				
				sprite.id ++;
				tmp.id --;
				
				this.update(sprite);
				this.update(tmp);
			}
			
			while(
				sprite.id > 0 &&
				this.orderFunc(sprite, this.sprites[sprite.id - 1]) < 0
			) {
				var tmp = this.sprites[sprite.id - 1];
				
				this.sprites[sprite.id - 1] = sprite;
				this.sprites[sprite.id] = tmp;
				
				sprite.id --;
				tmp.id ++;
				
				this.update(sprite);
				this.update(tmp);
			}
		}
	},
	
	draw: function()
	{
		if(this.count === 0) {
			return this;
		}
		
		spriteShader
			.draw({
				mode: "trianglestrip", count: 4, instances: this.count,
				stride: 4 * spriteBlockLength, divisor: 1, buffer: this.spritebuf,
				uScreenSize: this.gl.size,
				uTextures: this.textures,
				aVert: { buffer: this.vertices, stride: 0, divisor: 0 }, 
				aPos: { offset: 0 * 4 },
				aSize: { offset: 2 * 4 },
				aAnchor: { offset: 4 * 4 },
				aTexCoordPos: { offset: 6 * 4 },
				aTexCoordSize: { offset: 8 * 4 },
				aTexId: { offset: 10 * 4 },
			});
		
		return this;
	},

};
