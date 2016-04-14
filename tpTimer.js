//tpTimer.js - time proportioning routines for CellarWarden.
var act = require('./actuators.js');
var utils = require('./utils.js');

var threshold = 5; //Minimum output level for time proportioning. Less than this, then tpTimerWindow processing is skipped.
var sampleRateSlow = 1000;
var sampleRateFast = 200;

tpHandle = [];

//tpHandleSetup - sets up the tpHandle array.
//  Run on startup or after initializing ctrls. Do not do recursively.
exports.tpHandleSetup = function( ctrls ) {
    //Check to see if tpHandle array initialized.
    if ( tpHandle.length == 0 ) {
        for ( var n = 0; n < ctrls.length; n++ ) {
            tpHandle.push( 'empty' );
        }; 
    };
};


//tpTimerInit() - Sets up a timer for time proportioning window. Sets up background process via setInterval.
exports.tpTimerInit = function( ctrls, i, actType ) {  
    
//utils.log( i+ ': tpTimerInit()\ttpWindowStart: ' + ctrls[i].tpWindowStart );

    if ( tpHandle[i] !== 'empty' ) {
        return;
    };

    //Set tpWindowStart to 0.
    ctrls[i].tpWindowStart = 0;

    //Determine proper sample rate for tpTimer.
    if (actType == 'cool' ) {

        //If pin not registered, don't set up tpWindow.
        if ( ctrls[i].coolPinRegd == false ) {
            return;
        };

        //Determine sample rate.
        if ( ctrls[i].cfg.coolTpWindow < 20 ) {
            ctrls[i].tpSampleRate = sampleRateFast;
        } else {
            ctrls[i].tpSampleRate = sampleRateSlow;
        };
    };
    if (actType == 'heat' ) {

        //If pin not registered, don't set up tpWindow.
        if ( ctrls[i].heatPinRegd == false ) {
            return;
        };

        //Determine sample rate.
        if ( ctrls[i].cfg.heatTpWindow < 20 ) {
            ctrls[i].tpSampleRate = sampleRateFast;
        } else {
            ctrls[i].tpSampleRate = sampleRateSlow;
        };
    };
    //utils.log( 'tpSampleRate: ' + ctrls[i].tpSampleRate );

    
    //Setup tpTimer using setInterval.
    tpHandle[i] = setInterval( tpTimerWindow, ctrls[i].tpSampleRate, ctrls, i, actType );
    //utils.log( i + ': tpHandle - ' + JSON.stringify( tpHandle[i]._called ) );
};

function tpTimerTest( ctrls, g, actType ) {
    utils.log( 'tpTimerTest()...' );
};

//tpTimerWindow() - Function called from within tpTimerInit() setInterval function to handle time proportioning.
//  actType - type of actuator ('cool' or 'heat')
function tpTimerWindow( ctrls, i, actType ) {
    //utils.log('Top of tpTimerWindow.');
    var now = new Date();
    var p = i;
    var actType1 = actType;
    var tpWindow = ( actType1 == 'cool') ? ctrls[p].cfg.coolTpWindow : ctrls[p].cfg.heatTpWindow; 

    //utils.log( i + ': tpTW' );

    //If tpWindowStart = 0, mark beginning of timer window.
    if ( ctrls[p].tpWindowStart === 0 ) {
        ctrls[p].tpWindowStart = now;
        //Turn on actuator. What happens if there is a delay set???
        act.setActuator( ctrls, p, actType1, true, false );
    };

    //If timer has elapsed, we need to reset it.
    var elapsed = utils.secondsElapsedFloat( ctrls[p].tpWindowStart, now ); 

    //utils.log( 'Elapsed: ' + elapsed );
    if ( elapsed > tpWindow ) {
        ctrls[p].tpWindowStart = 0; 
    } else {
        //Determine if proportion if elapsed is greater than %output * time window length
        if ( elapsed > ( Math.abs(ctrls[p].output ) / 100 * tpWindow ) ) {
            //Turn off actuator because proportion of time window has elapsed.
            //  Checking coolOn and heatOn prevents multiple calls to turn off during rest of loop. 
            if ( actType1 == 'cool' && ctrls[p].coolOn == true ) {

                //Turn off actuator.
                act.setActuator( ctrls, p, actType, false, false );
                if ( ctrls[p].cfg.coolDelay > 0 ) act.setDelay( ctrls, p, 'cool');

                //Activate cool delay if need be.
            };
            if ( actType1 == 'heat' && ctrls[p].heatOn == true ) {

                //Turn off heating actuator.
                act.setActuator( ctrls, p, actType, false, false );

                //Activate heat delay if needed.
                if ( ctrls[p].cfg.heatDelay > 0 ) act.setDelay( ctrls, p, 'heat' ); 
            };
        };      
    };
};

//tpTimerKill() - Shuts down an existing tpTimer. Do this during crossovers 
//  and idling or when controller turned off or reinitiailized.
exports.tpTimerKill = function( ctrls, i ) {
    //utils.log( 'tpTimerKill initiated...' );
    clearInterval( tpHandle[i] );
    tpHandle[i] = 'empty';
};

