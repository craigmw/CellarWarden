//testLoop.js - test background loop functionality.

var act_stop = 0;
var act_start = 1;
var act_init = 2;
var act_update = 3;
var sampleRate = 500; 
var outP1 = 0;


function loop( timerID, action, instance, windowSize, outP ) {
    switch (action) {
        case act_start:
            console.log('Starting timer...');
            //outP1 = outP;
            //Setup loop.
            timerID = setInterval( function() {
                console.log( timerID + '-' + instance + '-' + outP1 );
            }, sampleRate ); 
            break;
        case act_stop:
            console.log('Stopping timer...');
            clearInterval( timerID );
            break;
        case act_update:
            console.log('Updating timer...');
            outP1 = outP;
            break;
        default:
            //Do nothing for now.
    };
    return timerID;
};

//Now start the looping function.
var loop1 = loop( null, act_start, 0, 500, 50 );

//Now update the loop.
setTimeout( function() {
    loop( loop1, act_update, 0, 500, 65 );
}, 5000 );

//Update the loop again.
setTimeout( function() {
    loop( loop1, act_update, 0, 500, 32 );
}, 10000 );

//Now stop the loop.
//Now update the loop.
setTimeout( function() {
    loop( loop1, act_stop, 0, 500, 65 );
}, 15000 );

//Now finish.
setTimeout( function() {
    console.log('Finished processing.');
}, 20000 );


              