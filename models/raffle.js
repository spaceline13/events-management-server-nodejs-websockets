module.exports = {
	ifHasAccessToRoom:function (confId,sid,connection,done_cb){
		var q='SELECT COUNT(`RaffleEvents`.`id`)>0 as access, \
		`Conferences_Have_Participants`.`conference_token_id`, `Conferences_Have_Participants`.`identifier`, `Conferences_Have_Participants`.`participant_id` \
		FROM `Conferences_Have_Participants` \
		JOIN `Conferences` ON `Conferences_Have_Participants`.`conference_id` = `Conferences`.`id` \
		JOIN `Participants` ON `Conferences_Have_Participants`.`participant_id` = `Participants`.`id` \
		JOIN `RaffleEvents` ON `Conferences_Have_Participants`.`conference_id` = `RaffleEvents`.`conference_id` \
		WHERE `Participants`.`session_id` = ? AND `Conferences`.`url` = ?';
		connection.query(q,[sid,confId] ,function(err, rows, fields) {
			if (!err){
				if(rows.length>0 && rows[0].access==1)
					done_cb(rows[0]);
				else
					console.log('User has no access to this room or invalid room',confId,sid);
			} else {
				console.log('Error while checking db for room.',err, rows, fields);
			}
		});
	},
	getFullRaffle:function (confId,sid,connection,done_cb){
		var out = [];
		module.exports.getActiveRaffle(confId, null, connection, function(err, rows) {
			if (!err){
				if(rows.length>0){
					out = rows[0];
					var c=0,lim=3,hadImportantError=false;
					module.exports.getRaffleBanners(confId,out.id,connection,function (err,banners) {
						if(!err){
							out.banners = banners;
						}else{
							out.banners = [];
						}
						dn();
					})
					module.exports.getParticipantsTicket(confId,out.id,sid,connection,function (err,order) {
						if(!err){
							out.participant_order = order;
						}else{
							console.log('Error, stop everything');
							hadImportantError = true;
						}
						dn();
					})
					module.exports.getRaffleTicketsCount(out.id,connection,function (err,count) {
						out.participants = count;
						dn();
					})
					function dn() {
						c++;
						if(c===lim){
							if(!hadImportantError) done_cb(null,out);
						}
					}
				}else{
					done_cb(null,'no raffles');
				}
			} else {
				done_cb(err,null);
			}
		});
	},
	addTicket: function (confId,sid,raffle_event_id,values,connection,done_cb) {
		connection.getConnection(function(err, connection) {
			var _done_cb = function (a,b) {
				done_cb(a,b);
				connection.release();
			}
			module.exports.getActiveRaffle(confId, raffle_event_id, connection, function(err, rows) {
				if (!err){
					if(rows.length>0){
						var c=0, failedUniques=[];
						var raffle = rows[0];
						/* Get the lists of required and unique fields */
						var req=[],unq=[];
						for (var i = 0; i < raffle.fields.length; i++) {
							if( raffle.fields[i].required ){
								req.push(raffle.fields[i].id);
							}
							if( raffle.fields[i].unique ){
								var f = values.find(function(item){
									return item[0]==raffle.fields[i].id;
								})
								if(f && f[1]) unq.push([raffle.fields[i].id, f[1]]);
								else unq.push([raffle.fields[i].id, null]);
							}
						}
						/* Make sure the required fields are filled */
						var reqOk = true;
						for (var i = req.length - 1; i >= 0 && reqOk; i--) {
							var f = values.find(function(item){
								return item[0]==req[i];
							})
							if(f){
								reqOk = reqOk && f[1];
							}
						}
						if(!reqOk){
							_done_cb('required not filled',null);
						}else{
							/* Make sure the unique fields are unique */
							if(unq.length){
								for (var i = unq.length - 1; i >= 0 ; i--) {
									module.exports.testUnique(unq[i][0],unq[i][1],connection,function(fieldId,isOK) {
										goOn(fieldId,isOK);
									});
								}
							}else{
								goOn(null,true);
							}
							function goOn(fieldId,isOK) {
								c++;
								if(!isOK) failedUniques.push(fieldId);
								if(unq.length===0||c===unq.length){
									if(failedUniques.length){
										_done_cb('unique failed',failedUniques);
									}else{
										connection.beginTransaction(function(err) {
											module.exports.createTicket(sid, raffle_event_id, confId, true, connection, function (err, rows) {
												if(!err){
													if(rows.affectedRows && rows.insertId){
														var ticketId = rows.insertId;
														module.exports.addFieldsToTicket(ticketId, confId, values, connection, function (errors, affectedRows) {
															if( !errors.length && affectedRows ){
																connection.commit(function(err) {
																	if (err) {
																		_done_cb('unknown error',1);
																		connection.rollback();
																	}else{
																		_done_cb(null,{'id':ticketId,'affectedRows':affectedRows});
																	}
																});
															}else{
																_done_cb('could not add data',null);
																connection.rollback();
															}
														});
													}else{
														_done_cb('could not add ticket',null);
														connection.rollback();
													}
												}else{
													if(err.sqlState=='23000') _done_cb('duplicate ticket');
													else _done_cb('unknown error',2);
													connection.rollback();
												}
											})
										});
									}
								}
							}
						}
					}else{
						_done_cb('no active raffles',null);
					}
				} else {
					_done_cb(err,null);
				}
			});
		});
	},
	getActiveRaffle:function (confId,raffle_event_id,connection,done_cb){
		var q = 'SELECT \
		`RaffleEvents`.`id`, \
		`RaffleEvents`.`name`, \
		`RaffleEvents`.`active`, \
		`RaffleEvents`.`message`, \
		`RaffleEvents`.`button_label_text`, \
		`RaffleEvents`.`num_of_participants_text`, \
		`RaffleEvents`.`registrationActive`, \
		\
		`RaffleFields`.`id` AS `fId`, \
		`RaffleFields`.`name` AS `fName`, \
		`RaffleFields`.`type` AS `fType`, \
		`RaffleFields`.`required` AS `fRequired`, \
		`RaffleFields`.`unique` AS `fUnique` \
		FROM `Conferences` \
		JOIN `RaffleEvents` ON `Conferences`.`id` = `RaffleEvents`.`conference_id` \
		LEFT JOIN `RaffleFields` ON `RaffleEvents`.`id` = `RaffleFields`.`raffle_event_id` \
		WHERE `Conferences`.`url`=? AND `RaffleEvents`.`active` = 1 AND `RaffleEvents`.`deleted` = 0 '
		+(raffle_event_id!==null?'AND `RaffleEvents`.`id` = ? ':'')+
		'ORDER BY `RaffleEvents`.`id` ASC, `RaffleFields`.`id` ASC \
		';
		var params = [confId];
		if(raffle_event_id!==null) params.push(raffle_event_id);
		connection.query(q,params,function (err,rows) {
			var out = [];
			if(!err){
				if(rows.length>0){
					var c=-1, lastId = null;
					for (var i = 0; i < rows.length; i++) {
						var row = rows[i];
						if(lastId!=row.id){
							lastId=row.id;
							c++;
							out.push({
								'id':row.id,
								'name':row.name,
								'active':row.active,
								'message':row.message,
								'button_label_text':row.button_label_text,
								'num_of_participants_text':row.num_of_participants_text,
								'registrationActive':row.registrationActive,
								'fields':[]
							});
						}
						if(row.fId!==null){
							out[c].fields.push({
								'id':row.fId,
								'name':row.fName,
								'type':row.fType,
								'required':row.fRequired,
								'unique':row.fUnique
							});
						}
					}
				}
			}
			done_cb(err,out);
		});
	},
	getRaffleBanners:function (confId,raffle_event_id,connection,done_cb){
		var q = 'SELECT `RaffleBanners`.`id`, \
		`RaffleBanners`.`image`, \
		`RaffleBanners`.`text`, \
		`RaffleBanners`.`position` \
		FROM `Conferences` \
		JOIN `RaffleEvents` ON `Conferences`.`id` = `RaffleEvents`.`conference_id` \
		JOIN `RaffleBanners` ON `RaffleEvents`.`id` = `RaffleBanners`.`raffle_event_id` \
		WHERE `Conferences`.`url`= ? AND `RaffleEvents`.`id` = ? AND `RaffleEvents`.`deleted` = 0 \
		ORDER BY `RaffleBanners`.`order` ASC, `RaffleBanners`.`id` ASC \
		';
		connection.query(q,[confId,raffle_event_id],done_cb);
	},
	getParticipantsTicket:function (confId,raffle_event_id,sid,connection,done_cb){
		var q ='SELECT `RaffleTickets`.`order` \
		FROM `RaffleTickets` \
		JOIN `Participants` ON `RaffleTickets`.`participant_id`=`Participants`.`id` \
		JOIN `RaffleEvents` ON `RaffleTickets`.`raffle_event_id`=`RaffleEvents`.`id` \
		JOIN `Conferences` ON `RaffleEvents`.`conference_id` = `Conferences`.`id` \
		WHERE `Conferences`.`url`= ? AND `RaffleEvents`.`id`= ? AND `Participants`.`session_id`= ? AND `RaffleEvents`.`deleted` = 0 \
		';
		connection.query(q,[confId,raffle_event_id,sid],function (err, rows) {
			if(err){
				done_cb(err, null);
			}else{
				if( rows && rows.length>0 ){
					done_cb(null, rows[0].order);
				}else{
					done_cb(null, null);
				}
			}
		});
	},
	getRaffleTicketsCount:function (raffle_event_id,connection,done_cb){
		var q ='SELECT COUNT(1) AS `c`\
		FROM `RaffleTickets` \
		JOIN `RaffleEvents` ON `RaffleEvents`.`id`=`RaffleTickets`.`raffle_event_id` \
		WHERE `RaffleEvents`.`id`= ? AND `RaffleEvents`.`deleted` = 0 \
		';
		connection.query(q,[raffle_event_id],function (err, rows) {
			if(err){
				done_cb(err, null);
			}else{
				if( rows && rows.length>0 ){
					done_cb(null, rows[0].c);
				}else{
					done_cb(null, null);
				}
			}
		});
	},
	getRaffleTicketOrder:function(raffle_ticket_id,connection,done_cb){
		var q = 'SELECT `RaffleTickets`.`order` FROM `RaffleTickets` WHERE `RaffleTickets`.`id`= ?';
		connection.query(q,[raffle_ticket_id],function (err, rows) {
			if(err){
				done_cb(err, null);
			}else{
				if( rows && rows.length>0 ){
					done_cb(null, rows[0].order);
				}else{
					done_cb(null, null);
				}
			}
		});
	},
	testUnique:function(raffle_field_id,newData,connection,done_cb){
		var q = 'SELECT DISTINCT `RaffleFields`.`id` \
		FROM `RaffleFields` \
		JOIN `RaffleFieldData` ON `RaffleFields`.`id` = `RaffleFieldData`.`raffle_field_id` \
		WHERE `RaffleFields`.`id` = ? AND `RaffleFieldData`.`data` = ? AND `RaffleFields`.`unique` = 1 \
		';
		/* If the new value is null it is definitely unique */
		if(newData===null){
			done_cb(raffle_field_id, true)
		}else{
			connection.query(q,[raffle_field_id,newData],function (err, rows) {
				done_cb(raffle_field_id,  !err && rows && rows.length===0 );
			});
		}
	},
	createTicket:function(sid, raffle_event_id, confId, checkActiveReg, connection, done_cb){
		var q = 'INSERT INTO `RaffleTickets`(`participant_id`, `raffle_event_id`, `order`) \
		VALUES( \
			( \
				SELECT `Participants`.`id` FROM `Participants` WHERE `Participants`.`session_id` = ? \
			), \
			( \
				SELECT `RaffleEvents`.`id` \
				FROM `Conferences` \
				JOIN `RaffleEvents` ON `Conferences`.`id` = `RaffleEvents`.`conference_id` \
				WHERE `RaffleEvents`.`id`= ? AND `Conferences`.`url`= ? \
				AND `RaffleEvents`.`deleted`=0 \
				'+(checkActiveReg?'AND `RaffleEvents`.`registrationActive`=1 ':'')+
			'), \
			( \
				SELECT `A`.`o` \
				FROM ( \
					SELECT COALESCE(MAX(`RaffleTickets`.`order`),0)+1 AS `o` \
					FROM `Conferences` \
					JOIN `RaffleEvents` ON `Conferences`.`id` = `RaffleEvents`.`conference_id` \
					JOIN `RaffleTickets` ON `RaffleEvents`.`id` = `RaffleTickets`.`raffle_event_id` \
					WHERE `RaffleEvents`.`id`= ? AND `Conferences`.`url`= ? \
				) AS `A` \
			) \
		)';
		connection.query(q,[sid,raffle_event_id,confId,raffle_event_id,confId],done_cb);
	},
	addFieldsToTicket:function(raffle_ticket_id, confId, data, connection, done_cb){
		var out = false;
		var q = 'INSERT INTO `RaffleFieldData`(`raffle_field_id`, `raffle_ticket_id`, `data`) \
		SELECT `RaffleFields`.`id`, ?, ? \
		FROM `Conferences` \
		JOIN `RaffleEvents` ON `Conferences`.`id` = `RaffleEvents`.`conference_id` \
		JOIN `RaffleFields` ON `RaffleEvents`.`id` = `RaffleFields`.`raffle_event_id` \
		WHERE `Conferences`.`url`= ? AND `RaffleFields`.`id` = ?';
		var l = data.length;
		var c = 0, affectedRows=0, errors=[], results=[];
		if(l){
			for (var i = 0; i < l; i++) {
				connection.query(q,[raffle_ticket_id,data[i][1],confId,data[i][0]],function (err, rows) {
					goOn(err, rows);
				});
			}
		}else{
			goOn('no data', []);
		}
		function goOn(err, rows) {
			c++;
			if(err) errors.push(err);
			if(rows && rows.affectedRows) affectedRows += rows.affectedRows;
			if( data.length===0 || c===data.length ){
				done_cb(errors,affectedRows);
			}
		}
	}
}
