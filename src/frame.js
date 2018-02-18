webgl.plugins.frame = frame;

function frame(texture, framedata)
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
