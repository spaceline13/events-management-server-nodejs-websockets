// Utility functions
module.exports = {
	ifIsValidConferenceId:function (confId,connection,done_cb){
		var q='SELECT COUNT(`Conferences`.`id`)>0 AS valid FROM `Conferences` WHERE `url` = ?';
		connection.query(q,[confId] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0 && rows[0].valid==1)
					done_cb();
				else
					console.log('Not valid confid');
			} else {
				console.log('Error while checking db for confid.',err, rows, fields);
			}
		});
	},
	broadcastToRoom:function (io,confId,msg){
		// this is where the connection to the database and the validation should happen
		var nsp = io.of(confId); 

		/* Get the room and fix the counter from undefined to 0 */
		var _room = nsp.adapter.rooms[msg.room];
		if(_room && !_room.counter) _room.counter=0;

		/* Send the Previous Broadcast Counter */
		if(_room) msg.data._pbc = _room.counter;

		if(msg.from && nsp.connected[msg.from]){
			nsp.connected[msg.from].broadcast.to(msg.room).emit(msg.action, msg.data);
		}else{
			nsp.to(msg.room).emit(msg.action, msg.data);
		}
		/* Incease the counter */
		if(_room) _room.counter++;

		return true;
	},
	constructNamespaceName:function (conference_url, database_name) {
		/* The database_name is used to know if we are in the nepadna or conferience code */
		/* Conferience events start with /C and Nepanda ones wit /N */
		var prefix = database_name.substring(0,1).toUpperCase();
		var conf = conference_url.toLowerCase();
		return '/'+prefix+conf;
	},
	getSHA1:function(input){
		var crypto = require('crypto');
		return crypto.createHash('sha1').update(input).digest('hex')
	},
	extractConferenceName:function (namespace_name) {
		return namespace_name.substring(2);
	},
	checkAuthToken: function (confId, token, connection, done_cb) {
		var q = '\
		SELECT `ConferenceUsers`.`id`, `ConferenceUsers`.`revoked` AS `revokedUser`, \
		`ParticipantTokens`.`id` AS `tokenId`, `ParticipantTokens`.`revoked` AS `revokedToken`, \
		`Conferences`.`id` AS `conference_id` \
		FROM `ConferenceUsers` \
		JOIN `Conferences` ON `ConferenceUsers`.`conference_id` = `Conferences`.`id` \
		JOIN `ParticipantTokens` ON `ConferenceUsers`.`id` = `ParticipantTokens`.`conference_user_id` \
		WHERE `ParticipantTokens`.`token` = ? AND `Conferences`.`url` = ? \
		';
		connection.query(q,[token,confId] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					var revokedUser = !!parseInt(rows[0].revokedUser);
					var revokedToken = !!parseInt(rows[0].revokedToken);
					if(revokedUser || revokedToken){
						done_cb({'revokedUser':revokedUser,'revokedToken':revokedToken,'conference_id':parseInt(rows[0].conference_id)},null);
					}else{
						done_cb(null,{'id':parseInt(rows[0].id),'tokenId':parseInt(rows[0].tokenId),'conference_id':parseInt(rows[0].conference_id)});
					}
				}else{
					done_cb({'error':'not found'},null);
				}
			} else {
				done_cb({'error':'unknown'},null);
			}
		});
	}
}
