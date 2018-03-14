(function() {

webgl.plugins.sprite = sprite;

function sprite(frame, pos, anchor)
{
	return new Sprite(frame, pos, anchor);
}

function Sprite(frame, pos, anchor)
{
	this.batch = undefined;
	this.id = undefined;
	
	this.setFrame(frame);
	this.setPos(pos || [0, 0]);
	this.setAnchor(anchor || [0.5, 0.5]);
	this.setScale([1, 1]);
}

Sprite.prototype = {

	constructor: Sprite,
	
	setFrame: function(frame)
	{
		this.frame = frame;
		
		if(this.batch) {
			this.batch.update(this);
		}
		
		return this;
	},
	
	setPos: function(pos)
	{
		this.pos = pos;
		
		if(this.batch) {
			this.batch.reorder(this);
			this.batch.update(this);
		}
		
		return this;
	},
	
	setAnchor: function(anchor)
	{
		this.anchor = anchor;
		
		if(this.batch) {
			this.batch.update(this);
		}
		
		return this;
	},
	
	setScale: function(scale)
	{
		this.scale = scale;
		
		if(this.batch) {
			this.batch.update(this);
		}
		
		return this;
	},

};
webgl.plugins.spritecamera = Camera;

function Camera(pos, focus, zoom)
{
	if(!(this instanceof Camera)) {
		return new Camera(pos, focus, zoom);
	}
	
	this.pos = pos || [0, 0];
	this.focus = focus || [0, 0];
	this.zoom = zoom || 1;
}

Camera.prototype = {

	constructor: Camera,
	
	move: function(relX, relY)
	{
		this.pos[0] += relX;
		this.pos[1] += relY;
	},

};
function Frame(texture, framedata)
{
	return {
		texture: texture,
		name: framedata.name,
		size: framedata.size,
		osize: framedata.osize,
		pos: framedata.pos,
		pad: framedata.pad,
		texcoordpos: [framedata.pos[0] / texture.size[0], framedata.pos[1] / texture.size[1]],
		texcoordsize: [framedata.size[0] / texture.size[0], framedata.size[1] / texture.size[1]],
	};
}
var atlasCache = {};

webgl.plugins.atlas = atlas;
webgl.loadJson = loadJson;
webgl.frame = Frame;

function atlas(url, readyFunc)
{
	var frames = {};
	
	if(atlasCache[url]) {
		if(readyFunc) {
			readyFunc(frames);
		}
		
		return atlasCache[url];
	}

	loadJson(url, jsonLoad.bind(this));

	return frames;

	function jsonLoad(json)
	{
		var tex = this.textureFromUrl(json.texurl, texLoad.bind(this));
	
		function texLoad()
		{
			for(var i=0; i<json.frames.length; i++) {
			
				frames[json.frames[i].name] = Frame(tex, json.frames[i]);
			}
			
			if(readyFunc) {
				readyFunc(frames);
			}
		}
	}
}

function loadJson(url, callback)
{
	webgl.loadText(url, textLoad);
	
	function textLoad(text)
	{
		callback(JSON.parse(text));
	}
}
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
	"uniform vec2 uCamPos;",
	"uniform vec2 uCamFocus;",
	"uniform float uZoom;",
	"uniform bool uNoScale;",
	"varying vec2 vTexCoord;",
	"varying float vTexId;",
	"void main() {",
		"vec2 vert = vec2(mod(aVert, 2.0), floor(aVert / 2.0));",
		"vec2 screenPos = (vert - aAnchor) * aSize * (uNoScale ? 1.0 : uZoom) + aPos * uZoom;",
		"screenPos -= uCamPos * uZoom;",
		"screenPos += uScreenSize * uCamFocus;",
		"vec2 clipPos = screenPos * vec2(+2.0, -2.0) / uScreenSize + vec2(-1.0, +1.0);",
		"gl_Position = vec4(clipPos, 0.0, 1.0);",
		"vTexCoord = aTexCoordPos + aTexCoordSize * vert;",
		"vTexId = aTexId;",
	"}",
].join("\n");

var spriteShaderFrag = [
	"precision highp float;",
	"uniform sampler2D uTextures[8];",
	"varying vec2 vTexCoord;",
	"varying float vTexId;",
	"void main() {",
		"for(float i=0.0; i<8.0; i++) {",
			"if(i == vTexId) {",
				"gl_FragColor = texture2D(uTextures[int(i)], vTexCoord);",
			"}",
		"}",
	"}",
].join("\n");

function spritebatch(usage, camera, noScale)
{
	return new SpriteBatch(this, usage, camera, noScale);
}

function SpriteBatch(gl, usage, camera, noScale)
{
	if(usage instanceof Camera) {
		noScale = camera;
		camera = usage;
		usage = undefined;
	}
	
	usage = usage || "static";
	camera = camera || Camera();
	noScale = noScale || false;
	
	if(!spriteShader) {
		spriteShader = gl.shader(spriteShaderVert, spriteShaderFrag);
	}
	
	this.gl = gl;
	this.orderFunc = undefined;
	this.capacity = spriteStartCapacity;
	this.count = 0;
	this.textures = [];
	this.camera = camera;
	this.noScale = noScale;
	this.vertices = gl.buffer("byte", [0, 1, 2, 3]);
	this.spritebuf = gl.buffer(usage, "float", this.capacity * spriteBlockLength);
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
	
	clear: function()
	{
		for(var i=0; i<this.count; i++) {
			this.sprites[i].batch = undefined;
		}
		
		this.count = 0;
		
		return this;
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
			sprite.frame.size[0] * sprite.scale[0],
			sprite.frame.size[1] * sprite.scale[1],
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
		
		return this;
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
				uCamPos: this.camera.pos,
				uCamFocus: this.camera.focus,
				uZoom: this.camera.zoom,
				uNoScale: this.noScale,
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


})();