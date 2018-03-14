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
