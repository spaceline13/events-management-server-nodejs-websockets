module.exports = {
	ratePanel:function ( conference, panel, rating, sid, connection, done_cb ){
		var q='INSERT INTO `Participants_Rate_Panels`(`participant_id`, `panel_id`, `rating`) \
			   VALUES( \
				(   SELECT `id` \
				    FROM `Participants` \
					WHERE `session_id` = ? \
				), \
				(   SELECT `id` \
					FROM `Panels` \
					WHERE `id`=? \
					AND showRating=1 \
				), \
			   ?)';
		
		connection.query(q,[sid,panel,rating] ,function(err, rows, fields) {
			var out = {
				'rating':rating,
				'panel':panel, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	unratePanel:function ( conference, panel, sid, connection, done_cb ){
		var q= 'DELETE FROM `Participants_Rate_Panels` \
				WHERE `participant_id` = ( \
					SELECT `id` \
					FROM `Participants` \
					WHERE `session_id` = ? \
				) \
				AND `panel_id` = ?';
		
		connection.query(q,[sid,panel] ,function(err, rows, fields) {
			var out = {
				'panel':panel, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	commentPanel:function ( conference, panel, comment, sid, connection, done_cb ){
		if(comment.length<1024){
			var q='INSERT INTO `Participants_Comment_Panels`(`participant_id`, `panel_id`, `comment`) \
				   VALUES( \
					(   SELECT `id` \
						FROM `Participants` \
						WHERE `session_id` = ? \
					), \
					(   SELECT `id` \
						FROM `Panels` \
						WHERE `id`=? \
						AND showRating=1 \
					), \
				   ?)';

			connection.query(q,[sid,panel,comment] ,function(err, rows, fields) {
				var out = {
					'comment':comment,
					'panel':panel, 
				};
				if (!err){
					done_cb(out);
				}else{
					//console.log('Error while performing Query.',err, rows, fields);
					out.error = -1;
					done_cb(out);
				}
			});
		} else {
			console.log('Error: too long comment');
			out.error = -1;
			done_cb(out);
		}
	},
	rateSpeaker:function ( conference, speaker, rating, sid, connection, done_cb ){
		var q= 'INSERT INTO `Participants_Rate_Speakers`(`participant_id`, `speaker_id`, `rating`) \
				VALUES( \
				 (   SELECT `id` \
					 FROM `Participants` \
					 WHERE `session_id` = ? \
				 ), \
				 (   SELECT `id` \
					 FROM `Speakers` \
					 WHERE `id`=? \
					 AND showRating=1 \
				 ), \
				?)';
		
		connection.query(q,[sid,speaker,rating] ,function(err, rows, fields) {
			var out = {
				'rating':rating,
				'speaker':speaker, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	unrateSpeaker:function ( conference, speaker, sid, connection, done_cb ){
		var q= 'DELETE FROM `Participants_Rate_Speakers` \
				WHERE `participant_id` = ( \
					SELECT `id` \
					FROM `Participants` \
					WHERE `session_id` = ? \
				) \
				AND `speaker_id` = ?';
		
		connection.query(q,[sid,speaker] ,function(err, rows, fields) {
			var out = {
				'speaker':speaker, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	commentSpeaker:function ( conference, speaker, comment, sid, connection, done_cb ){
		if(comment.length<1024){
			var q='INSERT INTO `Participants_Comment_Speakers`(`participant_id`, `speaker_id`, `comment`) \
				   VALUES( \
					(   SELECT `id` \
						FROM `Participants` \
						WHERE `session_id` = ? \
					), \
					(   SELECT `id` \
						FROM `Speakers` \
						WHERE `id`=? \
						AND showRating=1 \
					), \
				   ?)';

			connection.query(q,[sid,speaker,comment] ,function(err, rows, fields) {
				var out = {
					'comment':comment,
					'speaker':speaker, 
				};
				if (!err){
					done_cb(out);
				}else{
					//console.log('Error while performing Query.',err, rows, fields);
					out.error = -1;
					done_cb(out);
				}
			});
		} else {
			//console.log('Error: too long comment');
			var out = {
				'error':-1
			};
			done_cb(out);
		}
	},
	addToMyAgenda:function ( conference, speaker, sid, connection, done_cb ){
		var q= 'INSERT INTO `Participants_Have_Speakers`(`participant_id`, `speaker_id`) VALUES( ( \
				SELECT id FROM `Participants` WHERE `Participants`.`session_id`=?), ( \
					SELECT `Speakers`.`id` \
					FROM `Conferences` \
					JOIN `Agenda` ON `Conferences`.`id` = `Agenda`.`conference_id` \
					JOIN `AgendaDates` ON `Agenda`.`id` = `AgendaDates`.`agenda_id` \
					JOIN `AgendaRooms` ON `AgendaDates`.`id` = `AgendaRooms`.`agenda_date_id` \
					JOIN `Panels` ON `AgendaRooms`.`id` = `Panels`.`agenda_room_id` \
					JOIN `Panels_Have_Speakers` ON `Panels`.`id` = `Panels_Have_Speakers`.`panel_id` \
					JOIN `Speakers` ON `Panels_Have_Speakers`.`speaker_id` = `Speakers`.`id` \
					WHERE `Conferences`.`url`=? AND `Speakers`.`id`=? \
				) )';

		connection.query(q,[sid,conference,speaker] ,function(err, rows, fields) {
			var out = {
				'speaker':speaker, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	removeFromMyAgenda:function ( conference, speaker, sid, connection, done_cb ){
		var q= 'DELETE FROM `Participants_Have_Speakers` \
				WHERE( `participant_id`=(SELECT id FROM `Participants` WHERE `Participants`.`session_id`=?) AND `speaker_id`= ( \
					SELECT `Speakers`.`id` \
					FROM `Conferences` \
					JOIN `Agenda` ON `Conferences`.`id` = `Agenda`.`conference_id`  \
					JOIN `AgendaDates` ON `Agenda`.`id` = `AgendaDates`.`agenda_id` \
					JOIN `AgendaRooms` ON `AgendaDates`.`id` = `AgendaRooms`.`agenda_date_id` \
					JOIN `Panels` ON `AgendaRooms`.`id` = `Panels`.`agenda_room_id` \
					JOIN `Panels_Have_Speakers` ON `Panels`.`id` = `Panels_Have_Speakers`.`panel_id` \
					JOIN `Speakers` ON `Panels_Have_Speakers`.`speaker_id` = `Speakers`.`id` \
					WHERE `Conferences`.`url`=? AND `Speakers`.`id`=? \
				) )';

		connection.query(q,[sid,conference,speaker] ,function(err, rows, fields) {
			var out = {
				'speaker':speaker, 
			};
			if (!err){
				done_cb(out);
			}else{
				//console.log('Error while performing Query.',err, rows, fields);
				out.error = -1;
				done_cb(out);
			}
		});
	},
	ifHasAccessToRoom:function (confId,room_id,sid,connection,done_cb){
		var q='SELECT COUNT(`Agenda`.`id`)>0 as access \
				FROM `Conferences_Have_Participants` \
				JOIN `Conferences` ON `Conferences_Have_Participants`.`conference_id` = `Conferences`.`id` \
				JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id` \
				JOIN `Agenda` ON `Conferences_Have_Participants`.`conference_id` = `Agenda`.`conference_id` \
				WHERE `Participants`.`session_id` = ? AND `Conferences`.`url` = ? AND `Agenda`.`id` = ?';
		connection.query(q,[sid,confId,room_id] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0 && rows[0].access==1)
					done_cb();
				else
					console.log('User has no access to this room or invalid room',confId,room_id,sid);
			} else {
				console.log('Error while checking db for room.',err, rows, fields);
			}
		});
	}
}