//testplugs.js - tests CellarWarden plugins

var cwPlugs = require( 'cwPlugins' );

var plugs = [];

cwPlugs.loadPlugins( plugs, function(err, plugs ) {
    if( err ) {
    	console.log( 'Error loading plugins: ' + err );
    } else {  
        setTimeout( function() {    

        	//List all plugins
    	    console.log( 'Listing all plugins...');
            for (var i=0; i < plugs.length; i++ ) { 
	            console.log( 'plugin '+ i +': ' + plugs[i].name );
            };

            //List only sensor plugins
            console.log( '\nSensors: ' );
            var sensors = cwPlugs.pluginList( plugs, 'sensor' );
            for (var i=0; i < sensors.length; i++ ) {
            	console.log( sensors[i] );
            };

            //List only actuator plugins
            console.log( '\nActuators: ' );
            var actuators = cwPlugs.pluginList( plugs, 'actuator' );
            for (var i=0; i < actuators.length; i++ ) {
            	console.log( actuators[i] );
            };


        }, 500 );
    };
});

