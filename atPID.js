//pid-autotune.js - PID autotune function from the Arduino Autotune Library.
//  Node.js implementation of the Arduino Autotune library developed by
//  Brett Beauregard <br3ttb@gmail.com> brettbeauregard.com
//  (http://playground.arduino.cc/Code/PIDAutotuneLibrary).
//  Ported from the PID autotune library from William Spinelli 
//  (http://www.mathworks.com/matlabcentral/fileexchange/4652-autotunerpid-toolkit).
//  Autotune performance values for Ziegler-Nichols closed loop method
//  adapted from National Instruments (http://zone.ni.com/reference/en-XX/help/370401J-01/lvpidmain/ziegnichforms/)
//  Ported by Craig M. Walsh (https://github.com/craigmw).

//Local variables.
var isMax; 
var isMin;
var setpoint;
var peak1; 
var peak2;
var sampleTime;
var nLookBack;
var peakType;
var lastInputs = new Array(101);
var peaks = new Array(10);
var peakCount = 0;
var maxPeaks = 5;
var justchanged;
var justevaled;
var absMax;
var absMin;
var outputStart;
var Ku;
var Pu;

//Constructor for autotune function.
var PID_ATune = function( Input, Output) { 
    input = Input; 
    output = Output; 
    controlType = 0 ; //default to PI 
    noiseBand = 0.5; 
    running = false; 
    oStep = 30; 
    this.SetLookbackSec( 10 ); 
    lastTime = this.millis(); 
};

//Constants
PID_ATune.FAST = 0;
PID_ATune.NORMAL = 1;
PID_ATune.SLOW = 2; 

PID_ATune.prototype.millis = function() {
	var d = new Date();
	return d.getTime();
}

PID_ATune.prototype.Cancel = function() { 
    this.running = false; 
};  

PID_ATune.prototype.updateATune = function( input1, output1 ) {
    this.input = input1;
    this.output = output1;
};

PID_ATune.prototype.getOutput = function() {
	return this.output;
};

PID_ATune.prototype.Runtime = function() {

	justevaled = false;
	if( peakCount > maxPeaks && this.running ) {
	    this.running = false;
        this.FinishUp();
        return 1;
    };

    var now = this.millis();
	
    if( ( now - this.lastTime ) < sampleTime ) return false;
    this.lastTime = now;
    var refVal = this.input;
    justevaled = true;
    if( !this.running ) { //initialize working variables the first time around
        peakType = 0;
        peakCount = 0;
        justchanged = false;
        absMax = refVal;
        absMin = refVal;
        setpoint = refVal;
        this.running = true;
        outputStart = this.output;
        this.output = outputStart + this.oStep;
    } else {
        if( refVal > absMax ) absMax = refVal;
        if( refVal < absMin ) absMin = refVal;
	};
	
    //oscillate the output based on the input's relation to the setpoint
    if( refVal > setpoint + this.noiseBand ) {
        this.output = outputStart - this.oStep;
	} else if ( refVal < setpoint - this.noiseBand ) {
		this.output = outputStart + this.oStep;
	};
	
    //bool isMax=true, isMin=true;
    isMax = true;
    isMin = true;

    //id peaks
    for( var i = nLookBack - 1; i >= 0; i-- ) {
        var val = lastInputs[i];
        if( isMax ) isMax = refVal > val;
        if( isMin ) isMin = refVal < val;
        lastInputs[ i + 1 ] = lastInputs[i];
    };
    lastInputs[0] = refVal;  

    if( nLookBack < 9 ) {  //we don't want to trust the maxes or mins until the inputs array has been filled
	    return 0;
	};
  
    if( isMax ) {
        if( peakType == 0 ) peakType = 1;
        if( peakType == -1 ) {
            peakType = 1;
            justchanged = true;
            peak2 = peak1;
        };
        peak1 = now;
        peaks[peakCount] = refVal;
   
    } else if( isMin ) {
        if( peakType == 0 ) peakType = -1;
        if( peakType == 1 ) {
            peakType = -1;
            peakCount++;
            justchanged = true;
        };
    
        if( peakCount < 10 ) peaks[peakCount] = refVal;
    };
  
    if( justchanged && peakCount > 2 ) { //we've transitioned.  check if we can autotune based on the last peaks
        var avgSeparation = ( Math.abs( peaks[peakCount - 1] - peaks[peakCount - 2] ) + Math.abs( peaks[peakCount - 2] - peaks[peakCount - 3] ) ) / 2;
        if( avgSeparation < 0.05 * ( absMax - absMin ) ) {
            this.FinishUp();
            this.running = false;
            return 1;
        };
    };
    justchanged = false;
	return 0;
};

PID_ATune.prototype.FinishUp = function() {
	  this.output = outputStart;

      //we can generate tuning parameters!
      Ku = 4 * ( 2 * oStep ) / ( ( absMax - absMin ) * 3.14159 );
      Pu = ( peak1 - peak2 ) / 1000;
};

PID_ATune.prototype.GetKp = function( performance ) {
	var retVal = 0;
	switch ( performance ) {
		case this.FAST:
		    retVal = ( this.controlType == 1 ) ? 0.6 * Ku : 0.4 * Ku;
		    break;
		case this.NORMAL:
      	    retVal = ( this.controlType == 1 ) ? 0.25 * Ku : 0.18 * Ku;
		    break;
		case this.SLOW:
		    retVal = ( this.controlType == 1 ) ? 0.15 * Ku : 0.13 * Ku;
		    break;
		default:
		    retVal = ( this.controlType == 1 ) ? 0.6 * Ku : 0.4 * Ku;
	};
	return retVal;
};

PID_ATune.prototype.GetKi = function( performance ) {
	var retVal = 0;
	switch ( performance ) {
		case this.FAST:
		    retVal = ( this.controlType == 1 ) ? 1.2 * Ku / Pu : 0.48 * Ku / Pu; // Ki = Kc/Ti: Ti = 0.5*Pu
		    break;                                                               // Ti = Pu/2  
		case this.NORMAL:
		    retVal = ( this.controlType == 1 ) ? 1.2 * Ku / Pu : 0.48 * Ku / Pu; // Ki = Kc/Ti: Ti = 0.5*Pu
		    break;                                                               // Ti = Pu/2  
		case this.SLOW:
		    retVal = ( this.controlType == 1 ) ? 1.2 * Ku / Pu : 0.48 * Ku / Pu; // Ki = Kc/Ti: Ti = 0.5*Pu
		    break;                                                               // Ti = Pu/2  
		default:
		    retVal = ( this.controlType == 1 ) ? 1.2 * Ku / Pu : 0.48 * Ku / Pu; // Ki = Kc/Ti: Ti = 0.5*Pu
	};
    return retVal; 
};

PID_ATune.prototype.GetKd = function( performance ) {
	var retVal = 0;
	switch ( performance ) {
		case this.FAST:
		    retVal = ( this.controlType == 1 ) ? 0.075 * Ku * Pu : 0;  //Kd = Kc * Td, Kd = (0.6 * Ku)*(Pu/8) = 0.075 * Ku * Pu
		    break;                                                     // Td = Pu/8, Kc = 0.6 * Ku  
		case this.NORMAL:
		    retVal = ( this.controlType == 1 ) ? 0.075 * Ku * Pu : 0;  //Kd = Kc * Td
		    break;                                                     // Td = Pu/8  
		case this.SLOW:
		    retVal = ( this.controlType == 1 ) ? 0.075 * Ku * Pu : 0;  //Kd = Kc * Td
		    break;                                                     // Td = Pu/8  
		default:
		    retVal = ( this.controlType == 1 ) ? 0.075 * Ku * Pu : 0;  //Kd = Kc * Td
	};
    return retVal;
};

PID_ATune.prototype.SetOutputStep = function( Step ) {
    this.oStep = Step;
};

PID_ATune.prototype.GetOutputStep = function() {
    return this.oStep;
};

PID_ATune.prototype.SetControlType = function( Type ) { //0=PI, 1=PID
    this.controlType = Type;
};

PID_ATune.prototype.GetControlType = function() {
    return this.controlType;
};
	
PID_ATune.prototype.SetNoiseBand = function( Band ) {
    this.noiseBand = Band;
};

PID_ATune.prototype.GetNoiseBand = function() {
    return this.noiseBand;
};

PID_ATune.prototype.SetLookbackSec = function( value ) {
    if ( value < 1 ) value = 1;
	
    if( value < 25 ) {
        nLookBack = value * 4;
        sampleTime = 250;
    } else {
        nLookBack = 100;
        sampleTime = value * 10;
    };
};

PID_ATune.prototype.GetLookbackSec = function() {
    return nLookBack * sampleTime / 1000;
};

module.exports = PID_ATune;