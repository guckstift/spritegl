var webgl = (function() {

var plugins = {};

webgl.plugins = plugins;
webgl.loadText = loadText;

function webgl(w, h)
{
	var width = w;
	var height = h;
	
	if(Array.isArray(width)) {
		height = width[1];
		width = width[0];
	}
	
	var setSize = typeof width === "number" && typeof height === "number"
	var argc = arguments.length;
	var toBody = false;
	var fullPage = false;
	var renderFunc = undefined;
	
	var options = {
		alpha: true,
		depth: true,
		stencil: false,
		antialias: true,
		premultipliedAlpha: true,
		preserveDrawingBuffer: false,
		failIfMajorPerformanceCaveat: false,
	}
	
	for(var i=0; i<argc; i++) {
		var arg = arguments[i];
		
		if(typeof arg === "string") {
			var negate = arg.substr(0, 3) === "no-";
			
			if(negate) {
				arg = arg.substr(3);
			}
			
			if(options.hasOwnProperty(arg)) {
				options[arg] = !negate;
			}
			else if(arg === "appendToBody") {
				toBody = true;
			}
			else if(arg === "fullPage") {
				fullPage = true;
			}
		}
		else if(typeof arg === "function") {
			renderFunc = arg;
		}
	}
	
	var gl = document.createElement("canvas").getContext("webgl", options);
	
	gl.ia = gl.getExtension("ANGLE_instanced_arrays");
	gl.fd = gl.getExtension("EXT_frag_depth");
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	gl.fullPage = false;
	gl.renderFunc = undefined;
	gl.frameLoopStarted = false;
	gl.lastShader = undefined;
	gl.sizeBackup = [0, 0];
	
	gl.resize = resize;
	gl.enableFullPage = enableFullPage;
	gl.disableFullPage = disableFullPage;
	gl.appendTo = appendTo;
	gl.appendToBody = appendToBody;
	gl.setClearColor = setClearColor;
	gl.setRenderFunc = setRenderFunc;
	gl.useShader = useShader;
	gl.buffer = buffer;
	gl.shader = shader;
	gl.shaderFromUrl = shaderFromUrl;
	gl.texture = texture;
	gl.textureFromUrl = textureFromUrl;
	
	gl.onWindowResize = function()
	{
		gl.resize(innerWidth, innerHeight);
	};
	
	if(setSize) {
		gl.resize(width, height);
	}
	else {
		gl.resize(800, 600);
	}
	
	if(toBody) {
		gl.appendToBody();
	}
	
	if(fullPage) {
		gl.enableFullPage();
	}
	
	if(renderFunc) {
		gl.setRenderFunc(renderFunc);
	}
	
	var pluginKeys = Object.getOwnPropertyNames(plugins);
	
	for(var i=0; i<pluginKeys.length; i++) {
		var key = pluginKeys[i];
		
		gl[key] = plugins[key];
	}
	
	return gl;
}

function resize(width, height)
{
	if(Array.isArray(width)) {
		height = width[1];
		width = width[0];
	}
	
	this.canvas.width = width;
	this.canvas.height = height;
	this.size = [width, height];
	this.viewport(0, 0, width, height);

	return this;
}

function enableFullPage()
{
	this.canvas.style.position = "absolute";
	this.canvas.style.top = "0";
	this.canvas.style.left = "0";
	this.sizeBackup = [this.canvas.width, this.canvas.height];

	addEventListener("resize", this.onWindowResize);

	this.onWindowResize();
	
	return this;
}

function disableFullPage()
{
	this.canvas.style.position = "";
	this.canvas.style.top = "";
	this.canvas.style.left = "";

	removeEventListener("resize", this.onWindowResize);
	
	this.resize(this.sizeBackup);
	
	return this;
}

function appendTo(elm)
{
	if(typeof elm === "string") {
		elm = document.querySelector(elm);
	}
	
	elm.append(this.canvas);

	return this;
}

function appendToBody()
{
	this.appendTo(document.body);

	return this;
}

function setClearColor(r, g, b, a)
{
	if(Array.isArray(r)) {
		g = r[1];
		b = r[2];
		a = r[3];
		r = r[0];
	}
	
	this.clearColor(r, g, b, a);
}

function setRenderFunc(func)
{
	var self = this;
	
	this.renderFunc = func;
	
	if(this.frameLoopStarted === false) {
		this.frameLoopStarted = true;
		requestAnimationFrame(frame);
	}
	
	function frame(now)
	{
		if(self.renderFunc) {
			self.clear(self.COLOR_BUFFER_BIT);
			self.renderFunc(now);
			requestAnimationFrame(frame);
		}
		else {
			self.frameLoopStarted = false;
		}
	}
}

function useShader(shader)
{
	if(this.lastShader !== shader) {
		this.useProgram(shader);
		this.lastShader = shader;
	}
}

function combineTextFromUrls(urls, srcMap)
{
	var res = "";

	for(var i=0; i<urls.length; i++) {
		var url = urls[i];
		var text = srcMap[url];
		res += text;
	}

	return res;
}

function loadText(url, callback)
{
	var xhr = new XMLHttpRequest();

	xhr.open("GET", url);
	xhr.addEventListener("load", xhrLoad);
	xhr.send();

	function xhrLoad()
	{
		if(xhr.status === 200) {
			callback(xhr.responseText);
		}
	}
}
function buffer()
{
	var buffer = this.createBuffer();
	var argc = arguments.length;
	var index = false;
	var len = 0;
	var data = [];
	
	var usages = {
		"static":  this.STATIC_DRAW,
		"dynamic": this.DYNAMIC_DRAW,
		"stream":  this.STREAM_DRAW,
	};
	
	var types = {
		"byte":   { arrayType: Int8Array,    glType: this.BYTE },
		"short":  { arrayType: Int16Array,   glType: this.SHORT },
		"ubyte":  { arrayType: Uint8Array,   glType: this.UNSIGNED_BYTE },
		"ushort": { arrayType: Uint16Array,  glType: this.UNSIGNED_SHORT },
		"float":  { arrayType: Float32Array, glType: this.FLOAT },
	};
	
	for(var i=0; i<argc; i++) {
		var arg = arguments[i];
		
		if(typeof arg === "string") {
			if(usages.hasOwnProperty(arg)) {
				buffer.usage = arg;
			}
			else if(types.hasOwnProperty(arg)) {
				buffer.type = arg;
			}
			else if(arg === "index") {
				buffer.index = true;
			}
		}
		else if(typeof arg === "number") {
			len = arg;
		}
		else if(Array.isArray(arg)) {
			len = arg.length;
			data = arg;
		}
	}
	
	buffer.usage = buffer.usage || "static";
	buffer.index = buffer.index || false;
	buffer.type = buffer.type || (buffer.index ? "ushort" : "float");
	
	buffer.arrayType = types[buffer.type].arrayType;
	buffer.bytesPerElm = buffer.arrayType.BYTES_PER_ELEMENT;
	buffer.glType = types[buffer.type].glType;
	buffer.glUsage = usages[buffer.usage];
	buffer.target = buffer.index ? this.ELEMENT_ARRAY_BUFFER : this.ARRAY_BUFFER;

	buffer.gl = this;

	buffer.resize = bufferResize;
	buffer.set = bufferSet;
	buffer.update = bufferUpdate;
	
	buffer.resize(len);
	buffer.set(0, data);
	
	return buffer;
}

function bufferResize(len)
{
	var gl = this.gl;
	var data = new this.arrayType(len);
	
	if(this.data) {
		data.set(this.data.subarray(0, Math.min(this.len, len)));
	}
	
	this.data = data;
	this.len = len;
	
	gl.bindBuffer(this.target, this);
	gl.bufferData(this.target, this.data, this.glUsage);
	
	this.invalidRange = [this.len, 0];
	
	return this;
}

function bufferSet(offset, data)
{
	data = Array.isArray(data) ? data : [data];
	
	this.data.set(data, offset);
	
	this.invalidRange = [
		Math.min(this.invalidRange[0], offset),
		Math.max(this.invalidRange[1], offset + data.length),
	];
	
	return this;
}

function bufferUpdate()
{
	var gl = this.gl;
	
	if(this.invalidRange[0] < this.invalidRange[1]) {
		gl.bindBuffer(this.target, this);
	
		gl.bufferSubData(
			this.target, this.invalidRange[0] * this.arrayType.BYTES_PER_ELEMENT,
			this.data.subarray(this.invalidRange[0], this.invalidRange[1])
		);
	
		this.invalidRange = [this.len, 0];
	}
	
	return this;
}
var shaderCache = {};

function createShader(gl)
{
	var prog = gl.createProgram();
	
	prog.vertShader = gl.createShader(gl.VERTEX_SHADER);
	prog.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	
	prog.gl = gl;
	prog.ready = false;
	prog._indices = undefined;
	prog._mode = undefined;
	prog._stride = undefined;
	prog._offset = undefined;
	prog._count = undefined;
	prog._divisor = undefined;
	prog._instances = undefined;
	prog._buffer = undefined;
	
	prog.indices = shaderIndices;
	prog.mode = shaderMode;
	prog.stride = shaderStride;
	prog.offset = shaderOffset;
	prog.count = shaderCount;
	prog.divisor = shaderDivisor;
	prog.instances = shaderInstances;
	prog.buffer = shaderBuffer;
	prog.assign = shaderAssign;
	prog.draw = shaderDraw;
	
	return prog;
}

function shader(vert, frag)
{
	var shaderId = null;
	var prog = createShader(this);
	
	try {
		if(
			typeof vert === "string" && typeof frag === "string" &&
			document.querySelector(vert) && document.querySelector(frag)
		) {
			shaderId = vert + "|" + frag;
		
			if(shaderCache[shaderId]) {
				return shaderCache[shaderId];
			}
		}
	
		var vertElm = typeof vert === "string" ? document.querySelector(vert) : vert;
		var fragElm = typeof frag === "string" ? document.querySelector(frag) : frag;
	}
	catch(e) {
	}
	
	vert = vertElm instanceof Node ? vertElm.textContent : vert;
	frag = fragElm instanceof Node ? fragElm.textContent : frag;
	
	compileShader(prog, vert, frag);
	
	shaderCache[shaderId] = prog;
	
	return prog;
}

function shaderFromUrl(vertUrls, fragUrls, readyFunc)
{
	vertUrls = Array.isArray(vertUrls) ? vertUrls : [vertUrls];
	fragUrls = Array.isArray(fragUrls) ? fragUrls : [fragUrls];
	
	var shaderId = vertUrls.join("|") + "|" + fragUrls.join("|");
	
	if(shaderCache[shaderId]) {
		if(readyFunc) {
			readyFunc(shaderCache[shaderId]);
		}
		
		return shaderCache[shaderId];
	}
	
	var prog = createShader(this);
	var vertUrlsToLoad = vertUrls.length;
	var fragUrlsToLoad = fragUrls.length;
	var vertSrcs = {};
	var fragSrcs = {};
	var vertSrc = null;
	var fragSrc = null;

	for(var i=0; i<vertUrls.length; i++) {
		loadText(vertUrls[i], vertSrcLoad.bind(this, vertUrls[i]));
	}

	for(var i=0; i<fragUrls.length; i++) {
		loadText(fragUrls[i], fragSrcLoad.bind(this, fragUrls[i]));
	}
	
	return prog;

	function vertSrcLoad(url, src)
	{
		vertSrcs[url] = src;
		vertUrlsToLoad --;

		if(vertUrlsToLoad === 0) {
			vertSrc = combineTextFromUrls(vertUrls, vertSrcs);
			
			if(vertSrc !== null && fragSrc !== null) {
				compileShader(prog, vertSrc, fragSrc);
				shaderCache[shaderId] = prog;
				
				if(readyFunc) {
					readyFunc(prog);
				}
			}
		}
	}

	function fragSrcLoad(url, src)
	{
		fragSrcs[url] = src;
		fragUrlsToLoad --;

		if(fragUrlsToLoad === 0) {
			fragSrc = combineTextFromUrls(fragUrls, fragSrcs);
			
			if(vertSrc !== null && fragSrc !== null) {
				compileShader(prog, vertSrc, fragSrc);
				shaderCache[shaderId] = prog;
				
				if(readyFunc) {
					readyFunc(prog);
				}
			}
		}
	}
}

function compileShader(prog, vertSrc, fragSrc)
{
	var gl = prog.gl;
	var texCnt = 0;
	
	gl.shaderSource(prog.vertShader, vertSrc);
	gl.shaderSource(prog.fragShader, fragSrc);

	gl.compileShader(prog.vertShader);
	gl.compileShader(prog.fragShader);

	if(!gl.getShaderParameter(prog.vertShader, gl.COMPILE_STATUS)) {
		throw(
			"Error: Vertex shader compilation failed: " +
			gl.getShaderInfoLog(prog.vertShader)
		);
	}

	if(!gl.getShaderParameter(prog.fragShader, gl.COMPILE_STATUS)) {
		throw(
			"Error: Fragment shader compilation failed: " +
			gl.getShaderInfoLog(prog.fragShader)
		);
	}

	gl.attachShader(prog, prog.vertShader);
	gl.attachShader(prog, prog.fragShader);
	gl.linkProgram(prog);

	if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		throw(
			"Error: Shader program linking failed: " +
			gl.getProgramInfoLog(prog)
		);
	}

	prog.attributes = {};
	prog.uniforms = {};

	gl.useProgram(prog);

	var numAttributes = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);

	for(var i=0; i<numAttributes; i++) {
		var info = gl.getActiveAttrib(prog, i);
		var name = info.name.match(/[a-zA-Z0-9_]+/)[0];
		
		prog.attributes[name] = {
			location: gl.getAttribLocation(prog, name),
			type: info.type,
		};
	}

	var numUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);

	for(var i=0; i<numUniforms; i++) {
		var info = gl.getActiveUniform(prog, i);
		var name = info.name.match(/[a-zA-Z0-9_]+/)[0];
	
		prog.uniforms[name] = {
			location: gl.getUniformLocation(prog, name),
			type: info.type,
			size: info.size,
			texUnit: info.type === gl.SAMPLER_2D ? texCnt : 0,
			texReady: false,
		};
		
		if(info.type === gl.SAMPLER_2D) {
			texCnt += info.size;
		}
	}
	
	prog.ready = true;
}

function shaderIndices(indices)
{
	var gl = this.gl;
	
	this._indices = indices;
	indices.update();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
	
	return this;
}

function shaderMode(mode)
{
	var gl = this.gl;
	
	this._mode = (
		mode == "points"        ? gl.POINTS :
		mode == "linestrip"     ? gl.LINE_STRIP :
		mode == "lineloop"      ? gl.LINE_LOOP :
		mode == "lines"         ? gl.LINES :
		mode == "trianglestrip" ? gl.TRIANGLE_STRIP :
		mode == "trianglefan"   ? gl.TRIANGLE_FAN :
		mode == "triangles"     ? gl.TRIANGLES :
		this._mode
	);
	
	return this;
}

function shaderStride(stride)
{
	this._stride = stride;
	
	return this;
};

function shaderOffset(offset)
{
	this._offset = offset;
	
	return this;
};

function shaderCount(count)
{
	this._count = count;
	
	return this;
};

function shaderDivisor(divisor)
{
	this._divisor = divisor;
	
	return this;
}

function shaderBuffer(buffer)
{
	this._buffer = buffer;
	
	return this;
}

function shaderInstances(instances)
{
	this._instances = instances;
	
	return this;
}

function shaderAssign(name, value)
{
	if(this.attributes.hasOwnProperty(name)) {
		shaderAssignAttribute.call(this, name, value);
	}
	else if(this.uniforms.hasOwnProperty(name)) {
		shaderAssignUniform.call(this, name, value);
	}
	
	return this;
}

function shaderAssignAttribute(name, value)
{
	var gl = this.gl;
	var attrib = this.attributes[name];
	
	var buffer = (
		value.buffer !== undefined ? value.buffer :
		value instanceof WebGLBuffer ? value :
		this._buffer !== undefined ? this._buffer :
		0
	);
	
	var offset = (
		value.offset !== undefined ? value.offset :
		this._offset !== undefined ? this._offset :
		0
	);
	
	var stride = (
		value.stride !== undefined ? value.stride :
		this._stride !== undefined ? this._stride :
		0
	);
	
	var divisor = (
		value.divisor !== undefined ? value.divisor :
		this._divisor !== undefined ? this._divisor :
		0
	);
	
	if(!attrib) {
		return this;
	}
	
	var type = attrib.type;
	var location = attrib.location;
	
	var components = (
		type === gl.FLOAT ? 1 :
		type === gl.FLOAT_VEC2 ? 2 :
		type === gl.FLOAT_VEC3 ? 3 :
		type === gl.FLOAT_VEC4 ? 4 :
		0
	);
	
	if(components === 0) {
		throw "Error: Attribute type not supported.";
	}
	
	buffer.update();
	gl.bindBuffer(buffer.target, buffer);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, components, buffer.glType, false, stride, offset);
	
	if(gl.ia) {
		gl.ia.vertexAttribDivisorANGLE(location, divisor);
	}
	
	return this;
}

function shaderAssignUniform(name, value)
{
	var gl = this.gl;
	var uniform = this.uniforms[name];

	if(!uniform) {
		return false;
	}
	
	var type = uniform.type;
	var location = uniform.location;
	var size = uniform.size;
	
	gl.useShader(this);
	
	if(type === gl.SAMPLER_2D) {
		if(size > 1) {
			var texUnits = Array(value.length);
	
			for(var i=0; i<value.length; i++) {
				texUnits[i] = uniform.texUnit + i;
				
				if(!value[i].ready) {
					uniform.texReady = false;
					return false;
				}
				
				gl.activeTexture(gl.TEXTURE0 + texUnits[i]);
				gl.bindTexture(gl.TEXTURE_2D, value[i]);
			}

			gl.uniform1iv(location, texUnits);
			uniform.texReady = true;
		}
		else {
			if(!value.ready) {
				uniform.texReady = false;
				return false;
			}
		
			gl.activeTexture(gl.TEXTURE0 + uniform.texUnit);
			gl.bindTexture(gl.TEXTURE_2D, value);
			gl.uniform1i(location, uniform.texUnit);
			uniform.texReady = true;
		}
	}
	else {
		var func = (
			type === gl.FLOAT ? gl.uniform1fv :
			type === gl.FLOAT_VEC2 ? gl.uniform2fv :
			type === gl.FLOAT_VEC3 ? gl.uniform3fv :
			type === gl.FLOAT_VEC4 ? gl.uniform4fv :
			type === gl.INT || type === gl.BOOL ? gl.uniform1iv :
			type === gl.INT_VEC2 || type === gl.BOOL_VEC2 ? gl.uniform2iv :
			type === gl.INT_VEC3 || type === gl.BOOL_VEC3 ? gl.uniform3iv :
			type === gl.INT_VEC4 || type === gl.BOOL_VEC4 ? gl.uniform4iv :
			type === gl.FLOAT_MAT2 ? gl.uniformMatrix2fv :
			type === gl.FLOAT_MAT3 ? gl.uniformMatrix3fv :
			type === gl.FLOAT_MAT4 ? gl.uniformMatrix4fv :
			null
		);

		if(func === null) {
			throw "Error: Uniform type not supported.";
		}

		if(
			type === gl.FLOAT_MAT2 || type === gl.FLOAT_MAT3 || type === gl.FLOAT_MAT4
		) {
			func.call(gl, location, false, value);
		}
		else {
			func.call(gl, location, value);
		}
	}
	
	return true;
}

function shaderDraw(input)
{
	input = input || {};
	
	if(this.ready === false) {
		return this;
	}
	
	var gl = this.gl;
	var keys = Object.getOwnPropertyNames(input);
	
	for(var i=0; i<keys.length; i++) {
		var key = keys[i];
		
		if(key === "indices") {
			this.indices(input[key]);
		}
		else if(key === "mode") {
			this.mode(input[key]);
		}
		else if(key === "stride") {
			this.stride(input[key]);
		}
		else if(key === "offset") {
			this.offset(input[key]);
		}
		else if(key === "count") {
			this.count(input[key]);
		}
		else if(key === "divisor") {
			this.divisor(input[key]);
		}
		else if(key === "instances") {
			this.instances(input[key]);
		}
		else if(key === "buffer") {
			this.buffer(input[key]);
		}
		else {
			this.assign(key, input[key]);
		}
	}
	
	var allTexturesReady = true;
	var uniKeys = Object.getOwnPropertyNames(this.uniforms);
	
	for(var i=0; i<uniKeys.length; i++) {
		var uniform = this.uniforms[uniKeys[i]];
		
		if(uniform.type === gl.SAMPLER_2D) {
			allTexturesReady = allTexturesReady && uniform.texReady;
		}
	}
	
	if(!allTexturesReady) {
		return this;
	}
	
	gl.useShader(this);
	
	var mode = this._mode || gl.TRIANGLES;
	var instances = this._instances || 1;
	
	if(gl.ia) {
		if(this._indices) {
			gl.ia.drawElementsInstancedANGLE(
				mode, this._indices.len, this._indices.glType, 0, instances
			);
		}
		else {
			gl.ia.drawArraysInstancedANGLE(mode, 0, this._count, instances);
		}
	}
	else {
		if(this._indices) {
			gl.drawElements(mode, this._indices.len, this._indices.glType, 0);
		}
		else {
			gl.drawArrays(mode, 0, this._count);
		}
	}
	
	return this;
}
var texCache = {};

function texture(width, height, pixels, filter)
{
	var tex = this.createTexture();
	
	this.bindTexture(this.TEXTURE_2D, tex);
	
	if(width instanceof HTMLImageElement) {
		var img = width;
		
		width = img.width;
		height = img.height;
		filter = height || "nearest";
		filter = filter === "nearest" ? this.NEAREST : filter === "linear" ? this.LINEAR : 0;
		
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, filter);
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, filter);
		this.texImage2D(this.TEXTURE_2D, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img);
	}
	else {
		if(typeof pixels === "string") {
			filter = pixels;
			pixels = null;
		}
		
		pixels = pixels || null;
		filter = filter || "nearest";
		filter = filter === "nearest" ? this.NEAREST : filter === "linear" ? this.LINEAR : 0;
		
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, filter);
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, filter);
		
		this.texImage2D(
			this.TEXTURE_2D, 0, this.RGBA, width, height, 0, this.RGBA, this.UNSIGNED_BYTE,
			new Uint8Array(pixels)
		);
	}
	
	tex.size = [width, height];
	tex.ready = true;
	tex.img = undefined;
	
	return tex;
}

function textureFromUrl(url, filter, readyFunc)
{
	if(typeof filter === "function") {
		readyFunc = filter;
		filter = undefined;
	}
	
	var filterName = filter || "nearest";
	var texid = url + "#" + filterName;
	
	if(texCache[texid]) {
		if(readyFunc) {
			readyFunc(texCache[texid]);
		}
		
		return texCache[texid];
	}
	
	filter = (
		filterName === "nearest" ? this.NEAREST : filterName === "linear" ? this.LINEAR : 0
	);
	
	var tex = this.createTexture();
	var img = document.createElement("img");
	
	img.addEventListener("load", imgLoad.bind(this));
	img.src = url;
	
	tex.size = [0, 0];
	tex.ready = false;
	tex.img = img;
	
	return tex;
	
	function imgLoad()
	{
		tex.size = [img.width, img.height];
		tex.ready = true;
	
		this.bindTexture(this.TEXTURE_2D, tex);
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, filter);
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, filter);
		this.texImage2D(this.TEXTURE_2D, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img);
		
		texCache[texid] = tex;
		
		if(readyFunc) {
			readyFunc(tex);
		}
	}
}

return webgl;})();