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
