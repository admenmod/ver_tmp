'use strict';
let nodes_ns = new function() {
	function emptyFunction() {};
	
	let isPointRectIntersect = (v, arr) => {
		let d = 0;
		for(let c = arr.length-1, n = 0; n < arr.length; c = n++) {
			arr[n].y > v.y != arr[c].y > v.y &&
			v.x < (arr[c].x - arr[n].x) * (v.y - arr[n].y) / (arr[c].y - arr[n].y) + arr[n].x &&
			(d = !d);
		};
		return d;
	};
	
	
	let Node = this.Node = class extends Child {
		constructor(p = {}) {
			super();
			this.name = p.name||this.NODE_TYPE;
			
			this._isRenderDebug = 0;
			
			this._rotation = p.rotation||0;
			this._position = (p.pos || p.position || vec2()).buf();
			this._scale = (p.scale || vec2(1, 1)).buf();
			this._zIndex = p.zIndex||0;
			
			this.scripts = {};
		}
		
		get NODE_TYPE() { return this.__proto__[Symbol.toStringTag]; }
		
		set zIndex(v) { this._zIndex = v; }
		get zIndex() { return this._zIndex; }
		
		get pos() { return this.position; }
		get scale() { return this._scale; }
		get position() { return this._position; }
		
		set rotation(v) { this._rotation = v; }
		get rotation() { return this._rotation; }
		
		get globalPos() { return this.globalPosition; }
		get globalScale() { return this._getRelativeScale(Child.MAX_CHILDREN); }
		get globalRotation() { return this._getRelativeRotation(Child.MAX_CHILDREN); }
		get globalPosition() { return this._getRelativePosition(Child.MAX_CHILDREN); }
		
		get globalIsRenderDebug() { return this._getRelativeIsRenderDebug(Child.MAX_CHILDREN); }
		
		_getRelativeIsRenderDebug(nl = 0) {
			let v = this._isRenderDebug;
			let tt = this.getChainParent();
			for(let i = 0; i < Math.min(nl, tt.length, Child.MAX_CHILDREN); i++) {
				if(tt[i]._isRenderDebug) {
					v = tt[i]._isRenderDebug;
					break;
				};
			};
			return this._isRenderDebug||v;
		}
		
		_getRelativeScale(nl = 0) {
			let v = this.scale.buf();
			let tt = this.getChainParent();
			for(let i = 0; i < Math.min(nl, tt.length, Child.MAX_CHILDREN); i++) v.inc(tt[i].scale);
			return v;
		}
		
		_getRelativeRotation(nl = 0) {
			let v = this.rotation;
			let tt = this.getChainParent();
			
			for(let i = 0; i < Math.min(nl, tt.length, Child.MAX_CHILDREN); i++) v += tt[i].rotation;
			return v;
		}
		
		_getRelativePosition(nl = 0) {
			let arr = this.getChainParent();
			let l = Math.min(nl, arr.length, Child.MAX_CHILDREN);
			
			let prev = this;
			let v = vec2();
			
			for(let i = 0; i < l; i++) {
				let next = arr[i];
				
				let acc = prev.position.buf();
				if(next.rotation !== 0) acc.angle = next.rotation;
				v.plus(acc);
				
				prev = next;
			};
			
			if(arr.length) v.plus(prev.position);
			
			return v.inc(this.globalScale);
		}
		
		ready() {
			this.emit('ready');
			
			let arr = this._children;
			for(let i = 0; i < arr.length; i++) arr[i].ready();
		}
		update(dt = 1000/60) {
			this.emit('update', dt);
			
			let arr = this._children;
			for(let i = 0; i < arr.length; i++) arr[i].update(dt);
		}
		render(ctx) {
			ctx.save();
			this.draw(ctx);
			ctx.restore();
			
			this.emit('render', ctx);
			
			let arr = this.getChildren().sort((a, b) => a.zIndex - b.zIndex);
			for(let i = 0; i < arr.length; i++) arr[i].render(ctx);
		}
		
		draw(ctx) {
			if(this.globalIsRenderDebug === 1) this.renderDebug(ctx, 30);
		}
		
		renderDebug(ctx, c = 30) {
			let pos = this.globalPosition;
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#3377ee';
			ctx.moveTo(pos.x-c, pos.y);
			ctx.lineTo(pos.x+c, pos.y);
			ctx.moveTo(pos.x, pos.y-c);
			ctx.lineTo(pos.x, pos.y+c);
			ctx.stroke();
			/*
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = 'bold 15px Arial';
			
			ctx.strokeStyle = '#111111';
			ctx.strokeText(this.name, pos.x, pos.y);
			ctx.fillStyle = '#eeeeee';
			ctx.fillText(this.name, pos.x, pos.y);
			*/
		}
		
		getChild(name) { return this._children.find(i => i.name === name); }
		appendChild(node) {
			if(this.getChild(node.name)) return Error('err: name match');
			return super.appendChild(node);
		}
		
	//	appendChild(...args) { return super.appendChild(...args); } // todo: cache
	//	removeChild(...args) { return super.appendChild(...args); } // todo: cache
	};
	Node.prototype[Symbol.toStringTag] = 'Node';
	
	
	let Spatial = this.Spatial = class extends Node {
		constructor(p = {}) {
			super(p);
			
			this.visible = p.visible||true;
			this._size = (p.size || vec2()).buf();
			
			this._rotationOffsetPoint = (p.rotationOffsetPoint || vec2()).buf();
			this.alpha = p.alpha !== undefined ? p.alpha : 1;
		}
		
		get size() { return this._size; }
		get globalSize() { return this.globalScale.inc(this._size); }
		
		get alpha() { return this._alpha; }
		set alpha(v) { return this._alpha = Math.min(1, Math.max(0, v)); }
		get globalAlpha() { return this._getRelativeAlpha(Child.MAX_CHILDREN); }
		
		_getRelativeAlpha(nl = 0) {
			let v = this.alpha;
			let tt = this.getChainParent();
			for(let i = 0; i < Math.min(nl, tt.length, Child.MAX_CHILDREN); i++) v *= tt[i].alpha || 1;
			return v;
		}
	};
	Spatial.prototype[Symbol.toStringTag] = 'Spatial';
	
	
	let Sprite = this.Sprite = class extends Spatial {
		constructor(p = {}) {
			super(p);
			
			if(!p.image) throw Error('Invalid parameter image');
			this.image = p.image;
			
			this._size = vec2(p.size?.x||this.image.width, p.size?.y||this.image.height);
			
			this._drawAngleOffset = p.drawAngleOffset||0;
			this._drawOffset = (p.drawOffset || vec2()).buf();
		}
		
		renderDebug(ctx) {
			let pos = this.globalPosition, size = this.globalSize;
			let drawPos = pos.buf().plus(this._drawOffset).minus(size.buf().div(2));
			
			ctx.beginPath();
			ctx.globalAlpha = this.globalAlpha+0.2;
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#ffff00';
		//	ctx.strokeRect(drawPos.x+ctx.lineWidth/2, drawPos.y+ctx.lineWidth/2, size.x-ctx.lineWidth, size.y-ctx.lineWidth);
		//	ctx.strokeRect(drawPos.x-ctx.lineWidth/2, drawPos.y-ctx.lineWidth/2, size.x+ctx.lineWidth, size.y+ctx.lineWidth);
			ctx.strokeRect(drawPos.x, drawPos.y, size.x, size.y);
			
			ctx.moveTo(pos.x-size.x/3, pos.y);
			ctx.lineTo(pos.x+size.x/3, pos.y);
			ctx.moveTo(pos.x, pos.y-size.y/3);
			ctx.lineTo(pos.x, pos.y+size.y/3);
			ctx.stroke();
		}
		
		draw(ctx) {
			if(!this.visible) return;
			
			let pos = this.globalPosition, size = this.globalSize;
			let drawPos = pos.buf().plus(this._drawOffset).minus(size.buf().div(2));
			
			ctx.beginPath();
			ctx.globalAlpha = this.globalAlpha;
			
			if(this.globalRotation !== 0) ctx.rotateOffset(this.globalRotation+this._drawAngleOffset, pos.buf().plus(this._rotationOffsetPoint));
			
			ctx.drawImage(this.image, drawPos.x, drawPos.y, size.x, size.y);
			
			if(this.globalIsRenderDebug === 1) this.renderDebug(ctx, pos, size, drawPos);
			
			super.draw(ctx);
		}
	};
	Sprite.prototype[Symbol.toStringTag] = 'Sprite';
	
	
	let CollisionObject = this.CollisionObject = class extends Spatial {
		constructor(p = {}) {
			super(p);
		}
		
		getStaticCollisionBox() {
			let pos = this.globalPosition;
			let hSize = this.globalSize.div(2);
			
			return [
				pos.buf().minus(hSize),
				pos.buf().plus(hSize.x, -hSize.y),
				pos.buf().plus(hSize), 
				pos.buf().plus(-hSize.x, hSize.y)
			];
		}
		
		getDynamicCollisionBox() {
			let pos = this.globalPosition;
			let rotation = this.globalRotation;
			let hSize = this.globalSize.div(2);
			
			let lt = hSize.buf().invert(),
				rt = vec2(hSize.x, -hSize.y),
				rb = hSize.buf(),
				lb = vec2(-hSize.x, hSize.y);
			
			lt.angle = rt.angle = rb.angle = lb.angle = rotation;
			
			return [lt.plus(pos), rt.plus(pos), rb.plus(pos), lb.plus(pos)];
		}
		
		getCollisionBox() {
			return this.globalRotation === 0 ? this.getStaticCollisionBox() : this.getDynamicCollisionBox();
		}
		
		getBoundingRect() {
			let pos = this.globalPosition, size = this.globalSize;
			return {
				x: pos.x, w: size.x, width: size.x,
				y: pos.y, h: size.y, height: size.y,
				
				left: pos.x - size.x/2,
				right: pos.x + size.x/2,
				top: pos.y - size.y/2,
				bottom: pos.y + size.y/2
			};
		}
		
		isStaticRectIntersect(b) {
			let a = this.getBoundingRect();
			b = b.getBoundingRect?.() || b;
			return a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top;
		}
		
		isDynamicRectIntersect(b) {
			let v = false;
			let a = this.getDynamicCollisionBox();
			b = b.getDynamicCollisionBox();
			
			for(let i = 0; i < a.length; i++) {
				if(v = isPointRectIntersect(a[i], b)) break;
			};
			
			return v;
		}
		
		isRectIntersect(b) {
			return this.globalRotation !== 0 || b.globalRotation !== 0 ? this.isDynamicRectIntersect(b) : this.isStaticRectIntersect(b);
		}
		
		renderDebug(ctx) {
			let box = this.getCollisionBox();
			
			ctx.beginPath();
			ctx.globalAlpha = 0.5;
			ctx.lineWidth = 1;
			ctx.fillStyle = '#227777';
			ctx.strokeStyle = '#33ffff';
			ctx.moveTo(box[0].x, box[0].y);
			for(let i = 1; i < box.length; i++) ctx.lineTo(box[i].x, box[i].y);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	};
	CollisionObject.prototype[Symbol.toStringTag] = 'CollisionObject';
	
	
	let PhysicsBody = this.PhysicsBody = class extends CollisionObject {
		constructor(p = {}) {
			super(p);
			
			this._velocity = vec2(); // motion
			this.script_interface.velocity = this.velocity;
			
			this._prevBox = this.getBoundingRect();
		}
		
		get vel() { return this.velocity; }
		get velocity() { return this._velocity; }
		
		collisionUpdate(box) { // todo: finalize
			let a = this._prevBox, b = box.getBoundingRect();
			
			if(this.isStaticRectIntersect(b)) {
				let w2 = a.w/2, h2 = a.h/2;
				
				if(a.right < b.left) {
					this.vel.x = 0;
					this.pos.x = b.left - w2;
				} else if(b.right < a.left) {
					this.vel.x = 0;
					this.pos.x = b.right + w2;
				} else if(a.bottom < b.top) {
					this.vel.y = 0;
					this.pos.y = b.top - h2;
				} else if(b.bottom < a.top) {
					this.vel.y = 0;
					this.pos.y = b.bottom + h2;
				};
			};
			
			this._prevBox = this.getBoundingRect();
		}
		
		update(dt) {
		//	this.collisionUpdate();
			super.update(dt);
		}
	};
	PhysicsBody.prototype[Symbol.toStringTag] = 'PhysicsBody';
	//======================================================================//
};
