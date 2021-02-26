var popupsModel = require('./../models/popups.js');
module.exports = {
	run:function (skt,pub,connection,confId,uF){
			skt.on('get announcements popups', function(msg){
				if(msg.feature == 'popups'){
					if(skt.rooms['popups']){
						popupsModel.getAnnouncementsPopups(uF.extractConferenceName(confId),connection,function (error,data) {
							skt.emit('get announcements popups',{'feature':'popups','data':data.data,'title':data.title});
						});
					}else{
						console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
					} 
				}
			});

		},
	getPopups:function (skt,confId,sid,connection,done_cb){
		popupsModel.getPopups(confId,sid,connection,function(res){
			skt.emit('get popups',res);
		});
	}
}