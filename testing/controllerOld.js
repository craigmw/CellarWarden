//controller.js: Add temp and humidity controllers to CellarWarden.

var fs = require( 'fs' ); //Read and write controllers to file.
var PID = require('pid-controller');
var gpio = require('rpi-gpio');
var utils = require('./utils.js');
var tprof = require('./tprofiles.js');
var Ctrl = function() {};

//State constants;
var st_OFF =       0;
var st_IDLE =      1;
var st_COOL =      2;
var st_COOLWAIT =  3;
var st_HEAT =      4;
var st_HEATWAIT =  5;
var st_DEHUM =     6;
var st_DEHUMWAIT = 7;
var st_HUMI =      8;
var st_HUMIWAIT =  9;
var st_PAUSE =     10;
var st_name = [];
st_name[0] = 'Off';
st_name[1] = 'Idling';
st_name[2] = 'Cooling';
st_name[3] = 'Waiting to Cool';
st_name[4] = 'Heating';
st_name[5] = 'Waiting to Heat';
st_name[6] = 'Dehumidifying';
st_name[7] = 'Waiting to Dehumidify';
st_name[8] = 'Humidifying';
st_name[9] = 'Waiting to Humidify';
st_name[10] = 'Paused';

var st_marker =   10; //Height of state marker in logfile.

//Time increment to process.
var t_SEC =  1;
var t_MIN =  2;
var t_HOUR = 3;
var t_DAY =  4;

//Initialize loop for first run or after restart (power failure?);
var loopFirst = true;

//Other variables.
var filename = './allCtrls.json';
var saveCtrlFileDelay = 60;       //Save Ctrls to file after this number of minutes has elapsed.
var ctrlsFileLastSave = new Date();

Ctrl.prototype.log = function (text) {
    console.log('Text inside controller.js: ' + text );
    //console.log( 'Inside controller.js: testString = ' + testString );
};

Ctrl.prototype.testLog = function( text ) {
    this.log( text );
};

//Ctrl.init - Set up a new controller object (JSON object not JSON array of objects).
Ctrl.prototype.init = function() {
     
    this.currState = st_OFF;    //State of this control [Off, Idling, Cooling, Waiting for Cool, Heating, Waiting for Heat, etc]
    this.isActive = true;       //Is control active or inactive? Processing only occurs if this is true.
    this.ctrlMode = 'HYS';      //PID or HYS
    this.type = 'HUMD';         //HUMD or TEMP
    this.name = 'Humidifier';   //Name of controller. 
    this.sensor = 'humi1';      //Sensor name picked from list (in config window)
    this.input = 50;           //Input from sensor, current value from this sensor (passed from main program)
    this.logData = true;        //Log data to logFile? (true or false)
    this.logFileName = './Humidity.csv'; //Name of controller logfile. 
    this.currSetpoint = 70;     //Current setpoint (calculated)
    this.startSetpoint = 50;    //Starting setpoint (setpoint when process started)
    this.endSetpoint = 80;      //Ending setpoint (setpoint when process is finished; allows for ramping)
    this.coolPin = '18';        //GPIO pin for cooling/dehumidification (decreasing to setpoint).
    this.coolOn = false;        //Is cooling currently active (true) or not (false)?
    this.coolPWM = false;       //Use PWM on cooling pin (true or false)? Use pigpio library to process if true.
    this.coolPinInvert = true;  //Invert this GPIO pin (e.g. for Sainsmart relay board)?
    this.coolDelay = 1;         //minutes to delay before activating cooling/dehumidifier.
    this.coolDelayStart = 0;    //Unix time when cool delay started.
    this.checkCoolDelay = true; //Flag to check cool delay. Only true on start or state transition (cooling turns off).
    this.heatPin = '25';        //GPIO pin for heating/humidification (raising to setpoint).
    this.heatOn = false;        //Is heating currently active or not?
    this.heatUsePWM = false;    //Use PWM on heating pin (true or false)? Use pigpio library to process if true.
    this.heatPinInvert = true;  //Invert this GPIO pin (e.g. for Sainsmart relay board)?
    this.heatDelay = 1;         //minutes to delay before heating/humidifying.
    this.heatDelayStart = 0;    //Unix time when heat delay started.
    this.checkHeatDelay = true; //Flag to check cool delay. Only true on start or state transition (cooling turns off).
    this.hysteresis = 2;        //Hysteresis value; treated as +/- (won't heat or cool if over or under by this value).
    this.kp = 5;
    this.ki = 0.25;
    this.kd = -1.5;
    this.dt = 1000;
    this.pidWindow = 300;       //Time in seconds for PID output to be integrated 
                                //  (e.g. 10% output would be on for 30 seconds and off for 270)
    this.PID = new PID( this.input, this.currSetpoint, this.kp, this.ki, this.kd, PID.DIRECT );
    this.useProfile = false;    //Use a temperature profile?
    this.profileName ='';       //Filename of temperature profile template to use.
    this.tprof = [];            //Temperature profile array. 
    this.tprofCurrSegm = 0;     //Index of current profile segment.
    this.tprofSegmElapsed = 0;  //Time elapsed for current profile segment.
    this.tprofTimeInc = t_MIN;  //Time increment to use for profiles.
};

//Ctrl.getStateName - determines state name using st_name array.
//  st_index - index of st_name array (uses st_ constants defined above).
//  returns state name from array.
Ctrl.prototype.getStateName = function( st_index ) {
    return st_name[ st_index ];
};

//Ctrl.addCtrl - Adds a controller object to controllers array.
//  Also, initializes JSON array if new initialized controller added.
//  ctrls = name of JSON array to pass.
//  newCtrl = controller object to add to ctrls JSON array.
//  returns array of controllers. To initialize array, call with addCtrl( ctrls, new this.init().
Ctrl.prototype.addCtrl = function( ctrls, newCtrl ) {
    ctrls.push( newCtrl );
    return ctrls;
};

//Ctrl.removeCtrl - Removes a controller object from controllers array.
//  ctrls = name of JSON array to pass.
//  index = index of controller to remove from array.
Ctrl.prototype.removeCtrl = function( ctrls, index ) { 
    ctrls.splice( index, 1 );
    return ctrls;
};

//Ctrl.updateCtrl - Updates a controller object in controllers array.
//  ctrls = name of JSON array to pass.
//  ctrl = name of JSON controller object with updated values to replace in array.
//  index = index of controller to update.
Ctrl.prototype.updateCtrl = function( ctrls, ctrl, index ) {
    if ( index > -1 ) {
        ctrls[ index ] = ctrl;
    };
    return ctrls;
};

//Ctrl.loadCtrlsFile - Loads controls from JSON file. If file not found, create a new one with default controller object.
//  filename - filename to load
//  returns - controllers JSON array.
Ctrl.prototype.loadCtrlsFile = function( fileName ) {
    var retCtrls = [];
    utils.readFromJsonFile( fileName, function(err, data) {
        if (err) {
            console.log('Error reading controllers file '+ fileName );
            retCtrls = null;
        } else {
            retCtrls = data;
            console.log( 'Number of controls loaded: ' + retCtrls.length );
        };
    });
    setInterval( function() { 
        return retCtrls;
    }, 1000 );
};

//Ctrl.writeCtrlsFile - write current controllers JSON array to file.
//  ctrls - JSON array of controllers
//  filename - name of file to save
Ctrl.prototype.writeCtrlsFile = function( ctrls, filename ) {
    utils.writeToJsonFile( ctrls, filename, function(err, data) {
        if( err) {
            console.log( 'Could not save controller settings to file '+ filename + '. Error: ' + err );
        } else {
            console.log( 'Saved controller settings to ' + filename + '.' );
        };
    });
};

//Ctrl.setTunings() - sets tunings for PID.
Ctrl.prototype.setTunings = function( kp, ki, kd ) {
    this.PID.setTunings( kp, ki, kd );
};

//Ctrl.process - Called from CellarW; runs through each controller to determine if actuators need to be activated.
//  ctrls = name of JSON array with all controllers.
//  sensorData = name of JSON object with current sensor values.
//  returns error if one exists
Ctrl.prototype.process = function( ctrls, sensorData ) {
    var error = null;
    var i = 0;
    if (ctrls.length < 1 ) {
        console.log('No controllers to process!');
        return ctrls;
    };

    //Iterate through each object in ctrls array and process.
    for ( i=0; i < ctrls.length; i++ ) {
        if (ctrls[i].isActive ) {

            //console.log('Top of process for controller ' + i );

            //First time through loop (startup or resume after power failure)?
            //  Prevents activation of heating or cooling until after delay is passed.
            if ( loopFirst ) {
                this.initLoop( ctrls, i );
                loopFirst = false;
            };
 
            //Determine current sensor value for controller.
            ctrls[i].input = this.getSensorInput( sensorData, ctrls[i].sensor );
            //console.log( 'input[' + i + '] = ' + ctrls[i].input );

            //If returned sensor value is NaN (error condition), inactivate this controller.                     
            if (ctrls[i].input == NaN ) {                                    
                ctrls[i].isActive = false;                                         
            };
  
            //Calculate current setpoint using temperature profile.
            ctrls = this.findSetpoint( ctrls, i );

            //Set actuators for this control.
            //console.log( 'Controller ' + i + ' input: ' + ctrls[i].input + ' setpoint: ' + ctrls[i].currSetpoint );
            this.processActuators( ctrls, i );  

            //Write data to logfile (if active).
            //  Only write to file every few times through loop, so add logic for this.
            this.writeToLogFile( ctrls, i );
        };
        //console.log( JSON.stringify( ctrls ) );
        //return ctrls; 
    };
    
    //Save controllers array to file after set delay has elapsed.
    var now = new Date();
    if ( utils.hoursElapsed( ctrlsFileLastSave, now ) >= saveCtrlFileDelay ) {  
        this.writeCtrlsFile( ctrls, filename );
        saveCtrlFileDelay = now;
    }; 
 
    return ctrls;
};

//Ctrl.initLoop - initialize variables on first time through loop.
//  ctrls - array of controller objects
//  index - index of current controller.
Ctrl.prototype.initLoop = function( ctrls, i ) {
    if (ctrls[i].coolDelay > 0 ) {
        ctrls[i].checkCoolDelay = true;
    };
    if (ctrls[i].heatDelay > 0 ) {
        ctrls[i].checkHeatDelay = true;
    };
    ctrlsFileLastSave = new Date();
};

//Ctrl.getThisSensorInput - searches through sensorData ojbect to find correct sensor value.
//  sData = sensor data
//  sensorName = name of sensor in sData;
Ctrl.prototype.getSensorInput = function( sData, sensorName ) {
    var sensorValue = NaN;  //Return NaN if error obtaining sensor value.
    
    //Search through sensorData using current sensor name.
    switch( sensorName ) {
        case 'temp1':  
            sensorValue = sData.temp1;
            break;
        case 'humi1':  
            sensorValue = sData.humi1;
            break;
        case 'temp2':  
            sensorValue = sData.temp2;
            break;
        case 'humi2':  
            sensorValue = sData.humi1;
            break;
        case 'onew1':  
            sensorValue = sData.onew1;
            break;
        case 'onew2':  
            sensorValue = sData.onew2;
            break;
        case 'onew3':  
            sensorValue = sData.onew3;
            break;
        case 'onew4':  
            sensorValue = sData.onew4;
            break;
        case 'onew5':  
            sensorValue = sData.onew5;
            break;
        case 'onew6':  
            sensorValue = sData.onew6;
            break;
        case 'onew7':  
            sensorValue = sData.onew7;
            break;
        case 'onew8':  
            sensorValue = sData.onew8;
            break;
        default:
            sensorValue = NaN;
            console.log( 'Could not find sensor name ' + sensorName + ' in list of sensors.' );
    };   
    //console.log( 'sensorValue: ' + sensorValue );
    return sensorValue;
};


//Ctrl.findSetpoint - Determine setpoint using associated profile (if it exists).
//  If profile does not exist, turn off ctrl[index].useProfile flag.
//  ctrls1 - controllers JSON array.
//  index - index of current controller  
//  Returns setpoint.
Ctrl.prototype.findSetpoint = function( ctrls, index ) {
    ctrls[index].currSetpoint = ctrls[index].endSetpoint;
    //return ctrls;
 
    //If profile flag is off, just return with currSetpoint = endSetpoint.
    //console.log( 'findSetpoint: ' + index + ': use profile? ctrls[' + index + '].useProfile == ' + ctrls[index].useProfile );
    if ( ctrls[index].useProfile == false ) {
        return ctrls;
    };

    //If no segments in temperature profile, turn off useProfile and return endSetpoint;
    //console.log( 'Findsetpoint: ctrls[' + index + '].tprof.length == ' + ctrls[index].tprof.length );
    if ( ctrls[index].tprof.length == 0 ) {
        ctrls[index].useProfile = false;
        return ctrls;
    };

    //tprof exists, so run it.
    ctrls = tprof.process( ctrls, index );

    return ctrls;
};

//Ctrl.processActuators - Sets actuator depending on need to cool or heat, and if delay. 
//  Also, determines if in PID or hysteresis mode.
//  ctrls - controllers array of objects.
//  i - index of array pointing to current controller. 
Ctrl.prototype.processActuators = function( ctrls, i ) {
    var gpioErr = null;
    var ctrlState = st_OFF;
    //console.log('Processing actuators for controller ' + i );
    
    if ( ctrls[i].ctrlMode == 'PID' ) {
        //Determine currSetpoint using PID mode.
        
    } else {
        //Hysteresis (HYS) mode.
        ctrlState = this.getHysState( ctrls, i );
        ctrls[i].currState = ctrlState;
        switch ( ctrlState ) {

            case st_COOL:
                //Activate cooling (if no delay)
                if ( !this.delayActuator( 'cool', ctrls, i, false ) ) {
                    gpioErr = this.setActuator( true, ctrls[i].coolPin, ctrls[i].coolPinInvert );
                    if (gpioErr ) {
                        console.log( 'Cannot write to gpio pin ' + ctrls[i].coolPin + '. Controller + ' + i +
                            ' turned off. ERROR: ' + gpioErr );
                        ctrls[i].isActive = false; 
                    };
                } else {
                    ctrls[i].currState = st_COOLWAIT;
                };
                break;
            
            case st_DEHUM:
                //Activate dehumid (if no delay)
                //console.log( 'Activate dehumidifying for controller ' + i );
                if ( !this.delayActuator( 'cool', ctrls, i, false ) ) {
                    gpioErr = this.setActuator( true, ctrls[i].coolPin, ctrls[i].coolPinInvert );
                    if (gpioErr ) {
                        console.log( 'Cannot write to gpio pin ' + ctrls[i].coolPin + '. Controller + ' + i +
                            ' turned off. ERROR: ' + gpioErr );
                        ctrls[i].isActive = false; 
                    };
                } else {
                    ctrls[i].currState = st_DEHUMWAIT;
                };
                break;
            
            case st_HEAT:
                //Activate heating (if no delay)
                //console.log( 'Activate heating for controller ' + i );
                if ( !this.delayActuator( 'heat', ctrls, i, false ) ) {
                    gpioErr = this.setActuator( true, ctrls[i].heatPin, ctrls[i].heatPinInvert );
                    if (gpioErr ) {
                        console.log( 'Cannot write to gpio pin ' + ctrls[i].heatPin + '. Controller + ' + i +
                            ' turned off. ERROR: ' + gpioErr );
                        ctrls[i].isActive = false; 
                    };
                } else {
                    ctrls[i].currState = st_HEATWAIT;
                };
                break;
           
            case st_HUMI:
                //Activate humidifying (if no delay)
                //console.log( 'Activate humidifying for controller ' + i );
                if ( !this.delayActuator( 'heat', ctrls, i, false ) ) {
                    gpioErr = this.setActuator( true, ctrls[i].heatPin, ctrls[i].heatPinInvert );
                    if (gpioErr ) {
                        console.log( 'Cannot write to gpio pin ' + ctrls[i].heatPin + '. Controller + ' + i +
                            ' turned off. ERROR: ' + gpioErr );
                        ctrls[i].isActive = false; 
                    };
                } else {
                    ctrls[i].currState = st_HUMIWAIT;
                };
                break;

            case st_PAUSE:
                //Controller paused, so leave gpio pins in their current state.
                break;

            case st_OFF:
                //Turned controller off, so turn off gpio pins.
                gpioErr = this.setActuator( false, ctrls[i].coolPin, ctrls[i].coolPinInvert );
                if (gpioErr ) {
                    console.log( 'Cannot write to gpio pin ' + ctrls[i].coolPin + '. Controller + ' + i +
                        ' turned off. ERROR: ' + gpioErr );
                };
                gpioErr = this.setActuator( false, ctrls[i].heatPin, ctrls[i].heatPinInvert );
                if (gpioErr ) {
                    console.log( 'Cannot write to gpio pin ' + ctrls[i].heatPin + '. Controller + ' + i +
                        ' turned off. ERROR: ' + gpioErr );
                };
                console.log( 'Controller ' + i + ' turned off.' );
                ctrls[i].isActive = false;
                break;
           
            default:
                //Idling, so turn off cool and heat pins.
                gpioErr = this.setActuator( false, ctrls[i].coolPin, ctrls[i].coolPinInvert );
                if (gpioErr ) {
                    console.log( 'Cannot write to gpio pin ' + ctrls[i].coolPin + '. Controller + ' + i +
                        ' turned off. ERROR: ' + gpioErr );
                    ctrls[i].isActive = false; 
                };
                gpioErr = this.setActuator( false, ctrls[i].heatPin, ctrls[i].heatPinInvert );
                if (gpioErr ) {
                    console.log( 'Cannot write to gpio pin ' + ctrls[i].heatPin + '. Controller + ' + i +
                        ' turned off. ERROR: ' + gpioErr );
                    ctrls[i].isActive = false; 
                };
                //console.log( 'Idling on controller ' + i );
                ctrls[i].currStat = st_IDLE;
        };
    };
}; 

//Ctrl.getHysState - Determine controller state using hysteresis control.
//  ctrls - array of controllers.
//  i - index of current controller.
//  returns controller state (using state constants)
Ctrl.prototype.getHysState = function( ctrls, i ) {
    var inp = ctrls[i].input;
    var sp = ctrls[i].currSetpoint;
    var ctrlType = ctrls[i].type; 
    var tHigh = sp + ctrls[i].hysteresis;
    var tLow = sp - ctrls[i].hysteresis;
    var retState = st_IDLE;

    //Check for cooling.
    if (inp > tHigh ) {
        retState = (ctrlType == 'TEMP') ? st_COOL : st_DEHUM;
    } else if (inp > sp) {
        retState = st_IDLE;
    };

    //Check for heating.
    if (inp < tLow ) {
        retState = (ctrlType == 'TEMP') ? st_HEAT : st_HUMI; 
        
    } else if (inp < sp) {
        retState = st_IDLE;
    };
    
    //Check for cooling/heating transitioning from on to off (state change). When this happens, activate delay. 
    if ( (ctrls[i].currState == st_COOL ) && (retState != st_COOL) ) {
        //console.log( 'ctrls[' + i + '] cooling turning off. Set coolDelayStart to current time.');
        this.delayActuator( 'cool', ctrls, i, true );
        ctrls[i].checkCoolDelay = true;
    };
    if ( (ctrls[i].currState == st_HEAT ) && ( retState != st_HEAT ) ) {
        //console.log( 'ctrls[' + i + '] heating turning off. Set heatDelayStart to current time.');
        this.delayActuator( 'heat', ctrls, i, true );
        ctrls[i].checkHeatDelay = true;
    };   
   
    return retState;
};



//Ctrl.delayActuator - check for delay on actuator. If delay remains, return true. 
//  Also, updates time remaining for delay and controller state. 
//  actType - type of actuator ('heat' or 'cool').
//  ctrls - controllers array.
//  i - index pointing to this controller.
//  reset - reset delay when state changes.
//  returns false if no delay, true if delay active.
Ctrl.prototype.delayActuator = function( actType, ctrls, i, reset ) {
    
    //If delay is set to zero, ignore and return false.
    if ( (actType == 'heat' && ctrls[i].heatDelay == 0) || (actType == 'cool' && ctrls[i].coolDelay == 0) ) {
        return false;
    } else {
        //console.log('Checking for delay: ' + ( (actType == 'cool') ? 'cool' : 'heat') );
    };

    var now = new Date();
    var elapsed = 0;

    //Reset flag true, so reset delayStart time.
    if ( reset ) {
        if (actType == 'cool') {
            //console.log( 'Resetting coolDelayStart to now.');
            ctrls[i].coolDelayStart = now;
        } else {
            //console.log( 'Resetting heatDelayStart to now.');
            ctrls[i].heatDelayStart = now;
        };
        return false;
    };   

    //Check for delay.
    if( actType == 'cool' ) {
        //Set coolDelayStart to now if first time through.
        if ( ctrls[i].coolDelayStart == 0 ) { ctrls[i].coolDelayStart = now };

        //If checkCoolDelay is false, skip checking and return false.
        if ( !ctrls[i].checkCoolDelay ) {
            return false;
        };  
        
        //Check for cool delay.  
        elapsed = utils.minutesElapsed( ctrls[i].coolDelayStart, now );
        //console.log('Cool delay: ' + ctrls[i].coolDelay + '\tElapsed: ' + elapsed );
        if ( elapsed >= ctrls[i].coolDelay ) {
            //console.log('Cool delay has elapsed.');
            //Cool delay is over, so reset coolDelayStart, turn off checking and return false.
            ctrls[i].coolDelayStart = 0;
            ctrls[i].checkCoolDelay = false;  //Turn off cooling delays until next time cooling turns off.
            return false
        } else {
            return true;   
        };
    } else {

        //Set heatDelayStart to now if first time through.
        if ( ctrls[i].heatDelayStart == 0 ) { ctrls[i].heatDelayStart = now };

        //If checkHeatDelay is false, skip checking and return false.
        if ( !ctrls[i].checkHeatDelay ) { 
            return false;
        };

        //Check for heat delay.
        elapsed = utils.minutesElapsed( ctrls[i].heatDelayStart, now );
        if ( elapsed >= ctrls[i].heatDelay ) {
            //console.log('Heat delay has elapsed.');

            //Heat delay is over, so reset heatDelayStart, turn off checking and return false.
            ctrls[i].heatDelayStart = 0;
            ctrls[i].checkHeatDelay = false;
            return false;
        } else {
            return true;
        };
    };   
    return false;
};

//Ctrl.setActuator - Sets selected gpio pin to high or low (depending on inverted or not).
//  actState - true = activate, false = deactivate
//  pin - gpio pin number.
//  inverted - pin inverted (true or false).
//  returns error or null if okay.
Ctrl.prototype.setActuator = function( actState, pin, inverted ) {
    var retVal = null;
    
    //If pin = '-1', ignore (no pin selected for this actuator)
    if ( pin = '-1' ) {
        return retVal;
    };

    var output = (inverted ? actState : !actState );
    gpio.setup( pin, gpio.DIR_OUT, write );
    gpio.setMode( gpio.MODE_BCM);
    function write() {
        gpio.write( pin, output, function(err) {
            if (err ) {
                retVal = err;
                return err;
            };
        });
    }; 
    return retVal;
};  


//Ctrl.testActuator - Tests actuator to make sure gpio pin works.
//  pin - gpio pin number
//  inverted - true if inverted, false if not inverted.
Ctrl.prototype.testActuator = function( pin, inverted ) {
    this.setActuator( (inverted ? false : true ), pin, inverted );
    setTimeout( function() {
        this.setActuator( (inverted ? true : false ), pin, inverted );
    }, 1000 );
};

Ctrl.prototype.writeToLogFile = function( ctrls, i ) {
    //Write data to file if logFileName provided and logging is active.
    if ( ctrls[i].logData && ctrls[i].logFileName !== '' ) {
        //console.log('Writing data to ' + ctrls[i].logFileName );        

        
 
        //Assemble data in CSV format (date/time, input value from sensor, current setpoint, heat/humi state, cool/dehumi state)
        var csvData = utils.getDateTime() + ',';
        csvData += ctrls[i].input.toFixed(2) + ',';
        csvData += ctrls[i].currSetpoint.toFixed(2) + ',';
        csvData += ( ( ctrls[i].currState == st_HEAT || ctrls[i].currState == st_HUMI ) ? st_marker : 0 ) + ',';
        csvData += ( ( ctrls[i].currState == st_COOL || ctrls[i].currState == st_DEHUM ) ? st_marker : 0 ); 
  
        //If file does not exist, add a comment with parameters to parse on client side.
        fs.access( ctrls[i].logFileName, fs.F_OK, function( error ) {
            if( !error ) {
                //Append csvData to file. 
                csvData += '\n';
                fs.appendFile( ctrls[i].logFileName, csvData, 'utf8', function(err) {
                    if (err) {
                        console.log( 'Unable to write to controller logfile ' + ctrls[i].logFileName + '. Error: ' + err );
                        ctrls[i].logData = false;  //Turn off logging to prevent recurrent errors.
                    };
                });
            } else {
                //File does not exist, so first record includes comment with controller parameters used for dygraphs (title, etc).
                csvData += ' #@%' + JSON.stringify( ctrls[i] ) + '\n';

                //Use the following to decode this comment in javascript:
                //var tempString = csvData.substring( csvData.indexOf('#@%') + 3, csvData.length );
                //var tempCtrl = JSON.parse( tempString );
                //console.log( 'tempString: ' + tempString );
                //console.log( 'Controller name: ' + tempCtrl.name + '\nSensor: ' + tempCtrl.sensor );

                //Now append csvData to file (this will create the file with first record). 
                fs.appendFile( ctrls[i].logFileName, csvData, 'utf8', function(err) {
                    if (err) {
                        console.log( 'Unable to write to controller logfile ' + ctrls[i].logFileName + '. Error: ' + err );
                        ctrls[i].logData = false;  //Turn off logging to prevent recurrent errors.
                    };
                });
            };
        });    
    };
}; 

module.exports = new Ctrl();