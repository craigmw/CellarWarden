//actuator.js - Adds gpio actuator control to CellarWarden.

var gpio = require('rpi-gpio');
var utils = require('./utils.js');
var ctrl = require('./controller.js');
var Act = function() {};
var loopTime = 250;  //Time proportioning loop will fire continuously at this rate (in milliseconds).

//State variables
var act_off = 0;                 //Turn this actuator off
var act_on = 1;                  //Turn this actuator on
var act_idle = 2;                //Do not alter actuator state
var act_reset = 3;               //Reset this actuator - needed in case control type changes (e.g. from pid to hysteresis).
var act_update = 4;              //Update actuator output value (tpOut).

//Act.init - initializes actuator object.
//  returns - new actuator object.
Act.prototype.init = function() {
    this.pin = '';               //GPIO pin number.
    this.name='';                //Optional actuator name.
    this.invertPin = true;       //Invert output for this pin?
    this.delay = 0;              //Delay time to prevent turning this actuator on too often. 
    this.usePwm = false;         //Use PWM? If so, set hardware PWM on this GPIO pin.
    this.state = act_off;        //State of this pin (off, on or idle).
    this.tpOut = 0;              //Proportional output of this actuator. Set by PID loop (or by manual control?).
    this.tpWindow = 0;           //Length of window for time proportioning (in seconds).
    this.tpWindowStart = 0;      //Unix time that the tp window started. 0 = reset.
    this.tpLoop = 0;             //Handle for the tpLoop that is set up each time setInterval called (for time proportioning).
};   

//Act.timeWindow - Time proportioning control for PID control of discrete actuators (e.g. relays).
//  Obtains an initial output variable (pidOut) from the PID loop, and then sets actuator on for a proportion of the window.
//  While the actuator is on during the window delay, ignores any updates in PV. 
//  pidOut - output variable sent by PID. Value > 0 for heating, < 0 for cooling. Expects 100% (regardless of direction).
//  pidWindow - number of seconds for PID window.
//  windowStart - time that this window started. Reset when elapsed time >= pidWindow. To initialize window, set to 0.
//  returns - direction (st_COOL vs. st_HEAT) actuator state (on or off or do nothing) and window start time: { actDirection : actState : windowStart }; 
Act.prototype.timeWindow = function( pidOut, pidWindow, windowStart ) {
    var actDirection = ( pidOut > 0 ) ? st_HEAT : st_COOL;
    var tNow = new Date();
    var actState = false;

    //Check to see if windowStart == 0, if so, initialize window.
    if ( windowStart === 0 ) {
        windowStart = tNow;
    };

    var elapsed = secondsElapsedFloat( windowStart, tNow);
    var duration = pidWindow * ( Math.abs( pidOut ) / 100 );

    //Now, determine if we need to turn actState high or low (or leave alone) depending on where we are in window.
    if ( elapsed < pidWindow ) {
        if ( elapsed <= duration ) {
            actState = act_on;
        } else { 
            actState = act_off;
        };
    } else {
        //Reset window.
        actState = act_idle;
        windowStart = 0;
    };

    return { direction : actDirection, state : actState, timeStart : windowStart };
};

//Act.timeLoop - sets up background timer for running timeWindow function. Uses global variable loopTime for each iteration.


//Act.setActuator - Sets selected gpio pin to high or low (depending on inverted or not).
//  actState - true = activate, false = deactivate
//  pin - gpio pin number.
//  inverted - pin inverted (true or false).
//  returns error or null if okay.
Act.prototype.setActuator = function( actState, pin, inverted ) {
    var retVal = null;
    
    //If pin = '', ignore (no pin selected for this actuator)
    if ( pin = '' ) {
        return retVal;
    };
    if ( pin == '' ) {
        return retVal;
    };

    var output = (inverted ? actState : !actState );
    gpio.setup( pin, gpio.DIR_OUT, write );
    gpio.setMode( gpio.MODE_BCM);
    function write() {
        gpio.write( pin, output, function(err) {
            if (err ) {
                utils.log( 'Error writing to gpio pin ' + pin + ' ERROR: ' + err, 'green', true, false ); 
                retVal = err;
                return err;
            };
        });
    }; 
    return retVal;
};  

//Act.actuatorsOff - Turns off actuator(s) of a selected control (used when deleting controller).
//  ctrls2 - array of controllers
//  index2 - index of controller to shut off actuators
//  returns true (no error) or false (error detected)
Act.prototype.actuatorsOff = function( ctrls2, index2 ) {
    var err1 = false;
    var err2 = false;
    var retVal = true;
    //Shut off coolPin if it exists.
    if( ctrls2[index2].cfg.coolPin != '') {
        //If a timeProportioning timer is running, kill it first.
        //Now set this gpio pin off.
        err1 = this.setActuator( false, ctrls2[index2].cfg.coolPin, ctrls2[index2].cfg.coolPinInvert );
    };
    //Shut off heatPin if it exists.   
    if( ctrls2[index2].cfg.heatPin != '') {
        //If a timeProportioning timer is running, kill it first.
        //Now set this gpio pin off.
        err2 = this.setActuator( false, ctrls2[index2].cfg.heatPin, ctrls2[index2].cfg.heatPinInvert );
    };
    //Check for an error.
    retVal = !( err1 || err2 );
    return retVal;
};
         
//Act.testActuator - Tests actuator to make sure gpio pin works.
//  pin - gpio pin number
//  inverted - true if inverted, false if not inverted.
Act.prototype.testActuator = function( pin, inverted ) {
  
    if ( pin == '' || pin =='-1' ) {
        return;
    };
    gpio.setup( pin, gpio.DIR_OUT, write );
    gpio.setMode( gpio.MODE_BCM);
    var output = (inverted ? false : true );
    function write() {
        gpio.write( pin, output, function(err) {
            if (err ) {
                utils.log( 'Error writing to gpio pin ' + pin + ' ERROR: ' + err, 'green', true, false ); 
            };
        });
    };
    setTimeout( function() {
        output = (inverted ? true : false );
        function write() {
            gpio.write( pin, output, function(err) {
                if (err ) {
                    utils.log( 'Error writing to gpio pin ' + pin + ' ERROR: ' + err, 'green', true, false ); 
                } else {
                    utils.log( 'Turning off gpio pin ' + pin + '...', 'green', true, false );
                };
            });
        };
    }, 2000 ); 
};

module.exports = new Act();