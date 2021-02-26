module.exports = {
	getParticipantDataId:function (confId,sid,connection,done_cb){
		var q='SELECT `ParticipantData`.`id`\
		FROM `Conferences`\
		JOIN `ParticipantData_Loggedin_Conferences` ON `Conferences`.`id` = `ParticipantData_Loggedin_Conferences`.`conference_id`\
		JOIN `ParticipantData` ON `ParticipantData_Loggedin_Conferences`.`participant_data_id` = `ParticipantData`.`id`\
		JOIN `Conferences_Have_Participants`\
			ON `Conferences`.`id` = `Conferences_Have_Participants`.`conference_id`\
			AND `ParticipantData`.`id` = `Conferences_Have_Participants`.`participantData_id`\
		JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id`\
		WHERE `Conferences`.`url` = ?\
		AND `Participants`.`session_id`=?\
		AND `ParticipantData`.`deleted`=0';
		connection.query(q,[confId,sid] ,done_cb);
	},
	addMessage:function (confId,sid,to,message,connection,done_cb) {
		var q = 'INSERT INTO `PrivateMessages`(`conference_id`, `sender_id`, `receiver_id`, `message`, `creationTime`)\
		SELECT MAX(`id`), MAX(`sender`), MAX(`receiver`), ?, NOW()\
		FROM(\
			SELECT `Conferences`.`id`, `ParticipantData`.`id` AS `sender`, NULL AS `receiver`\
			FROM `Conferences`\
			JOIN `ParticipantData_Loggedin_Conferences` ON `Conferences`.`id` = `ParticipantData_Loggedin_Conferences`.`conference_id`\
			JOIN `ParticipantData` ON `ParticipantData_Loggedin_Conferences`.`participant_data_id` = `ParticipantData`.`id`\
			JOIN `Conferences_Have_Participants`\
				ON `Conferences`.`id` = `Conferences_Have_Participants`.`conference_id`\
				AND `ParticipantData`.`id` = `Conferences_Have_Participants`.`participantData_id`\
			JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id`\
			WHERE `Conferences`.`url` = ?\
			AND `Participants`.`session_id`=?\
			AND `ParticipantData`.`deleted`=0\
			AND `ParticipantData`.`verifiedEmail`=1 \
			UNION\
			SELECT `Conferences`.`id`, NULL AS `sender` , `ParticipantData`.`id` AS `receiver`\
			FROM `Conferences`\
			JOIN `ParticipantData_Loggedin_Conferences` ON `Conferences`.`id` = `ParticipantData_Loggedin_Conferences`.`conference_id`\
			JOIN `ParticipantData` ON `ParticipantData_Loggedin_Conferences`.`participant_data_id` = `ParticipantData`.`id`\
			WHERE `Conferences`.`url`=?\
			AND `ParticipantData`.`id` = ?\
			AND `ParticipantData`.`deleted`=0\
		) AS A';
		connection.query(q,[message,confId,sid,confId,to] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.affectedRows>0){
					out.id = results.insertId;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	getMessage:function (id,connection,done_cb) {
		var q = 'SELECT `id`, `conference_id`, `sender_id`, `receiver_id`, `message`, `read`, `creationTime`\
		FROM `PrivateMessages`\
		WHERE `id` = ?';
		connection.query(q,[id] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.length>0){
					out=results[0];
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	getMessagesByParticipantId:function (confId,participant_id,connection,done_cb) {
		var q = 'SELECT `id`, `conference_id`, `sender_id`, `receiver_id`, `message`, `read`, `creationTime`\
		FROM `PrivateMessages`\
		WHERE `conference_id` = (SELECT `id` FROM `Conferences` WHERE `url` = ?) AND ( `sender_id` = ? OR `receiver_id` = ? )\
		ORDER BY `creationTime` ASC';
		connection.query(q,[confId,participant_id,participant_id] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.length>0){
					out=results;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	markAsRead:function (confId,sender_id,receiver_id,id,connection,done_cb) {
		var q = 'UPDATE `PrivateMessages`\
		JOIN `Conferences` ON `PrivateMessages`.`conference_id` = `Conferences`.`id`\
		SET `PrivateMessages`.`read` = 1, `PrivateMessages`.`readTime` = NOW()\
		WHERE `PrivateMessages`.`read` = 0 AND \
		`Conferences`.`url` = ? AND `PrivateMessages`.`sender_id` = ? AND `PrivateMessages`.`receiver_id` = ? AND `PrivateMessages`.`id` = ?';
		connection.query(q,[confId,sender_id,receiver_id,id] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.affectedRows>0){
					out.success = true;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	logout:function (confId,sid,connection,done_cb) {
		var q = 'UPDATE `Conferences_Have_Participants`\
		SET `participantData_id` = NULL\
		WHERE participant_id = ( SELECT id FROM `Participants` WHERE `session_id` = ?)\
		AND conference_id = (SELECT id FROM Conferences WHERE url = ?)';
		connection.query(q,[sid,confId], function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.affectedRows>0){
					out.success = true;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	getBanners:function (confId,connection,done_cb) {
		var q = 'SELECT `id`, `image`, `url`, `text`, `location`\
		FROM `NetworkingBanners`\
		WHERE `conference_id` = (SELECT id FROM Conferences WHERE url = ?)\
		ORDER BY `location` ASC';
		connection.query(q,[confId] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.length>0){
					out=results;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	getDiscussions:function (confId,participant_id,connection,done_cb) {
		var q = '\
		SELECT `Discussions`.`id`, `Discussions`.`name`, `Discussions`.`status`, COUNT(`DiscussionsMessages`.`id`) AS `allMessages`,\
		SUM( IF(`DiscussionsMessages`.`participant_data_id`!=?,`ParticipantData_Read_DiscussionsMessages`.`id` IS NULL,NULL) ) AS `unreadMessages`\
		FROM `Discussions`\
		LEFT JOIN `DiscussionsMessages` ON `Discussions`.`id` = `DiscussionsMessages`.`discussion_id`\
		LEFT JOIN `ParticipantData_Read_DiscussionsMessages`\
			ON `DiscussionsMessages`.`id` = `ParticipantData_Read_DiscussionsMessages`.`discussion_message_id`\
			AND `ParticipantData_Read_DiscussionsMessages`.`participant_data_id` = ?\
		WHERE `conference_id` = (SELECT id FROM Conferences WHERE url = ?) AND `Discussions`.`status` != 0\
		GROUP BY `Discussions`.`id`\
		ORDER BY `Discussions`.`creationTime` DESC\
		';
		connection.query(q,[participant_id, participant_id, confId] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.length>0){
					out=results;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
	markDiscussionMessageAsRead:function (confId,participant_data_id,message_id,connection,done_cb) {
		var q = '\
		INSERT INTO `ParticipantData_Read_DiscussionsMessages`(`participant_data_id`, `discussion_message_id`)\
		SELECT ?, `DiscussionsMessages`.`id`\
		FROM `Discussions`\
		JOIN `DiscussionsMessages` ON `Discussions`.`id` = `DiscussionsMessages`.`discussion_id`\
		WHERE `Discussions`.`conference_id` = (SELECT `id` FROM `Conferences` WHERE `url` = ?)\
		AND `DiscussionsMessages`.`id` = ?\
		';
		connection.query(q,[participant_data_id,confId,message_id] ,function(err, results, fields) {
			var out = {};
			if (!err){
				if(results.affectedRows>0){
					out.success = true;
				}else{
					out.error = -2;
				}
			} else {
				out.error = -1;
			}
			done_cb(out);
		});
	},
}
// read discussion message