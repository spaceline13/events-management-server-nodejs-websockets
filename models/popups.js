var async = require('async');
module.exports = {
	getPopups:function (confId,sid,connection,done_cb){
		var q='SELECT `InfoPopups`.`id`, \
		`InfoPopups`.`image`, \
		`InfoPopups`.`text`, \
		`InfoPopups`.`title`, \
		`InfoPopups`.`voting_question_id` AS `qid`, \
		`VotingQuestions`.`voting_group_id` AS `gid`, \
		`InfoPopups`.`anouncementsEnabledTime`, \
		`InfoPopups`.`showAnnouncementsTime`, \
		`InfoPopups`.`anouncementsEnabled` \
		FROM `Conferences` \
		JOIN `InfoPopups` ON `Conferences`.`id` = `InfoPopups`.`conference_id` \
		LEFT JOIN `VotingQuestions` ON `InfoPopups`.`voting_question_id` = `VotingQuestions`.`id` \
		WHERE `Conferences`.`url` = ? AND `InfoPopups`.`enabled`=1 AND `InfoPopups`.`id` NOT IN ( \
			SELECT `Participants_Seen_Popups`.`info_popup_id` \
			FROM `Participants_Seen_Popups` \
			JOIN `Participants` ON `Participants_Seen_Popups`.`participant_id` = `Participants`.`id` \
			WHERE `Participants`.`session_id` = ? \
		)';
		connection.query(q,[confId,sid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0)
					done_cb(rows);
				//else
					//console.log('Did not get any popups',confId,'popups',sid);
			} else {
				console.log('Error while checking db for room.',err, rows, fields);
			}
		});
	},
	getAnnouncementsPopups:function (confId,connection,done_cb){
		var q='SELECT `InfoPopups`.`id`, \
		`InfoPopups`.`image`, \
		`InfoPopups`.`text`, \
		`InfoPopups`.`title`, \
		`InfoPopups`.`voting_question_id` AS `qid`, \
		`VotingQuestions`.`voting_group_id` AS `gid`, \
		`InfoPopups`.`anouncementsEnabledTime`, \
		`InfoPopups`.`showAnnouncementsTime` \
		FROM `Conferences` \
		JOIN `InfoPopups` ON `Conferences`.`id` = `InfoPopups`.`conference_id` \
		LEFT JOIN `VotingQuestions` ON `InfoPopups`.`voting_question_id` = `VotingQuestions`.`id` \
		WHERE `Conferences`.`url` = ? AND `InfoPopups`.`anouncementsEnabled`=1 \
		ORDER BY `InfoPopups`.`anouncementsEnabledTime` DESC';
		var q2='SELECT `text` \
		FROM `MenuMeta` \
		JOIN `Conferences` ON `MenuMeta`.`conference_id` = `Conferences`.`id` \
		WHERE `MenuMeta`.`menu_id`=33 AND `Conferences`.`url` = ? \
		';
		async.parallel(
			{
				data: function(cb){ 
					connection.query(q,[confId] ,function(err, rows, fields) {
						if (!err){
							cb(null,rows);
						} else {
							console.log('Error while checking db for room.',err, rows, fields);
						}
					});
				},
				title: function(cb){ 
					connection.query(q2,[confId] ,function(err, rows) {
						if( !err && rows && rows.length ){
							cb(null,rows[0].text);
						}else{
							cb(null,null);
						}
					});
				},
			},
			done_cb		
		);
	}
}
