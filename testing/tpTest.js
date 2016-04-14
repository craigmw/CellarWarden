//tpTest.js - tests time proportioning with LED output.
var gpio = require('rpi-gpio');
var utils = require('./utils.js');
var pin1 = 12;
var output1 = 90;
var coolTpWindow = 0.5;  //Seconds
var heatTpWindow = 2;  //Seconds
tpWindowStart = 0;     //Date
var loopDelay = 4;     //Seconds
var tpSampleRate = 0;  //Milliseconds. 
var tpHandle = null;
var invert1 = false;
var i = 0;

//Initialize gpio pin
gpioDigiInit( pin1 );


//Set up main loop to call tpTimer routine.
setInterval( function() {
    output1 = randomInt( 0, 100 );
    utils.log( i + ' - Output: ' + output1 );
    //utils.log( 'Top of main loop.');

    //Setup tpTimer if it doesn't exist.
    if ( tpHandle == null ) {
        tpTimerInit( 'cool' );
    };
    if (i == 5) {
        i = 0;
        //tpTimerKill();
    } else {
        i++;
    };
}, loopDelay * 1000 ); 

//tpTimerInit() - Sets up a timer for time proportioning window. Sets up background process via setInterval.
function tpTimerInit( actType ) {  
    utils.log( 'At top of tpTimerInit() ');
    //First, determine proper sample rate for tpTimer.
    if ( coolTpWindow < 20 ) {
        tpSampleRate = 100;
    } else {
        tpSampleRate = 1000;
    };
    
    //Setup tpTimer using setInterval.
    tpHandle = setInterval( tpTimerWindow, tpSampleRate, actType );
};

//tpTimerWindow() - Function called from within tpTimerInit() setInterval function to handle time proportioning.
//  actType - type of actuator ('cool' or 'heat')
function tpTimerWindow( actType ) {
    //utils.log('Top of tpTimerWindow.');
    var now = new Date();
    var tpWindow = ( actType == 'cool') ? coolTpWindow : heatTpWindow; 

    //If tpWindowStart = 0, we need to mark beginning of timer window
    if ( tpWindowStart === 0 ) {
        tpWindowStart = now;
        //Turn on actuator. What happens if there is a delay set???
        setActuator( actType, true, false );
    };

    //If timer has elapsed, we need to reset it.
    var elapsed = utils.secondsElapsedFloat( tpWindowStart, now ); 
    //utils.log( 'Elapsed: ' + elapsed );
    if ( elapsed > tpWindow ) {
        tpWindowStart = 0; 
    } else {
        //Determine if proportion if elapsed is greater than %output * time window length
        if ( elapsed > ( output1/100 * tpWindow ) ) {
            //Turn off actuator because proportion of time window has elapsed.
            setActuator( actType, false, false );
        };      
    };
};

//tpTimerKill() - Shuts down an existing tpTimer. Do this during crossovers or when controller turned off or reinitiailized.
function tpTimerKill() {
    clearInterval( tpHandle );
    tpHandle = null;
};


//gpioDigiInit() - initializes gpio pin for digital output (on/off).
//  pin - gpio pin to initialize
function gpioDigiInit( pin ) {
    //utils.log( 'Initializing gpio pin ' + pin + ' for output...', 'green', false, false );
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
//  direction - 'cool' or 'heat'
//  output - PWM mode = 0-100%; Digital mode = true (high) false (low)
//  pwm - pwm mode (true), digital mode (false)
//  returns - true if activated, false if delay
function setActuator( direction, output, pwm ) {
        
    //utils.log( 'Writing ' + output + ' to pin ' + pin1 + '.' );
 
    //No delays, so write to pin.
    if ( pwm ) {
        gpioPwmWrite( pin1, output, invert1 );
    } else {
        gpioDigiWrite( pin1, output, invert1 );
    };
    return true;
};  

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

