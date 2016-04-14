// tprofiles.js - Temperature profile handling for CellarWarden.

var VERBOSE = false;

var Ctrls = require('./controller.js');
var utils = require('./utils.js');

var tProf = function() {}; //Needed for controller state constants.

var loopFirstTime = true;  //Set this flag to true to force restart.

//Time increment to process.
var t_SEC =  1;
var t_MIN =  2;
var t_HOUR = 3;
var t_DAY =  4;


//tProf.init - creates a new temp profile segment object.
tProf.prototype.init = function() {
    this.cfg = {          //  *** config variables, can be changed by user ***
        id : 0,           //Unique id for this segment.
        duration : 0,     //Duration of segment in minutes.
        startSP : 0,      //Starting setpoint of this segment.
        endSP : 0,        //Ending setpoint of this segment.
        ramp : false,     //Ramp or no ramp (true or false)?
        hold : false,     //Is this segment a hold (e.g. maintain setpoint infinitely); use as last segment.
    },                    //  *** state variables ***
    this.timeStart = 0;   //Stores date/time when this segment started.
    this.timeChecked = 0; //Date/time when segment was last checked.
};


//tProf.addSegm - adds a new segment to a controller.
//  ctrls - array of controllers
//  index - index of controller
//  returns array of controllers
tProf.prototype.addSegm = function( ctrls, index ) {
    var newSegm = new this.init();
    ctrls[index].tprof.push( newSegm );

    //Now, modify this segment's ID.
    var newIndex = ctrls[index].tprof.length - 1;
    ctrls[index].tprof[newIndex].cfg.id = newIndex; 
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
    tprof1[tpi].cfg.duration = duration;
    tprof1[tpi].cfg.startSP = startSP;
    tprof1[tpi].cfg.endSP = endSP;
    tprof1[tpi].cfg.ramp = ramp;
    tprof1[tpi].cfg.hold = hold;
    return tprof1; 
};

//tProf.delSegm - delete segment from a controller.
//  ctrls - array of controllers
//  index - index of controller
//  segIndex - index of segment to delete.
tProf.prototype.delSegm = function( ctrls, index, segIndex ) {
    ctrls[index].tprof.splice( segIndex, 1 );
};

//tProf.resetProfile() - resets all segments and sets Ctrl.tprofCurrSegm to 0.
//  ctrls3 - ctrls array.
//  ind3 - index of ctrl object to reset
//  returns updated ctrls array
tProf.prototype.resetProfile = function( ctrls3, ind3 ) {
    for( var n = 0; n < ctrls3[ind3].tprof.length; n++ ) {
        ctrls3[ind3].tprof[n].timeStart = 0;
        ctrls3[ind3].tprof[n].timeChecked = 0;  
    };
    ctrls3[ind3].tprofCurrSegm = 0;
    utils.log( 'Profile ' + ctrls3[ind3].cfg.profileName + ' on controller ' + ind3 + ' (' + ctrls3[ind3].cfg.name +') is shut down.', 'yellow', true, false ); 
    return ctrls3;
}; 

//tProf.initProf() - Resets or initializes a controller's profile on startup/program resumption.
//  ctrls - array of controllers
//  i - index of current controller
tProf.prototype.initProf = function( ctrls, i ) {
    //If profile is active, resume, otherwise reset the profile.
    if (ctrls[i].cfg.tprofActive == true ) {
        var sI = ctrls[i].tprofCurrSegm;
        utils.log( 'Controller ' + i +  ' (' + ctrls[i].cfg.name + ') is resuming profile segment ' + ctrls[i].tprofCurrSegm + '...', 'yellow', true, true );
        utils.log( 'Resumed Segment: ' + sI + '\tSegment Started: ' + ctrls[i].tprof[sI].timeStart + '\tElapsed: ' + ctrls[i].tprofSegmElapsed );
        //Do we need to do anything to resume controller at its current segment?
    } else {
        this.resetProfile( ctrls, i );
    };
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
    ctrls[i].currSetpoint = ctrls[i].cfg.endSetpoint;
    
    //Determine current segment index.
    var sI = ctrls[i].tprofCurrSegm;
    if ( VERBOSE ) {utils.log( 'ctrls[' + i + '].tprofCurrSegm = ' + ctrls[i].tprofCurrSegm, 'yellow', false ) };
    //utils.log( 'Controller: ' + i + '\tSegment: ' + sI + '\t.tprof[sI].timeStart: ' + ctrls[i].tprof[sI].timeStart, 'yellow', false, false );
    
    //Check to make sure we are using a profile on this controller. If not, then skip processing.
    if ( ctrls[i].cfg.useProfile == false ) {
        ctrls[i].tprofActive = false;
        return ctrls;
    };

    //Make sure that first segment has duration greater than zero, otherwise skip processing.
    if ( ctrls[i].tprof[0].cfg.duration === 0 ) {
        ctrls[i].tprofActive = false;
        utils.log( 'Profile ' + ctrls[i].cfg.profileName + ' on controller ' + i + ' (' + 
            ctrls[i].cfg.name + ') has zero duration on the first segment. Shutting profile down.' );
        return ctrls;
    };

    //Check to see if this profile is active. If not, shut down controller (if not done already) and skip processing.
    if ( ( ctrls[i].cfg.tprofActive == false ) ) {
        if (VERBOSE) {utils.log('ctrls[' + i + '].cfg.tprofActive is false. ctrls[' + i + 
            '].tprof[' + sI + '].timeStart = ' + ctrls[i].tprof[sI].timeStart, 'yellow', true, false ) }; 
            
        //Check to see if timeStart === 0 for first segment. If not, reset profile and shut down.
        if ( ctrls[i].tprof[0].timeStart === 0 ) {
            //return ctrls;
        } else {
            if ( ctrls[i].cfg.useProfile == true ) {
                ctrls = this.resetProfile( ctrls, i );
                //utils.log( '.tprof[0].timeStart: ' + ctrls[i].tprof[0].timeStart + 
                //    '\t.tprof[0].timeChecked: ' + ctrls[i].tprof[0].timeChecked, 'red', false );
            };
        };
        return ctrls;
    };

    //Check to see if timeStart = 0 for first segment. If so, this profile has just been started 
    //  so set timeStart and timeChecked to now and indicate that profile is starting up.
    if (sI === 0 ) {
        //utils.log( 'tprof[' + i + '].tprof[0].timeStart: ' + ctrls[i].tprof[0].timeStart, 'red', false, false );
        if( ctrls[i].tprof[0].timeStart === 0 ) {
            if (ctrls[i].cfg.useProfile == true ) {
                ctrls[i].tprof[sI].timeStart = now;
                ctrls[i].tprof[sI].timeChecked = now;
                utils.log( 'Profile ' + ctrls[i].cfg.profileName + ' on controller ' + i + ' (' + 
                    ctrls[i].cfg.name + ') is starting up on segment ' + sI + '...', 'yellow', true, false );
            };
        };
    };

    //If paused flag set, set timeChecked and exit loop.
    //  Interrupts processing of segment until paused flag set to false.
    //  Also, allows for resume without counting pause time against duration.
    //  Does not alter currSetpoint.
    if ( ctrls[i].currState == Ctrls.st_PAUSE ) {
        if (VERBOSE ) { utils.log( 'Controller ' + i + ' (' + ctrls[i].cfg.name + ') is paused...', 'yellow', true, false ) };
        ctrls[i].tprof[sI].timeChecked = now;
        return ctrls;
    };

    //Determine if there is a hold. If so, return. Maintains endSetpoint indefinitely.
    //utils.log( 'Checking hold...');
    if (ctrls[i].tprof[sI].cfg.hold == true ) {
        if (VERBOSE) { utils.log( 'Profile ' + i + ' (' + ctrls[i].cfg.name + ') holding indefinitely...', 'yellow', true, false ) };
        ctrls[i].currSetpoint = ctrls[i].tprof[sI].cfg.endSP;
        return ctrls;
    };

    //Update tprofSegmElapsed: timeElapsed from last time checked to now;
    //  Use a float for elapsed so that we get better precision.
    var timeBase = 'blank';
    if (VERBOSE) { utils.log( 'ctrls[' + i + '].cfg.tprofTimeInc = ' + ctrls[i].cfg.tprofTimeInc, 'yellow', true, false ) };
    switch ( parseInt( ctrls[i].cfg.tprofTimeInc ) ) {
        case t_MIN:
            elapsed = utils.minutesElapsedFloat( ctrls[i].tprof[sI].timeStart, now );
            timeBase = 'minutes';
            break;
        case t_HOUR:
            elapsed = utils.hoursElapsedFloat( ctrls[i].tprof[sI].timeStart, now );
            timeBase = 'hours';
            break;
        case t_DAY:
            elapsed = utils.daysElapsedFloat( ctrls[i].tprof[sI].timeStart, now );
            timeBase = 'days';
            break;
        default:
            elapsed = utils.minutesElapsedFloat( ctrls[i].tprof[sI].timeStart, now );
            timeBase = 'minutes (default)';
    }; 
    ctrls[i].tprofSegmElapsed = elapsed;
    if (VERBOSE) { utils.log( 'Elapsed: ' + elapsed + ' ' + timeBase, 'yellow', true, false ) };

    //Determine temp. If ramp, do linear interpolation, otherwise just give endSetpoint.
    if ( ctrls[i].tprof[sI].cfg.endSP == ctrls[i].tprof[sI].cfg.startSP ) {
        ctrls[i].tprof[sI].cfg.ramp = false;
        ctrls[i].currSetpoint = ctrls[i].tprof[sI].cfg.endSP;
    } else {
        ctrls[i].tprof[sI].cfg.ramp = true;
        ctrls[i].currSetpoint = this.calcRamp( ctrls[i].tprof[sI], elapsed );
    };
    
    //Determine if we need to move to next segment. 
    if ( elapsed >= ctrls[i].tprof[sI].cfg.duration ) {
        //Is current segment the last in array? If so, turn off controller and exit.
        if ( ( sI + 1) >= ctrls[i].tprof.length ) {
            //This is last index, so just exit with endSetpoint and turn off controller.
            ctrls[i].tprof[sI].timeChecked = now;
            //ctrls[i].currState = Ctrls.st_OFF;
            ctrls[i].isActive = false;
            ctrls[i].currSetpoint = ctrls[i].tprof[sI].cfg.endSP;
            utils.log( 'Controller ' + i +  ' (' + ctrls[i].cfg.name + ') completed last profile segment ' 
                + (sI) + ' without hold. Controller shut down.', 'yellow', true, false );
        } else {
            //Update next segment timeChecked to now.
            ctrls[i].tprof[sI + 1].timeChecked = now;
            ctrls[i].tprof[sI + 1].timeStart = now;
            
            //Increment segment index;
            utils.log( 'Controller ' + i +  ' (' + ctrls[i].cfg.name + ') is starting profile segment ' + (sI+1) + '...', 'yellow', true, false );
            ctrls[i].tprofCurrSegm = ctrls[i].tprofCurrSegm + 1;
        };
    };
    return ctrls;
};

//tProf.calcRamp - determines Setpoint from time remaining in ramp.
//  segM - temperature profile segment object
//  elapsed - time elapsed in profile.
tProf.prototype.calcRamp = function( segM, elapsed ) {
    //Just return endSP for now. Need to figure this out.
    retSP = segM.cfg.endSP;

    //Simple line function. y = mx + b. Slope is rise (endSP - startSP) over run (duration). X = elapsed time.
    retSP = ( elapsed * ( segM.cfg.endSP - segM.cfg.startSP ) / segM.cfg.duration ) + segM.cfg.startSP;

    return retSP;
}; 


module.exports = new tProf();