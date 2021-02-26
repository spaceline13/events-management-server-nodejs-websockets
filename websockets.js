const fs = require('fs');
var options = process.env.SSL_KEY?{
	key: fs.readFileSync(process.env.SSL_KEY),
	cert: fs.readFileSync(process.env.SSL_CERT),
	ca: fs.readFileSync(process.env.SSL_CA)
}:null;
var app = require('express')();
var bodyParser = require("body-parser");
var http = require(process.env.SSL_KEY?'https':'http');
var server = http.createServer(options, app);
var io = require('socket.io')(server);
var uF = require('./utilityFunctions.js');
var questionsController = require('./controllers/controlQuestions.js');
var networkingController = require('./controllers/controlNetworking.js');
var popupsController = require('./controllers/controlPopups.js');
var agendaController = require('./controllers/controlAgenda.js');
var votingController = require('./controllers/controlVoting.js');
var raffleController = require('./controllers/controlRaffle.js');
var graphsController = require('./controllers/controlGraphs.js');
var wordcloudController = require('./controllers/controlWordcloud.js');
var redis = require('redis');
var mysql = require('mysql');
var cookie = require('cookie');

//mysql
var connection = mysql.createPool({
	connectionLimit : 10,
	host     : process.env.SQL_HOST,
	user     : process.env.SQL_USER, 
	password : process.env.SQL_PASSWORD,
	database : process.env.SQL_DATABASE,
	charset  : 'utf8mb4'
});

//redis
var REDIS_PORT = process.env.REDIS_PORT;
var REDIS_HOSTNAME = process.env.REDIS_HOSTNAME;
var pub = redis.createClient(REDIS_PORT, REDIS_HOSTNAME);
var countdownReciever = redis.createClient(REDIS_PORT, REDIS_HOSTNAME); 
/* use body parser as middleware for posts handling */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* set CORS headers to allow requests from the main website */
app.all('/socket.io/*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "https://conferience.com");
	res.header("Access-Control-Allow-Credentials", "true");
	next();
});

var stoping = false;
process.on('message', (m) => {
	if(m && (typeof m==='object') && m.action==='stop'){
		console.log(`${process.pid} Stopping...`);
		stoping = true;
		/* Send the stopping message to all namespaces */
		for (var id in io.nsps) {
			io.of(io.nsps[id].name).emit('reconnectAfter',m.time);
		}
		/*We do not know when the emit finished so we do nothing after sending the signal */
	}
});
var db = process.env.SQL_DATABASE;
votingController.checkForCountdownsOnStart(pub,connection,'/'+db.toUpperCase().charAt(0));
countdownReciever.subscribe('countdown');
countdownReciever.on('message', function(channel, msg) {
	msg = JSON.parse(msg);
	if(msg.action == 'votingTimer'){
		votingController.startCountdown(pub,connection,msg);
	}
});
io.use(function(socket, next){
	/* return the result of next() to accept the connection. */
	if(socket.handshake.query.confId){
		var confId = uF.constructNamespaceName(socket.handshake.query.confId, process.env.SQL_DATABASE);
		if( !io.nsps[confId] ){
			uF.ifIsValidConferenceId(uF.extractConferenceName(confId),connection,function(){
				console.log('creating namespace: ',confId);
				var sub = redis.createClient(REDIS_PORT, REDIS_HOSTNAME); 
				sub.subscribe(confId);
				/* Listen for messages being published to this server. */
				sub.on('message', function(channel, msg) {
					msg = JSON.parse(msg);
					if(msg.room){
						/* Broadcast the message to all connected clients on this server. */
						uF.broadcastToRoom(io,confId,msg);
					}else if(msg.score){
						votingController.score(uF.extractConferenceName(confId),msg.score,io.nsps[confId].sockets,connection);
					}else{
						if(msg.kick){
							if( msg.from == 'nw'){
								networkingController.kickNetworkingParticipant(nmspc,msg.user);
							}
						}else if(msg.to && networkingUsers[msg.to] ){
							console.log('Failed message without room:', msg);
							// networkingUsers[msg.to].emit(msg.action, msg.data);
						}else{
							/* Send to all in namespace */
							io.of(confId).emit(msg.action, msg.data);
						}
					}
				});
				var nmspc = io.of(confId);
				nmspc.on('connect',function (skt) {
					skt.emit('alert','Welcome to: '+confId);
					/* When someone disconnects check if there is anybody else left and if the namespace is empty delete it */
					skt.on('disconnect', function(){
						var _n = io.nsps[confId];
						if(_n){
							/* get number of connections */
							var tmp = _n.sockets
							var connectionsLeft = Object.keys(tmp).length;
							console.log('user disconnected, sockets left: ',connectionsLeft);
							/* If there are no connections left in the namespace delete it  */
							// if(connectionsLeft===0){
							// 	console.log('deleting: ', confId);
							// 	_n.removeAllListeners();
							// 	delete _n;
							// 	delete nmspc;
							// 	sub.unsubscribe();
							// 	sub.quit();
							// }
						}else{
							console.log('The namespace was not found when disconnecting', confId);
						}
					});
					
					//Controllers
					popupsController.run(skt,pub,connection,confId,uF);	
					questionsController.run(skt,pub,connection,confId,uF);	
					networkingController.run(skt,pub,connection,confId,uF);	
					agendaController.run(skt,pub,connection,confId);
					votingController.run(skt,pub,connection,confId,uF);
					raffleController.run(skt,pub,connection,confId,uF);
					graphsController.run(skt,pub,connection,confId,uF);
					wordcloudController.run(skt,pub,connection,confId,uF);
					
					skt.on('join room', function(data){
						var conf = uF.extractConferenceName(confId);
						var room = data.room.substring(2,data.room.length);
						if(!skt.rooms[data.room]){
							if(data.room.startsWith('qs')){
								questionsController.ifHasAccessToRoom(conf,room,data.auth,uF,connection,function(partDt){
									//leave any other question rooms before joining the new one
									// for(r in skt.rooms){
									// 	if( r.startsWith('qs') && (r!=data.r) ) {
									// 		skt.leave(r);
									// 	}
									// }
									skt.join(data.room);
									if( myRoom = questionsController.getOwnRoomName(room,partDt.id,uF) ){
										skt.join(myRoom);
										console.log('joined',myRoom);
									}
									skt.join(data.room);
									skt.emit('joined room',data.room);
								});
							}else if(data.room.startsWith('wc')){
								console.log('REQUEST FOR ',data.room);
								wordcloudController.ifHasAccessToRoom(conf,room,data.auth,uF,connection,function(partDt,wordcloud_id){
									skt.join(data.room);
									skt.emit('joined room',{'feature':'wordcloud','data':wordcloud_id});
								});
							}else if(data.room=='nw'){
								networkingController.getParticipantDataId(conf,data.sid,connection,function(err, rows, fields){
									if(!err&&rows.length){
										console.log('Logged in, adding to list');
										/*
										Add the user to their own room for private messaging.
										(Note: the same user can have multiple sockets/browsers and this is why we use a room)
										*/
										skt.join('networkingP'+rows[0].id);
										/* Also join the basic networking room */
										skt.join(data.room);
										networkingController.sendAllToParticipant(conf,rows[0].id,connection,function (messages, discussions) {
											skt.emit('joined room',{'room':data.room,'id':rows[0].id,'messages':messages,'discussions':discussions});
										});
									}else{
										console.log( 'Failed to join networking: ', err, rows );
									}
								});
							}else if(data.room=='popups'){							
								skt.join(data.room);
								skt.emit('joined room',data.room);
								popupsController.getPopups(skt,conf,data.sid,connection);
							}else if( data.room.startsWith('ag') && (room!=data.room) ){
								agendaController.ifHasAccessToRoom(conf,room,data.sid,connection,function(){
									//leave any other question rooms before joining the new one
									for(room in skt.rooms){
										if( room.startsWith('ag') && (room!=data.room) ) {
											skt.leave(room);
										}
									}
									skt.join(data.room);
									skt.emit('joined room',data.room);
								});
							}else if(data.room=='sharedDocuments'){							
								skt.join(data.room);
								skt.emit('joined room',data.room);
							}else if(data.room.startsWith('vo')){
								var group = data.room.substring(2,data.room.length);
								votingController.ifHasAccessToRoom(conf,group,data.sid,connection,function(){
									//leave any other voting rooms before joining the new one
									for(room in skt.rooms){
										if( room.startsWith('vo') && (room!=data.room) ) {
											skt.leave(room);
										}
									}
									skt.join(data.room);
									skt.emit('joined room',data.room);
									/* Put the session id in the socket */
									skt.sid = data.sid;
									votingController.getVoting(skt,conf,data.sid,group,null,null,data.vpromo,connection);
								});
							}else if(data.room=='main'){							
								skt.join(data.room);
								skt.emit('joined room',data.room);
							}else if(data.room=='rf'){
								raffleController.ifHasAccessToRoom(conf,data.sid,connection,function(){
									raffleController.getFullRaffle(conf,data.sid,connection,function(err,dt){
										skt.join(data.room);
										skt.emit('joined room',{'feature':'raffle','data':dt});
									});
								});
							}else if(data.room=='graphs'){							
								skt.join(data.room);
								skt.emit('joined room',data.room);
								graphsController.getGroups(skt,conf,connection);
							}
						}else{
							skt.emit('already in',data.room);
						}
					});
				});
			}); 
		}else{
			console.log(confId,'exists');
		}
		next();
	}else{
		/* call next() with an Error if you need to reject the connection. */
		next(new Error('Authentication error'));
	}
	
});

var myArgs = process.argv.slice(2);
var port = myArgs[0];
server.listen(port, function(){
	console.log(`${process.pid} listening on *:${port}`);
});
