'use strict';
Scene.create('main', function() {
	let { screenSize, netmap, CameraMoveingObject, Joystick } = global_ns;
	let { Node, Sprite, CollisionObject } = nodes_ns;
	
	this.preload(loadImage('./img/unnamed.png').then(img => db.unnamed = img));
	
	let rootNode = null, noimage = null;
	
	let cameraMoveingObject = new CameraMoveingObject(main.camera);
	
	let joystick = new Joystick({
	//	colors: [0, '#223344', 1, '#556677'],
	//	coreColors: [0, '#334455', 1, '#8899aa']
	});
	


	//===============load===============//
	this.load = () => console.log('loaded');


	//===============init===============//
	this.init = () => {
		rootNode = new Node({
			name: 'root',
		});
		rootNode._isRenderDebug = 1;
		
		noimage = rootNode.appendChild(new Sprite({
			image: db.unnamed,
			scale: vec2().set(0.1)
		}));
		
		
		let resizeHandler = e => {
			netmap.size.set(screenSize);
			joystick.pos.set(screenSize.buf().minus(90));
			
			rootNode.scale.set(7/cvs.vw);
		};
		
		resizeHandler();
		cvs.on('resize', resizeHandler);
		
		
		noimage.on('update', function(dt) {
			let node = this.emitter;
			
			node.position.moveAngle(joystick.value / dt * 100, joystick.angle);
			node.rotation = joystick.angle + Math.PI/2;
		});
		
		
		rootNode.ready();
		
		console.log('inited');
	};


	//===============update===============//
	this.update = dt => {
		//=======prePROCES=======//--vs--//=======EVENTS=======//
	//	cameraMoveingObject.update(touches, main.camera);
		
		main.camera.moveTime(noimage.globalPos.minus(screenSize.buf().div(2)), 5);
		//==================================================//


		//=======PROCES=======//--vs--//=======UPDATE=======//
		joystick.update(touches);
		
		rootNode.update(dt);
		//==================================================//


		//==========DRAW==========//--vs--//==========RENDER==========//
		main.ctx.clearRect(0, 0, cvs.width, cvs.height);
		
		netmap.draw(main);
		
		rootNode.render(main);
		
		joystick.draw(main.ctx);
		
		main.save();
		main.fillStyle = '#ffffff';
		main.font = 'bold 15px Arial';
		main.ctx.fillText('FPS: '+(1000/dt).toFixed(2), 20, 20);
		main.restore();
	}; //==============================//


	this.exit = () => console.log('exited');
});


Scene.run('main');
