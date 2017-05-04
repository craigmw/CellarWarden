//pid.js - Adds PID control to CellarWarden. Ported from pid-controller with added modifications.

/** 
 * pid-controller -  A node port of the Arduino PID library intended to be used on the Raspberry Pi
 * github@wilberforce.co.nz Rhys Williams
 * Based on:
 * Arduino PID Library - Version 1.0.1
 * by Brett Beauregard <br3ttb@gmail.com> brettbeauregard.com
 *
 * This Library is licensed under a GPLv3 License
 *
 */

var VERBOSE = false;

var antiWindUP = true;  //Reset limiting flag. Prevents ITerm windup by blocking accumulation if output 0 or 100%.

 
var PID = function(Input, Setpoint, Kp,  Ki, Kd, ControllerDirection) {
    //this.myOutput = Output;
    this.input = Input;
    this.mySetpoint = Setpoint;
    this.inAuto = false;
	
    this.setOutputLimits(0, 255);				//default output limit corresponds to //the arduino pwm limits
    this.SampleTime = 100;					    //default Controller Sample Time is 0.1 seconds
    this.setControllerDirection(ControllerDirection);
    this.setTunings(Kp, Ki, Kd);
    this.lastTime = this.millis() - this.SampleTime;		
    this.ITerm=0;
    this.myOutput=0;
};

//constants
PID.AUTOMATIC=1;
PID.MANUAL=0;
PID.DIRECT=0;
PID.REVERSE=1;	

PID.prototype.setInput = function(current_value) {
    this.input = current_value;
};

PID.prototype.setPoint = function(current_value) {
    this.mySetpoint = current_value;
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
PID.prototype.compute = function() {
    if(!this.inAuto) return false;
    if( this.input === null ) return false;
    var now = this.millis();
    var timeChange = ( now - this.lastTime );
    var tError = timeChange - this.SampleTime;

    //Update sampleTime based on timeChange.
    //this.setSampleTime( timeChange );
    //this.setTunings( this.kp, this.ki, this.kd );
    //console.log( 'Loop time: ' + timeChange + '\tTiming error: ' + tError );
    //console.log( 'timeChange: ' + timeChange + '\t this.SampleTime: ' + this.SampleTime );
    if( timeChange >= this.SampleTime ) {
        /*Compute all the working error variables*/
        var input = this.input;
        var error = this.mySetpoint - input;
        //console.log( 'PID error: ' + error );

        if( ( this.myOutput > this.outMax ) || ( this.myOutput < this.outMin ) ) {
            //If antiWindUp true, don't accumulate ITerm if output is maximum or minimum.
            this.ITerm = ( antiWindUp ? this.ITerm : this.ITerm + (this.ki * error) );
        } else {
            this.ITerm += (this.ki * error);
        };    

        if(this.ITerm > this.outMax) this.ITerm = this.outMax;
        else if(this.ITerm < this.outMin) this.ITerm= this.outMin;
        var dInput = (this.input - this.lastInput);
 
        /*Compute PID Output*/
        var output = this.kp * error + this.ITerm - this.kd * dInput;

        //console.log( 'input: '+input+'\tthis.kp: '+this.kp+'\tthis.ki: '+this.ki+'\tthis.kd: '+
        //    this.kd+'\tthis.ITerm: '+this.ITerm+'\tdInput: '+dInput+'\toutput: '+output );
        if ( VERBOSE ){
            console.log( 'input: '+input.toFixed(3)+'\toutput ('+output.toFixed(3)+') = this.kp*error ('+(this.kp*error).toFixed(3)+
                ') + this.ITerm ('+this.ITerm.toFixed(3)+') - this.kd*dInput ('+(this.kd*dInput).toFixed(3)+')' );
        };       

        if(output > this.outMax) output = this.outMax;
        else if(output < this.outMin) output = this.outMin;
	      this.myOutput = output;
	  
        /*Remember some variables for next time*/
        this.lastInput = input;
        this.lastTime = now;
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
PID.prototype.setTunings = function(Kp, Ki, Kd) {
    //console.log('In PID.setTunings()...');
    if (Kp<0 || Ki<0 || Kd<0) return;
 
    this.dispKp = Kp; this.dispKi = Ki; this.dispKd = Kd;
   
    //this.SampleTimeInSec = ((double)this.SampleTime)/1000;  
    this.SampleTimeInSec = (this.SampleTime)/1000;  
    this.kp = Kp;
    this.ki = Ki * this.SampleTimeInSec;
    this.kd = Kd / this.SampleTimeInSec;
 
    if(this.controllerDirection == 1 ) {
        //console.log( 'PID in reverse direction (e.g. cooling).' );
        this.kp = (0 - this.kp);
        this.ki = (0 - this.ki);
        this.kd = (0 - this.kd);
    };
};

/* SetSampleTime(...) *********************************************************
 * sets the period, in Milliseconds, at which the calculation is performed	
 ******************************************************************************/
 PID.prototype.setSampleTime = function(NewSampleTime) {
   if (NewSampleTime > 0) {
      ratio = NewSampleTime / (1.0*this.SampleTime);
      this.ki *= ratio;
      this.kd /= ratio;
      this.SampleTime = Math.round(NewSampleTime);
   };
};

/* SetOutput( )********************* NEW
 *  Set output level if in manual mode
 **************************************************************************/
PID.prototype.setOutput = function( val ) {
	if(val > this.outMax) this.myOutput = val;
	else if(val < this.outMin) val = this.outMin;
	this.myOutput=val;
};

/* SetOutputLimits(...)****************************************************
 *     This function will be used far more often than SetInputLimits.  while
 *  the input to the controller will generally be in the 0-1023 range (which is
 *  the default already,)  the output will be a little different.  maybe they'll
 *  be doing a time window and will need 0-8000 or something.  or maybe they'll
 *  want to clamp it from 0-125.  who knows.  at any rate, that can all be done
 *  here.
 **************************************************************************/
PID.prototype.setOutputLimits = function( Min, Max ) {
   if(Min >= Max) return;
   this.outMin = Min;
   this.outMax = Max;
 
   if(this.inAuto) {
	   if(this.myOutput > this.outMax) this.myOutput = this.outMax;
	   else if(this.myOutput < this.outMin) this.myOutput = this.outMin;
	 
	   if(this.ITerm > this.outMax) this.ITerm= this.outMax;
	   else if(this.ITerm < this.outMin) this.ITerm= this.outMin;
   };
};

/* SetMode(...)****************************************************************
 * Allows the controller Mode to be set to manual (0) or Automatic (non-zero)
 * when the transition from manual to auto occurs, the controller is
 * automatically initialized
 ******************************************************************************/ 
 PID.prototype.setMode = function( Mode ) {
    var newAuto = (Mode == PID.AUTOMATIC);
    if(newAuto == !this.inAuto) {  /*we just went from manual to auto*/
        this.initialize();
    }
    this.inAuto = newAuto;
};

/* Initialize()****************************************************************
 *	does all the things that need to happen to ensure a bumpless transfer
 *  from manual to automatic mode.
 ******************************************************************************/ 
 PID.prototype.initialize = function() { 
   this.ITerm = this.myOutput;
   var lastInput = this.myInput;
   if(this.ITerm > this.outMax) this.ITerm = this.outMax;
   else if(this.ITerm < this.outMin) this.ITerm = this.outMin;
};

/*  zeroITerm()****************************************************************
 *  initializes ITerm to prevent rollup. However, makes output oscillatory 
 *  below (or above) setpoint.
 *****************************************************************************/
PID.prototype.zeroITerm = function() {
    this.ITerm = 0;
};

/* SetControllerDirection(...)*************************************************
 * The PID will either be connected to a DIRECT acting process (+Output leads 
 * to +Input) or a REVERSE acting process(+Output leads to -Input.)  we need to
 * know which one, because otherwise we may increase the output when we should
 * be decreasing.  This is called from the constructor.
 ******************************************************************************/
PID.prototype.setControllerDirection = function(Direction) {
   if(this.inAuto && this.Direction !=this.controllerDirection) {
	  this.kp = (0 - this.kp);
      this.ki = (0 - this.ki);
      this.kd = (0 - this.kd);
   }   
   this.controllerDirection = Direction;
};

/* Status Functions*************************************************************
 * Just because you set the Kp=-1 doesn't mean it actually happened.  these
 * functions query the internal state of the PID.  they're here for display 
 * purposes.  this are the functions the PID Front-end uses for example
 ******************************************************************************/
PID.prototype.getKp = function() { 
	return  this.dispKp;
};

PID.prototype.getKd = function() {
	return  this.dispKd;
};

PID.prototype.getKi = function() {
	return  this.dispKi;
};

PID.prototype.getMode = function() {
	return  this.inAuto ? PID.AUTOMATIC : PID.MANUAL;
};

PID.prototype.getDirection = function() {
	return  this.controllerDirection;
};

PID.prototype.getOutput = function() {
	return  this.myOutput;
};

PID.prototype.getInput = function() {
	return  this.input;
};

PID.prototype.getSetPoint = function() {
	return  this.mySetpoint;
};

module.exports = PID;