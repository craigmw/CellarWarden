//autotune.js - Adds autotuning functions to CellarWarden.
//  Can only run autotuning on one actuator at a time.

//Requires.
var PID_ATune = require('./atPID.js');
var myPID = require('pid-controller');
var utils = require('./utils.js');

//Local variables.
var aTune = new PID_ATune( 0, 0 );

var kpmodel = 1.5;
var outputStart = 5;
var aTuneDisturbance = 0;   //Initial disturbance added (cooling) or subtracted (heating) from output at start of autotune.
var aTuneStep = 20; 
var aTuneNoise = 1;
var aTuneStartValue = 0;
var aTuneLookBack = 240;  //4 minute lookback time. This should be between 1/2 to 1/4 of time between peaks.

var tuning = false;
var atSetup = false;
var startOutput;          //Stores initial output level when autotuning started. When done, output set to this value.

//AT.setupAutotune() - Sets up autotune on selected actuator. PID must be configured and stable.
//  before calling this routine.
//  ctrls - controller array
//  i - index of controller to set up for autotuning
//  actuator - "cool" or "heat"
//  returns - true if autotune started, false if not started
exports.setupAutotune = function( ctrls, i, actuator ) {
    utils.log( 'Initiating autotune on controller ' + i + '(' + ctrls[i].cfg.name + ') ' +
        ( actuator == 'cool' ? 'cooling actuator.' : 'heating actuator.' ), 'green', false );

    //Save initial output at start of autotuning. Will return to this output level when autotuning finished.
    startOutput = ctrls[i].output;

    //Setup autotune object.
    tuning = true;
    if( tuning ) {
        tuning = false;
        changeAutoTune( ctrls, i, actuator );
        tuning = true;
        atSetup = true;
    };
    return true;
};

//changeAutoTune() - Change autotune parameters.
//  ctrls - array of controller objects.
//  i - index of current controller.
//  actuator - 'cool' or 'heat'
function changeAutoTune( ctrls, i, actuator ) {
    if(!tuning) {

        //Setup initial disturbance in output.
        if ( actuator == 'cool') {
            aTuneStartValue = ctrls[i].output + aTuneDisturbance;
        } else {
            aTuneStartValue = ctrls[i].output - aTuneDisturbance;        	
        };

        //Set mode to PI (0) vs. PID (1).
        var pidType = 0;
        if ( actuator == 'cool' ) {
            if ( ctrls[i].cfg.coolKd == 0 ) {
                pidType = 0;
            } else {
                pidType = 1;
            };
        };
        if ( actuator == 'heat' ) {
            if ( ctrls[i].cfg.heatKd == 0 ) {
                pidType = 0;
            } else {
                pidType = 1;
            };
        };
        aTune.SetControlType( pidType );

        //Set the output to the desired starting frequency.
        ctrls[i].output = aTuneStartValue;
        aTune.SetNoiseBand( aTuneNoise );
        aTune.SetOutputStep( aTuneStep );
        aTune.SetLookbackSec( aTuneLookBack );
        AutoTuneHelper( ctrls, i, true );
        tuning = true;
        //atSetup = true;

    } else { //cancel autotune
        aTune.Cancel();
        tuning = false;
        AutoTuneHelper( ctrls, i, false );
        atSetup = false;
    };
};

//AutoTuneHelper() - sets or gets PID mode (manual or auto) for autotuning.
//  ctrls - array of controller objects
//  i - index of current controller
//  start - true or false.
function AutoTuneHelper( ctrls, i, start ) {
    if( start ) {
        ATuneModeRemember = ctrls[i].PID.getMode();
    } else {
        ctrls[i].PID.setMode( ATuneModeRemember );
    };
};

//checkTuningStatus() - Determine if autotune is running (for initialization purposes).
//  returns - false = not tuning, true = tuning (already initialized)
exports.checkTuningStatus = function() {
    return atSetup;
};

//autotuneStop() - Sets up atSetup flag to false when autotuning cancelled/completed.
//  Also, prints out preliminary autotune parameters.
exports.autotuneStop = function() {
    atSetup = false;
    aTune.Cancel();
    aTune.FinishUp();
    var kp1 = aTune.GetKp();
    var ki1 = aTune.GetKi();
    var kd1 = aTune.GetKd();
    utils.log( 'Autotuning cancelled. Preliminary values - Kp: ' + kp1 + '\tKi: ' + ki1 + '\tKd: ' + kd1 );
};

//AT.processAutotune() - Runs autotuning on selected controller.
//  Called recursively from main program loop. Checks if autotuning active 
//  before processing.
//  ctrls - controller array
//  i - index of current controller
//  returns - 0 if skipped, 1 if tuning, 2 if tuning finished.
exports.processAutotune = function( ctrls, i ) {
	var retVal = 0;
	//Skip autotune processing if autotuning off.
    if ( ctrls[i].cfg.pidAutoTune == '' ) {
        utils.log( 'Skipping autotune because pidAutoTune is empty.' );
    	return retVal;
    };

    if( tuning ) {
    	//Prepare aTune object for Runtime().
    	aTune.updateATune( ctrls[i].input, ctrls[i].output );

    	//Now do Runtime().
        var val = ( aTune.Runtime() );
        if ( val != 0 ) {
            tuning = false;
        } else {
        	ctrls[i].output = aTune.getOutput();
        };
        if( !tuning ) { //we're done, set the tuning parameters
            var kp = aTune.GetKp();
            var ki = aTune.GetKi();
            var kd = aTune.GetKd();

            //Might want to alert user that new tunings available and allow them to institute these changes.
            ctrls[i].PID.setTunings( kp, ki, kd );

            //Copy settings to actuator
            if ( ctrls[i].cfg.pidAutoTune == 'cool' ) {
                 ctrls[i].cfg.coolKp = kp;
                 ctrls[i].cfg.coolKi = ki;
                 ctrls[i].cfg.coolKd = kd;
            } else {
                 ctrls[i].cfg.heatKp = kp;
                 ctrls[i].cfg.heatKi = ki;
                 ctrls[i].cfg.heatKd = kd;
            };

            AutoTuneHelper( ctrls, i, false );

            console.log( 'Tuning completed. kp: ' + kp + '\tki: ' + ki + '\tkd: ' + kd );

            //Return output to startOutput.
            ctrls[i].output = startOutput;
            retVal = 2;
        } else {
            retVal = 1;
        };
    };
    	
    return retVal;
};
