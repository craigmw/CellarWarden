//templates.js - handles profile template loading and saving for CellarWarden.

var fs = require( 'fs' );
var utils = require( './utils.js' );

var tmpDir = __dirname + '/public/profiles/';

exports.loadTempListing = function( callback ) {
    fs.readdir( tmpDir, function(err, items) {
        if (err) {
            utils.log( 'Unable to read templates directory ' + tmpDir + '\tError: ' + err, 'red', false, false );
            return callback( err, null );
        } else {
            return callback( null, items );
        };
    });
};

exports.loadTemplate = function( fileName, callback ) {
    fs.readFile( tmpDir + fileName, 'utf8', function( err, data ) {
        if( err ) {
            utils.log( 'Unable to read template file ' + fileName + '. ERROR: ' + err, 'red', false, false );
            return callback( err, null );
        } else { 
            return callback( null, data );
        };
    });
};

exports.saveTemplate = function( fileName, tmpProf, callback ) {

    //Need to add logic to prevent overwriting existing files. E.g. Send an error in
    // return saying file exists so that client can decide to overwrite. 
    // As it is now, it just overwrites without throwing an error.
    // Will need to use fs.exists() and if it does, throw a special error to define this.
    fs.writeFile( tmpDir + fileName, JSON.stringify( tmpProf ), function( err ) {
        if ( err ) {
            utils.log( 'Unable to write template ' + fileName + '. ERROR: ' + err, 'red', false, false );
            return callback( err);
        } else {
            utils.log( 'Profile template ' + fileName + ' written successfully.', 'white', false, false );
            return callback( null );
        };
    });
};

exports.deleteTemplate = function( fileName, callback ) {
    fs.unlink( tmpDir + fileName, function( err ) {
        if ( err ) {
            utils.log( 'Unable to delete template ' + fileName + '. ERROR: ' + err, 'red', false, false );
            return callback( err );
        } else {
            utils.log( 'Profile template ' + fileName + ' deleted successfully.', 'white', false, false );
            return callback( null );
        }; 
    });
};