/** 
 * pid.js -  A node port of the Arduino PID library intended to be used on the Raspberry Pi
 * github@wilberforce.co.nz Rhys Williams
 * updated by Craig M. Walsh to support multiple instances and anti-windup process
 * Based on:
 * Arduino PID Library - Version 1.0.1
 * by Brett Beauregard <br3ttb@gmail.com> brettbeauregard.com
 *
 * This Library is licensed under a GPLv3 License
 *
 */

var VERBOSE = false;

var antiWindUP = true;  //Reset limiting flag. Prevents ITerm windup by blocking accumulation if output 0 or 100%.
 
var PID = function( Input, Setpoint, Kp,  Ki, Kd, ControllerDirection ) {
    //this.myOutput = Output;
    this.input = Input;
    this.mySetpoint = Setpoint;
    this.inAuto = false;
	
    this.setOutputLimits( 0, 255 );				//default output limit corresponds to the arduino pwm limits
    this.SampleTime = 100;					    //default Controller Sample Time is 0.1 seconds
    this.setControllerDirection( PID, ControllerDirection );
    this.setTunings( PID, Kp, Ki, Kd );
    this.lastTime = this.millis() - this.SampleTime;		
    this.ITerm = 0;
    this.myOutput = 0;
};

//constants
PID.AUTOMATIC = 1;
PID.MANUAL=0;
PID.DIRECT=0;
PID.REVERSE=1;	

PID.prototype.setInput = function( pid, current_value) {
    pid.input = current_value;
};

PID.prototype.setPoint = function( pid, current_value) {
    pid.mySetpoint = current_value;
};


PID.prototype.millis = function() {
    var d=new Date();
    return d.getTime();
};

/* Compute() **********************************************************************
 *     This, as they say, is where the magic happens.  this function should be called
 *   every time "void loop()" executes.  the function will decide for itself whether a new
 *   pid Output needs to be computed.  returns true when the output is computed,
 *   false when nothing has been done.
 **********************************************************************************/ 
PID.prototype.compute = function( pid ) {
    if(!pid.inAuto) return false;
    if( pid.input === null ) return false;
    var now = this.millis();
    var timeChange = (now - pid.lastTime);
    var tError = timeChange - pid.SampleTime;

    //Update sampleTime based on timeChange.
    //pid.setSampleTime( timeChange );
    //pid.setTunings( pid.kp, pid.ki, pid.kd );
    //console.log( 'Loop time: ' + timeChange + '\tTiming error: ' + tError );
    if( timeChange >= pid.SampleTime ) {
        /*Compute all the working error variables*/
        var input = pid.input;
        var error = pid.mySetpoint - input;
        //console.log( 'PID error: ' + error );

        if( ( pid.myOutput > pid.outMax ) || ( pid.myOutput < pid.outMin ) ) {
            //If antiWindUp true, don't accumulate ITerm if output is maximum or minimum.
            pid.ITerm = ( antiWindUp ? pid.ITerm : pid.ITerm + (pid.ki * error) );
        } else {
            pid.ITerm += (pid.ki * error);
        };    

        if(pid.ITerm > pid.outMax) pid.ITerm = pid.outMax;
        else if(pid.ITerm < pid.outMin) pid.ITerm = pid.outMin;
        var dInput = ( pid.input - pid.lastInput );
 
        /*Compute PID Output*/
        var output = pid.kp * error + pid.ITerm - pid.kd * dInput;

        //console.log( 'input: '+input+'\tpid.kp: '+pid.kp+'\tpid.ki: '+pid.ki+'\tpid.kd: '+
        //    pid.kd+'\tpid.ITerm: '+pid.ITerm+'\tdInput: '+dInput+'\toutput: '+output );
        if ( VERBOSE ){
            console.log( 'input: '+input.toFixed(3)+'\toutput ('+output.toFixed(3)+') = pid.kp*error ('+(pid.kp*error).toFixed(3)+
                ') + pid.ITerm ('+pid.ITerm.toFixed(3)+') - pid.kd*dInput ('+(pid.kd*dInput).toFixed(3)+')' );
        };       

        if( output > pid.outMax ) output = pid.outMax;
        else if( output < pid.outMin ) output = pid.outMin;
	      pid.myOutput = output;
	  
        /*Remember some variables for next time*/
        pid.lastInput = input;
        pid.lastTime = now;
        return true;
     } else { 
        return false;
     };
};

/* SetTunings(...)*************************************************************
 * This function allows the controller's dynamic performance to be adjusted. 
 * it's called automatically from the constructor, but tunings can also
 * be adjusted on the fly during normal operation
 ******************************************************************************/ 
PID.prototype.setTunings = function( pid, Kp, Ki, Kd ) {
    //console.log('In PID.setTunings()...');
    
    if (Kp < 0 || Ki < 0 || Kd < 0 ) return;
 
    pid.dispKp = Kp; 
    pid.dispKi = Ki; 
    pid.dispKd = Kd;
   
    //pid.SampleTimeInSec = ((double)pid.SampleTime)/1000;  
    pid.SampleTimeInSec = ( pid.SampleTime )/1000;  
    pid.kp = Kp;
    pid.ki = Ki * pid.SampleTimeInSec;
    pid.kd = Kd / pid.SampleTimeInSec;
 
    if(pid.controllerDirection == 1 ) {
        //console.log( 'PID in reverse direction (e.g. cooling).' );
        pid.kp = ( 0 - pid.kp );
        pid.ki = ( 0 - pid.ki );
        pid.kd = ( 0 - pid.kd );
    };
};

/* SetSampleTime(...) *********************************************************
 * sets the period, in Milliseconds, at which the calculation is performed	
 ******************************************************************************/
 PID.prototype.setSampleTime = function( pid, NewSampleTime ) {
   if ( NewSampleTime > 0 ) {
      ratio = NewSampleTime / ( 1.0 * pid.SampleTime );
      pid.ki *= ratio;
      pid.kd /= ratio;
      pid.SampleTime = Math.round( NewSampleTime );
   };
};

/* SetOutput( )********************* NEW
 *  Set output level if in manual mode
 **************************************************************************/
PID.prototype.setOutput = function( pid, val ) {
	if(val > pid.outMax) pid.myOutput = val;
	else if(val < pid.outMin) val = pid.outMin;
	pid.myOutput=val;
};

/* SetOutputLimits(...)****************************************************
 *     This function will be used far more often than SetInputLimits.  while
 *  the input to the controller will generally be in the 0-1023 range (which is
 *  the default already,)  the output will be a little different.  maybe they'll
 *  be doing a time window and will need 0-8000 or something.  or maybe they'll
 *  want to clamp it from 0-125.  who knows.  at any rate, that can all be done
 *  here.
 **************************************************************************/
PID.prototype.setOutputLimits = function( pid, Min, Max ) {
   if(Min >= Max) return;
   pid.outMin = Min;
   pid.outMax = Max;
 
   if(pid.inAuto) {
	   if( pid.myOutput > pid.outMax ) pid.myOutput = pid.outMax;
	   else if(pid.myOutput < pid.outMin) pid.myOutput = pid.outMin;
	 
	   if( pid.ITerm > pid.outMax ) pid.ITerm= pid.outMax;
	   else if(pid.ITerm < pid.outMin) pid.ITerm= pid.outMin;
   };
};

/* SetMode(...)****************************************************************
 * Allows the controller Mode to be set to manual (0) or Automatic (non-zero)
 * when the transition from manual to auto occurs, the controller is
 * automatically initialized
 ******************************************************************************/ 
 PID.prototype.setMode = function( pid, Mode ) {
    var newAuto = (Mode == PID.AUTOMATIC);
    if(newAuto == !pid.inAuto ) {  /*we just went from manual to auto*/
        pid.initialize();
    }
    pid.inAuto = newAuto;
};

/* Initialize()****************************************************************
 *	does all the things that need to happen to ensure a bumpless transfer
 *  from manual to automatic mode.
 ******************************************************************************/ 
 PID.prototype.initialize = function( pid ) { 
   console.log( 'PID: ' + JSON.stringify(pid));
   this.ITerm = pid.myOutput;
   var lastInput = pid.myInput;
   if(pid.ITerm > pid.outMax) pid.ITerm = pid.outMax;
   else if(pid.ITerm < pid.outMin) pid.ITerm = pid.outMin;
};

/*  zeroITerm()****************************************************************
 *  initializes ITerm to prevent rollup. However, makes output oscillatory 
 *  below (or above) setpoint.
 *****************************************************************************/
PID.prototype.zeroITerm = function( pid ) {
    pid.ITerm = 0;
};

/* SetControllerDirection(...)*************************************************
 * The PID will either be connected to a DIRECT acting process (+Output leads 
 * to +Input) or a REVERSE acting process(+Output leads to -Input.)  we need to
 * know which one, because otherwise we may increase the output when we should
 * be decreasing.  This is called from the constructor.
 ******************************************************************************/
PID.prototype.setControllerDirection = function( pid, Direction ) {
   if( pid.inAuto && pid.Direction !=pid.controllerDirection ) {
	  pid.kp = ( 0 - pid.kp );
      pid.ki = ( 0 - pid.ki );
      pid.kd = ( 0 - pid.kd );
   }   
   pid.controllerDirection = Direction;
};

/* Status Functions*************************************************************
 * Just because you set the Kp=-1 doesn't mean it actually happened.  these
 * functions query the internal state of the PID.  they're here for display 
 * purposes.  this are the functions the PID Front-end uses for example
 ******************************************************************************/
PID.prototype.getKp = function( pid ) { 
	return  pid.dispKp;
};

PID.prototype.getKd = function( pid ) {
	return  pid.dispKd;
};

PID.prototype.getKi = function( pid ) {
	return  pid.dispKi;
};

PID.prototype.getMode = function( pid ) {
	return  pid.inAuto ? PID.AUTOMATIC : PID.MANUAL;
};

PID.prototype.getDirection = function( pid ) {
	return  pid.controllerDirection;
};

PID.prototype.getOutput = function( pid ) {
	return  pid.myOutput;
};

PID.prototype.getInput = function( pid ) {
	return  pid.input;
};

PID.prototype.getSetPoint = function( pid ) {
	return  pid.mySetpoint;
};

module.exports = PID;