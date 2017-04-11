//plugins.js - Load plugins for CellarWarden

var vs = require( 'fs');
var path = './node_modules/';

exports.plugin = {
	name: null,
	type: null,
	version: null,
	desc: null
};

//loadPlugins - Load all plugins by traversing node_modules directory and searching for 
//  plugin.inf files for info. If directory does not have plugin.inf, skip. If it does 
//  have a plugin.inf file, load JSON data from that file into plugins array.
//  plus - array of plugins
//  returns - modified array of plugings
module.exports.loadPlugins = function( plugs ) {
	//Generate list of directories in node_modules. 
    fs.readdir( path, function( err, items ) {
	    if ( err ) {
		    console.log( 'Unable to open directory ' + path + ' for reading. Error: ' + err );
	    } else {
		    console.log( items );

		    //Check each directory for plugin.inf. If it exists, load data into plugs array. If not, skip.
		    for (var i = 0; i < items.length; i++ ) {
		    	//Load plugin.inf if it exists.
		    	fs.readFile( path, 'UTF8', function(err, data ) {
		    		if (!err ) {
		    			var plug = JSON.parse( data );
                        if ( plug.name && plug.type && plug.version && plug.desc ) {
                            plugs.push( new plugin );
                            plugs[i] = {
                            	name: plug.name,
                            	type: plug.type,
                            	version: plug.version,
                            	desc: plug.desc
                            }; 
                        };
		    		};
		    	})
		    };
        };
	});
    return plugs;
};

//findPlugins - Get array of all plugins of a specific type.
//  plugs - array of plugins
//  type - type of plugins to list
//  returns - array of plugins of specified type
module.exports.findPlugins = function( plugs, type ) {
	var plugList = [];
	return plugList;
};

