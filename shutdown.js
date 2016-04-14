//shutdown.js - Shutdown processing for CellarWarden
//shutDown() - Turns off lcd, gpio, etc. on SIGINT or SIGTERM.
//  config - configuration object
//  ctrls - array of controllers
//

utils = require( './utils.js');
display1 = require( './display.js');
act = require( './actuators.js');

exports.shutDown = function( config, ctrls ) {
    //Shut down hardware.
    if ( config.lcdExists ) {

        //Turn off lcd display.
        display1.killLcd( config );
    };

    //Close logfile.

    //Turn off I2C bus if on.

    //Turn off all actuators. 
    for ( var ind = 0; ind < ctrls.length; ind++ ) {
        console.log( 'Turning off GPIO pins on controller ' + ind );
        act.actuatorsOff( ctrls, ind );
    };
        
    //Unregister all gpio pins.
    act.gpioShutdown( ctrls, ind );
    console.log( 'GPIO pins unregistered.' );

    //Set two second timeout to make sure everything finishings.
    console.log( 'Waiting for shutdown...' );
    setTimeout( function() {
        console.log('CellarWarden now shut down.' );
        process.exit();
    }, 2000 );
};