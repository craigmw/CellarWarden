//testEE.js - tests of event emitter functionality.

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var tpTime = 500;

function GoodEmitter( instance ) {
    var i = 0;
    EventEmitter.call(this);
    console.log( 'Doing stuff inside GoodEmitter('+instance+')...' );
    setInterval( function() {
        i++;
        //console.log( i );
        process.stdout.write( '\t' + instance + '-' + i );
        if (instance == 9 ) {
            process.stdout.write( '\n');
        };
    }, tpTime);
     
};

util.inherits(GoodEmitter, EventEmitter);

var good1 = new GoodEmitter(1);
//good1.on('event', function(msg) { console.log("Good Instance 1: "+msg); });
var good2 = new GoodEmitter(2);
//good2.on('event', function(msg) { console.log("Good Instance 2: "+msg); });
var good3 = new GoodEmitter(3);
var good4 = new GoodEmitter(4);
var good5 = new GoodEmitter(5);
var good6 = new GoodEmitter(6);
var good7 = new GoodEmitter(7);
var good8 = new GoodEmitter(8);
var good9 = new GoodEmitter(9);


//good3.on('event', function(msg) { console.log("Good Instance 3: "+msg); });
//good1.emit('event', 'GoodEmitter: Emitting from Instance 1');
//good2.emit('event', 'GoodEmitter: Emitting from Instance 2');
//good3.emit('event', 'GoodEmitter: Emitting from Instance 3');

console.log( 'good1: ' + JSON.stringify( good1 ) );

setTimeout( function() { good1 = null }, 5000 );
setTimeout( function() { good2 = null }, 10000 );
setTimeout( function() { good3 = null }, 15000 );

