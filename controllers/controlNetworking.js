var networkingModel = require('./../models/networking.js');
module.exports = {
	run:function (skt,pub,connection,confId,uF){
		skt.on('add message', function(msg){
			if(msg.feature == 'networking'){

				networkingModel.addMessage(
					uF.extractConferenceName(confId),
					msg.sid,
					msg.to,
					msg.text,
					connection,
					function(addRes){
						if(addRes.error){
							console.log('Err',1);
						}else{
							networkingModel.getMessage(addRes.id,connection,function (getRes) {
								if(getRes.error){
									console.log('Err',2);
								}else{
									var dt = {
										action:'add message',
										data:getRes
									};
									/* Send the message to both the sender and the receivers */
									dt.room='networkingP'+getRes.receiver_id;
									pub.publish(confId, JSON.stringify(dt));
									dt.room='networkingP'+getRes.sender_id;
									pub.publish(confId, JSON.stringify(dt));
								}
							})
						}
					}
				);
			}
		});
		skt.on('read message', function(msg){
			if(msg.feature == 'networking'){
				var conference_id = uF.extractConferenceName(confId);
				networkingModel.getParticipantDataId(
					conference_id,
					msg.sid,
					connection,
					function (err, rows, fields) {
						if(!err&&rows.length){
							var myId = rows[0].id;
							networkingModel.markAsRead(
								conference_id,
								msg.owner,
								myId,
								msg.id,
								connection,
								function (res) {
									if(res.success){
										var dt = {
											action:'read message',
											room:'networkingP'+msg.owner,
											data:{
												'id':msg.id
											}
										}
										pub.publish(confId, JSON.stringify(dt));
									}
								}
							)
						}else{
							console.log( 'Failed to get own id: ', err, rows );
						}
					}
				)
			}
		});
		skt.on('read discussion message', function(msg){
			if(msg.feature == 'networking'){
				var conference_id = uF.extractConferenceName(confId);
				networkingModel.getParticipantDataId(
					conference_id,
					msg.sid,
					connection,
					function (err, rows, fields) {
						if(!err&&rows.length){
							var myId = rows[0].id;
							networkingModel.markDiscussionMessageAsRead(
								conference_id,
								myId,
								msg.id,
								connection,
								function (res) {
								}
							)
						}else{
							console.log( 'Failed to get own id: ', err, rows );
						}
					}
				)
			}
		});
		skt.on('logout', function(msg){
			if(msg.feature == 'networking'){
				var conference_id = uF.extractConferenceName(confId);
				networkingModel.getParticipantDataId(
					conference_id,
					msg.sid,
					connection,
					function (err, rows, fields) {
						var success = 0;
						if(!err&&rows.length){
							var myId = rows[0].id;
							networkingModel.logout(
								conference_id,
								msg.sid,
								connection,
								function (res) {
									var success = res.success?1:0;
									skt.emit('logout', { 'feature':'networking', 'success':success });
									if(success){
										skt.leave('networkingP'+myId);
										skt.leave('nw');
									}
								}
							)
						}else{
							console.log( 'Failed to get own id: ', err, rows );
							skt.emit('logout', { 'feature':'networking', 'success':success });
						}
					}
				)
			}
		});
	},
	getParticipantDataId:function (confId,sid,connection,done_cb){
		networkingModel.getParticipantDataId(confId,sid,connection,done_cb);
	},
	sendAllToParticipant:function (conference_url,participant_id,connection,done_cb){
		var messages=null, discussions=null;
		var gotMessages=false, gotDiscussions=false;
		networkingModel.getMessagesByParticipantId(conference_url,participant_id,connection,function (res) {
			if(!res.error){
				messages=res;
			}else{
				messages=null;
			}
			gotMessages=true;
			done();
		});
		networkingModel.getDiscussions(conference_url,participant_id,connection,function (res) {
			if(!res.error){
				discussions=res;
			}else{
				discussions=null;
			}
			gotDiscussions=true;
			done();
		});
		function done() {
			if(gotMessages && gotDiscussions){
				done_cb(messages, discussions);
			}
		}
	},
	kickNetworkingParticipant: function(namespace,participant_data_id){
		/* Remove the user from the other user's list */
		namespace.emit('participant left',participant_data_id);
		/* Find the user's sockets and remove them from the networking so they no longer get updates */
		var room = namespace.adapter.rooms['networkingP'+participant_data_id];
		var sockets = (room&&room.sockets)?room.sockets:{};
		for (var clientId in sockets ) {
			var client_socket = namespace.connected[clientId];
			client_socket.leave('nw');
			client_socket.leave('networkingP'+participant_data_id);
		}
	}
}
