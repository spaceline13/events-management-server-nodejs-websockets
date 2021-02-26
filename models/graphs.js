var async = require('async');
module.exports = {
	getGroups:function (confId,connection,done_cb){
		var qGroups='SELECT \
		`VotingGroups`.`id`, \
		`VotingGroups`.`text`, \
		`VotingGroups`.`graphsNum`, \
		`VotingGroups`.`showTotal`, \
		"vg" AS type, \
		0 AS `controlQuestions`, \
		`VotingGroups`.`identifySelfChartLimit`, \
		`VotingGroups`.`identifySelfChartCorrectOnly`, \
		IF(`VotingGroups`.`showTopQuestions`,`VotingGroups`.`topQuestions`,0) AS `showTopQuestions`, \
		IF(`VotingGroups`.`showBottomQuestions`,`VotingGroups`.`bottomQuestions`,0) AS `showBottomQuestions` \
		FROM `Conferences` \
		JOIN  `VotingGroups` ON `Conferences`.`id` = `VotingGroups`.`conference_id` \
		WHERE `VotingGroups`.`graphs` AND \
		`Conferences`.`id` = ( \
			SELECT `Conferences`.`id` \
			FROM `Conferences` \
			WHERE `Conferences`.`url` = ? \
		) AND `VotingGroups`.`deleted` = 0 \
		ORDER BY `VotingGroups`.`order`';
		
		var qCustom = 'SELECT \
		`CustomGraphs`.`id`, \
		`CustomGraphs`.`name` AS `text`, \
		"cg" AS `type`, \
		0 AS `controlQuestions` \
		FROM `CustomGraphs` \
		JOIN `Conferences` ON `CustomGraphs`.`conference_id` = `Conferences`.`id` \
		WHERE `Conferences`.`url` = ? \
		AND `CustomGraphs`.`visible`';
		
		var qSpeakerEval = 'SELECT \
		`Agenda`.`id` \
		FROM `Conferences` \
		JOIN `Agenda` ON `Conferences`.`id` = `Agenda`.`conference_id` \
		WHERE `Agenda`.showGraphs=1 \
		AND `Conferences`.`url` = ?';
		async.parallel(
			{
				groups: function(cb){ 
					connection.query(qGroups,[confId] ,function(err, rows) {
						cb(null,rows);
					});
				},
				custom: function(cb){ 
					connection.query(qCustom,[confId] ,function(err, rows) {
						cb(null,rows);
					});
				},
				speaker: function(cb){ 
					connection.query(qSpeakerEval,[confId] ,function(err, rows) {
						if(rows.length>0){
							rows[0].text='Speaker Evaluation';
							rows[0].type='sp';
						}
						cb(null,rows);
					});
				}
			},
			function(err,rows){
				var res = rows.groups;
				res.push.apply(res, rows.custom);
				res.push.apply(res, rows.speaker);
				done_cb(res);
			}		
		);
	},
	getGraphs:function(confId,group,qid,type,connection,done_cb){
		//multiple choise and rating
		var q1 = 'SELECT \
		`VotingGroups`.`orderByScore`, \
		`VotingGroups`.`showTotal`, \
		`VotingQuestions`.`id` AS qid, \
		`VotingQuestions`.`order`, \
		`VotingQuestions`.`colorizeNegativeWords`,  \
		`VotingQuestions`.`hideText`, \
		`VotingQuestions`.`wordCloud`, \
		`VotingQuestions`.`image` AS `questionImage`, \
		`VotingQuestions`.`question`, \
		`VotingQuestions`.`type`, \
		`VotingQuestions`.`subtype`, \
		1 as graphs, \
		`VotingQuestions`.`graphsExtra`, \
		`VotingAnswers`.`id` AS aid,  \
		`VotingAnswers`.`order` AS `aOrder`, \
		`Participants_Have_Voting_Answers`.`participant_id`, \
		`Participants_Have_Voting_Answers`.`text` as participant_text, \
		`VotingQuestions`.`allowMultipleAnswers`, \
		IF(`VotingQuestions`.`showGraphsComments`,`VotingQuestions`.`graphsComments`,null) AS `graphsComments`, \
		IF (`VotingGroups`.`controlQuestions`=1,`VotingQuestions`.`graphsResults`,1) as graphsResults, \
		IF(`VotingQuestions`.`answerType`!=2,`VotingAnswers`.`text`,null) AS `text`, \
		IF(`VotingQuestions`.`answerType`!=1,`VotingAnswers`.`image`,null) AS `image`, \
		IF(`VotingQuestions`.`countdown`>0,UNIX_TIMESTAMP(DATE_ADD(`countdownStartTimestamp`, INTERVAL `countdown` second)),null) AS `timeLimit`, \
		(IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`showCorrect`,`VotingGroups`.`showCorrect`) AND `VotingAnswers`.`isCorrect`) AS `isCorrect`, \
		count(`Participants_Have_Voting_Answers`.`voting_answer_id`) * IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, 0, 1) AS `votes`, \
		`A`.`qVotes` * IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, 0, 1)  AS `qVotes`, \
		`A`.`qUniqueVotes` * IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, 0, 1)  AS `qUniqueVotes` \
		FROM `VotingGroups` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
		LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
		LEFT JOIN ( \
			SELECT `VotingQuestions`.`id` AS qid, \
			COUNT( `Participants_Have_Voting_Answers`.`participant_id`) as `qVotes`, \
			COUNT( DISTINCT `Participants_Have_Voting_Answers`.`participant_id`) as `qUniqueVotes` \
			FROM `VotingGroups` \
			JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
			LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			WHERE `VotingGroups`.`id` = ? AND `Conferences`.`url` = ? AND \
			(`VotingQuestions`.`dontKnowAnswer` IS null OR (`VotingAnswers`.`id`!=`VotingQuestions`.`dontKnowAnswer`)) AND \
			IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`graphs`,`VotingGroups`.`graphs`) AND \
			`VotingQuestions`.`deleted` = 0 \
			GROUP BY `VotingQuestions`.`id` \
			ORDER BY `VotingQuestions`.`order` ASC, `VotingQuestions`.`id` ASC, `VotingAnswers`.`order` ASC \
		) AS `A` ON `VotingQuestions`.`id` = `A`.`qid` \
		WHERE `VotingGroups`.`id` = ? AND `Conferences`.`url` = ? AND \
		IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`graphs`,`VotingGroups`.`graphs`) AND \
		`VotingQuestions`.`deleted` = 0 AND \ '+
		(qid?'` VotingQuestions`.`id` = 0 AND \ ':'') +
		' (`VotingQuestions`.`type` = 1 OR `VotingQuestions`.`type` = 3) \
		AND (`VotingQuestions`.`dontKnowAnswer` IS null OR (`VotingAnswers`.`id`!=`VotingQuestions`.`dontKnowAnswer`)) \
		GROUP BY `VotingAnswers`.`id` \
		ORDER BY `VotingQuestions`.`order` ASC, `VotingQuestions`.`id` ASC, `VotingAnswers`.`order` ASC';
				
		//free text and personal data
		var q2 = 'SELECT \
		`VotingGroups`.`orderByScore`, \
		`VotingGroups`.`showTotal`, \
		`VotingQuestions`.`id` AS qid, \
		`VotingQuestions`.`order`, \
		`VotingQuestions`.`colorizeNegativeWords`,  \
		`VotingQuestions`.`hideText`, \
		`VotingQuestions`.`wordCloud`, \
		1 as graphs, \
		`VotingQuestions`.`graphsExtra`, \
		`VotingAnswers`.`id` AS aid, \
		`VotingQuestions`.`image` AS `questionImage`, \
		`VotingQuestions`.`question`, \
		`VotingQuestions`.`type`, \
		`VotingQuestions`.`subtype`, \
		`Participants_Have_Voting_Answers`.`participant_id`, \
		`VotingQuestions`.`allowMultipleAnswers`, \
		IF(`VotingQuestions`.`showGraphsComments`, `VotingQuestions`.`graphsComments`,null) AS `graphsComments`, \
		IF(`VotingQuestions`.`countdown`>0,UNIX_TIMESTAMP(DATE_ADD(`countdownStartTimestamp`, INTERVAL `countdown` second)),null) AS `timeLimit`, \
		IF (`VotingGroups`.`controlQuestions`=1,`VotingQuestions`.`graphsResults`,1) as graphsResults, \
		IF(`VotingQuestions`.`answerType`!=2,`VotingAnswers`.`text`,null) AS `text`, \
		IF(`VotingQuestions`.`answerType`!=1,`VotingAnswers`.`image`,null) AS `image`, \
		IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, null, `Participants_Have_Voting_Answers`.`text`)  as participant_text, \
		(IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`showCorrect`,`VotingGroups`.`showCorrect`) AND `VotingAnswers`.`isCorrect`) AS `isCorrect`, \
		count(`Participants_Have_Voting_Answers`.`voting_answer_id`) * IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, 0, 1) AS `votes`, \
		`A`.`qVotes` * IF(`VotingGroups`.`controlQuestions`=1 AND `VotingQuestions`.`graphsResults`=0, 0, 1)  AS `qVotes` \
		FROM `VotingGroups` \
		JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
		JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
		JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
		LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
		LEFT JOIN ( \
			SELECT `VotingQuestions`.`id` AS qid, COUNT( DISTINCT `Participants_Have_Voting_Answers`.`participant_id`) as qVotes \
			FROM `VotingGroups` \
			JOIN `VotingQuestions` ON `VotingGroups`.`id` = `VotingQuestions`.`voting_group_id` \
			JOIN `VotingAnswers` ON `VotingQuestions`.`id` = `VotingAnswers`.`voting_question_id` \
			JOIN `Conferences` ON `VotingGroups`.`conference_id` = `Conferences`.`id` \
			LEFT JOIN `Participants_Have_Voting_Answers` ON `VotingAnswers`.`id` = `Participants_Have_Voting_Answers`.`voting_answer_id` \
			WHERE `VotingGroups`.`id` = ? AND `Conferences`.`url` = ? AND \
			IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`graphs`,`VotingGroups`.`graphs`) AND \
			`VotingQuestions`.`deleted` = 0 \
			GROUP BY `VotingQuestions`.`id` \
			ORDER BY `VotingQuestions`.`order` ASC, `VotingQuestions`.`id` ASC, `VotingAnswers`.`order` ASC \
		) AS `A` ON `VotingQuestions`.`id` = `A`.`qid` \
		WHERE `VotingGroups`.`id` = ? AND `Conferences`.`url` = ? AND \
		IF(`VotingGroups`.`controlQuestions`,`VotingQuestions`.`graphs`,`VotingGroups`.`graphs`) AND \
		`VotingQuestions`.`deleted` = 0 AND \ '+
		(qid?'` VotingQuestions`.`id` = 0 AND \ ':'') +
		' (`VotingQuestions`.`type` = 2 OR `VotingQuestions`.`type` = 4) \
		GROUP BY `VotingAnswers`.`id`, `Participants_Have_Voting_Answers`.`participant_id` \
		ORDER BY `VotingQuestions`.`order` ASC, `VotingQuestions`.`id` ASC, `VotingAnswers`.`order` ASC';
		async.parallel(
			{
				rate: function(cb){ 
					if((type!=2)&&(type!=4)){
						connection.query(q1,[group,confId,group,confId] ,function(err, rows) {
							cb(null,rows);
						});
					}
				},
				text: function(cb){ 
					if((type!=1)&&(type!=3)){
						connection.query(q2,[group,confId,group,confId] ,function(err, rows) {
							cb(null,rows);
						});
					}
				}
			},
			function(err,rows){
				var res = rows.rate.concat(rows.text);
				var comments = [];
				//form the data
				var counter = -1;
				var questions = [];
				var lastQuestionId = null;
				var lastAnswerId = null;
				var lastParticipant = null;
				//nps and mean
				var sum=0;
				var nps = null;
				var neg=0;
				var pos=0;
				for (var i=0;i<res.length;i++) {
					if( lastQuestionId != res[i]['qid']){
						lastQuestionId = res[i]['qid'];
						if(counter>-1){
							if(questions[ counter ]['type']=="3"){ //mean for rating
								if(questions[ counter ]['answers'].length==11){
									if(parseInt(questions[ counter ]['votes'])>0){
										pos = (pos/parseInt(questions[ counter ]['votes']))*100;
										neg = (neg/parseInt(questions[ counter ]['votes']))*100;
										nps = pos - neg;
									}
									questions[ counter ]['nps'] = nps;
									nps=null;
									neg=0;
									pos=0;
								}
								//mean
								questions[ counter ]['mean'] = sum/100;
								sum=0;
							}else if ((questions[ counter ]['type']=="2")||(questions[ counter ]['type']=="4")){
								particips = [];
								if(questions[ counter ]['participants'].length>0){
									for (var key in questions[ counter ]['participants']) {
										if( questions[ counter ]['participants'][key]['hasData'] ){
											questions[ counter ]['participants'][key]['hasData'] = null;
											particips.push(questions[ counter ]['participants'][key]);
										}
									}
								}
								questions[ counter ]['votes'] = particips.length;
								questions[ counter ]['participants'] = particips;
							}
							/* nps and mean */
							sum=0;
							nps=null;
							neg=0;
							pos=0;
						}
						
						counter++;
						
						questions[counter] = {
						'id':res[i]['qid'],
						'text':res[i]['question'],
						'colorizeNegativeWords':res[i]['colorizeNegativeWords'],
						'hideText':res[i]['hideText'],
						'order':res[i]['order'],
						'type':res[i]['type'],
						'subtype':res[i]['subtype'],
						'graphsComments':res[i]['graphsComments'],
						'graphsResults':parseInt(res[i]['graphsResults']),
						'wordCloud':res[i]['wordCloud'],
						//'image':res[i]['questionImage']?s3_url(getenv('VOTING_QUESTION_FILES_DIR'),res[i]['questionImage']):null,
						'timeLimit' : res[i]['timeLimit'],
						'votes' : res[i]['qVotes'],
						'uniqueVotes' : res[i]['allowMultipleAnswers']=="1"?res[i]['qUniqueVotes']:null,
						'showTotal' : res[i]['showTotal'],
						'orderByScore' : res[i]['orderByScore'],
						'answers':[],
						'participants':[]
						};
					}
					if( lastAnswerId != res[i]['aid'] ){
						lastAnswerId = res[i]['aid'];
						//sum for mean (rating)
						if(parseInt(res[i]['qVotes'])!=0){
							perc = Math.round(parseInt(res[i]['votes'])/parseInt(res[i]['qVotes'])*100, 2);
						}else
							perc = 0;
						sum = sum + parseInt(res[i]['text'])*perc;
						//num for nps (rating)
						num = parseInt(res[i]['text']);
						if(num<7){
							neg=neg+parseInt(res[i]['votes']);
						}
						if(num>8){
							pos=pos+parseInt(res[i]['votes']);
						}
						questions[ counter ]['answers'].push({
							'id' : res[i]['aid'],
							'text' : res[i]['text'],
							'isCorrect' : res[i]['isCorrect'],
							'barColor':(res[i]['isCorrect']=='1')?'#4BAA4B':null,
							'barColorBackground':(res[i]['isCorrect']=='1')?'#C2FFC2':null,
							'votes' : res[i]['votes'],
							'order':res[i]['aOrder']?res[i]['aOrder']:null,
							//'image' : res[i]['image']?s3_url(getenv('VOTING_ANSWER_FILES_DIR'),res[i]['image']):null,
							'perc':perc,
							'barText':parseInt(res[i]['graphsExtra'])?res[i]['votes']:perc+'%',
							'comments': comments[parseInt(res[i]['aid'])]  ? comments[parseInt(res[i]['aid'])] : []
						});
					}
					//free text and personal data
					if( res[i]['participant_id']){
						if(res[i]['participant_id']!=lastParticipant){
							lastParticipant = res[i]['participant_id'];
						}
						
						if( (questions[ counter ]['type']=='4') || (questions[ counter ]['type']=='2' && res[i]['participant_text'])){
							if(!questions[ counter ]['participants'][ lastParticipant.toString() ])
								questions[ counter ]['participants'][ lastParticipant.toString() ] = {hasData:null,text:[],answers:[]};
							
							vote = res[i]['participant_text'].trim();
							if( questions[ counter ]['participants'] && questions[ counter ]['participants'][ lastParticipant.toString() ]['hasData'] ){
								questions[ counter ]['participants'][ lastParticipant.toString() ]['hasData'] = questions[ counter ]['participants'][ lastParticipant.toString() ]['hasData'] || vote.length>0;
							}else{
								questions[ counter ]['participants'][ lastParticipant.toString() ]['hasData'] = vote.length>0;
							}
							if(questions[ counter ]['type']=='4'){
								questions[ counter ]['participants'][ lastParticipant.toString()]['text'].push(res[i]['text']+': '+res[i]['participant_text']);//personal data
							}else{
								questions[ counter ]['participants'][ lastParticipant.toString() ]['answers'].push({'text':res[i]['text'], 'vote':vote, 'answer':res[i]['aid']});//free text
							}
						}
					}
				}
				//---SOME TASKS FOR THE LAST QUESTION---//
				if(counter>-1){
					
					if(questions[ counter ]['type']=="3"){ //nps for rating
						if(questions[ counter ]['answers'].length==11){
							if(parseInt(questions[ counter ]['votes'])>0){
								pos = (pos/parseInt(questions[ counter ]['votes']))*100;
								neg = (neg/parseInt(questions[ counter ]['votes']))*100;
								nps = pos - neg;
							}
							questions[ counter ]['nps'] = nps;
							nps=null;
							neg=0;
							pos=0;
						}
						
						//mean
						questions[ counter ]['mean'] = sum/100;
						sum=0;
					}else if ((questions[ counter ]['type']=="2")||(questions[ counter ]['type']=="4")){
						particips = [];
						if(questions[ counter ]['participants'] && questions[ counter ]['participants'].length>0){
							for (var key in questions[ counter ]['participants']) {
								if( questions[ counter ]['participants'][key]['hasData'] ){
									questions[ counter ]['participants'][key]['hasData'] = null;
									particips.push(questions[ counter ]['participants'][key]);
								}
							}
						}
						questions[ counter ]['votes'] = particips.length;
						questions[ counter ]['participants'] = particips;
					}
				}
				
				done_cb(questions);
			}		
		);
	}
}
