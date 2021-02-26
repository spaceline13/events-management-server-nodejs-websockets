var votingModel = require('./../models/voting.js');
var async = require('async');
module.exports = {
	getVoting:function (skt,confId,sid,gid,qid,back,vpromo,connection){
		votingModel.getToken(confId,sid,connection,function (err,userToken) {
			if(!err){
				votingModel.getVotingGroup(confId,gid,sid,userToken,connection,function(res){
					if((!parseInt(res.isLocked))&&parseInt(res.open)){
						if(parseInt(res.requiresRegistration)){
							votingModel.getRegistrationQuestionId(confId,connection,function(err,id){
								votingModel.getVotingQuestion(confId,id,sid,userToken,connection,function(res){
									if( userToken || res.isVoted ){
										goOn();
									}
									skt.emit('registration form',{feature:'voting',data:res});
								});
							});
						}else goOn();
						function goOn() {
							if(parseInt(res.isProjectionVoting)){
								if(parseInt(res.projectionMode)){
									if(res.goTo){
										votingModel.getVotingQuestion(confId,parseInt(res.goTo),sid,userToken,connection,function(res){
											if(res.isVoted)
												skt.emit('get voting question',{'feature':'voting','data':{'status':'paused'}});
											else
												skt.emit('get voting question',{feature:'voting',data:res});
										});
									}
								} else {
									skt.emit('get voting question',{'feature':'voting','data':{'status':'paused'}});
								}
							}else if(parseInt(res.onePage)){ 
								if(parseInt(res.is_promo_voting)){ //voting promo
									votingModel.getGroupQuestions(confId,gid,sid,vpromo,null,connection,function(res){
										skt.emit('get all voting questions',{feature:'voting',data:res});
									});
								} else { //simple onepage
									votingModel.getGroupQuestions(confId,gid,sid,null,userToken,connection,function(res){
										skt.emit('get all voting questions',{feature:'voting',data:res});
									});
								}
							}else if(parseInt(res.hasBackNext)){
								if(back){ //backnext previous question
									votingModel.getPreviousQuestionId(confId,gid,qid,connection,function(id){
										votingModel.getVotingQuestion(confId,id,sid,userToken,connection,function(res){
											skt.emit('get voting question',{feature:'voting',data:res});
										});
									});
								} else { //backnext next question
									votingModel.getNextQuestionId(confId,gid,qid,connection,function(id){
										votingModel.getVotingQuestion(confId,id,sid,userToken,connection,function(res){
											skt.emit('get voting question',{feature:'voting',data:res});
										});
									});
								}
							}else{
								if(parseInt(res.hasLogic)){
									votingModel.getGroupQuestions(confId,gid,sid,null,userToken,connection,function(res){
										if(res && res.length){
											var _history=[];
											function getQuestionById(id) {
												for (var i = res.length - 1; i >= 0; i--) {
													if( res[i].id == id ) return {'i':i,'data':res[i]};
												}
												return false;
											}
											function addQAnswers(question, curentI) {
												var answers=question?question.answers:[];
												var isVoted = false;
												for (var i = answers.length - 1; i >= 0; i--) {
													if( answers[i]['isSelected'] ){
														var next = answers[i]['next'];
														var goToEnd = answers[i]['goToEnd'];
														isVoted = true;
														if(goToEnd){
															addId(-1);
														}else if(next===null){
															if(res[curentI+1]){
																addId(res[curentI+1].id);
															}
														}else{
															addId(next);
														}
													}
												}
												return isVoted;
											}
											function addId(id){
												var out = false;
												if( _history.indexOf(id)<0 ){
													_history.push(id);
													out = true;
												}
												return out;
											}
											/* Add first question */
											_history.push(res[0].id);
											/* Follow the history and send the first non answered question */
											for (var i = 0; i < _history.length; i++) {
												if(_history[i]!=-1){
													var obj = getQuestionById(_history[i]);
													if( obj ){
														var isVoted = addQAnswers(obj['data'], obj['i']);
														if( !isVoted ){
															votingModel.getVotingQuestion(confId,obj['data'].id,sid,userToken,connection,function(res){
																skt.emit('get voting question',{feature:'voting','data':res});
															});
															return;
														}
													}
												}else{
													break;
												}
											}
											skt.emit('get voting question',{'feature':'voting','data':{'status':'finished'}});
										}
									});
								}else{
									if(res.hasToken){ //token onetouch
										votingModel.getTokenQuestionId(confId,gid,userToken,parseInt(res.controlQuestions),connection,function(data){
											if(data.id){
												votingModel.getVotingQuestion(confId,data.id,sid,userToken,connection,function(res){
													skt.emit('get voting question',{feature:'voting',data:res});
												});
											} else {
												skt.emit('get voting question',{feature:'voting',data:data});
											}
										});
									} else { //simple onetouch
										votingModel.getAvailableQuestionId(confId,gid,sid,parseInt(res.controlQuestions),connection,function(data){
											if(data.id){
												votingModel.getVotingQuestion(confId,data.id,sid,userToken,connection,function(res){
													skt.emit('get voting question',{feature:'voting',data:res});
												});
											} else {
												skt.emit('get voting question',{feature:'voting',data:data});
											}
										});
									}
								}
							}
						}
					}
					skt.emit('get voting group',{feature:'voting',data:res});
				});
			}
		});
	},
	checkForCountdownsOnStart:function(pub,connection,dbPrefix){
		votingModel.checkForCountdownsOnStart(
			connection,
			dbPrefix,
			function(res){
				for(var i=0;i<res.length;i++){
					module.exports.startCountdown(pub,connection,res[i]);
				}
			}
			);
	},
	startCountdown:function (pub,connection,msg){
		setTimeout(function(){
			votingModel.disableVotingQuestion(
				msg.group,
				msg.question,
				connection,
				function(res){
					pub.publish(msg.channel, JSON.stringify({action:'countdown finished',room:'vo'+msg.group,data:{question:msg.question, group:msg.group}}));
				}
				);
		},parseInt(msg.countdown)*1000);
	},
	score:function (confId,gid,sockets,connection) {
		function findSocket(sid,rows) {
			return rows.findIndex(function (row) {
				console.log(row.session_id,sid);
				return row.session_id==sid;
			}); 
		}
		votingModel.calculateScores(confId,gid,connection,function(err, rows, fields) {
			if(!err){
				for(var key in sockets){
					var f = findSocket(sockets[key].sid,rows);
					if(f>=0){
						sockets[key].emit('show score',{'position':f+1,'score':rows[f].score});
					}else{
						sockets[key].emit('show score',{'position':null,'score':null});
					}
				}
			}
		})
	},
	run:function (skt,pub,connection,confId,uF){
		skt.on('get voting', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.gid]){
					module.exports.getVoting(skt,uF.extractConferenceName(confId),msg.data.sid,msg.data.gid,msg.data.qid,msg.data.back,msg.data.vpromo,connection);
				}else{
					console.log('NOT IN ROOM: ',msg.data.gid,' has access to: ',skt.rooms);
				} 
			} 
		});
		skt.on('lock voting', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.group]){
					votingModel.getToken(uF.extractConferenceName(confId),msg.data.sid,connection,function (err,token) {
						if(err){
							console.log('Error getting token: ',err);
						}else{
							votingModel.lockVoting(
								uF.extractConferenceName(confId),
								msg.data.group,
								token,
								msg.data.vpromo,
								msg.data.sid,
								connection,
								function(res){
									skt.emit('lock voting', {feature:'voting',data:res});
								}
							);
						}
					});
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			} 
		});
		
		skt.on('vote vquestion', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.group]){
					votingModel.getToken(uF.extractConferenceName(confId),msg.data.sid,connection,function (err,token) {
						if(err){
							console.log('Error getting token: ',err);
						}else{
							votingModel.voteQuestion(
								uF.extractConferenceName(confId),
								msg.data.qid,
								msg.data.sid,
								msg.data.votes,
								token,
								msg.data.vpromo,
								connection,
								function(res,info){
									if(!res.error){
										res['qid']=msg.data.qid;
									}
									skt.emit('vote vquestion',{feature:'voting',data:res});
									if( info && info.reachedLimit && info.reachedLimit.length ){
										var dt = {
											action:'disable answers',
											room:'vo'+msg.data.group,
											data:{
												feature:'voting',
												data:{
													'qid':msg.data.qid,
													'answers':info.reachedLimit
												}
											},
										};
										pub.publish(confId, JSON.stringify(dt));

										votingModel.getVotingAnswersByLimit(uF.extractConferenceName(confId),msg.data.qid,info.reachedLimit,connection,function (err,dt) {
											if(!err && dt && dt.length){
												var dt = {
													action:'add answers',
													room:'vo'+msg.data.group,
													data:{
														feature:'voting',
														data:{
															'qid':msg.data.qid,
															'answers':dt
														}
													},
												};
												pub.publish(confId, JSON.stringify(dt));
											}
										})
									}
									if( info && info.toBeEnabled && info.toBeEnabled.length ){
										var dt = {
											action:'enable answers',
											room:'vo'+msg.data.group,
											data:{
												feature:'voting',
												data:{
													'qid':msg.data.qid,
													'answers':info.toBeEnabled
												}
											},
										};
										pub.publish(confId, JSON.stringify(dt));
									}
									if( info && info.toBeDeleted && info.toBeDeleted.length ){
										var dt = {
											action:'delete answers',
											room:'vo'+msg.data.group,
											data:{
												feature:'voting',
												data:{
													'qid':msg.data.qid,
													'answers':info.toBeDeleted
												}
											},
										};
										pub.publish(confId, JSON.stringify(dt));
									}
								},
								/* Raffle callback */
								function (err, results) {
									if( results && results.length ){
										var raffleModel = require('./../models/raffle.js');
										for (var i = 0; i < results.length; i++) {
											if( results[i] && results[i].dt && results[i].dt.affectedRows ){
												var reid = results[i].ev;
												async.parallel([
													function(callback) {
														raffleModel.getRaffleTicketsCount(reid,connection,callback);
													},
													function(callback) {
														raffleModel.getRaffleTicketOrder(results[i].dt.id,connection,callback);
													}
													],
													function(err, res) {
														if(!err && res && res.length ){
															var out = {};
															out.participants = res[0];
															out.participant_order = res[1];
															skt.emit('add ticket',{ 'feature':'raffle', 'data':out });
															/* Send the number of participants to all participants */
															var data = {
																action:'edit raffle',
																room:'rf',
																data:{
																	feature:'raffle',
																	data:{
																		'id':reid,
																		'changes':{
																			'participants':out.participants
																		}
																	}
																},
															};
															pub.publish(confId, JSON.stringify(data));
														}
													});
											}
										}
									}
								}
							);
						}
					});
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			} 
		});
		skt.on('registration vote', function(msg){
			if(msg.feature == 'voting'){
				var conf = uF.extractConferenceName(confId);
				votingModel.getRegistrationQuestionId(conf,connection,function(err,qid){
					if( !err && qid ){
						votingModel.testForToken(conf,msg.data.votes,connection,function(err,exists) {
							console.log('Could not test for token:',err);
							if(err){
								skt.emit('registration vote',{feature:'voting',data:{'error':'error','id':qid}});
							}else if(exists && exists.isSame){
								skt.emit('registration vote',{feature:'voting',data:{'error':'conflict','id':qid}});
							}else{
								votingModel.voteQuestion(
									conf,
									qid,
									msg.data.sid,
									msg.data.votes,
									null,
									null,
									connection,
									function(res,info){
										skt.emit('registration vote',{feature:'voting',data:res});
										votingModel.addToken(conf,msg.data.sid,res,connection,function(err,tokenId){
											console.log('tokenId',tokenId);
										});
									}
								);
							}
						});
					}
				});
			}
		});
		skt.on('login vote', function(msg){
			if(msg.feature == 'voting'){
				var conf = uF.extractConferenceName(confId);
				votingModel.getRegistrationQuestionId(conf,connection,function(err,qid){
					if( !err && qid ){
						votingModel.testForToken(conf,msg.data.votes,connection,function(err,exists) {
							if(err){
								skt.emit('login vote',{feature:'voting',data:{'error':'error','id':qid}});
							}else if(exists && exists.isSame){
								votingModel.setToken(conf,msg.data.sid,exists.id,connection,function (err,results) {
									skt.emit('login vote',{feature:'voting',data:true});
								});
							}else{
								skt.emit('login vote',{feature:'voting',data:{'error':'failed','id':qid}});
							}
						});
					}
				});
			}
		});
		
		skt.on('get voting banners', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.group]){
					votingModel.getVotingBanners(
						msg.data.gid,
						connection,
						function(res){
							skt.emit('get voting banners',{feature:'voting',data:res});
						}
						);
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			} 
		});
		skt.on('get next presentation voting', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.gid]){
					votingModel.getNextQuestionId(uF.extractConferenceName(confId),msg.data.gid,msg.data.qid,connection,function(id){
						votingModel.getVotingQuestion(uF.extractConferenceName(confId),id,msg.data.sid,null,connection,function(res){
							if(res.isVoted)
								skt.emit('get voting question',{'feature':'voting','data':{'status':'paused'}});
							else
								skt.emit('get voting question',{feature:'voting',data:res});
						});
					});
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			} 
		});
		skt.on('get prev presentation voting', function(msg){
			if(msg.feature == 'voting'){
				if(skt.rooms['vo'+msg.data.gid]){
					votingModel.getPreviousQuestionId(uF.extractConferenceName(confId),msg.data.gid,msg.data.qid,connection,function(id){
						votingModel.getVotingQuestion(uF.extractConferenceName(confId),id,msg.data.sid,null,connection,function(res){
							if(res.isVoted)
								skt.emit('get voting question',{'feature':'voting','data':{'status':'paused'}});
							else
								skt.emit('get voting question',{feature:'voting',data:res});
						});
					});
				}else{
					console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
				} 
			} 
		});
	},
	ifHasAccessToRoom:function (confId,room_id,sid,connection,done_cb){
		votingModel.ifHasAccessToRoom(confId,room_id,sid,connection,done_cb);
	}
}