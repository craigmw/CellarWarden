//RestoreCtrls.js - Restores controllers.json from controllers.json.save

controller = require( './controller.js');
utils = require( './utils' );
var ctrls = [];
ctrls = controller.addCtrl( ctrls, new controller.init() );
console.log( 'Before read - Number of Controllers: ' + ctrls.length );

//Read controllers.json.save
utils.readFromJsonFile( './public/controllers.json.save', function(err, data) {
    if (err) {
        console.log('Error reading controllers file '+ fileName );
        ctrls = null;
    } else {
        ctrls = JSON.parse( JSON.stringify (data ) );
        console.log( 'After read - Number of Controllers: ' + ctrls.length );

        //Now write to controllers.json
        controller.writeCtrlsFile( ctrls, './public/controllers.json' );
    };
});





