var async = require('async');
module.exports = {
	/** 
	 * Checks if a user has added words in the given word cloud.
	 * The callback args are:
	 * 	error: an error if the sql query failed
	 * 	counter: the number of words the user has added
	 */
	wordsAdded:function (word_cloud_id,conference_id,userId,connection,done_cb){
		/* Assumes the auth token validation happened in the controller function */
		var q = 'SELECT COUNT(DISTINCT `WordCloudWord`.`id`) AS `c` \
		FROM `WordCloud` \
		JOIN `WordCloudWord` ON `WordCloud`.`id` = `WordCloudWord`.`word_cloud_id` \
		WHERE `WordCloud`.`conference_id` = ? AND `WordCloud`.`id` = ? AND `WordCloudWord`.`conference_user_id` = ? \
		';
		connection.query(q,[conference_id,word_cloud_id,userId] ,function(err, rows, fields) {
			if (!err){
				done_cb(null,rows[0].c);
			} else {
				console.log('WordCloud error 2: ',err);
				done_cb(err);
			}
		});
	},
	/** 
	 * Get a list of words and their count.
	 * The callback args are:
	 * 	error: if the sql query failed
	 * 	wordList: a list of words and their count
	 */
	getWordcloud:function (word_cloud_id,conference_id,connection,done_cb) {
		/* Assumes the auth token validation happened in the controller function */
		var q = 'SELECT `WordCloudWord`.`text`, COUNT(1) AS `weight` \
		FROM `WordCloud` \
		JOIN `WordCloudWord` ON `WordCloud`.`id` = `WordCloudWord`.`word_cloud_id` \
		WHERE `WordCloud`.`conference_id` = ? \
		AND `WordCloud`.`id` = ? \
		AND `WordCloudWord`.`visible` = 1 \
		GROUP BY `WordCloudWord`.`text` \
		';
		connection.query(q,[conference_id,word_cloud_id] ,function(err, rows, fields) {
			if (!err){
				done_cb(null,rows);
			} else {
				console.log('WordCloud error 3: ',err);
				done_cb(err,null);
			}
		});
	},
	/** 
	 * Get the WordCloud's properties ( the word_cloud_id,conference_id combination is IMPORTANT since other functions assume this function has checked the combination )
	 * The callback args are:
	 * 	error:
	 * 		an error if the sql query failed
	 * 		or -1 if the query returned nothing (probably wrong word_cloud_id and conference_id combination)
	 * 	wordList: a object containing the properties of the word cloud group
	 */
	getWordcloudInfo:function (word_cloud_id,conference_id,connection,done_cb) {
		/* Assumes the auth token validation happened in the controller function */
		var q = 'SELECT \
		`text`, \
		`inputs`, \
		`maxWords`, \
		`maxCharacters`, \
		`showWordCloud`, \
		`showInputs`, \
		`defaultVisible`, \
		`title`, \
		`word_cloud_options_id`, \
		`promptText`, \
		`sendButtonText`, \
		`sendButtonColor`, \
		`sendButtonTextColor` \
		FROM `WordCloud` \
		WHERE `WordCloud`.`conference_id` = ? \
		AND `WordCloud`.`id` = ? \
		';
		connection.query(q,[conference_id,word_cloud_id] ,function(err, rows, fields) {
			if (!err){
				if(rows && rows.length) done_cb(null,rows[0]);
				else done_cb(-1,null);
			} else {
				console.log('WordCloud error 4: ',err);
				done_cb(err,null);
			}
		});
	},
	/**
	 * Returns all the necessary data to needed by the app to show the word cloud page
	 * The callback args are:
	 * 	errors:
	 * 		-1 incorrect word_cloud_id and conference_id combination
	 * 		-2 sql error
	 * 	data an object that contains the following:
	 * 		properties: an object that contains the WordCloud properties or null if an error occurred
	 * 		wordsAdded: the number of words added by the participant or null in the case that an error occurred or the inputs are not visible
	 * 		wordcloud: an array of words and their count or null if it was not necessary to be calculated
	 * 		page: one of the following strings: ['inactive','inputs','thank you','wordcloud']
	 */
	getFullWordCloud:function (word_cloud_id,conference_id,userId,connection,done_cb){
		/* Assumes the auth token validation happened in the controller function */
		var out = {
			properties:null,
			wordsAdded:null,
			wordcloud:null,
			wordcloudOptions:null,
			page:null,
		};
		/* First get the word cloud properties */
		module.exports.getWordcloudInfo(word_cloud_id,conference_id,connection,function (err, properties) {
			if( err ){
				if( err===-1 ) done_cb(-1,out); /* Wrong word_cloud_id and conference_id combination*/
				else done_cb(-2,out); /* Unknown error */
			}else{
				out.properties = properties;
				/* If the inputs are visible */
				if( properties.showInputs ){
					/* Get the number of words added to decide what page to show */
					module.exports.wordsAdded(word_cloud_id,conference_id,userId,connection,function (err, wordsAdded) {
						if( err ){
							done_cb(-2,out); /* Unknown error */
						}else{
							out.wordsAdded = wordsAdded;
							/* If no words where added show the inputs page */
							if(wordsAdded==0){
								out.page = 'inputs';
								done_cb(null,out);
							}
							/* If at least one word was added show either the word cloud or the thank you page */
							else{
								/* If the word cloud is visible show it */
								if(properties.showWordCloud){
									out.page = 'wordcloud';
									module.exports.getWordCloudOptions(properties.word_cloud_options_id,connection,function (err,options) {
										if(!err){
											out.wordcloudOptions = options;
											/* ----------------------- */
											module.exports.getWordcloud(word_cloud_id,conference_id,connection,function (err,wordList) {
												if( err ){
													done_cb(-2,out); /* Unknown error */
												}else{
													out.wordcloud = wordList;
													done_cb(null,out);
												}
											})
											/* ----------------------- */
										}
									})
								}
								/* If the word cloud is not visible just show the thank you page */
								else{
									out.page = 'thank you';
									done_cb(null,out);
								}
							}
						}
					})
				}
				/* If the inputs are NOT visible */
				else{
					if( properties.showWordCloud ){
						/* Just show the word cloud */
						out.page = 'wordcloud';
						module.exports.getWordCloudOptions(properties.word_cloud_options_id,connection,function (err,options) {
							if(!err){
								out.wordcloudOptions = options;
								/* ----------------------- */
								module.exports.getWordcloud(word_cloud_id,conference_id,connection,function (err,wordList) {
									if( err ){
										done_cb(-2,out); /* Unknown error */
									}else{
										out.wordcloud = wordList;
										done_cb(null,out);
									}
								})
								/* ----------------------- */
							}
						})
					}else{
						/* If the inputs and the word cloud are NOT visible show inactive page */
						out.page = 'inactive';
						done_cb(null,out)
					}
				}
			}
		})
	},
	/**
	 * Add a list of words to the given word cloud
	 * The callback args are:
	 * 	errors:
	 * 		-1 incorrect word_cloud_id and conference_id combination
	 * 		-2 sql error
	 * 		-3 The wordcloud group does not accept new words
	 * 		-5 Incorrect input
	 * 	affectedRows: the number of words added if there where no errors, null otherwise
	 */
	addWords: function (word_cloud_id,conference_id,words,userId,connection,done_cb) {
		/* Assumes the auth token validation happened in the controller function */
		if( !words || typeof words!=='object' || !words.length ) done_cb(-4,null); /* Incorrect words type */
		/* Get the word cloud properties to check the input */
		module.exports.getWordcloudInfo(word_cloud_id,conference_id,connection,function (err, properties) {
			if( err ){
				if( err===-1 ) done_cb(-1,null); /* Wrong word_cloud_id and conference_id combination*/
				else done_cb(-2,null); /* Unknown error */
			}else{
				if( properties.showInputs ){
					/* Validate input */
					if( !module.exports.validateInput(words, properties.inputs, properties.maxWords, properties.maxCharacters) ){
						done_cb(-5,null); /* Incorrect input  */
					}else{
						/* Make sure the participant has not already added too many words */
						module.exports.wordsAdded(word_cloud_id,conference_id,userId,connection,function (err, wordsAdded) {
							if( err ){
								done_cb(-2,null); /* Unknown error */
							}else if( (wordsAdded+words.length) <= properties.inputs){
								/* Everything ok, including the word_cloud_id,conference_id combination. Create the query to add the words */
								var q = '\
								INSERT INTO `WordCloudWord` (`word_cloud_id`, `conference_user_id`, `text`, `visible`) \
								VALUES  \
								';
								var qmarks = [], qValues = [];
								for (var i = 0; i < words.length; i++) {
									qmarks.push('(?, ?, ?, ?)');
									qValues = qValues.concat([word_cloud_id,userId, words[i], properties.defaultVisible?1:0]);
								}
								q = q + ' ' + qmarks.join(', ');
								connection.query(q,qValues ,function(err, rows) {
									if(!err){
										console.log('rows',rows);
										done_cb(null,rows.affectedRows);
									}else{
										console.log('err',err);
									}
								});
							}else{
								done_cb(-5,null); /* Incorrect input, too many words  */
							}
						})
					}
				}else{
					done_cb(-3,null); /* The wordcloud group does not accept new words */
				}
			}
		})
	},
	getWordCloudOptions: function (word_cloud_option_id,connection,done_cb) {
		var q = ' \
		SELECT `WordCloudFonts`.`color` \
		FROM `WordCloudOptions` \
		JOIN `WordCloudFonts` ON `WordCloudOptions`.`id` = `WordCloudFonts`.`word_cloud_id` \
		WHERE `WordCloudOptions`.`id` = ? \
		ORDER BY `WordCloudFonts`.`order` ASC \
		';
		connection.query(q,[word_cloud_option_id] ,function(err, rows, fields) {
			if (!err){
				var colors = [];
				for (var i = 0; i < rows.length; i++) {
					colors.push(rows[i].color);
				}
				done_cb(null,{'colors':colors});
			} else {
				console.log('WordCloud error 6: ',err);
				done_cb(err,null);
			}
		});
	},
	validateInput: function (inputArray, maxInputs, maxWords, maxCharacters) {
		/* Validate number of inputs */
		var stat = inputArray.length <= maxInputs;
		/* Validate number of words / characters per input */
		if(stat){
			if(maxWords||maxCharacters){
				for (var i = inputArray.length - 1; i >= 0 && stat; i--) {
					var txt = inputArray[i];
					stat = typeof txt==='string';
					if(stat){
						/* Word count */
						if(maxWords){
							stat = stat && txt.length && (txt.split(/\s+/).length<=maxWords);
						}
						/* Character count */
						if( maxCharacters ){
							stat = stat && (txt.length<=maxCharacters);
						}
					}
				}
			}
		}
		return stat;
	},
	ifHasAccessToRoom:function (confId,room_id,auth,uF,connection,done_cb){
		uF.checkAuthToken(confId, auth, connection, function (authError, user) {
			if(!authError){
				var q = 'SELECT `WordCloud`.`id` FROM `WordCloud` WHERE `WordCloud`.`id` = ? AND `WordCloud`.`conference_id` = ?';
				connection.query(q,[room_id,user.conference_id] ,function(err, rows, fields) {
					if(!err && rows && rows.length){
						done_cb(user,rows[0].id);
					}else{
						console.log('User has no access to this room or invalid room',confId,room_id);
					}
				});
			}else{
				console.log('Invalid auth:',confId,auth,room_id);
			}
		});
	}
}
