var async = require('async');
module.exports = {
	getVotingGroup:function (confId,gid,sid,token,connection,done_cb){
		var q='SELECT `VotingGroups`.`allowDeletingAnswers`, \
		`VotingGroups`.`buttonColor`, \
		`VotingGroups`.`buttonText`, \
		`VotingGroups`.`buttonTextColor`, \
		`VotingGroups`.`closedAnswerText`, \
		`VotingGroups`.`commentPlaceholder`, \
		`VotingGroups`.`conference_id`, \
		`VotingGroups`.`controlQuestions`, \
		`VotingGroups`.`deadline`, \
		`VotingGroups`.`deleted`, \
		`VotingGroups`.`editableAnswers`, \
		`VotingGroups`.`endText`, \
		`VotingGroups`.`goTo`, \
		`VotingGroups`.`graphs`, \
		`VotingGroups`.`graphsNum`, \
		`VotingGroups`.`hasBackNext`, \
		`VotingGroups`.`hasPageCounter`, \
		`VotingGroups`.`icon`, \
		`VotingGroups`.`iconColor`, \
		`VotingGroups`.`id`, \
		`VotingGroups`.`identifySelfChartCorrectOnly`, \
		`VotingGroups`.`identifySelfChartLimit`, \
		`VotingGroups`.`inputPlaceholder`, \
		(`VotingGroups`.`onePage` AND `VotingGroups`.`is_promo_voting`) AS `is_promo_voting`, \
		`VotingGroups`.`isRegistration`, \
		`VotingGroups`.`requiresRegistration`, \
		`VotingGroups`.`link`, \
		`VotingGroups`.`live`, \
		`VotingGroups`.`logo`, \
		`VotingGroups`.`onePage`, \
		`VotingGroups`.`isProjectionVoting`, \
		`VotingGroups`.`projectionMode`, \
		`VotingGroups`.`oneTouch`, \
		`VotingGroups`.`open`, \
		`VotingGroups`.`requiresRegistration`, \
		`VotingGroups`.`order`, \
		`VotingGroups`.`orderByScore`, \
		`VotingGroups`.`pageCounterColor`, \
		`VotingGroups`.`pageCounterTextColor`, \
		`VotingGroups`.`pauseText`, \
		`VotingGroups`.`showAnswerAtEnd`, \
		`VotingGroups`.`showCorrect`, \
		`VotingGroups`.`showIdentifySelf`, \
		`VotingGroups`.`showIdentifySelfChart`, \
		`VotingGroups`.`showLogo`, \
		`VotingGroups`.`showModal`, \
		`VotingGroups`.`showQuizScore`, \
		`VotingGroups`.`showTopQuestions`, \
		`VotingGroups`.`showTotal`, \
		`VotingGroups`.`text`, \
		`VotingGroups`.`timerEnabled`, \
		`VotingGroups`.`title`, \
		`VotingGroups`.`voting_modal_id`, \
		`VotingGroups`.`waitForServer`, \
		`VotingGroups`.`word_cloud_options_id`, \
		`VotingModals`.`title` as modalTitle, \
		`VotingModals`.`text` as modalText, \
		(((`Conferences`.`usePassword` = 1) AND (ISNULL(`Conferences`.`password`))) OR `VotingGroups`.`requiresRegistration`) as hasToken, \
		(COUNT(`Participants_Locked_Voting_Groups`.`voting_group_id`)>0 AND !`VotingGroups`.`is_promo_voting`) as isLocked, \
		(SELECT COUNT(*) FROM `VotingQuestions` WHERE `voting_group_id` = ? AND `type` != 255) as countQuestions, \
		COUNT(`VotingAnswers`.`next`) as hasLogic \
		FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		LEFT JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		LEFT JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		LEFT JOIN `VotingModals` ON `VotingGroups`.`voting_modal_id` = `VotingModals`.`id` \
		LEFT JOIN `Participants_Locked_Voting_Groups` ON `VotingGroups`.`id` = `Participants_Locked_Voting_Groups`.`voting_group_id` '+
		( token?
			' AND `Participants_Locked_Voting_Groups`.`token_id`=? ' :
			' LEFT JOIN `Participants` ON `Participants_Locked_Voting_Groups`.`participant_id` = `Participants`.`id` AND  `Participants`.`session_id` = ? '
		)+
		' WHERE `VotingGroups`.`deleted` = 0 \
		AND IF(`VotingGroups`.`controlQuestions`,1 ,`VotingGroups`.`open`) \
		AND `Conferences`.`url` = ? \
		AND `VotingGroups`.`id`=?';
		connection.query(q,[gid,(token?token:sid),confId,gid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0)
					done_cb(rows[0]);
				//else
					//console.log('Did not get any popups',confId,'popups',sid);
			} else {
				console.log('Error while trying to get voting group.',err, rows, fields);
			}
		});
	},
	getAvailableQuestionId:function (confId,gid,sid,controlQuestions,connection,done_cb){
		var q='SELECT `VotingQuestions`.`id` \
        FROM `Conferences` \
        JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
        JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
        JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
        LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
        LEFT JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` AND `Participants`.`session_id` = ? \
        WHERE `VotingGroups`.`deleted` = 0 \
        AND `VotingQuestions`.`deleted` = 0 \
		AND (`VotingGroups`.`controlQuestions`=0 OR `VotingQuestions`.`enabled`=1) \
        AND `VotingGroups`.`id` = ? \
        AND `Conferences`.`url` = ? \
        GROUP BY `VotingQuestions`.`id` \
        HAVING COUNT(`Participants`.`id`) = 0 \
        ORDER BY `VotingQuestions`.`order`, `VotingQuestions`.`id` ASC \
        LIMIT 1';

		connection.query(q,[sid,gid,confId] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb({id:rows[0]['id']});
				} else if (controlQuestions) {
					var q='SELECT `VotingQuestions`.`id`, (SELECT COUNT(id) FROM VotingQuestions WHERE voting_group_id = ? AND deleted = 0) as allQuestions \
					FROM `Conferences`  \
					JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
					JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
					JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
					LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
					LEFT JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` AND `Participants`.`session_id` = ? \
					WHERE `VotingGroups`.`deleted` = 0 \
					AND `VotingQuestions`.`deleted` = 0 \
					AND `VotingGroups`.`id` = ? \
					AND `Conferences`.`url` = ? \
					GROUP BY `VotingQuestions`.`id` \
                    HAVING COUNT(`Participants`.`id`)';
					connection.query(q,[gid,sid,gid,confId] ,function(err, rows, fields) {
						if (!err){
							if(rows.length>0){
								var groupQuestions = rows[0].allQuestions;
								var userVoted = rows.length;
								if(groupQuestions>userVoted){
									done_cb({status:'paused'});
								} else {
									done_cb({status:'finished'});
								}
							} else {
								done_cb({status:'paused'});
							}
						} else {
							console.log('Error while checking db if the user has voted any questions.',err, rows, fields);
						}
					});
				} else {
					done_cb({status:'finished'});
				}
			} else {
				console.log('Error while checking db for question id.',err, rows, fields);
			}
		});
	},
	getTokenQuestionId:function (confId,gid,token,controlQuestions,connection,done_cb){
		var q='SELECT `VotingQuestions`.`id` \
        FROM `Conferences` \
        JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
        JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
        JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
        LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` AND `Participants_Have_Voting_Answers`.`token_id` = ? \
        WHERE `VotingGroups`.`deleted` = 0 \
        AND `VotingQuestions`.`deleted` = 0 \
		AND (`VotingGroups`.`controlQuestions`=0 OR `VotingQuestions`.`enabled`=1) \
        AND`VotingGroups`.`id` = ? \
        AND `Conferences`.`url` = ? \
        GROUP BY `VotingQuestions`.`id` \
        HAVING COUNT(`Participants_Have_Voting_Answers`.`token_id`) = 0 \
        ORDER BY `VotingQuestions`.`order`, `VotingQuestions`.`id` ASC \
        LIMIT 1';

		connection.query(q,[token,gid,confId] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb({id:rows[0]['id']});
				} else if (controlQuestions) {
					var q='SELECT `VotingQuestions`.`id`, (SELECT COUNT(id) FROM VotingQuestions WHERE voting_group_id = ? AND deleted = 0) as allQuestions \
					FROM `Conferences`  \
					JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
					JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
					JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
					LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` AND `Participants_Have_Voting_Answers`.`token_id` = ? \
					WHERE `VotingGroups`.`deleted` = 0 \
					AND `VotingQuestions`.`deleted` = 0 \
					AND `VotingGroups`.`id` = ? \
					AND `Conferences`.`url` = ? \
					GROUP BY `VotingQuestions`.`id` \
                    HAVING COUNT(`Participants_Have_Voting_Answers`.`token_id`)';
					connection.query(q,[gid,token,gid,confId] ,function(err, rows, fields) {
						if (!err){
							if(rows.length>0){
								var groupQuestions = rows[0].allQuestions;
								var userVoted = rows.length;
								if(groupQuestions>userVoted){
									done_cb({status:'paused'});
								} else {
									done_cb({status:'finished'});
								}
							}
						} else {
							console.log('Error while checking db if the user has voted any questions.',err, rows, fields);
						}
					});
				} else {
					done_cb({status:'finished'});
				}
			} else {
				console.log('Error while checking db for question id.',err, rows, fields);
			}
		});
	},
	getNextQuestionId:function (confId,gid,qid,connection,done_cb){
		var q='SELECT `VotingQuestions`.`id` \
		FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		WHERE `VotingGroups`.`deleted` = 0 \
		AND `VotingQuestions`.`deleted` = 0 \
		AND `VotingGroups`.`id` = ? \
		AND `Conferences`.`url` = ? \
		AND `VotingQuestions`.`order` > IFNULL(( \
			SELECT `VotingQuestions`.`order` \
			FROM `VotingQuestions` \
			WHERE `VotingQuestions`.`id` = ? \
		), -1) \
		ORDER BY `VotingQuestions`.`order` ASC \
		LIMIT 1';

		connection.query(q,[gid,confId,qid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb(rows[0]['id']);
				}
				//else
					//console.log('Did not get any popups',confId,'popups',sid);
			} else {
				console.log('Error while checking db for question id.',err, rows, fields);
			}
		});
	},
	getPreviousQuestionId:function (confId,gid,qid,connection,done_cb){
		var q='SELECT `VotingQuestions`.`id` \
		FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		WHERE `VotingGroups`.`deleted` = 0 \
		AND `VotingQuestions`.`deleted` = 0 \
		AND `VotingGroups`.`id` = ? \
		AND `Conferences`.`url` = ? \
		AND `VotingQuestions`.`order` < ( \
			SELECT `VotingQuestions`.`order` \
			FROM `VotingQuestions` \
			WHERE `VotingQuestions`.`id` = ? \
		) \
		ORDER BY `VotingQuestions`.`order` DESC \
		LIMIT 1';

		connection.query(q,[gid,confId,qid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb(rows[0]['id']);
				}
				//else
					//console.log('Did not get any popups',confId,'popups',sid);
			} else {
				console.log('Error while checking db for question id.',err, rows, fields);
			}
		});
	},
	getRegistrationQuestionId:function (confId,connection,done_cb){
		var q='SELECT `VotingQuestions`.`id` \
		FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		WHERE `VotingGroups`.`deleted` = 0 \
		AND `VotingQuestions`.`deleted` = 0 \
		AND `VotingGroups`.`isRegistration` = 1 \
		AND `Conferences`.`url` = ? \
		LIMIT 1';

		connection.query(q,[confId],function (err, results) {
			if(err) done_cb(err,null);
			else if (results.length) done_cb(null,results[0].id);
			else done_cb(null,null);
		});
	},
	getVotingQuestion:function (confId,qid,sid,token,connection,done_cb){
		var q='SELECT \
		`VotingQuestions`.`id`, \
		`VotingQuestions`.`voting_group_id`, \
		`VotingQuestions`.`order` AS qorder, \
		IF(`VotingQuestions`.`type`=255,\'\',`VotingQuestions`.`question`) AS `question`, \
		`VotingQuestions`.`type`, \
		`VotingQuestions`.`splash_screen_menu_id`, \
		`VotingQuestions`.`subtype`, \
		`VotingQuestions`.`dontKnowAnswer`, \
		`VotingQuestions`.`isRequired`, \
		`VotingQuestions`.`allowMultipleAnswers`, \
		`VotingQuestions`.`maxAnswers`, \
		`VotingQuestions`.`answerType`, \
		(`VotingGroups`.`oneTouch` AND `VotingQuestions`.`oneTouch`) AS `oneTouch`, \
		`VotingQuestions`.`extra`, \
		`VotingQuestions`.`textStart`, \
		`VotingQuestions`.`textEnd`, \
		`VotingQuestions`.`min`, \
		`VotingQuestions`.`max`, \
		`VotingQuestions`.`image` AS `qImage`, \
		`VotingQuestions`.`requireValidation`,\
		IF(`VotingQuestions`.`countdown`>0, \
		UNIX_TIMESTAMP(DATE_ADD(`countdownStartTimestamp`, INTERVAL `countdown` second)),NULL) AS `timeLimit`, \
		`VotingAnswers`.`id` AS aid, \
		`VotingAnswers`.`order` AS aorder, \
		`VotingAnswers`.`type` AS atype, \
		`VotingAnswers`.`text` AS answer, \
		`VotingAnswers`.`image` AS `aImage`, \
		`VotingAnswers`.`hasComment`, \
		`VotingAnswers`.`commentMaxLength`, \
		`VotingAnswers`.`isRequired` as ans_req, \
		`VotingAnswers`.`isTokenPart`,   \
		`VotingAnswers`.`next`, `VotingAnswers`.`goToEnd`, \
		`VotingAnswers`.`excludeOthers`, \
		`VotingAnswers`.`nextSplashScreenMenu`, \
		`VotingAnswers`.`hasFile`, \
		`VotingAnswers`.`fileAccepts`, \
		`Participants_Have_Voting_Answers`.`text` as comments, \
		'+(token?'`Participants_Have_Voting_Answers`.`token_id`':'`Participants`.`session_id`')+' \
		FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` '+
			(token?' AND `Participants_Have_Voting_Answers`.`token_id`=? ':' \
			LEFT JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` AND `Participants`.`session_id` = ? ')+' \
		WHERE `VotingQuestions`.`id` = ? \
		AND `Conferences`.`url` = ? \
		ORDER BY qorder ASC, aorder ASC';
		connection.query(q,[(token?token:sid),qid,confId] ,function(err, rows, fields) {
			if (!err){
				var currentAnswerId = null;
				var c = 0;
				var hasFile = false;
				if(rows.length>0){
					var out = {
						'id':rows[0]['id'],
						'order': rows[0]['qorder'],
						'question': rows[0]['question'],
						'type': rows[0]['type'],
						'subtype': rows[0]['subtype'],
						'splash_screen_menu_id': rows[0]['splash_screen_menu_id'],
						'dontKnowAnswer': rows[0]['dontKnowAnswer'],
						'isRequired': rows[0]['isRequired'],
						'allowMultipleAnswers': rows[0]['allowMultipleAnswers'],
						'maxAnswers': rows[0]['maxAnswers'],
						'answerType': rows[0]['answerType'],
						'oneTouch': rows[0]['oneTouch'],
						'extra': rows[0]['extra'],
						'textStart': rows[0]['textStart'],
						'textEnd': rows[0]['textEnd'],
						'min': rows[0]['min'],
						'max': rows[0]['max'],
						'image': rows[0]['qImage'],
						'requireValidation': rows[0]['requireValidation'],
						'timeLimit': rows[0]['timeLimit'],
						'answers': []
					};
					for(var i=0;i<rows.length;i++){
						if(rows[i]['aid']!=currentAnswerId){
							out['answers'][c++] = {
								'id': rows[i]['aid'],
								'order': rows[i]['aorder'],
								'type': rows[i]['atype'],
								'text': rows[i]['answer'],
								'image': rows[i]['aImage'],
								'hasComment': rows[i]['hasComment'],
								'commentMaxLength': rows[i]['splash_screen_menu_id'],
								'isRequired': rows[i]['ans_req'],
								'isTokenPart': rows[i]['isTokenPart'],
								'next': rows[i]['next'],
								'goToEnd': rows[i]['goToEnd'],
								'excludeOthers': rows[i]['excludeOthers'],
								'nextSplashScreenMenu': rows[i]['nextSplashScreenMenu'],
								'hasFile': rows[i]['hasFile'],
								'fileAccepts': rows[i]['fileAccepts'],
							}
							currentAnswerId = rows[i]['aid'];
							if(rows[i]['hasFile']){
								hasFile = true;
								out['answers'][c-1]['files'] = [];
							}
						}
						if(rows[i]['session_id']){
							out['answers'][c-1]['isSelected'] = 1;
							out['answers'][c-1]['comments'] = rows[i]['comments'];
							out['isVoted'] = true;
						} else if(rows[i]['token_id']){
							out['answers'][c-1]['isSelected'] = 1;
							out['answers'][c-1]['comments'] = rows[i]['comments'];
							out['isVoted'] = true;
						}
					}
					module.exports.calcPageCounter(rows[0]['voting_group_id'],parseInt(rows[0]['qorder']),connection,function(data){
						out['pageCount'] = data['counter'];
						out['isLast'] = data['isLast'];
						module.exports.markDisabledAnswers(qid,out,connection,function (err, disabled) {
							if(!err){
								module.exports.rulez(qid,out,connection,function (err, disabled) {
									if(!err){
										if(hasFile && (!token)){
											module.exports.getVotingQuestionFiles(confId,qid,sid,connection,done_cb,out);
										} else {
											done_cb(out);
										}
									}
								})
							}
						})
					});
				}
				//else
					//console.log('Did not get any questions',confId,'popups',sid);
			} else {
				console.log('Error while checking db for question.',err, rows, fields);
			}
		});
	},
	getVotingAnswersByLimit:function (confId,qid,answers,connection,done_cb) {
		var q='\
		SELECT `VotingAnswers`.`id`, \
		`VotingAnswers`.`order`, \
		`VotingAnswers`.`text`, \
		`VotingAnswers`.`image`, \
		`VotingAnswers`.`hasComment`, \
		`VotingAnswers`.`commentMaxLength`, \
		`VotingAnswers`.`isRequired`, \
		`VotingAnswers`.`next`, `VotingAnswers`.`goToEnd`, \
		`VotingAnswers`.`excludeOthers`, \
		`VotingAnswers`.`nextSplashScreenMenu`, \
		`VotingAnswers`.`hasFile`, \
		`VotingAnswers`.`fileAccepts`, \
		`VotingAnswersRules`.`voting_answer_id` AS `dependsOn` \
		FROM `VotingAnswers` \
		JOIN `VotingAnswersRules` ON `VotingAnswers`.`id` = `VotingAnswersRules`.`voting_target_answer_id` \
		WHERE `VotingAnswersRules`.`voting_answer_id` IN (:VOTING_ANSWERS:) AND `VotingAnswers`.`voting_question_id` = ? \
		GROUP BY `VotingAnswers`.`id` \
		';
		var qMarks = '';
		for (var i = answers.length - 1; i >= 0; i--) {
			qMarks+='?';
			if(i) qMarks+=',';
		}
		q=q.replace(':VOTING_ANSWERS:',qMarks);
		var params = answers;
		params.push(qid);
		connection.query(q,params,done_cb);
	},
	markDisabledAnswers: function(qid,questions,connection,done_cb) {
		var q='\
		SELECT `A`.`id` \
		FROM ( \
			SELECT `VotingAnswers`.`id`, `VotingAnswers`.`maximumAllowed`>0 AND `VotingAnswers`.`maximumAllowed` <= COUNT(`Participants_Have_Voting_Answers`.`voting_answer_id`) AS `disabled` \
			FROM `VotingAnswers` \
			LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			WHERE `VotingAnswers`.`voting_question_id` = ? \
			GROUP BY `VotingAnswers`.`id` \
			ORDER BY `VotingAnswers`.`order` ASC \
		) AS `A` \
		WHERE `A`.`disabled` = 1\
		';
		if( questions.answers && questions.answers.length ){
			module.exports.getDisabledAnswers(qid,connection,function(err, rows, fields) {
				if (!err){
					if( rows && rows.length ){
						for (var i = 0; i < rows.length; i++) {
							var f = questions.answers.find(function (ans,j) {
								if( rows[i].id==ans.id ){
									ans.disabled=1;
									return true;
								}
								return false;
							})
						}
					}
				} else {
					console.log('Error while checking db for disabled answers. ',err, rows, fields);
				}
				done_cb(err, rows);
			})
		} else {
			done_cb(false, null);
		}
	},
	getDisabledAnswers: function(qid,connection,done_cb) {
		var q='\
		SELECT `A`.`id`, (`A`.`votes` - `A`.`maximumAllowed`) AS `diff` \
		FROM ( \
			SELECT `VotingAnswers`.`id`, `VotingAnswers`.`maximumAllowed`>0 , `VotingAnswers`.`maximumAllowed` , COUNT(`Participants_Have_Voting_Answers`.`voting_answer_id`) AS `votes` \
			FROM `VotingAnswers` \
			LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			WHERE `VotingAnswers`.`voting_question_id` = ? \
			GROUP BY `VotingAnswers`.`id` \
			ORDER BY `VotingAnswers`.`order` ASC \
		) AS `A` \
		WHERE `A`.`maximumAllowed`>0 AND `A`.`maximumAllowed` <= `A`.`votes`\
		';
		connection.query(q,[qid],done_cb);
	},
	rulez: function(qid,questions,connection,done_cb) {
		var q='\
		SELECT `VotingAnswersRules`.`voting_target_answer_id`, `VotingAnswersRules`.`voting_answer_id`, `VotingAnswersRules`.`condition` \
		FROM `VotingAnswers` \
		JOIN `VotingAnswersRules` ON `VotingAnswers`.`id` = `VotingAnswersRules`.`voting_target_answer_id` \
		WHERE `VotingAnswers`.`voting_question_id` =? \
		ORDER BY `VotingAnswers`.`order` ASC \
		';
		if( questions.answers && questions.answers.length ){
			connection.query(q,[qid] ,function(err, rows, fields) {
				if (!err){
					if( rows && rows.length ){
						var hasDifferentRule = false;
						for (var i = 0; i < rows.length; i++) {
							if(rows[i].condition==1){
								/* find the answer it depends on */
								var f = questions.answers.find(function (ans,j) {
									if( rows[i].voting_answer_id==ans.id ){
										return true;
									}
									return false;
								})
								/* find the affected answer and remove it if the dependent answer is not disabled */
								if( f ){
									if( !f.disabled ){
										var fj=-1;
										var f = questions.answers.find(function (ans,j) {
											if( rows[i].voting_target_answer_id==ans.id ){
												fj=j;
												return true;
											}
											return false;
										})
										if(f){
											questions.answers.splice(fj,1);
										}
									}else{
										var f = questions.answers.find(function (ans,j) {
											if( rows[i].voting_target_answer_id==ans.id ){
												return true;
											}
											return false;
										})
										if(f){
											f.dependsOn=rows[i].voting_answer_id;
										}
									}
								}
							}else{
								hasDifferentRule = true;
							}
						}
						if(hasDifferentRule){
							console.log('This is where the answer from previous question should be implemented (condition=0)');
						}
					}
				} else {
					console.log('Error while checking db for answer rules. ',err, rows, fields);
				}
				done_cb(err, rows);
			});
		} else {
			done_cb(false, null);
		}
	},
	getGroupQuestions:function(confId,gid,sid,vpromo,token,connection,done_cb){
		var q='SELECT \
		`VotingQuestions`.`id`, \
		`VotingQuestions`.`order` AS qorder, \
		IF(`VotingQuestions`.`type`=255,\'\',`VotingQuestions`.`question`) AS `question`, \
		`VotingQuestions`.`type`, \
		`VotingQuestions`.`splash_screen_menu_id`, \
		`VotingQuestions`.`subtype`, \
		`VotingQuestions`.`dontKnowAnswer`, \
		`VotingQuestions`.`isRequired`, \
		`VotingQuestions`.`allowMultipleAnswers`, \
		`VotingQuestions`.`maxAnswers`, \
		`VotingQuestions`.`answerType`, \
		(`VotingGroups`.`oneTouch` AND `VotingQuestions`.`oneTouch`) AS `oneTouch`, \
		`VotingQuestions`.`extra`, \
		`VotingQuestions`.`textStart`, \
		`VotingQuestions`.`textEnd`, \
		`VotingQuestions`.`min`, \
		`VotingQuestions`.`max`, \
		`VotingQuestions`.`image` AS `qImage`, \
		`VotingQuestions`.`requireValidation`,\
		IF(`VotingQuestions`.`countdown`>0, \
		UNIX_TIMESTAMP(DATE_ADD(`countdownStartTimestamp`, INTERVAL `countdown` second)),NULL) AS `timeLimit`, \
		`VotingAnswers`.`id` AS aid, \
		`VotingAnswers`.`order` AS aorder, \
		`VotingAnswers`.`type` AS atype, \
		`VotingAnswers`.`text` AS answer, \
		`VotingAnswers`.`image` AS `aImage`, \
		`VotingAnswers`.`hasComment`, \
		`VotingAnswers`.`commentMaxLength`, \
		`VotingAnswers`.`isRequired` as ans_req, \
		`VotingAnswers`.`next`, `VotingAnswers`.`goToEnd`, \
		`VotingAnswers`.`excludeOthers`, \
		`VotingAnswers`.`nextSplashScreenMenu`, \
		`VotingAnswers`.`hasFile`, \
		`VotingAnswers`.`fileAccepts` '+
		( vpromo?
			' ' :
			(
				' , `Participants_Have_Voting_Answers`.`text` as comments ' +
				( token? ' , `Participants_Have_Voting_Answers`.`token_id` ' : ' , `Participants`.`session_id` ' )
			)
		)+
		'FROM `Conferences` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \ ' + (vpromo?'':
		'LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` '+
			(token?' AND `Participants_Have_Voting_Answers`.`token_id`=? ':' \
			LEFT JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` AND `Participants`.`session_id` = ? '))+' \
		WHERE `VotingGroups`.`id` = ? \
		AND `Conferences`.`url` = ? \
		ORDER BY qorder ASC, aorder ASC';
		var dt = [];
		if(!vpromo) dt.push((token?token:sid));
		dt.push(gid);
		dt.push(confId);
		connection.query(q,dt ,function(err, rows, fields) {
			if (!err){
				var currentAnswerId = null;
				var currentQuestionId = null;
				var qCount = 0;
				var aCount = 0;
				var hasFile = false;
				var questionsContainingFiles = [];
				var out = [];
				if(rows.length>0){
					for(var i=0;i<rows.length;i++){
						if(rows[i]['id']!=currentQuestionId){
							currentQuestionId=rows[i]['id'];
							out[qCount++] = {
								'id':rows[i]['id'],
								'order': rows[i]['qorder'],
								'question': rows[i]['question'],
								'type': rows[i]['type'],
								'subtype': rows[i]['subtype'],
								'splash_screen_menu_id': rows[i]['splash_screen_menu_id'],
								'dontKnowAnswer': rows[i]['dontKnowAnswer'],
								'isRequired': rows[i]['isRequired'],
								'allowMultipleAnswers': rows[i]['allowMultipleAnswers'],
								'maxAnswers': rows[i]['maxAnswers'],
								'answerType': rows[i]['answerType'],
								'oneTouch': rows[i]['oneTouch'],
								'extra': rows[i]['extra'],
								'textStart': rows[i]['textStart'],
								'textEnd': rows[i]['textEnd'],
								'min': rows[i]['min'],
								'max': rows[i]['max'],
								'image': rows[i]['qImage'],
								'requireValidation': rows[i]['requireValidation'],
								'timeLimit': rows[i]['timeLimit'],
								'answers': []
							};
							aCount = 0;
						}
						if(rows[i]['aid']!=currentAnswerId){
							out[qCount-1]['answers'][aCount++] = {
								'id': rows[i]['aid'],
								'order': rows[i]['aorder'],
								'type': rows[i]['atype'],
								'text': rows[i]['answer'],
								'image': rows[i]['aImage'],
								'hasComment': rows[i]['hasComment'],
								'commentMaxLength': rows[i]['splash_screen_menu_id'],
								'isRequired': rows[i]['ans_req'],
								'next': rows[i]['next'],
								'goToEnd': rows[i]['goToEnd'],
								'excludeOthers': rows[i]['excludeOthers'],
								'nextSplashScreenMenu': rows[i]['nextSplashScreenMenu'],
								'hasFile': rows[i]['hasFile'],
								'fileAccepts': rows[i]['fileAccepts'],
							}
							currentAnswerId = rows[i]['aid'];
							if(rows[i]['hasFile'] && (!vpromo) && (!token)){
								hasFile = true;
								out[qCount-1]['answers'][aCount-1]['files'] = [];
								questionsContainingFiles.push(qCount-1);
							}
						}
						if(rows[i]['session_id'] && (!vpromo)){
							out[qCount-1]['answers'][aCount-1]['isSelected'] = 1;
							out[qCount-1]['answers'][aCount-1]['comments'] = rows[i]['comments'];
						} else if(rows[i]['token_id']){
							out[qCount-1]['answers'][aCount-1]['isSelected'] = 1;
							out[qCount-1]['answers'][aCount-1]['comments'] = rows[i]['comments'];
						}
					}

					async.each(
						out,
						function(q,cb) {
							module.exports.markDisabledAnswers(q.id,q,connection,function (err, disabled) {
								if(!err){
									module.exports.rulez(q.id,q,connection,function (err, disabled) {
										cb(err,disabled);
									})
								}else{
									cb(err,disabled);
								}
							})
						},
						function (error) {
							if(!error){
								if(hasFile){
									module.exports.getVotingGroupFiles(confId,gid,sid,questionsContainingFiles,vpromo,connection,done_cb,out);
								} else {
									done_cb(out);
								}
							}else{
								console.log('Error while marking disabled answers:',error);
							}
						}
					);
				}
				//else
					//console.log('Did not get any questions',confId,'popups',sid);
			} else {
				console.log('Error while checking db for question.',err, rows, fields);
			}
		});
	},
	getVotingGroupFiles:function(confId,gid,sid,questionsContainingFiles,vpromo,connection,done_cb,out){
		var q = 'SELECT \
		`Participants_Have_Voting_Files`.`id`, \
		`Participants_Have_Voting_Files`.`file`, \
		`Participants_Have_Voting_Files`.`name`,\
		`VotingAnswers`.`id` as aid \
		FROM `Participants_Have_Voting_Files` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Files`.`voting_answer_id` = `VotingAnswers`.`id` \
		JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
		JOIN `VotingGroups` ON `VotingQuestions`.`voting_group_id` = `VotingGroups`.`id` \
		JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
		JOIN `Participants` ON `Participants_Have_Voting_Files`.`participant_id` = `Participants`.`id` \
		WHERE `Conferences`.`url` = ? \
		AND `VotingGroups`.`id`= ? \
		AND `Participants`.`session_id` = ? \
		AND ( \
			((`VotingGroups`.`onePage` AND `VotingGroups`.`is_promo_voting`)=0) OR \
			(`Participants_Have_Voting_Files`.`voting_promo` = ?) \
		)';
		connection.query(q,[confId,gid,sid,vpromo] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					for(var q=0;q<questionsContainingFiles.length;q++){
						for(var i=0;i<rows.length;i++){
							for(var j=0;j<out[questionsContainingFiles[q]]['answers'].length;j++){
								if(rows[i]['aid'] == out['answers'][j]['id']){
									out[questionsContainingFiles[q]]['answers'][j]['files'].push(rows[i]);
								}
							}
						}
					}
				}
			} else {
				console.log('Error while checking db for voting files.',err, rows, fields);
			}
			done_cb(out);
		});
	},
	getVotingQuestionFiles:function(confId,qid,sid,connection,done_cb,out){
		var q = 'SELECT \
		`Participants_Have_Voting_Files`.`id`, \
		`Participants_Have_Voting_Files`.`file`, \
		`Participants_Have_Voting_Files`.`name`,\
		`VotingAnswers`.`id` as aid \
		FROM `Participants_Have_Voting_Files` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Files`.`voting_answer_id` = `VotingAnswers`.`id` \
		JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
		JOIN `VotingGroups` ON `VotingQuestions`.`voting_group_id` = `VotingGroups`.`id` \
		JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
		JOIN `Participants` ON `Participants_Have_Voting_Files`.`participant_id` = `Participants`.`id` \
		WHERE `Conferences`.`url` = ? \
		AND `VotingQuestions`.`id`= ? \
		AND `Participants`.`session_id` = ?';
		connection.query(q,[confId,qid,sid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					for(var i=0;i<rows.length;i++){
						for(var j=0;j<out['answers'].length;j++){
							if(rows[i]['aid'] == out['answers'][j]['id']){
								out['answers'][j]['files'].push(rows[i]);
								console.log(out['answers'][j]['files']);
							}
						}
					}
				}
			} else {
				console.log('Error while checking db for voting files.',err, rows, fields);
			}
			done_cb(out);
		});
	},
	getVotingBanners:function(gid,connection,done_cb){
		q = 'SELECT `id`,`image`,`position` FROM `VotingGroupBanners` WHERE `voting_group_id` = ?';
		connection.query(q,[gid] ,function(err, rows, fields) {
			if (!err){
				done_cb(rows);
			} else {
				console.log('Error while trying to get voting banners.',err, rows, fields);
			}
		});
	},
	voteQuestion:function(confId,qid,sid,votes,token,vpromo,connection,done_cb,raffle_cb){
		var q = 'INSERT INTO `Participants_Have_Voting_Answers`(`participant_id`, `voting_answer_id`, `text`, `token_id`, `voting_promo`) \
		SELECT `Participants`.`id`, `VotingAnswers`.`id`, ?, ?, ? \
		FROM `Participants` \
		JOIN `Conferences_Have_Participants` ON `Participants`.`id` = `Conferences_Have_Participants`.`participant_id` \
		JOIN `Conferences` ON `Conferences_Have_Participants`.`conference_id` = `Conferences`.`id` \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		WHERE `Conferences`.`url` = ? AND `Participants`.`session_id` = ? AND `VotingQuestions`.`id` = ? AND `VotingAnswers`.`id` = ? \
		AND `VotingGroups`.`deleted` = 0 AND `VotingQuestions`.`deleted` = 0';

		module.exports.getCheckVoteQuestionData(confId,qid,sid,token,connection,function(checkData){
			var editableAnswers = parseInt(checkData[0].editableAnswers);
			var token2 = parseInt(checkData[0].hasToken)?token:null;
			var _vpromo = parseInt(checkData[0].is_promo_voting)?vpromo:null;
			module.exports.deleteQuestionVotesIfNeeded(editableAnswers,token2,_vpromo,sid,qid,connection,function(error,deleteInfo){
				if( !votes || !votes.length ){
					/* If there are no votes, after the deletion just respond with 'no votes' and notify the controller of any answers that need be deleted/enabled */
					if(!error){
						var info = {};
						if(deleteInfo){
							if(deleteInfo && deleteInfo.toBeEnabled && deleteInfo.toBeEnabled.length) info.toBeEnabled=deleteInfo['toBeEnabled'];
							if(deleteInfo && deleteInfo.toBeDeleted && deleteInfo.toBeDeleted.length) info.toBeDeleted=deleteInfo['toBeDeleted'];
						}
						done_cb('no votes',info);
					}
				}else{
					/* If some answers where deleted get the data again */
					if( deleteInfo && deleteInfo.affectedRows ){
						module.exports.getCheckVoteQuestionData(confId,qid,sid,token,connection,function(checkData){
							var editableAnswers = parseInt(checkData[0].editableAnswers);
							var token2 = parseInt(checkData[0].hasToken)?token:null;
							var _vpromo = parseInt(checkData[0].is_promo_voting)?vpromo:null;
							module.exports.ifCanVote(votes,checkData,token2,function(error,info){
								canVote(error,info,deleteInfo,_vpromo,token2);
							});
						});
					}else{
						module.exports.ifCanVote(votes,checkData,token2,function(error,info){
							canVote(error,info,deleteInfo,_vpromo,token2);
						});
					}
				}
			});
		});
		function canVote(error,info,deleteInfo,_vpromo,token2) {
			if(!error){
				if(deleteInfo){
					if(deleteInfo.toBeEnabled && deleteInfo.toBeEnabled.length) info.toBeEnabled=deleteInfo['toBeEnabled'];
					if(deleteInfo.toBeDeleted && deleteInfo.toBeDeleted.length) info.toBeDeleted=deleteInfo['toBeDeleted'];
				}
				async.map(votes, function (dt,cb) {
					connection.query(q,[dt['text'],token2,_vpromo,confId,sid,qid,dt['aid']] ,function(err, rows, fields) {
						if(err){
							console.log('Error while trying to vote question.',err, rows, fields);
						}
						/* Call the callback without data, just so that it knows it finished */
						cb(null,!err?{ aid:dt['aid'], id:rows.insertId }:null);
					});
				}, function(err, results) {
					done_cb(results,info);
					module.exports.toAttendeesList(qid,sid,connection,function () {});
					module.exports.hasTrigger(qid,sid,connection,function (err,triggers) {
						if( triggers && triggers.length ){
							for (var i = triggers.length - 1; i >= 0; i--) {
								module.exports.getAndRunActions(confId,triggers[i],sid,connection,raffle_cb);
							}
						}
					});
				});
			} else {
				done_cb({error:error, info});
			}
		}
	},
	getCheckVoteQuestionData:function(confId,qid,sid,token,connection,done_cb){
		var q = 'SELECT  (`VotingGroups`.`onePage` AND `VotingGroups`.`is_promo_voting`) AS `is_promo_voting`, \
		`VotingAnswers`.`maximumAllowed`, \
		`VotingAnswers`.`id` as aid, \
		`VotingAnswers`.`isRequired`, \
		`VotingAnswers`.`excludeOthers`, \
		COUNT(`Participants`.`id`) as allVotes, \
		`VotingQuestions`.`allowMultipleAnswers`, \
		`VotingGroups`.`editableAnswers`, \
		`Conferences`.`maxVotingVotes`, \
		((`Conferences`.`usePassword` = 1) AND (ISNULL(`Conferences`.`password`))) OR `VotingGroups`.`requiresRegistration` as hasToken, \
		IF((`VotingQuestions`.`maxAnswers` = 0) OR (`VotingQuestions`.`type`=4),9999,`VotingQuestions`.`maxAnswers`) as maxAnswers, \
		IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`enabled`,`VotingGroups`.`open`) as enabled, \
		IF( `countdown`=0,1,UNIX_TIMESTAMP(NOW()) <= (UNIX_TIMESTAMP(`countdownStartTimestamp`)+`countdown`)) as notExpired, \
			(SELECT COUNT(*) \
			FROM Conferences  \
			JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id`  \
			JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			WHERE Conferences.url = ?) as totalConferencesVotes, \
			\
			(SELECT COUNT(1) = 0 \
			FROM `Participants_Have_Voting_Answers` \
			JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
			JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
			WHERE `VotingQuestions`.`id` = ? AND `Participants_Have_Voting_Answers`.`token_id` = ?) as token_can_vote, \
			\
			(SELECT COUNT(1) = 0 \
			FROM `Participants_Have_Voting_Answers` \
			JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` \
			JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
			JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
			WHERE `VotingQuestions`.`id` = ? AND `Participants`.`session_id` = ?) as participant_can_vote, \
			(SELECT COUNT(*) \
			FROM `VotingQuestions` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			WHERE `VotingAnswers`.`isRequired` = 1 \
			AND `VotingQuestions`.`id` = ?) as hasRequiredAnswers \
		FROM Conferences \
		JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id`  \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
		LEFT JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` \
		WHERE Conferences.url = ? \
		AND VotingQuestions.id = ? \
		GROUP BY `VotingAnswers`.`id`';
		connection.query(q,[confId,qid,token,qid,sid,qid,confId,qid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb(rows);
				}else{
					console.log('Error while getting check data (empty results)',confId);
				}
			} else {
				console.log('Error while getting check data',err, rows, fields);
			}
		});
	},
	deleteQuestionVotesIfNeeded:function(editableAnswers,token,promo,sid,qid,connection,done_cb){
		var q = 'DELETE `Participants_Have_Voting_Answers` \
		FROM `Participants_Have_Voting_Answers` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
		WHERE `VotingAnswers`.`voting_question_id` = ? \
		AND '+
		(token?'`Participants_Have_Voting_Answers`.`token_id` = ? ':
			(promo?'`Participants_Have_Voting_Answers`.`voting_promo` = ? ':
			'`participant_id` = ( \
				SELECT `Participants`.`id` \
				FROM `Participants` \
				WHERE `Participants`.`session_id` = ? \
			  )'
			)
		);
		/*
		Get the answers this participant has given because after being deleted
		the participants may have to be notified that an answer is now available
		*/
		var qGetAffectedAnswers = 'SELECT `VotingAnswersRules`.`voting_target_answer_id`, `VotingAnswers`.`id` \
		FROM `Participants_Have_Voting_Answers` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
		LEFT JOIN `VotingAnswersRules` ON `VotingAnswers`.`id` = `VotingAnswersRules`.`voting_answer_id` \
		WHERE `VotingAnswers`.`maximumAllowed`>0 \
		AND `VotingAnswers`.`voting_question_id` = ? \
		AND '+
		(token?'`Participants_Have_Voting_Answers`.`token_id` = ? ':
			(promo?'`Participants_Have_Voting_Answers`.`voting_promo` = ? ':
			'`participant_id` = ( \
				SELECT `Participants`.`id` \
				FROM `Participants` \
				WHERE `Participants`.`session_id` = ? \
			  )'
			)
		);
		if(editableAnswers){
			/* Get disabled answers */
			module.exports.getDisabledAnswers(qid,connection,function (a,b) {
				/* Keep only the answers that have exactly as many votes as the limit */
				var affected = [];
				for (var i = b.length - 1; i >= 0; i--) {
					if(b[i].diff==0) affected.push(b[i].id);
				}
				/* Run the query to get only the answers affected by the participants votes */
				if(affected && affected.length){
					var qMarks = '';
					for (var i = affected.length - 1; i >= 0; i--) {
						qMarks+='?';
						if(i) qMarks+=',';
					}
					qGetAffectedAnswers += ' AND `VotingAnswers`.`id` IN ('+qMarks+')';
					var params = affected;
					params.splice(0,0,(token?token:(promo?promo:sid)));
					params.splice(0,0,qid);
					connection.query(qGetAffectedAnswers,params ,function(err, rows) {
						if(!err){
							/* Gather the toBeEnabled and toBeDeleted answer ids and run the delete */
							var toBeEnabled = [], toBeDeleted = [];
							for (var i = rows.length - 1; i >= 0; i--) {
								if( toBeEnabled.indexOf(rows[i].id)<0 ) toBeEnabled.push(rows[i].id);
								if( toBeDeleted.indexOf(rows[i].voting_target_answer_id)<0 ) toBeDeleted.push(rows[i].voting_target_answer_id);
							}
							connection.query(q,[qid,(token?token:(promo?promo:sid))] ,function(err, rows, fields) {
								if (!err){
									done_cb(null,{'toBeEnabled':toBeEnabled,'toBeDeleted':toBeDeleted,'affectedRows':rows.affectedRows});
								} else {
									done_cb(err,{'affectedRows':rows.affectedRows});
								}
							});
						} else {
							done_cb(err,null);
						}
					});
				}else{
					/* If no answer is affected just run the delete query */
					connection.query(q,[qid,(token?token:(promo?promo:sid))] ,function(err, rows, fields) {
						if (!err){
							done_cb(null,{'affectedRows':rows.affectedRows});
						} else {
							done_cb(err,{'affectedRows':rows.affectedRows});
						}
					});
				}
			});
		} else {
			done_cb(null,null);
		}
	},
	calcPageCounter:function(gid,order,connection,done_cb){
		var q='SELECT COUNT(IF(`VotingQuestions`.`type` = 255 AND `VotingQuestions`.`order` < ?,1,NULL)) as screens ,COUNT(*) as questions \
		FROM `VotingQuestions` \
		WHERE `VotingQuestions`.`voting_group_id` = ?';
		connection.query(q,[order,gid] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					var screens = parseInt(rows[0].screens);
					var questions = parseInt(rows[0].questions);
					done_cb({counter:(order-screens),isLast:(questions-order==0)});
				}
			} else {
				console.log('Error while checking db for page counter',err, rows, fields);
			}
		});
	},
	ifCanVote:function(votes,rows,token,done_cb){
		var out = {'reachedLimit':[]};
		var isPromo = parseInt(rows[0]['is_promo_voting'])==1;
		var hasToken = parseInt(rows[0]['hasToken'])==1;
		var maxAllowedAnswers = (parseInt(rows[0]['allowMultipleAnswers'])==1)?parseInt(rows[0]['maxAnswers']):1;
		var enabled = parseInt(rows[0]['enabled'])==1;
		var notExpiredCountdown = parseInt(rows[0]['notExpired'])==1;
		//prevent null token votes for token enabled votings
		var checkToken = hasToken?token:true;
		//total votes for the whole conference
		var notPassedTotalVotes = (parseInt(rows[0]['maxVotingVotes'])==0) || (parseInt(rows[0]['maxVotingVotes'])>=(parseInt(rows[0]['totalConferencesVotes'])+votes.length));
		var notSelectedTooManyAnswers = (!isPromo)?(maxAllowedAnswers >= votes.length):true;
		//limit the maximum votes for specific answer --all users (see some lines bellow (if((parseInt(rows[0]['maximumAllowed'])!=0).....)
		var notTooManyParticipantsSameAnswer = true;
		//check if user/token etc. has already voted
		var participantCanVote = ( !isPromo && !(rows[0]['editableAnswers']==1) )?(hasToken?(parseInt(rows[0]['token_can_vote'])==1):(parseInt(rows[0]['participant_can_vote'])==1)):true;
		//ensure that the required answers have been voted (see some lines bellow (the lines that use tmpReq) )
		var votedRequiredAnswers = true;
		//ensure that the user has not selected answers that exclude one another (see some lines bellow (if(rows[i]['excludeOthers']!=excludeOthersInitial)......)
		var notSelectedExcluded = true;
		var excludeOthersInitial = null;
		for(var i=0;i<rows.length;i++){
			var tmpReq = (parseInt(rows[i]['isRequired'])==1); //check all answers if any is required
			for(var v=0;v<votes.length;v++){
				if(votes[v]['aid'] == rows[i]['aid']){
					if(excludeOthersInitial===null) excludeOthersInitial = rows[i]['excludeOthers'];
					if(rows[i]['excludeOthers']!=excludeOthersInitial)
						notSelectedExcluded = false;
					if( parseInt(rows[i]['maximumAllowed'])!=0 ){
						var max = parseInt(rows[i]['maximumAllowed']);
						var vts = parseInt(rows[i]['allVotes']);
						if(vts >= max) notTooManyParticipantsSameAnswer = false;
						if(max == (vts+1)){
							out.reachedLimit.push(votes[v]['aid']);
						}
					}
					tmpReq = false; //if it was required, it has been fullfilled
				}
			}
			if(tmpReq) //if it was required and has not been fullfilled
				votedRequiredAnswers = false;
		}
		if (!enabled){
			done_cb('disabled voting');
		} else if (!notExpiredCountdown){
			done_cb('expired voting');
		} else if (!notPassedTotalVotes){
			done_cb('full voting');
		} else if (!notSelectedTooManyAnswers){
			done_cb('answers limit passed');
		} else if (!notTooManyParticipantsSameAnswer){
			done_cb('participant votes for answer limit passed');
		} else if (!participantCanVote){
			done_cb('this user has already voted');
		} else if (!votedRequiredAnswers){
			done_cb('there are required answers that need to be voted');
		} else if (!notSelectedExcluded){
			done_cb('you have selected answers that exclude one another');
		} else if (!checkToken){
			done_cb('you have not entered token');
		} else {
			/* The participant can vote*/
			done_cb(null,out);
		}
	},
	lockVoting:function(confId,gid,token,vpromo,sid,connection,done_cb){
		q = 'INSERT INTO `Participants_Locked_Voting_Groups`(`participant_id`, `voting_group_id`, `token_id`, `voting_promo`) \
		SELECT `Participants`.`id`, ?, ?, ? FROM `Participants` WHERE `Participants`.`session_id` = ?';
		module.exports.getAndCheckRequiredVoted(confId,gid,sid,vpromo,token,connection,function(err,canLock){
			if( canLock ){
				connection.query(q,[gid,token,vpromo,sid] ,function(err, rows, fields) {
					if (!err){
						done_cb({locked:true});
					} else {
						done_cb({error:err});
						console.log('Error while trying to lock voting group.',err, rows, fields);
					}
				});
			}else{
				done_cb({error:'err'});
			}
		});
	},
	getAndCheckRequiredVoted:function (confId,gid,sid,vpromo,token,connection,done_cb) {
		module.exports.getGroupQuestions(confId,gid,sid,vpromo,token,connection,function(res){
			var cont=module.exports.allRequiredVoted(res);
			done_cb(null,cont);
		});
	},
	allRequiredVoted:function (questions) {
		var cont=true;
		for (var i = questions.length - 1; i >= 0 && cont; i--) {
			if( questions[i].isRequired ){
				cont=false;
				for (var j = questions[i].answers.length - 1; j >= 0 && !cont; j--) {
					if(questions[i].answers[j].isSelected) cont=true;
				}
			}
		}
		return cont;
	},
	disableVotingQuestion:function(group,question,connection,done_cb){
		var q = 'UPDATE `VotingQuestions` \
		JOIN `VotingGroups` ON `VotingQuestions`.`voting_group_id` = `VotingGroups`.`id` \
		SET `VotingQuestions`.`enabled`= 0 \
		WHERE `VotingGroups`.`id` = ? \
		AND `VotingQuestions`.`id` = ? ';
		connection.query(q,[group,question] ,function(err, rows, fields) {
			if (!err){
				if(rows.affectedRows>0)
					done_cb(true);
			} else {
				console.log('Error while trying to disable voting question',err, rows, fields);
			}
		});
	},
	checkForCountdownsOnStart:function(connection,dbPrefix,done_cb){
		var q='SELECT VotingQuestions.id as `question`, VotingQuestions.voting_group_id as `group`, CONCAT(?,LOWER(Conferences.url)) as `channel`, (UNIX_TIMESTAMP(`countdownStartTimestamp`)+`countdown`) - UNIX_TIMESTAMP(NOW()) as `countdown` \
		FROM `VotingQuestions` \
		JOIN `VotingGroups` ON `VotingQuestions`.`voting_group_id` = `VotingGroups`.`id` \
		JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
		WHERE `countdown`>0 \
		AND UNIX_TIMESTAMP( NOW() ) < ( UNIX_TIMESTAMP(`countdownStartTimestamp`)+`countdown` )';
		connection.query(q,[dbPrefix] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0){
					done_cb(rows);
				}
			} else {
				console.log('Error',err, rows, fields);
			}
		});
	},
	ifHasAccessToRoom:function(confId,group_id,sid,connection,done_cb){
		var q='SELECT COUNT(`VotingGroups`.`id`)>0 as access \
				FROM `Conferences_Have_Participants` \
				JOIN `Conferences` ON `Conferences_Have_Participants`.`conference_id` = `Conferences`.`id` \
				JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id` \
				JOIN `VotingGroups` ON `Conferences_Have_Participants`.`conference_id` = `VotingGroups`.`conference_id` \
				WHERE `Participants`.`session_id` = ? AND `Conferences`.`url` = ? AND `VotingGroups`.`id` = ?';
		connection.query(q,[sid,confId,group_id] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0 && rows[0].access==1)
					done_cb();
				else
					console.log('User has no access to this room or invalid room',confId,group_id,sid);
			} else {
				console.log('Error while checking db for room.',err, rows, fields);
			}
		});
	},
	toAttendeesList:function(qid,sid,connection,done_cb) {
		/* Add row if it does not exist */
		var q1='\
		INSERT INTO `AtendeesList`(`atendeelist_id`, `participant_id`) \
		SELECT `AtendeesListLists`.`id`, `Participants`.`id` \
		FROM `AtendeesListLists` \
		JOIN `AtendeesListHeader` ON `AtendeesListLists`.`id` = `AtendeesListHeader`.`atendees_list_id` \
		,`Participants` \
		WHERE ( \
			`AtendeesListHeader`.`voting_question_id` = ? \
			OR \
			`AtendeesListHeader`.`voting_answer_id` IN ( \
				SELECT `id` FROM `VotingAnswers` WHERE `voting_question_id` = ? \
			) \
		) \
		AND `Participants`.`session_id` = ? \
		GROUP BY `AtendeesListLists`.`id` \
		';
		/* Add the data from the connected voting QUESTIONS */
		var q2='\
		INSERT INTO `AtendeesListColumns` (`header_id`, `value`, `row_id`, `voting_answer_id`) \
		\
		SELECT `AtendeesListHeader`.`id`, `VotingAnswers`.`text`, `AtendeesList`.`id`, `VotingAnswers`.`id` \
		FROM `AtendeesListLists` \
		JOIN `AtendeesListHeader` ON `AtendeesListLists`.`id` = `AtendeesListHeader`.`atendees_list_id` \
		JOIN `VotingQuestions` ON `AtendeesListHeader`.`voting_question_id` = `VotingQuestions`.`id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
		JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` \
		\
		JOIN `AtendeesList` \
			ON `Participants`.`id` = `AtendeesList`.`participant_id` \
			AND `AtendeesListLists`.`id` = `AtendeesList`.`atendeelist_id` \
 		\
		WHERE `VotingQuestions`.`id` = ? \
		AND `Participants`.`session_id` = ? \
		ON DUPLICATE KEY UPDATE \
		`AtendeesListColumns`.`value`=`VotingAnswers`.`text`, `AtendeesListColumns`.`voting_answer_id`=`VotingAnswers`.`id` \
		';
		/* Add the data from the connected voting ANSWERS */
		var q3='\
		INSERT INTO `AtendeesListColumns` (`header_id`, `value`, `row_id`) \
		SELECT `AtendeesListHeader`.`id`, `Participants_Have_Voting_Answers`.`text`, `AtendeesList`.`id` \
		FROM `AtendeesListLists` \
		JOIN `AtendeesListHeader` ON `AtendeesListLists`.`id` = `AtendeesListHeader`.`atendees_list_id` \
		JOIN `VotingAnswers` ON `AtendeesListHeader`.`voting_answer_id` = `VotingAnswers`.`id` \
		JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
		JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` \
		\
		JOIN `AtendeesList` \
			ON `Participants`.`id` = `AtendeesList`.`participant_id` \
			AND `AtendeesListLists`.`id` = `AtendeesList`.`atendeelist_id` \
		\
		WHERE `VotingAnswers`.`id` IN ( \
			SELECT `id` FROM `VotingAnswers` WHERE `voting_question_id` = ? \
		) \
		AND `Participants`.`session_id` = ? \
		ON DUPLICATE KEY UPDATE \
		`AtendeesListColumns`.`value`=`Participants_Have_Voting_Answers`.`text` \
		';
		connection.query(q1,[qid,qid,sid] ,function(err, rows) {
			if( (rows&&rows.affectedRows) || (err&&err.sqlState=='23000') ){
				async.parallel(
					[
						function(cb){ connection.query(q2,[qid,sid] ,function(err, rows) {
							if(err) console.log('Could not add to the AtendeesListColumns 1',err);
							cb(null, rows) });
						},
						function(cb){ connection.query(q3,[qid,sid] ,function(err, rows) {
							if(err) console.log('Could not add to the AtendeesListColumns 2',err);
							cb(null, rows) });
						}
					],
					done_cb
				);
			}else if(err){
				console.log('Could not add to the AtendeesList',err);
			}
		});
	},
	hasTrigger:function (qid,sid,connection,done_cb) {
		var q = '\
		SELECT `VotingTriggers`.`id`, `VotingTriggers`.`voting_group_id`, `VotingTriggers`.`condition`, `VotingTriggers`.`conditionAmount`, `VotingTriggers`.`amountIsAbsolute`, `VotingTriggers`.`comparator` \
		FROM `VotingTriggers` \
		WHERE `VotingTriggers`.`voting_group_id` = ( \
			SELECT `VotingQuestions`.`voting_group_id` FROM `VotingQuestions` WHERE `id` = ? \
		) \
		';
		connection.query(q,[qid] ,function(err, triggers) {
			if(err){
				console.log('Failed to get trigger: ',err);
				done_cb(err,null);
			}else if(triggers.length){
				async.map(triggers,function(trigger,cb) {
					var acceptableCondition = false;
					var qC = null;
					if( trigger.condition == 'correct' ){
						acceptableCondition = true;
						qC = 'SELECT COUNT(`VotingAnswers`.`id`) AS `max`, COUNT(`Participants`.`id`) AS `value` \
						FROM `Participants` \
						JOIN `Participants_Have_Voting_Answers` ON `Participants`.`id` = `Participants_Have_Voting_Answers`.`participant_id` \
						RIGHT JOIN `VotingAnswers` \
							ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
							AND `Participants`.`session_id` = ? \
						RIGHT JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
						WHERE `VotingQuestions`.`voting_group_id` = ? \
						AND `VotingQuestions`.`deleted` = 0 \
						AND `VotingAnswers`.`isCorrect` = 1 \
						';
					}else if( trigger.condition == 'voted' ){
						acceptableCondition = true;
						qC = 'SELECT COUNT(`A`.`id`) AS `max`, SUM(`A`.`answered`) AS `value` \
						FROM ( \
							SELECT `VotingQuestions`.`id`, COUNT(`Participants`.`id`)>0 AS `answered` \
							FROM `Participants` \
							JOIN `Participants_Have_Voting_Answers` ON `Participants`.`id` = `Participants_Have_Voting_Answers`.`participant_id` \
							RIGHT JOIN `VotingAnswers` \
								ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
								AND `Participants`.`session_id` = ? \
							RIGHT JOIN `VotingQuestions` ON `VotingAnswers`.`voting_question_id` = `VotingQuestions`.`id` \
							WHERE `VotingQuestions`.`voting_group_id` = ? \
							AND `VotingQuestions`.`deleted` = 0 \
							GROUP BY `VotingQuestions`.`id` \
						) AS `A` \
						';
					}
					if( acceptableCondition ){
						connection.query(qC,[sid,trigger.voting_group_id] ,function(err, res) {
							var passed = false;
							if(err){
								console.log('Failed to get trigger actions: ',err);
							}else if(res.length){
								var max = res[0]['max'];
								var value = res[0]['value'];

								var valueToCompare = 0;
								if( trigger.amountIsAbsolute==1 ){
									valueToCompare = trigger.conditionAmount;
								}else{
									valueToCompare = trigger.conditionAmount*max;
								}
								switch (trigger.comparator) {
									case -2:	passed = value<valueToCompare;	break;
									case -1:	passed = value<=valueToCompare;	break;
									case 0:		passed = value==valueToCompare;	break;
									case 1:		passed = value>=valueToCompare;	break;
									case 2:		passed = value>valueToCompare;	break;
									default:	passed = false;					break;
								}
							}
							cb(err,[trigger.id,passed]);
						});
					}else{
						cb('Incorrect condition',[trigger.id,null]);
					}
					;
				},function(err, results){
					var out = [];
					for (var i = results.length - 1; i >= 0; i--) {
						if( results[i][1] ){
							out.push(results[i][0]);
						}
					}
					done_cb(err,out);
				})
			}else{
				done_cb(null,null);
			}
		});
	},
	getAndRunActions: function (confId,voting_trigger_id,sid,connection,done_cb){
		var q = '\
		SELECT `RaffleFields`.`raffle_event_id`, \
		`CopyAnswerToRaffleAction`.`raffle_field_id`, \
		IF(`CopyAnswerToRaffleAction`.`useComment`,`Participants_Have_Voting_Answers`.`text`, `VotingAnswers`.`text`) AS `data` \
		FROM `Participants` \
		JOIN `Participants_Have_Voting_Answers` ON `Participants`.`id` = `Participants_Have_Voting_Answers`.`participant_id` \
		RIGHT JOIN `VotingAnswers` \
			ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
			AND `Participants`.`session_id` = ? \
		RIGHT JOIN `CopyAnswerToRaffleAction` ON `VotingAnswers`.`id` = `CopyAnswerToRaffleAction`.`voting_answer_id` \
		RIGHT JOIN `Voting_Triggers_Have_Actions` ON `CopyAnswerToRaffleAction`.`id` = `Voting_Triggers_Have_Actions`.`copy_answer_to_raffle_action_id` \
		RIGHT JOIN `RaffleFields` ON `CopyAnswerToRaffleAction`.`raffle_field_id` = `RaffleFields`.`id` \
		WHERE `Voting_Triggers_Have_Actions`.`voting_trigger_id` = ? \
		';
		connection.query(q,[sid,voting_trigger_id] ,function(err, actions) {
			if( actions.length ){
				var data = {};
				/* Group the actions */
				for (var i = actions.length - 1; i >= 0; i--) {
					var reid = actions[i]['raffle_event_id'];
					var rfid = actions[i]['raffle_field_id'];
					if(!data[reid]){
						data[reid] = {
							'ev':reid,
							'dt':[[ rfid, actions[i]['data'] ]]
						};
					}else{
						data[reid]['dt'].push([ rfid, actions[i]['data'] ]);
					}
				}
				var raffleModel = require('../models/raffle.js');
				/* Add the data */
				async.map(data,function (dt,cb) {
					raffleModel.addTicket(
						confId,
						sid,
						dt.ev,
						dt.dt,
						connection,
						function (error,_data_) {
							cb(error?{'ev':dt.ev,'dt':error}:null,{'ev':dt.ev,'dt':_data_});
						}
					);
				}, done_cb);
			}
		});
	},
	calculateScores: function (confId,gid,connection,done_cb){
		var q = '\
		SELECT `A`.`session_id`, `A`.`correct`, (`A`.`sumInvertedPerc`/`A`.`correct`)*`A`.`correct`*500 AS `score` \
		FROM ( \
			SELECT `Participants`.`session_id`, COUNT(IF(VotingAnswers.isCorrect,1,NULL)) AS `correct`, \
			SUM( \
				IF( \
					`VotingAnswers`.`isCorrect`, \
					(`VotingQuestions`.`countdown` - (`Participants_Have_Voting_Answers`.`timestamp`-`VotingQuestions`.`countdownStartTimestamp`)) / `VotingQuestions`.`countdown`, \
					0 \
				) \
			) AS `sumInvertedPerc` \
			FROM `Conferences` \
			JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
			JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			JOIN `Participants` ON `Participants_Have_Voting_Answers`.`participant_id` = `Participants`.`id` \
			WHERE `Conferences`.`url` = ? AND `VotingGroups`.`id`= ? \
			GROUP BY `Participants_Have_Voting_Answers`.`participant_id` \
		) AS `A` \
		ORDER BY `score` DESC \
		';
		connection.query(q,[confId,gid],done_cb);
	},
	getToken:function(confId,sid,connection,done_cb) {
		var q = '\
		SELECT `Conferences_Have_Participants`.`conference_token_id` \
		FROM `Conferences_Have_Participants` \
		JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id` \
		JOIN `Conferences` ON `Conferences_Have_Participants`.`conference_id` = `Conferences`.`id` \
		WHERE `Conferences`.`url` = ? \
		AND `Participants`.`session_id` = ? \
		';
		connection.query(q,[confId,sid],function (err, results) {
			if(err) done_cb(err,null);
			else if (results.length) done_cb(null,results[0].conference_token_id);
			else done_cb(null,null);
		});
	},
	testForToken:function (confId,votes,connection,done_cb) {
		var params = [confId,confId];
		var _q = '';
		for (var i = votes.length - 1; i >= 0; i--) {
			params.push( votes[i].aid );
			params.push( votes[i].text );
			_q+=' `VotingAnswers`.`id` = ? AND `Participants_Have_Voting_Answers`.`text` = ? ';
			if(i) _q+=' OR ';
		}
		var q = '\
		SELECT COUNT(1) = ( \
			SELECT COUNT(1) \
			FROM `Conferences` \
			JOIN `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
			JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			WHERE `VotingGroups`.`deleted` = 0 \
			AND `VotingQuestions`.`deleted` = 0 \
			AND `VotingGroups`.`isRegistration` = 1 \
			AND `VotingAnswers`.`isTokenPart` = 1 \
			AND `Conferences`.`url` = ? \
		) AS `isSame`, `Conference_Tokens`.`id` \
		FROM `Conferences` \
		JOIN `Conference_Tokens` ON `Conferences`.`id`=`Conference_Tokens`.`conference_id` \
		JOIN `Conference_Tokens_Have_Voting_Answers` ON `Conference_Tokens`.`id` = `Conference_Tokens_Have_Voting_Answers`.`token_id` \
		JOIN `Participants_Have_Voting_Answers` ON `Conference_Tokens_Have_Voting_Answers`.`participant_voting_answer_id` = `Participants_Have_Voting_Answers`.`id` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
		WHERE \
		`VotingAnswers`.`isTokenPart` = 1 \
		AND `Conferences`.`url` = ? \
		AND '+
			_q
		+' GROUP BY `Participants_Have_Voting_Answers`.`participant_id` \
		ORDER BY `isSame` DESC \
		LIMIT 1 \
		';
		connection.query(q,params,function (err, results) {
			if(err) done_cb(err,null);
			else if (results.length) done_cb(null,{'isSame':results[0].isSame,'id':results[0].id});
			else done_cb(null,null);
		});
	},
	addToken:function (confId,sid,votes,connection,done_cb) {
		var uuidv4 = require('uuid/v4');
		var qI = 'INSERT INTO `Conference_Tokens` (`conference_id`, `token`) \
		SELECT id, ? \
		FROM `Conferences` \
		WHERE `url`=? \
		';
		var qI2_1 = '\
		INSERT INTO `Conference_Tokens_Have_Voting_Answers`(`token_id`, `participant_voting_answer_id`) \
		SELECT ?, `Participants_Have_Voting_Answers`.`id` \
		FROM `Participants_Have_Voting_Answers` \
		JOIN `VotingAnswers` ON `Participants_Have_Voting_Answers`.`voting_answer_id` = `VotingAnswers`.`id` \
		WHERE `VotingAnswers`.`isTokenPart` = 1 \
		AND `Participants_Have_Voting_Answers`.`id` IN ( :IDS: ) \
		';
		connection.query(qI,[uuidv4(),confId],function (err, result) {
			if(!err){
				/* Prepare query */
				var params = [result.insertId];
				var qs = '';
				for (var i = votes.length - 1; i >= 0; i--) {
					qs+=votes[i].id;
					if(i) qs+=', ';
					params.push(votes[i].id);
				}
				qI2_1 = qI2_1.replace(':IDS:',qs);

				async.parallel(
					[
						function(cb){
							connection.query(qI2_1,params,cb);
						},
						function(cb){
							module.exports.updateAnswersToken(votes,result.insertId,connection,cb);
						},
						function(cb){
							module.exports.setToken(confId,sid,result.insertId,connection,cb);
						}
					],
					function (errors,results) {
						if(errors) done_cb(errors,null);
						else done_cb(null,result.insertId);
					}
				);
			}else{
				done_cb(err,null);
			}
		});
	},
	setToken:function (confId,sid,tokenId,connection,done_cb) {
		var qI2_2 = 'UPDATE `Conferences_Have_Participants` \
		SET `conference_token_id` = ? \
		WHERE \
		`Conferences_Have_Participants`.`conference_id` = (SELECT `id` FROM `Conferences` WHERE `url` = ?) AND \
		`Conferences_Have_Participants`.`participant_id` = (SELECT `id` FROM `Participants` WHERE `session_id` = ?)';
		connection.query(qI2_2,[tokenId,confId,sid],done_cb);
	},
	updateAnswersToken:function (votes,tokenId,connection,done_cb) {
		var qI2_3 = 'UPDATE `Participants_Have_Voting_Answers` \
		SET `token_id` = ? \
		WHERE `Participants_Have_Voting_Answers`.`id` IN ( :IDS: )';
		var params = [tokenId];
		var qs = '';
		for (var i = votes.length - 1; i >= 0; i--) {
			qs+=votes[i].id;
			if(i) qs+=', ';
			params.push(votes[i].id);
		}
		qI2_3 = qI2_3.replace(':IDS:',qs);
		connection.query(qI2_3,params,done_cb);
	}
}

