module.apn = require("apn");
module.gcm = require('node-gcm');
module.exports = {
	push:function (connection, confId, text='', title='', qid){
		var isAmba = ((confId=="amba")||(confId=="ambassadors"));
		if(isAmba){
			var qUpdtPush = 'UPDATE `Conferences` \
			JOIN `Push_Notification_Participants_Have_Conferences` ON `Conferences`.`id` = `Push_Notification_Participants_Have_Conferences`.`conference_id` \
			JOIN `PushNotificationParticipants` ON `Push_Notification_Participants_Have_Conferences`.`push_notification_participant_id` = `PushNotificationParticipants`.`id` \
			JOIN `PushNotificationSettings` ON `PushNotificationParticipants`.`id` = `PushNotificationSettings`.`push_notification_participant_id` \
			LEFT JOIN `Ambassadors` ON `Push_Notification_Participants_Have_Conferences`.`udid` = `Ambassadors`.`udid` \
			SET `PushNotificationParticipants`.`messageCount`=`PushNotificationParticipants`.`messageCount`+1 \
			WHERE `Conferences`.`url` = ? \
			AND ( `Ambassadors`.`isMobileLoggedIn` = 1 AND `Ambassadors`.`activated`= 1 )'; 
			var qGetPush = 'SELECT `PushNotificationParticipants`.`regid`, `PushNotificationParticipants`.`device`, `PushNotificationSettings`.`sound`, `Ambassadors`.`activated`, `PushNotificationSettings`.`vibration` \
			FROM `Conferences` \
			JOIN `Push_Notification_Participants_Have_Conferences` ON `Conferences`.`id` = `Push_Notification_Participants_Have_Conferences`.`conference_id` \
			JOIN `PushNotificationParticipants` ON `Push_Notification_Participants_Have_Conferences`.`push_notification_participant_id` = `PushNotificationParticipants`.`id` \
			JOIN `PushNotificationSettings` ON `PushNotificationParticipants`.`id` = `PushNotificationSettings`.`push_notification_participant_id` \
			LEFT JOIN `Ambassadors` ON  `Push_Notification_Participants_Have_Conferences`.`udid` = `Ambassadors`.`udid` \
			WHERE `Conferences`.`url` = ? \
			AND ( `Ambassadors`.`isMobileLoggedIn` = 1 AND `Ambassadors`.`activated`= 1 ) \
			AND ( \
				( `PushNotificationParticipants`.`device` = 0 ) \
				OR \
				( \
					`PushNotificationSettings`.`notifications` = 1 AND \
					(`PushNotificationParticipants`.`messageCount` % `PushNotificationSettings`.`notifyEvery`) = 0 \
				) \
			) \
			GROUP BY `PushNotificationParticipants`.`id`';
		} else {
			var qUpdtPush = 'UPDATE `Conferences` \
			JOIN `Push_Notification_Participants_Have_Conferences` ON `Conferences`.`id` = `Push_Notification_Participants_Have_Conferences`.`conference_id` \
			JOIN `PushNotificationParticipants` ON `Push_Notification_Participants_Have_Conferences`.`push_notification_participant_id` = `PushNotificationParticipants`.`id` \
			JOIN `PushNotificationSettings` ON `PushNotificationParticipants`.`id` = `PushNotificationSettings`.`push_notification_participant_id` \
			LEFT JOIN `Ambassadors` ON `Push_Notification_Participants_Have_Conferences`.`udid` = `Ambassadors`.`udid` \
			SET `PushNotificationParticipants`.`messageCount`=`PushNotificationParticipants`.`messageCount`+1 \
			WHERE `Conferences`.`url` = ?'; 
			var qGetPush = 'SELECT `PushNotificationParticipants`.`regid`, `PushNotificationParticipants`.`device`, `PushNotificationSettings`.`sound`, `Ambassadors`.`activated`, `PushNotificationSettings`.`vibration` \
			FROM `Conferences` \
			JOIN `Push_Notification_Participants_Have_Conferences` ON `Conferences`.`id` = `Push_Notification_Participants_Have_Conferences`.`conference_id` \
			JOIN `PushNotificationParticipants` ON `Push_Notification_Participants_Have_Conferences`.`push_notification_participant_id` = `PushNotificationParticipants`.`id` \
			JOIN `PushNotificationSettings` ON `PushNotificationParticipants`.`id` = `PushNotificationSettings`.`push_notification_participant_id` \
			LEFT JOIN `Ambassadors` ON  `Push_Notification_Participants_Have_Conferences`.`udid` = `Ambassadors`.`udid` \
			WHERE `Conferences`.`url` = ? \
			AND ( \
				( `PushNotificationParticipants`.`device` = 0 ) \
				OR \
				( \
					`PushNotificationSettings`.`notifications` = 1 AND \
					(`PushNotificationParticipants`.`messageCount` % `PushNotificationSettings`.`notifyEvery`) = 0 \
				) \
			) \
			GROUP BY `PushNotificationParticipants`.`id`';
		}
		
		connection.query(qUpdtPush,[confId] ,function(err, rows, fields) {
			if (err){
				console.log('Error while performing query ',err, rows, fields);
			}
		});
		connection.query(qGetPush,[confId] ,function(err, rows, fields) {
			if (!err){
				var iPhoneMsg = title+': '+text;
				var androidMsg = {'message' : text, 'title' : title, 'qid' : qid };
				var iPhoneIds = [];
				var androidIds = [];
				for (var i=0;i<rows.length;i++) {
					if( rows[i].device == '1' ){
						iPhoneIds.push([rows[i].regid, rows[i].sound, rows[i].vibration]);
					}else{
						androidIds.push(rows[i].regid);
					}
				}
				androidMsg.eventid = confId;
				var application = "notifications";
				if((confId=="amba") || (confId=="ambassadors")) 
					application = "ambassadors";
				else if (confId=="testnow") 
					application = "mtm";
				if( iPhoneIds.length>0 ) module.exports.sendApplesPushNotification( iPhoneMsg, iPhoneIds, qid, confId, application );
				if( androidIds.length>0 ) module.exports.sendGoogleCloudMessage( androidMsg, androidIds, title, application );
				
			} else {
				console.log('Error while performing query.',err, rows, fields);
			}
		});
	},
	sendGoogleCloudMessage:function(data, ids, collapseKey, application){
		var sender = new module.gcm.Sender((application=="notifications"?'AIzaSyAqLSoa8jDOckZYFV7QL-Nb1PHqrVsWhns':(application=="mtm"? 'AIzaSyDM8NUekEK1Ngn5EhKIAbip3YJC9Wy78qk': 'AIzaSyDvdfVSjRG5Dmtgi07r7SCDnK27xv58BR8')));
		var message = new module.gcm.Message({
			collapseKey: collapseKey,
			data: data
		});
		var regTokens = ids;
		sender.send(message, { registrationTokens: regTokens }, function (err, response) {
			if (err) console.error(err);
			else console.log(response);
		});
	},
	sendApplesPushNotification:function (message, deviceTokens, qid, confid, application){
		var options = {
			key : (application=="notifications"?process.env.APPLE_KEY:(application=="mtm"?process.env.MTM_APPLE_PEM:process.env.AMBASSADORS_KEY)),
			cert : (application=="notifications"?process.env.APPLE_CERT:(application=="mtm"?process.env.MTM_APPLE_PEM:process.env.AMBASSADORS_CERT)),
			passphrase : process.env.APPLE_PASS,
			connectionTimeout: 10000,
			production : true
		};
		try{
			var connection = new module.apn.Provider(options);
		}catch( e ){
			console.log(e);
		}
		if(connection){
			for (var i=0;i<deviceTokens.length;i++){
				var notification = new module.apn.Notification();
				notification.alert = message;
				notification.badge = 0;
				notification.sound = ((deviceTokens[i][2]=='1')?deviceTokens[i][1]:null)
				notification.payload = {qid:qid, confid:confid}; 
				notification.topic = (application=="notifications")?'com.conferience.conferience':'com.conferience.cosmote.Ambassadors';
				connection.send(notification, deviceTokens[i][0]).then( (result) => {
					
				});
			}
		}
	}
};
