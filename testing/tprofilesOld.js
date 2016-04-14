// tprofiles.js - Temperature profile handling for CellarWarden.

var Ctrls = require('./controller.js');
var utils = require('./utils.js');

var tProf = function() {}; //Needed for controller state constants.

var loopFirstTime = true;  //Set this flag to 

//tProf.init - creates a new temp profile segment object.
tProf.prototype.init = function() {
    this.timeStart = 0;   //Stores date/time when this segment started.
    this.timeChecked = 0; //Date/time when segment was last checked.
    this.duration = 0;    //Duration of segment in minutes.
    this.startSP = 0;     //Starting setpoint of this segment.
    this.endSP = 0;       //Ending setpoint of this segment.
    this.ramp = false;    //Ramp or no ramp (true or false)?
    this.hold = false;    //Is this segment a hold (e.g. maintain setpoint infinitely); use as last segment.
                          //  If no hold at last segment, then turn controller off.
};


//tProf.addSegm - adds a new segment to a controller.
//  ctrls - array of controllers
//  index - index of controller
//  newSegm - new profile segment
//  returns array of controllers
tProf.prototype.addSegm = function( ctrls, index, newSegm ) {
    ctrls[index].tprof.push( newSegm );
    return ctrls;
}; 

//tProf.updSegm - updates a segment with passed values.
//  tprof - temperature profile object
//  tpi - index of tprof segment
//  duration - duration of segment in minutes
//  startSP - starting setpoint.
//  endSP - ending setpoint.
//  ramp - is this a ramp (true or false)?
//  hold - is this a hold (true or false)?
//  returns tprof.  
tProf.prototype.updSegm = function( tprof1, tpi, duration, startSP, endSP, ramp, hold ) {
    tprof1[tpi].duration = duration;
    tprof1[tpi].startSP = startSP;
    tprof1[tpi].endSP = endSP;
    tprof1[tpi].ramp = ramp;
    tprof1[tpi].hold = hold;
    return tprof1; 
};

//tProf.delSegm - delete segment from a controller.
//  ctrls - array of controllers
//  index - index of controller
//  segIndex - index of segment to delete.
tProf.prototype.delSegm = function( ctrls, index, segIndex ) {
    ctrls[index].tprof.splice( segIndex, 1 );
};

//tProf.process - process current profile for this cycle.
//  ctrls - array of controllers
//  i - index of current controller
//  returns ctrls object with updated parameters (including currSetpoint
tProf.prototype.process = function( ctrls, i ) {
    //Get current time.
    var now = Date();
    var elapsed = 0;

    //By default, return setpoint is endSetpoint.
    ctrls[i].currSetpoint = ctrls[i].endSetpoint;
    
    //Determine current segment index.
    var sI = ctrls[i].tprofCurrSegm;
    console.log( 'ctrls[' + i + '].tprofCurrSegm = ' + ctrls[i].tprofCurrSegm );

    //If first time through loop, set timeStart and timeChecked to now and exit.
    //  Allows for resuming segment on startup (particularly for power failure).
    if ( loopFirstTime ) {
        ctrls[i].tprof[sI].timeStart = now;
        ctrls[i].tprof[sI].timeChecked = now;
        ctrls[i].currSetpoing = ctrls[i].tprof[sI].startSP;
        loopFirstTime = false;
        return ctrls;
    };

    //If paused flag set, set timeChecked and exit loop.
    //  Interrupts processing of segment until paused flag set to false.
    //  Also, allows for resume without counting pause time against duration.
    //  Does not alter currSetpoint.
    //console.log( 'Checking pause...' );
    if ( ctrls[i].currState == Ctrls.st_PAUSE ) {
        ctrls[i].tprof[sI].timeChecked = now;
        return ctrls;
    };

    //Determine if there is a hold. If so, return. Maintains endSetpoint indefinitely.
    //console.log( 'Checking hold...');
    if (ctrls[i].tprof[sI].hold == true ) {
        //console.log( 'Profile holding indefinitely...');
        //console.log( 'ctrls['+i+'].tprof['+sI+'].hold=' + ctrls[i].tprof[sI].hold );
        ctrls[i].currSetpoint = ctrls[i].tprof[sI].endSP;
        ctrls[i].endSetpoint = ctrls[i].tprof[sI].endSP;
        return ctrls;
    };

    //Determine if there has been a power failure (using timeLastChecked vs. now).
        
    //Update tprofSegmElapsed: minutesElapsed from last time checked to now;
    //  This won't work because elapsed is an integer of minutes. 
    elapsed = utils.minutesElapsed( ctrls[i].tprof[sI].timeStart, now );
    ctrls[i].tprofSegmElapsed = elapsed;
    console.log( 'Elapsed: ' + elapsed );
    //console.log( 'Time started: ' + ctrls[i].tprof[sI].timeStart + '\tNow: ' + now );

    //Determine temp. If ramp, do linear interpolation, otherwise just give endSetpoint.
    if ( ctrls[i].tprof[sI].endSP == ctrls[i].tprof[sI].startSP ) {
        ctrls[i].currSetpoint = ctrls[i].tprof[sI].endSP;
    } else {
        ctrls[i].tprof[sI].ramp = true;
        ctrls[i].currSetpoint = this.calcRamp( ctrls[i].tprof[sI], elapsed );
    };
    
    //Determine if we need to move to next segment. 
    if ( elapsed >= ctrls[i].tprof[sI].duration ) {
        //Is current segment the last in array? If so, turn off controller and exit.
        if ( ( sI + 1 ) >= ctrls[i].tprof.length ) {
            //This is last index, so just exit with endSetpoint and turn off controller.
            ctrls[i].tprof[sI].timeChecked = now;
            ctrls[i].currState = Ctrls.st_OFF;
            ctrls[i].currSetpoint = ctrls[i].tprof[sI].endSP;
            ctrls[i].endSetpoint = ctrls[i].tprof[sI].endSP;
            //return ctrls;
        } else {
            //Update next segment timeChecked to now.
            ctrls[i].tprof[sI + 1].timeChecked = now;
            ctrls[i].tprof[sI + 1].timeStart = now;
            
            //Increment segment index;
            ctrls[i].tprofCurrSegm = ctrls[i].tprofCurrSegm + 1;
        };
    };

    //Update timeChecked to now.
    //ctrls[i].tprof[sI].timeChecked = now;

    return ctrls;
};

//tProf.calcRamp - determines Setpoint from time remaining in ramp.
//  segM - temperature profile segment object
//  elapsed - time elapsed in profile.
tProf.prototype.calcRamp = function( segM, elapsed ) {
    //Just return endSP for now. Need to figure this out.
    retSP = segM.endSP;

    //Simple line function. y = mx + b. Slope is rise (endSP - startSP) over run (duration). X = elapsed time.
    retSP = ( elapsed * ( segM.endSP - segM.startSP ) / segM.duration ) + segM.startSP;

    //Ensure that retSP is not outside of range of startSP and endSP.
    /* if ( segM.endSP > segM.startSP ) {
        //endSP is higher than startSP.
        if ( retSP > segM.endSP ) {
            retSP = segM.endSP;
        };
        if ( retSP < segM.startSP ) {
            retSP = segM.startSP;
        };
    } else {
        //startSP is higher than endSP.
        if (retSP > segM.startSP ) {
            retSP = segM.startSP;
        };
        if ( retSP < segM.endSP ) {
            retSP = segM.endSP;
        };
    }; */
    return retSP;
}; 


module.exports = new tProf();