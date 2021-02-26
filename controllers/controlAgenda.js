var agendaModel = require('./../models/agenda.js');
module.exports = {
	run:function (skt,pub,connection,confId){
		skt.on('rate panel', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.ratePanel(
						msg.data.conference,
						msg.data.panel,
						parseInt(msg.data.rating),
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('rate panel',res);
							} else {
								var dt = {
									action:'rate panel',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('unrate panel', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.unratePanel(
						msg.data.conference,
						msg.data.panel,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('unrate panel',res);
							} else {
								var dt = {
									action:'unrate panel',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('comment panel', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.commentPanel(
						msg.data.conference,
						msg.data.panel,
						msg.data.comment,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('comment panel',res);
							} else {
								var dt = {
									action:'comment panel',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		
		skt.on('rate speaker', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.rateSpeaker(
						msg.data.conference,
						msg.data.speaker,
						parseInt(msg.data.rating),
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('rate speaker',res);
							} else {
								var dt = {
									action:'rate speaker',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('unrate speaker', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.unrateSpeaker(
						msg.data.conference,
						msg.data.speaker,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('unrate speaker',res);
							} else {
								var dt = {
									action:'unrate speaker',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('comment speaker', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.commentSpeaker(
						msg.data.conference,
						msg.data.speaker,
						msg.data.comment,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('comment speaker',res);
							} else {
								var dt = {
									action:'comment speaker',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('unrate speaker', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.unrateSpeaker(
						msg.data.conference,
						msg.data.speaker,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('unrate speaker',res);
							} else {
								var dt = {
									action:'unrate speaker',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('add to myagenda', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.addToMyAgenda(
						msg.data.conference,
						msg.data.speaker,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('add to myagenda',res);
							} else {
								var dt = {
									action:'add to myagenda',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
		skt.on('remove from myagenda', function(msg){
			if(skt.rooms['ag'+msg.data.group]){
				if(msg.feature == 'agenda'){
					agendaModel.removeFromMyAgenda(
						msg.data.conference,
						msg.data.speaker,
						msg.data.sid,
						connection,
						function(res){
							if(res.error){
								skt.emit('remove from myagenda',res);
							} else {
								var dt = {
									action:'remove from myagenda',
									room:'ag'+msg.data.group,
									data:res
								};
								skt.emit(dt.action, dt.data);
							}
						}
					);
				} 
			}else{
				console.log('NOT IN ROOM: ',msg.data.group,' has access to: ',skt.rooms);
			} 
		});
	},
	ifHasAccessToRoom:function (confId,room_id,sid,connection,done_cb){
		agendaModel.ifHasAccessToRoom(confId,room_id,sid,connection,done_cb);
	}
}
