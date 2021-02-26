var cluster = require('cluster');
const RESTART_TIME = 2000;
if (cluster.isMaster) {
	var fs = require('fs');
	/* Start the child process */
	function startPersistentWorker() {
		var worker = cluster.fork();
		console.log(`Started worker: ${worker.process.pid}`);
		worker.on('exit', (code, signal) => {
			var pid = worker.process.pid;
			if(!worker.exitedAfterDisconnect){
				if (signal) {
					console.log(`${worker.process.pid} worker was killed by signal: ${signal}, restarting...`);
					startPersistentWorker();
				} else if (code !== 0) {
					console.log(`${worker.process.pid} worker exited with error code: ${code}, restarting...`);
					startPersistentWorker();
				} else {
					console.log(`${worker.process.pid} worker success!`);
				}
			}else{
				console.log(`${worker.process.pid} exitedAfterDisconnect`);
			}
		});
		return worker;
	}
	/* We notify the worker, disconnect it and after RESTART_TIME we kill it */
	function stopWorker(worker) {
		worker.send({'action':'stop','time':RESTART_TIME});
		worker.disconnect();
		setTimeout(function(){
			if(worker){
				worker.exitedAfterDisconnect = true;
				worker.kill();
			}
		},RESTART_TIME);
	}
	startPersistentWorker();
	/* When the verion changes start the new process and gracefully stop all the old ones */
	fs.watchFile(__dirname+'/version', function() {
		console.log('Version change...');
		/* Start new process */
		var newWorker = startPersistentWorker();
		/* When the new process started, start closing the old processes */
		newWorker.on('listening', () => {
			/* Notify old processes to stop */
			for (var id in cluster.workers) {
				if( cluster.workers[id] != newWorker ){
					stopWorker(cluster.workers[id]);
				}
			}
		});
	});
}else if (cluster.isWorker) {
	//websockets
	require(__dirname + '/websockets.js');
}
