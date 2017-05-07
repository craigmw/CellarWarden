//actuators.js - provides gpio output routines for CellarWarden. Test3

var gpio = require('rpi-gpio');
var utils = require('./utils.js');

var VERBOSE = false;

//gpioInit() - set up gpio pins for this controller. Set up for cool and/or heat pin.
//  ctrls - array of controller objects
//  i - index of current controller
exports.gpioInit = function( ctrls, i ) {
    //Setup cooling pin if it is specified.
    if ( ctrls[i].cfg.coolPin !== '' && ctrls[i].cfg.coolPin !== null ) {
        if (ctrls[i].cfg.coolUsePwm ) {
            //Set up cool pin for pwm output.
            this.gpioPwmInit( ctrls, i, 'cool' );
        } else {
            //Set up cool pin for digital output.
            this.gpioDigiInit( ctrls, i, 'cool' );
        };
    };
    //Setup heating pin if it is specified.
    if ( ctrls[i].cfg.heatPin !== '' && ctrls[i].cfg.heatPin !== null ) {
        if (ctrls[i].cfg.heatUsePwm ) {
            //Set up heat pin for pwm output.
            this.gpioPwmInit( ctrls, i, 'heat' );
        } else {
            //Set up heat pin for digital output.
            this.gpioDigiInit( ctrls, i, 'heat' );
        };
    };
    //Turn off actuators?
};


//gpioDigiInit() - initializes gpio pin for digital output (on/off).
//  ctrls - array of controller objects
//  i - index of current controller
//  actType - 'heat' or 'cool
exports.gpioDigiInit = function( ctrls, i, actType ) {
    var pin = ( actType == 'cool' ) ? ctrls[i].cfg.coolPin : ctrls[i].cfg.heatPin;
    if (VERBOSE) { utils.log( 'Initializing gpio pin ' + pin + ' for output...', 'green', false, false ) };
    gpio.setup( pin, gpio.DIR_OUT, function( err ) {
        if ( err ) {
            if ( actType == 'cool' ) {
                ctrls[i].coolPinRegd = false;
            } else {
                ctrls[i].heatPinRegd = false;
            };
            utils.log( 'Unable to initialize GPIO pin ' + pin + ' for output. ' + err, 'red', true, false );
        } else {
            if ( actType == 'cool' ) {
                ctrls[i].coolPinRegd = true;
                //Set actuator to off.
                gpioDigiWrite( ctrls, i, 'cool', false, false ); 
            } else {
                ctrls[i].heatPinRegd = true;
                //Set actuator to off.
                gpioDigiWrite( ctrls, i, 'heat', false, false );
            };
            utils.log( 'Initialized GPIO pin ' + pin + ' for output on controller ' + i + ' . ', 'green', false, false );
        }; 
    });  
    gpio.setMode( gpio.MODE_BCM );    
};


//gpioDigiWrite() - function to write digital output to gpio pin.
//  ctrls - array of controller objects
//  i - index of current controller
//  actType - 'cool' or 'heat'
//  output - write true (high) or false (low) to gpio pin
//  invert - invert output?
function gpioDigiWrite( ctrls, i, actType, output, invert ) {
    var pin = ( actType == 'cool' ) ? ctrls[i].cfg.coolPin : ctrls[i].cfg.heatPin;
    var pinRegd = ( actType == 'cool' ) ? ctrls[i].coolPinRegd : ctrls[i].heatPinRegd;

    if ( pin == null ) {
        return;
    };

    //Make sure this pin has been registered.
    if (pinRegd == false ) {
        return;
    };
    //utils.log( 'gpioDigiWrite() - output: ' + output + '\tpinRegd: ' + pinRegd);
    //utils.log( i + 'invert: ' + invert )
    //var outP = invert ? !output : output;
    //utils.log( 'Writing ' + outP + ' to gpio pin ' + pin + '.', 'green', false, false );
    gpio.write( pin, ( invert ? !output : output ), function( err ) {
        if ( err ) {
            if ( VERBOSE ) { utils.log( 'Unable to write to GPIO pin ' + pin + '. Error:' + err, 'red', true, false ) };
        };
    });
};

//gpioPwmInit() - initialize gpio pin for pwm output.
//  pin - gpio pin to initialize.
exports.gpioPwmInit = function( pin ) {
    //Need to add logic for PWM access via gpiopid daemon.
}; 

//gpioPwmWrite() - write pwm value to gpio pin using pigpiod daemon.
//  Expects output from 0 to 100.
//  ctrls - array of controller objects
//  i - index of current controller
//  actType - 'cool' or 'heat'
//  output - output value to set
//  invert - Invert the output? If inverted, subtract output from 100.
function gpioPwmWrite( ctrls, i, actType, output, invert ) {
    var outP = invert ? 100-output : output;
    //Set up logic for writing to pwm.
};

//setActuator() - Sets selected gpio pin to high or low (depending on inverted or not).
//  actType - 'cool' or 'heat'
//  output - PWM mode = 0-100%; Digital mode = true (high) false (low)
//  pwm - pwm mode (true), digital mode (false)
//  returns - true if activated, false if delay
exports.setActuator = function( ctrls, i, actType, output, pwm ) {
    var pin;
    var invert;

    //if (VERBOSE) { utils.log( i + '. setActuator() - output: ' + output ) };
    //Determine pin based on actType
    if ( actType == 'cool' ) {
        pin = ctrls[i].coolPin;
        invert = ctrls[i].cfg.coolPinInvert;

        //Check for delay. If so, skip processing.
        if ( ctrls[i].coolDelayOn ) {
            ctrls[i].coolOn = false; 
            return false;
        };
    } else {
        pin = ctrls[i].heatPin;
        invert = ctrls[i].cfg.heatPinInvert;

        //Check for delay. If so, skip processing.
        if ( ctrls[i].heatDelayOn ) {
            ctrls[i].heatOn = false;
            return false;
        };
    }; 

    //utils.log( i + ': setActuator() - invert: ' + invert );
  
    //If pin == '', ignore (no pin selected for this actuator)
    if ( pin == '' ) {
        return true;
    };

    //No delays, so write to pin.
    if ( pwm ) {
        gpioPwmWrite( ctrls, i, actType, output, invert );
        if ( output == 0 || output == false ) {
            if ( actType == 'cool' ) { 
                ctrls[i].coolOn = false;
            };
            if ( actType == 'heat' ) { 
                ctrls[i].heatOn = false;
            };
        } else {
            if ( actType == 'cool' ) { 
                ctrls[i].coolOn = true;
            };
            if ( actType == 'heat' ) { 
                ctrls[i].heatOn = true;
            };
        }; 
    } else {
        gpioDigiWrite( ctrls, i, actType, output, invert );
        if ( output == 0 || output == false ) {
            if ( actType == 'cool' ) { 
                ctrls[i].coolOn = false;
            };
            if ( actType == 'heat' ) { 
                ctrls[i].heatOn = false;
            };
        } else {
            if ( actType == 'cool' ) { 
                ctrls[i].coolOn = true;
            };
            if ( actType == 'heat' ) { 
                ctrls[i].heatOn = true;
            };
        }; 
    };

    return true;
};  

//setDelay() - sets up a delay on an actuator when the actuator toggles off.
//  ctrls - array of controllers objects
//  i - index of current controller
//  actType - actuator type, 'cool' or 'heat'
//  returns - false (no delay setup), true (delay has been set)
exports.setDelay = function( ctrls, i, actType ) {
    var retVal = false;
    //Setup cooling delay.
    if ( actType == 'cool' ) {
        if ( ctrls[i].cfg.coolDelay > 0 ) {
            //Flag that actuator is delayed. 
            ctrls[i].coolDelayOn = true;

            //Setup delay on cooling pin.
            setTimeout( function() {
                //Turn delay flag off when timer has completed.
                ctrls[i].coolDelayOn = false;
            }, ctrls[i].cfg.coolDelay * 60 * 1000 );
            retVal = true;
        };
    };
    
    //Setup heating delay.  
    if ( actType == 'heat' ) {
        if ( ctrls[i].cfg.heatDelay > 0 ) {
            //Flag that actuator is delayed. 
            ctrls[i].heatDelayOn = true; 

            //Setup delay on heating pin.
            setTimeout( function() {
                //Turn delay flag off when timer has completed.
                ctrls[i].heatDelayOn = false;
            }, ctrls[i].cfg.heatDelay * 60 * 1000 );
        };
        retVal = true;
    };
    return retVal;
}; 

//actuatorsOff - Turns off all actuator(s) of a selected control (used when deleting controller).
//  ctrls - array of controllers
//  i - index of controller to shut off actuators
//  returns true (no error) or false (error detected)
exports.actuatorsOff = function( ctrls, i ) {
    
    //If coolPin is setup, turn it off.
    if ( ctrls[i].cfg.coolPin !== '' ) {
        if ( ctrls[i].cfg.coolUsePwm ) {
            gpioPwmWrite( ctrls, i, 'cool', false, ctrls[i].cfg.coolPinInvert );
        } else {
            gpioDigiWrite( ctrls, i, 'cool', false, ctrls[i].cfg.coolPinInvert );
        };
        //Unregister pin.
        //ctrls[i].coolPinRegd = false;
    }; 
    //If heatPin is setup, turn it off.
    if ( ctrls[i].cfg.heatPin !== '' ) {
        if ( ctrls[i].heatUsePwm ) {
            gpioPwmWrite( ctrls, i, 'heat', false, ctrls[i].heatPinInvert );
        } else {
            gpioDigiWrite( ctrls, i, 'heat', false, ctrls[i].heatPinInvert );
        };
        //Unregister pin.
        //ctrls[i].heatPinRegd = false;
    }; 
        
    //Kill tpWindow if it exists.
    if (ctrls[i].tpHandle !== null ) {
        clearInterval( tpHandle[i] );
    };

    return false;
};
         
//testActuator - Tests actuator to make sure gpio pin works.
//  pin - gpio pin number
//  invert - true if inverted, false if not inverted.
//  pwm - if true, use pwm, otherwise use digital gpio writes
exports.testActuator = function( pin, invert, pwm ) {
    utils.log( 'Testing gpio pin ' + pin + '...', 'green', false, false );
  
    if ( pin == '' || pin =='-1' ) {
        return;
    };
    if ( pwm ) {
        //Test using pwm.
        this.gpioPwmInit( pin ); 
        gpioPwmWrite( pin, ( invert ? 0 : 100 ) );
        setTimeout( function() {
            gpioPwmWrite( pin, ( invert ? 100 : 0 ) );
        }, 2000 );
    } else {
        //Test using digital write.
        gpio.setMode( gpio.MODE_BCM );
        gpio.setup( pin, gpio.DIR_OUT, function( err ) {
            if ( err ) {
                utils.log( 'Unable to initialize GPIO pin ' + pin + ' for output. Error:' + err, 'red', false, false );
            } else {
                gpio.write( pin, ( invert ? false : true ), function( err ) {
                    if ( err ) {
                        utils.log( 'Unable to write to GPIO pin ' + pin + '. Error:' + err, 'red', false, false );
                    } else {
                        setTimeout( function() { 
                            gpio.write( pin, ( invert ? true : false ), function( err ) {
                                if ( err ) {
                                    utils.log( 'Unable to write to GPIO pin ' + pin + '. Error:' + err, 'red', false, false );
                                } else {
                                    utils.log( 'Finished testing pin ' + pin + ' gpio write.', 'green', false, false );
                                };
                            });
                        }, 2000 );
                    }; 
                });
            };
        });
    };    
};


//gpioShutdown() - unregisters all gpio pins.
exports.gpioShutdown = function() {
	gpio.destroy(function() {
        utils.log('All gpio pins unexported.');
    });

};