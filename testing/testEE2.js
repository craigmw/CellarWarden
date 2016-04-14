//testEE2.js - tests of event emitter functionality.

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var delay = 500;

function ee( instance ) {
    EventEmitter.call(this);
};

util.inherits(ee, EventEmitter);

var ee1 = new ee(1);
var ee2 = new ee(2);

function processEE( instance, outP ) {
    process.stdout.write('\t' + instance + '-outP: ' + outP);
};

//Setup listeners.
ee1.on('init', processEE );
ee1.on('update', processEE );
ee2.on('init', processEE );
ee2.on('update', processEE );

//Activate listeners.
ee1.emit('init', 1, 0 );
ee2.emit('init', 2, 0 );
var m = 1;
var loop = true;
var timerID = setInterval( function() {
    //loop = !loop;
    ee1.emit( 'update', 1, m );
    ee2.emit( 'update', 2, m );
    if ( m == 20 ) {
        ee1.removeListener('init', processEE );
        console.log( '\tee1 event listener removed...');
    };
    if ( m == 40 ) {
        ee2.removeListener('init', processEE );
        console.log( '\tee2 event listener removed...');
        clearInterval(timerID);
        console.log('Done testing!');
    };

    m++;
}, delay );  

//So the function called by the event listener (processEE) can act as a background process. 
//First, initialize this by making a new instance and then calling .on('init', processEE) with initialization
//parameters using .emit('init'). Then, can update parameters by calling .on('update', processEE)
//using .emit('update). When controller is turned off, need to use .removeListener('init', processEE) and
//.removeListener('update', processEE);
