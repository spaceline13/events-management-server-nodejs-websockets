var raffleModel = require('./../models/raffle.js');
module.exports = {
	run:function (skt,pub,connection,confId,uF){
		skt.on('add ticket', function(msg){
			if(msg.feature == 'raffle'){
				if(skt.rooms['rf']){
					raffleModel.addTicket(
						uF.extractConferenceName(confId),
						msg.data.sid,
						msg.data.reid,
						msg.data.values,
						connection,
						function (error,data) {
							var dt = {}, c=0;
							if(error){
								dt.data=data;
								dt.error=error;
								dn(1);
							}else{
								raffleModel.getRaffleTicketsCount(msg.data.reid,connection,function (err,count) {
									dt.participants = count;
									dn(2);
								})
								raffleModel.getRaffleTicketOrder(data.id,connection,function (err,order) {
									dt.participant_order = order;
									dn(2);
								})
							}
							function dn(target) {
								c++;
								if(c==target){
									skt.emit('add ticket',{ 'feature':'raffle', 'data':dt });
									/* Send the number of participants to all participants */
									if(!dt.error){
										var data = {
											action:'edit raffle',
											room:'rf',
											data:{
												feature:'raffle',
												data:{
													'id':msg.data.reid,
													'changes':{
														'participants':dt.participants
													}
												}
											},
										};
										pub.publish(confId, JSON.stringify(data));
									}
								}
							}
						});
				}else{
					console.log('NOT IN ROOM: rf has access to: ',skt.rooms);
				} 
			}
		});
		skt.on('get raffle', function(msg){
			if(msg.feature == 'raffle'){
				if(skt.rooms['rf']){
					raffleModel.getFullRaffle(uF.extractConferenceName(confId),msg.data.sid,connection,function(err,dt){
						skt.emit('joined room',{'feature':'raffle','data':dt});
					});
				}else{
					console.log('NOT IN ROOM: rf has access to: ',skt.rooms);
				}
			}
		});

	},
	ifHasAccessToRoom:function (confId,sid,connection,done_cb){
		raffleModel.ifHasAccessToRoom(confId,sid,connection,done_cb);
	},
	getFullRaffle:function (confId,sid,connection,done_cb){
		raffleModel.getFullRaffle(confId,sid,connection,done_cb);
	}
}