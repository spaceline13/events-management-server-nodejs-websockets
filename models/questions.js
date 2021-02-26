module.notifications = require('./notifications.js');
var async = require('async');
module.exports = {
	add:function (question,group,conference_id,conference_url,userId,connection,done_cb){
		/* Assumes the auth token validation happened in the controller function */
		var q1='INSERT INTO `Questions` (`text`, `votes`, `enabled`,`timeCreated`,`contains_BW`) \
			SELECT ?, 0, (`questionDefaultState` AND ?), current_timestamp(), ? \
			FROM `QuestionGroups` \
			WHERE `QuestionGroups`.`conference_id` = ? AND `QuestionGroups`.`id`=? \
		';

		var q2='INSERT INTO `Participants_Have_Questions`(`question_id`, `conference_user_id`) VALUES (?, ?)';
		var q3='INSERT INTO `QuestionGroups_Have_Questions`(`question_group_id`, `question_id`) \
			SELECT ?, ? \
			FROM `QuestionGroups` \
			WHERE `QuestionGroups`.`conference_id` = ? AND `QuestionGroups`.`id` = ?\
			AND IF(`QuestionGroups`.`questionCharacterLimit`,CHAR_LENGTH(?)<=`QuestionGroups`.`questionCharacterLimit`,1)\
			';

		var qamb= 'SELECT `Ambassadors`.`name`, `Ambassadors`.`surname` \
			FROM `Ambassadors` \
			WHERE `Ambassadors`.`conference_id` = ? AND `Ambassadors`.`conference_user_id` = ? \
			';
		
		var qttl = 'SELECT COALESCE(`QuestionGroups`.`text_singular`,`QuestionGroups`.`text`) AS `text`, `QuestionGroups`.`questionDefaultState` as live \
			FROM `QuestionGroups` \
			WHERE `QuestionGroups`.`conference_id` = ? AND `QuestionGroups`.`id` = ?';



		async.waterfall([
			function(callback) {
				module.exports.textContainsBadWords(question,connection,callback);
			},
			_addQuestion,
			_notif,
		], function (err, result) {
			done_cb(err, result);
		});



		function _addQuestion(hasBW,callback) {
			var en = hasBW?0:1;
			var newInsert = null;
			connection.query(q1,[question,en,hasBW,conference_id,group] ,function(err, rows, fields) {
				var out = {
					'question':question,
					'hasBW':hasBW,
					'group':group
				};
				if (!err){
					newInsert = rows.insertId;
					connection.query(q2,[newInsert, userId] ,function(err, rows, fields) {
						if (!err){
							connection.query(q3,[group,newInsert,conference_id,group,question] ,function(err, rows, fields) {
								if ( !err && (rows.affectedRows>0) ){
									out.id = newInsert;
									callback(null, out, question);
								}else{
									//console.log('Error while performing Query.',err, rows, fields);
									callback(1,out,null);
								}
							});
						} else {
							console.log(err);
							//console.log('Error while performing Query.',err, rows, fields);
							callback(2,out,null);
						}
					});
				} else {
					callback(3,out,null);
				}
			});
		}
		function _notif(out, question, callback) {
			async.parallel({
				name: function(internalCallback) {
					connection.query(qamb,[conference_id,userId] ,function(err, rows, fields) {
						if (!err){
							var name = null;
							if(rows.length>0){
								if(rows[0].surname){
									name = rows[0].surname+(rows[0].name.lenght<4?rows[0].name:(rows[0].name.substring(0,3)+'.'));
								}
							}
							internalCallback(null,name);
						} else {
							internalCallback(1,null);
						}
					});
				},
				groupInfo: function(internalCallback) {
					connection.query(qttl,[conference_id,group] ,function(err, rows, fields) {
						var title = 'Question';
						var live = null;
						if (!err){
							if(rows.length>0){
								if(rows[0].live==1){
									live = true;
									if(rows[0].text) title = rows[0].text;
								}else{
									live = false;
								}
							}
							internalCallback(null,{'live':live,'title':title});
						}else{
							internalCallback(1,null);
						}
					});
				}
			}, function(err, results) {
				if(err){
					callback(err,out);
				}else{
					var name = results.name;
					var title = results.groupInfo.title;
					if(results.groupInfo.live){
						var message = name?(name+' - '+title):title;
						out.status = 'sent';
						module.notifications.push( connection, conference_url, question, message, parseInt(group) );
					}else{
						out.status = 'pending';
					}
					callback(null,out);
				}
			});
		}
	},
	vote:function ( conference_id, group, question, type, userId, connection, done_cb ){
		/* Assumes the auth token validation happened in the controller function */
		var qStatus = " \
		SELECT `QuestionGroups`.`likesEnabled`, `QuestionGroups`.`maxLikes`, \
		`Conferences`.`maxQuestionLikes` \
		FROM `QuestionGroups` \
		JOIN `Conferences` ON `QuestionGroups`.`conference_id` = `Conferences`.`id` \
		WHERE `QuestionGroups`.`id` = ? \
		AND `Conferences`.`id` = ? \
		";
		var qMaxLikes='SELECT ( COUNT(`Participants_Vote_Questions`.`id`) < `QuestionGroups`.`maxLikes` ) AS `canVote` \
			FROM `QuestionGroups` \
			JOIN `QuestionGroups_Have_Questions` ON `QuestionGroups_Have_Questions`.`question_group_id` = `QuestionGroups`.`id` \
			JOIN `Questions` ON `QuestionGroups_Have_Questions`.`question_id` = `Questions`.`id` \
			JOIN `Participants_Vote_Questions` ON `Questions`.`id` = `Participants_Vote_Questions`.`question_id` \
			WHERE `QuestionGroups`.`conference_id` = ? \
			AND `QuestionGroups`.`id` = ? \
			AND `Questions`.`deleted` = 0 \
			AND `Participants_Vote_Questions`.`conference_user_id` = ? \
		';
		var qMaxConfLikes='SELECT ( COUNT(`Participants_Vote_Questions`.`question_id`) < ? ) AS `canVote` \
			FROM `QuestionGroups` \
			JOIN `QuestionGroups_Have_Questions` ON `QuestionGroups_Have_Questions`.`question_group_id` = `QuestionGroups`.`id` \
			JOIN `Questions` ON `QuestionGroups_Have_Questions`.`question_id` = `Questions`.`id` \
			JOIN `Participants_Vote_Questions` ON `Questions`.`id` = `Participants_Vote_Questions`.`question_id` \
			WHERE `QuestionGroups`.`conference_id` = ? \
			AND `Questions`.`deleted` = 0 \
			AND `Participants_Vote_Questions`.`conference_user_id` = ? \
		';
		var q1 ='INSERT INTO `Participants_Vote_Questions`(`conference_user_id`, `question_id`, `modifier`) \
				SELECT ?, `Questions`.`id`, ? \
				FROM `QuestionGroups` \
				JOIN `QuestionGroups_Have_Questions` ON `QuestionGroups_Have_Questions`.`question_group_id` = `QuestionGroups`.`id` \
				JOIN `Questions` ON `QuestionGroups_Have_Questions`.`question_id` = `Questions`.`id` \
				WHERE `QuestionGroups`.`conference_id` = ? AND `Questions`.`id` = ?\
				GROUP BY `Questions`.`id`\
		';
		var q2u = 'UPDATE `Questions` SET `votes`=`votes`+1 WHERE `id` = ?';
		var q2d = 'UPDATE `Questions` SET `votesDown`=`votesDown`+1 WHERE `id` = ?';

		var out = {
			'id':question,
			'type':type=='up'?'up':'down',
			'group':group,
		};

		async.waterfall([
			getMeta,
			testGroupCanVote,
			testConferenceCanVote
		], function (err, result) {
			if( err ){
				out.error = err;
				done_cb(out);
			}else{
				participantVote(out,result);
			}
		});

		function getMeta(callback) {
			connection.query(qStatus,[group, conference_id] ,function(err, rows, fields) {
				if (!err){
					if(rows.length>0){
						callback(null, rows[0]);
					}else{
						callback(-1, null);
					}
				} else {
					callback(-1, null);
				}
			});
		}
		function testGroupCanVote(meta, callback) {
			if(parseInt(meta.likesEnabled)){
				if(parseInt(meta.maxLikes)){
					connection.query(qMaxLikes,[conference_id,group,userId] ,function(err, rows, fields) {
						if ( !err && (rows.length>0) ){
							if(parseInt(rows[0].canVote)){
								callback(null, meta);
							}else{
								callback(2, null);
							}
						}else{
							callback(3, null);
						}
					});
				}else{
					callback(null, meta);
				}
			}else{
				callback(-1, null);
			}
		}
		function testConferenceCanVote(meta, callback) {
			if(parseInt(meta.likesEnabled)){
				var maxQuestionLikes = parseInt(meta.maxQuestionLikes);
				if( maxQuestionLikes ){
					connection.query(qMaxConfLikes,[maxQuestionLikes, conference_id, userId] ,function(err, rows, fields) {
						if ( !err && (rows.length>0) ){
							if(parseInt(rows[0].canVote)){
								callback(null, meta);
							}else{
								callback(5, null);
							}
						}else{
							callback(3, null);
						}
					});
				}else{
					callback(null, meta);
				}
			}else{
				callback(-1, null);
			}
		}
		function participantVote(out,meta) {
			var params = [userId, type=='up'?1:-1, conference_id, question];
			connection.query(q1,params ,function(err, rows, fields) {
				if (!err && (rows.affectedRows>0) ){
					connection.query((type=='up'?q2u:q2d),[question] ,function(err, rows, fields) {
						if (!err){
							if(rows.affectedRows==0){
								out.error = -1;
							}
						}else{
							//console.log('Error while performing Query.',err, rows, fields);
							out.error = -1;
						}
						done_cb(out);
					});
				}else{
					//console.log('Error while performing Query.',err, rows, fields);
					out.error = 4;
					done_cb(out);
				}
			});
		}
	},
	undovote:function ( conference_id, group, question, user_id, connection, done_cb ){
		/* Assumes the auth token validation happened in the controller function */
		var qM='SELECT `QuestionGroups`.`likesEnabled`, `QuestionGroups`.`canTakeBackLike`, `Participants_Vote_Questions`.`modifier` \
			FROM `QuestionGroups`\
			JOIN `QuestionGroups_Have_Questions` ON `QuestionGroups_Have_Questions`.`question_group_id` = `QuestionGroups`.`id` \
			JOIN `Questions` ON `QuestionGroups_Have_Questions`.`question_id` = `Questions`.`id` \
			JOIN `Participants_Vote_Questions` ON `Questions`.`id` = `Participants_Vote_Questions`.`question_id` \
			WHERE `QuestionGroups`.`conference_id` = ? \
			AND `QuestionGroups`.`id` = ? \
			AND `Questions`.`id` = ? \
			AND `Questions`.`deleted` = 0 \
			AND `Participants_Vote_Questions`.`conference_user_id` = ? \
			';
		var qU = 'UPDATE `Questions` SET `Questions`.`votes`=`Questions`.`votes`-? WHERE `Questions`.`id` = ?';
		var qD = 'UPDATE `Questions` SET `Questions`.`votesDown`=`Questions`.`votesDown`-? WHERE `Questions`.`id` = ?';
		var qDel='DELETE `Participants_Vote_Questions` \
			FROM `QuestionGroups` \
			JOIN `QuestionGroups_Have_Questions` ON `QuestionGroups_Have_Questions`.`question_group_id` = `QuestionGroups`.`id` \
			JOIN `Questions` ON `QuestionGroups_Have_Questions`.`question_id` = `Questions`.`id` \
			JOIN `Participants_Vote_Questions` ON `Questions`.`id` = `Participants_Vote_Questions`.`question_id` \
			WHERE `QuestionGroups`.`conference_id` = ? \
			AND `QuestionGroups`.`id` = ? \
			AND `Questions`.`id` = ? \
			AND `Questions`.`deleted` = 0 \
			AND `Participants_Vote_Questions`.`conference_user_id` = ? \
			';

			var out = {
				'id':question,
				'group':group,
			};
			connection.query(qM,[conference_id,group,question,user_id] ,function(err, rows, fields) {
				if (!err){
					if(rows.length>0){
						var canTakeBackLike = rows[0].canTakeBackLike=='1';
						var likesEnabled = rows[0].likesEnabled=='1';
						var modifier = parseInt(rows[0].modifier);
						if( canTakeBackLike && likesEnabled){
							connection.query(modifier>0?qU:qD,[Math.abs(modifier),question] ,function (err, rows, fields) {
								if ( (!err) && (rows.affectedRows>0) ){
									connection.query(qDel,[conference_id,group,question,user_id] ,function (err, rows, fields) {
										if (!err){
											out.modifier = modifier;
										} else {
											out.error = -1;
										}
										done_cb(out);
									});
								} else {
									out.error = -2;
									done_cb(out);
								}
							});
						} else {
							out.error = -3;
							done_cb(out);
						}
					}else{
						out.error = -4;
						done_cb(out);
					}
				}else{
					//console.log('Error while performing Query.',err, rows, fields);
					out.error = -5;
					done_cb(out);
				}
			});
	},
	textContainsBadWords: function (text,connection,done_cb) {
		var hasBW = 0;
		var qBW='SELECT COUNT(`BadWords`.`word`)>0 AS hb FROM `BadWords` WHERE `word` IN (:questionWords:)';
		if( typeof text === 'string' ){
			var words = text.toLowerCase().split(/[\s+,.\/<>\?;\'\':""\[\]{}\(\)\!@#\$%\^\&\\\\]/);
			var qMarks = '';
			for (var i = words.length - 1; i >= 0; i--) {
				qMarks+='?';
				if(i) qMarks+=',';
			}
			qBW=qBW.replace(':questionWords:',qMarks);
			var bq = connection.query(qBW,words,function(err, rows, fields) {
				if (!err){
					done_cb(null,(rows.length>0)&&(rows[0].hb==1));
				}else{
					done_cb(err,null);
				}
			});
		}else{
			done_cb('Invalid type',null);
		}
	},
	ifHasAccessToRoom:function (confId,room_id,auth,uF,connection,done_cb){
		uF.checkAuthToken(confId, auth, connection, function (authError, user) {
			if(!authError){
				done_cb(user);
			}else{
				console.log('User has no access to this room or invalid room',confId,room_id,auth);
			}
		});
	}
}
