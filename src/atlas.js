var atlasCache = {};

webgl.plugins.atlas = atlas;
webgl.loadJson = loadJson;

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
