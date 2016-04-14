//tpTest2.js - tests time proportioning with LED output. Multiple controllers with objects stored in array.
var gpio = require('rpi-gpio');
var utils = require('./utils.js');

var loopDelay = 10;
var loop = 0;
var ctrls = [
    {
        name : 'Ctrl_0',
        coolPin : 12,
        heatPin : null,
        output : 90,
        pwm : false,
        coolTpWindow : 2,
        heatTpWindow : 2,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolInvert : false,
        heatInvert : false
    },   
    {
        name : 'Ctrl_1',
        coolPin : 16,
        heatPin : null,
        output : 90,
        pwm : false,
        coolTpWindow : 2,
        heatTpWindow : 2,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolInvert : false,
        heatInvert : false
    },
    {
        name : 'Ctrl_2',
        coolPin : 21,
        heatPin : null,
        output : 90,
        pwm : false,
        coolTpWindow : 2,
        heatTpWindow : 2,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolInvert : false,
        heatInvert : false
    },   
    {
        name : 'Ctrl_3',
        coolPin : 24,
        heatPin : null,
        output : 90,
        pwm : false,
        coolTpWindow : 2,
        heatTpWindow : 2,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolInvert : false,
        heatInvert : false
    },
    {
        name : 'Ctrl_4',
        coolPin : 13,
        heatPin : null,
        output : 90,
        pwm : false,
        coolTpWindow : 2,
        heatTpWindow : 2,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolInvert : false,
        heatInvert : false
    },
];

/*
//List all assignable gpio pins.
for ( var i = 0; i < 40; i++ ) {
    gpioDigiInit( i );
};
gpio.destroy( function() {
    utils.log( 'All pins unexported.')
});

*/

//Initialize gpio pins.
for ( var i = 0; i < ctrls.length; i++ ) {
    utils.log( 'ctrls[' + i + '].coolPin: ' + ctrls[i].coolPin );
    gpioDigiInit( ctrls[i].coolPin );
};

//Set up main loop to call tpTimer routine.
setInterval( function() {
    for (var n = 0; n < ctrls.length; n++ ) {

        ctrls[n].output = randomInt( 0, 100 );
        utils.log( loop + ' - ' + ctrls[n].name + ' output: ' + ctrls[n].output );
        //utils.log( 'Top of main loop.');

        //Setup tpTimer if it doesn't exist.
        if ( ctrls[n].tpHandle == null ) {
            tpTimerInit( ctrls, n, 'cool' );
        };
        if (loop == 5) {
            tpTimerKill( ctrls, n );
        };
    }; 
    if (loop == 5) {
        loop = 0;
    } else {
        loop++;
    };
}, loopDelay * 1000 ); 

//tpTimerInit() - Sets up a timer for time proportioning window. Sets up background process via setInterval.
function tpTimerInit( ctrls, i, actType ) {  
    utils.log( 'At top of tpTimerInit() ');
    //First, determine proper sample rate for tpTimer.
    if ( ctrls[i].coolTpWindow < 20 ) {
        ctrls[i].tpSampleRate = 100;
    } else {
        ctrls[i].tpSampleRate = 1000;
    };
    
    //Setup tpTimer using setInterval.
    ctrls[i].tpHandle = setInterval( tpTimerWindow, ctrls[i].tpSampleRate, ctrls, i, actType );
};

//tpTimerWindow() - Function called from within tpTimerInit() setInterval function to handle time proportioning.
//  actType - type of actuator ('cool' or 'heat')
function tpTimerWindow( ctrls, i, actType ) {
    //utils.log('Top of tpTimerWindow.');
    var now = new Date();
    var p = i;
    var tpWindow = ( actType == 'cool') ? ctrls[p].coolTpWindow : ctrls[p].heatTpWindow; 

    //If tpWindowStart = 0, we need to mark beginning of timer window
    if ( ctrls[p].tpWindowStart === 0 ) {
        ctrls[p].tpWindowStart = now;
        //Turn on actuator. What happens if there is a delay set???
        setActuator( ctrls, p, actType, true, false );
    };

    //If timer has elapsed, we need to reset it.
    var elapsed = utils.secondsElapsedFloat( ctrls[p].tpWindowStart, now ); 

    //utils.log( 'Elapsed: ' + elapsed );
    if ( elapsed > tpWindow ) {
        ctrls[p].tpWindowStart = 0; 
    } else {
        //Determine if proportion if elapsed is greater than %output * time window length
        if ( elapsed > ( ctrls[p].output / 100 * tpWindow ) ) {
            //Turn off actuator because proportion of time window has elapsed.
            setActuator( ctrls, p, actType, false, false );
        };      
    };
};

//tpTimerKill() - Shuts down an existing tpTimer. Do this during crossovers or when controller turned off or reinitiailized.
function tpTimerKill( ctrls, i ) {
    clearInterval( ctrls[i].tpHandle );
    ctrls[i].tpHandle = null;
};


//gpioDigiInit() - initializes gpio pin for digital output (on/off).
//  pin - gpio pin to initialize
function gpioDigiInit( pin ) {
    utils.log( 'Initializing gpio pin ' + pin + ' for output...', 'green', false, false );
    gpio.setup( pin, gpio.DIR_OUT, function( err ) {
        if ( err ) {
            utils.log( 'Unable to initialize GPIO pin ' + pin + ' for output. ' + err, 'red', true, false );
        };
    });  
    gpio.setMode( gpio.MODE_BCM );    
};


//gpioDigiWrite() - function to write digital output to gpio pin.
//  pin - pin to write to
//  output - write true (high) or false (low) to gpio pin
//  invert - invert output?
function gpioDigiWrite( pin, output, invert ) {
    if ( pin == null ) {
        return;
    };

    var outP = invert ? !output : output;
    //utils.log( 'Writing ' + outP + ' to gpio pin ' + pin + '.', 'green', false, false );
    gpio.write( pin, ( invert ? !output : output ), function( err ) {
        if ( err ) {
            utils.log( 'Unable to write to GPIO pin ' + pin + '. Error:' + err, 'red', true, false );
        };
    });
};

//setActuator() - Sets selected gpio pin to high or low (depending on inverted or not).
//  actType - 'cool' or 'heat'
//  output - PWM mode = 0-100%; Digital mode = true (high) false (low)
//  pwm - pwm mode (true), digital mode (false)
//  returns - true if activated, false if delay
function setActuator( ctrls, i, actType, output, pwm ) {
    //Determine pin based on actType
    var pin = ( actType == 'cool' ) ? ctrls[i].coolPin : ctrls[i].heatPin;
    var invert1 = ( actType == 'cool' ) ? ctrls[i].coolInvert : ctrls[i].heatInvert;

        
    //utils.log( 'Writing ' + output + ' to pin ' + pin1 + '.' );
 
    //No delays, so write to pin.
    if ( ctrls[i].pwm ) {
        gpioPwmWrite( pin, output, invert1 );
    } else {
        gpioDigiWrite( pin, output, invert1 );
    };
    return true;
};  

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

