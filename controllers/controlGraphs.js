var graphsModel = require('./../models/graphs.js');
module.exports = {
	getGroups:function (skt,confId,connection){
		graphsModel.getGroups(confId,connection,function(res){
			skt.emit('get graphs groups',{feature:'graphs',data:res});
		});
	},
	run:function (skt,pub,connection,confId,uF){
		skt.on('get graphs groups', function(msg){
			if(msg.feature == 'graphs'){
				if(skt.rooms['graphs']){
					module.exports.getGroups(skt,uF.extractConferenceName(confId),connection);
				}else{
					console.log('NOT IN ROOM: graphs',' has access to: ',skt.rooms);
				} 
			} 
		});
		
		skt.on('get group graphs', function(msg){
			if(msg.feature == 'graphs'){
				if(skt.rooms['graphs']){
					graphsModel.getGraphs(uF.extractConferenceName(confId),msg.data.gid,null,null,connection,function(res){
						skt.emit('get group graphs',{'feature':'graphs','group':msg.data.gid,'data':res});
					});
				}else{
					console.log('NOT IN ROOM: graphs',' has access to: ',skt.rooms);
				} 
			} 
		});
		
		skt.on('get question graphs', function(msg){
			if(msg.feature == 'graphs'){
				if(skt.rooms['graphs']){
					graphsModel.getGraphs(uF.extractConferenceName(confId),msg.data.gid,msg.data.qid,msg.data.type,connection,function(res){
						skt.emit('get group graphs',{'feature':'graphs','group':msg.data.gid,'data':res});
					});
				}else{
					console.log('NOT IN ROOM: graphs',' has access to: ',skt.rooms);
				} 
			} 
		});
	}
}