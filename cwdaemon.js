//cwdaemon.js - Daemonize CellarWarden using forever library.

var forever = require( 'forever-monitor' );
var utils = require( './utils.js' );

var args = [];

process.argv.forEach(function (val, index, array) {
  //utils.log(index + ': ' + val);
  args[ index ] = val;
});

cwPath = ( args[2] ? args[2] : __dirname );

var restarts = 5;

var child = new (forever.Monitor)( cwPath + '/CellarW.js', {
    max: restarts,
    silent: false,
    append: true,
    logFile: cwPath + '/foreverlog.log', // Path to log output from forever process (when daemonized)
    outFile: cwPath + '/server.log', // Path to log output from child stdout
    errFile: cwPath + '/error.log', // Path to log output from child stderr
    args: []  //Environmental variables to pass to CellarW on startup
});

child.on('exit', function () {
    utils.log('CellarW.js has exited after ' + restarts + ' restarts.');
});

child.start();

//Report exits and restarts.
child.on( "exit", function() {
  utils.log( 'CellarW.js has exited!' );
});
child.on( "restart", function() {
  utils.log( 'CellarW.js has restarted.' );
});
child.on( 'watch:restart', function( info ) {
  utils.log( 'Restarting CellarW.js script because ' + info.file + ' changed' );
});

// If ctrl+c is hit, free resources, turn off all actuators and exit.
process.on('SIGINT', function() {
    utils.log( 'CellarWarden is shutting down after Ctrl-C (SIGNINT).', 'white', true );
    //utils.shutDown( config, ctrls );
    //process.exit();
});

// If process is terminated, free resources, turn off all actuators and exit.
process.on('SIGTERM', function() {
    utils.log( 'CellarWarden is shutting down after termination signal received (SIGTERM).', 'white', true );
    //utils.shutDown( config, ctrls );    
    //process.exit();
});


process.on( 'exit', function() {
  utils.log( 'About to exit CellarW process.' );
});

//Deal with uncaught exceptions...
process.on( 'uncaughtException', function( err ) {
  utils.log( 'Caught exception in CellarWarden: ' + err );
});