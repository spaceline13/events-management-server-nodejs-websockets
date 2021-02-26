var questionsModel = require('./../models/questions.js');
module.exports = {
	run:function (skt,pub,connection,confId,uF){
		var conferenceUrl = uF.extractConferenceName(confId).toLowerCase();
		skt.on('add question', function(msg){
			/* Make sure the message is sent to a room the user is in, this could be
			used as a way to check the user credentials only when entering the room */
			if(msg.feature == 'questions'){
				if(skt.rooms['qs'+msg.data.group]){
					if( conferenceUrl == msg.data.conference.toLowerCase() ){
						uF.checkAuthToken(conferenceUrl, msg.data.auth, connection, function (authError, user) {
							if(!authError){
								questionsModel.add(
									msg.data.question,
									msg.data.group,
									user.conference_id,
									conferenceUrl,
									user.id,
									connection,
									function(err,res){
										if(err){
											skt.emit('add question',res);
										} else {
											var dt = {
												action:'add question',
												room:'qs'+msg.data.group,
												data:res,
												from:skt.id
											};
											if((!res.hasBW)&&(res.status!='pending')){//status is pending when live questions is off
												pub.publish(confId, JSON.stringify(dt));
											}
											dt.data.token = msg.data.token;
											dt.data._pbc = '+';
											skt.emit(dt.action, dt.data);
										}
									}
								);
							}
						})
					}else{
						console.log('Incorrect conference: ',msg.data.conference,' expected: ',conferenceUrl);
					}
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			}
		});
		skt.on('vote question', function(msg){
			if(msg.feature == 'questions'){
				if(skt.rooms['qs'+msg.data.group]){
					if( conferenceUrl == msg.data.conference.toLowerCase() ){
						uF.checkAuthToken(conferenceUrl, msg.data.auth, connection, function (authError, user) {
							questionsModel.vote(
								user.conference_id,
								msg.data.group,
								msg.data.qid,
								msg.data.type,
								user.id,
								connection,
								function(res){
									if(res.error){
										skt.emit('vote question',res);
									} else {
										var dt = {
											action:'vote question',
											room:'qs'+msg.data.group,
											data:res,
										};
										pub.publish(confId, JSON.stringify(dt));
										/* Send to self (each user has their own room since the user can have more than 1 device) */
										dt.data.sentFromMe = true;
										dt.data._pbc = '+';
										if( myRoom = module.exports.getOwnRoomName(msg.data.group,user.id,uF) ){
											dt.room = myRoom;
											pub.publish(confId, JSON.stringify(dt));
										}else{
											skt.emit(dt.action, dt.data);
										}
									}
								}
							);
						})
					}else{
						console.log('Incorrect conference: ',msg.data.conference,' expected: ',conferenceUrl);
					}
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			}
		});
		skt.on('undovote question', function(msg){
			if(msg.feature == 'questions'){
				if(skt.rooms['qs'+msg.data.group]){
					if( conferenceUrl == msg.data.conference.toLowerCase() ){
						uF.checkAuthToken(conferenceUrl, msg.data.auth, connection, function (authError, user) {
							if( !authError && user ){
								questionsModel.undovote(
									user.conference_id,
									msg.data.group,
									msg.data.qid,
									user.id,
									connection,
									function(res){
										if(res.error){
											skt.emit('undovote question',res);
										} else {
											var dt = {
												action:'undovote question',
												room:'qs'+msg.data.group,
												data:res,
											};
											pub.publish(confId, JSON.stringify(dt));
											/* Send to self (each user has their own room since the user can have more than 1 device) */
											dt.data.sentFromMe = true;
											dt.data._pbc = '+';
											if( myRoom = module.exports.getOwnRoomName(msg.data.group,user.id,uF) ){
												dt.room = myRoom;
												pub.publish(confId, JSON.stringify(dt));
											}else{
												skt.emit(dt.action, dt.data);
											}
										}
									}
								);
							}
						})
					}else{
						console.log('Incorrect conference: ',msg.data.conference,' expected: ',conferenceUrl);
					}
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			}
		});
	},
	ifHasAccessToRoom:function (confId,room_id,auth,uF,connection,done_cb){
		questionsModel.ifHasAccessToRoom(confId,room_id,auth,uF,connection,done_cb);
	},
	getOwnRoomName:function (room,conference_user_id,uF) {
		var out = null;
		if( conference_user_id ){
			out = 'qs'+room+'.'+conference_user_id+'.';
		}
		return out;
	}
}
