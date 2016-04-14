//resetSegments.js - resets all segments in all ctrl objects found in controllers.json

ctrl = require('./controller.js');
tprof = require('./tprofiles.js');
util = require('./utils.js');

var fileName = './public/controllers.json';

var ctrls = [];
ctrls = ctrl.addCtrl( ctrls, new ctrl.init() );

//Load controllers.json and reset all controllers.
util.readFromJsonFile( fileName, function( error, object) {
    if( !error ) {
        ctrls = JSON.parse( JSON.stringify( object ) );
        
        //Cycle through each ctrl element.
        for (var i=0; i < ctrls.length; i++ ) {
            console.log('Times before reset: ');
            displayTimes( ctrls, i );
            console.log('\nTimes after reset: ');
            tprof.resetCtrl( ctrls, i );
        };
        
        //Now write updated file.
        util.writeToJsonFile( ctrls, fileName, function( error2 ) {
            if( !error2 ) {
                console.log( 'Reset all controllers in file ' + fileName + '.' );
            }; 
        });
    
    } else {
        console.log( 'Error reading file. ERROR: ' + error );
    };  
});

function displayTimes( ctrls1, ind1 ) {
    var timeStart = 0;
    var timeChecked = 0;
    for (var n = 0; n < ctrls1[ind1].tprof.length; n++ ) {
        timeStart = ctrls1[ind1].tprof[n].timeStart;
        timeChecked = ctrls1[ind1].tprof[n].timeChecked;
        console.log( '\ttimeStart: ' + timeStart + '\ttimeChecked: ' + timeChecked );
    };
};
