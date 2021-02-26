var wordcloudModel = require('./../models/wordcloud.js');
module.exports = {
	run:function (skt,pub,connection,confId,uF){
		var conferenceUrl = uF.extractConferenceName(confId).toLowerCase();
		skt.on('getFullWordCloud', function(msg){
			/* Make sure the message is sent to a room the user is in, this could be
			used as a way to check the user credentials only when entering the room */
			if(msg.feature == 'wordcloud'){
				if(skt.rooms['wc'+msg.data.wordcloud]){
					if( conferenceUrl == msg.data.conference.toLowerCase() ){
						uF.checkAuthToken(conferenceUrl, msg.data.auth, connection, function (authError, user) {
							if(!authError){
								wordcloudModel.getFullWordCloud(
									msg.data.wordcloud,
									user.conference_id,
									user.id,
									connection,
									function (err,data) {
										if(err){
											skt.emit('getFullWordCloud',{'id':msg.data.wordcloud,'feature':'wordcloud','error':'error'});
										}else{
											skt.emit('getFullWordCloud',{'id':msg.data.wordcloud,'feature':'wordcloud','data':data});
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
		skt.on('addWords', function(msg){
			/* Make sure the message is sent to a room the user is in, this could be
			used as a way to check the user credentials only when entering the room */
			if(msg.feature == 'wordcloud'){
				if(skt.rooms['wc'+msg.data.wordcloud]){
					if( conferenceUrl == msg.data.conference.toLowerCase() ){
						uF.checkAuthToken(conferenceUrl, msg.data.auth, connection, function (authError, user) {
							if(!authError){
								wordcloudModel.addWords(
									msg.data.wordcloud,
									user.conference_id,
									msg.data.words,
									user.id,
									connection,
									function (err,affectedRows) {
										if(err){
											if( err===-1) errorText='invalid';
											else if( err===-2) errorText='server';
											else if( err===-3) errorText='closed';
											else if( err===-5) errorText='input';
											else errorText='unknown';
											skt.emit('added words',{'id':msg.data.wordcloud,'feature':'wordcloud','error':errorText});
										}else{
											skt.emit('added words',{'id':msg.data.wordcloud,'feature':'wordcloud','data':affectedRows>0});
											/* Calculate the word cloud and send it to everybody */
											wordcloudModel.getFullWordCloud(
												msg.data.wordcloud,
												user.conference_id,
												user.id,
												connection,
												function (err,data) {
													if(!err){
														/* Send the words to everybody else */
														var dt = {
															action:'wordcloud update',
															room:'wc'+msg.data.wordcloud,
															data:{'id':msg.data.wordcloud,'feature':'wordcloud','data':data}
														};
														pub.publish(confId, JSON.stringify(dt));
													}
												}
											);
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
		wordcloudModel.ifHasAccessToRoom(confId,room_id,auth,uF,connection,done_cb);
	},
}
