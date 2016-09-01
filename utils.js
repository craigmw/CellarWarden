//utils.js - Utility functions for CellarWarden.


var fs = require( 'fs' );
//var act = require('./actuators.js');
//var display1 = require('./display.js');
//var io = 
var writeLogFile = false;
var fileName = './server.log';

//mergeJsonProto: merges two JSON/node objects into one, preserving structure defined in prototype.
//  protoObject - prototype object, contains desired object structure.
//  updObject - object to update the prototype with. 
//  returns - merged JSON object that follows the structure of the protoObject.
exports.mergeJsonProto = function( protoObject, updObject) {
    return Object.assign( protoObject, updObject );     
};

//readFromJsonFile: reads from JSON file asynchronously. 
//  Returns parsed JSON object or error in callback.
exports.readFromJsonFile = function( fileName, callback ) {
    var obj = [];
    fs.readFile( fileName, 'utf8', function(err, data) {
        if (err) {
            console.log( err );
            return callback( err, null );
        } else {
            obj = JSON.parse( data );
            //console.log( 'obj.length=' + obj.length );
            //console.log( 'obj[0].param1=' + obj[0].param1 );
            return callback( err, obj ); 
        };
    });
};

//writeToJsonFile: Writes JSON object to file.
// Writes JSON object (ctrlObj) to fileName. Returns error or null.
exports.writeToJsonFile = function( ctrlObj, fileName, callback ) {
    fs.writeFile( fileName, JSON.stringify( ctrlObj ), function( err ) {
        if (err) {
            console.log( 'Error writing to controllers file ' + fileName + '. Error: ' + err );
            return callback( err, null );
        } else {
            return callback( null, null );
        };
    });
};

//Time functions.

//Generate Date - time string for display and logging
exports.getDateTime = function() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
};

//millisElapsed(). Milliseconds elapsed from time1 to time2
exports.millisElapsed = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = parseInt(time2 - time1);
    return retVal;
}; 


//secondsElapsed(). Seconds elapsed from time1 to time2
exports.secondsElapsed = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = parseInt((time2 - time1) / 1000);
    return retVal;
}; 

//secondsElapsedFloat(). Seconds elapsed from time1 to time2 with floating point
exports.secondsElapsedFloat = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = (time2 - time1) / 1000;
    return retVal;
};

//minutesElapsed(). Minutes elapsed from time1 to time2
exports.minutesElapsed = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = parseInt((timeN2 - timeN1) / 60000);
    return retVal;
};

//minutesElapsedFloat(). Minutes elapsed from time1 to time2 with floating point
exports.minutesElapsedFloat = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = (timeN2 - timeN1) / 60000;
    return retVal;
};

//hoursElapsed(). Hours elapsed from time1 to time2.
exports.hoursElapsed = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = parseInt((timeN2 - timeN1) / 3600000);
    return retVal;
};

//hoursElapsedFloat(). hours elapsed from time1 to time2 with floating point.
exports.hoursElapsedFloat = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = (timeN2 - timeN1) / 3600000;
    return retVal;
};

//daysElapsed(). Days elapsed from time1 to time2.
exports.daysElapsed = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = parseInt((timeN2 - timeN1) / 86400000);
    return retVal;
};

//daysElapsedFloat(). Days elapsed from time1 to time2 with floating point.
exports.daysElapsedFloat = function( time1, time2 ) {
    var timeN1 = Date.parse( time1 );
    var timeN2 = Date.parse( time2 );
    var retVal = (timeN2 - timeN1) / 86400000;
    return retVal;
};

//log() - make a nicer console.log.
//  text - text to print
//  color - color string
//  timestamp - true or false if we want to add a timestamp
//  emit - emit a socket to send this message to client?
exports.log = function( text, color, timestamp, emit ) {
    var now1 = new Date();
    var sendText = ( timestamp ) ? now1 + ': ' + text : text;
    var sendHtml = sendText;
    var sendPlain = sendText;
    switch ( color ) {
        case "yellow":
            sendText = '\x1b[33m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: yellow">' + sendHtml + '</span>';
            break;  
        case "green":
            sendText = '\x1b[32m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: green">' + sendHtml + '</span>';
            break;  
        case "red":
            sendText = '\x1b[31m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: red">' + sendHtml + '</span>';
            break;  
        case "blue":
            sendText = '\x1b[34m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: blue">' + sendHtml + '</span>';
            break;  
        case "magenta":
            sendText = '\x1b[35m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: magenta">' + sendHtml + '</span>';
            break;  
        case "cyan":
            sendText = '\x1b[36m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: cyan">' + sendHtml + '</span>';
            break;  
        case "white":
            sendText = '\x1b[37m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: white">' + sendHtml + '</span>';
            break;  
        case "black":
            sendText = '\x1b[37m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: black">' + sendHtml + '</span>';
            break;  
        case "inverted":
            sendText = '\x1b[7m' + sendText + '\x1b[37m';
            sendHtml = sendHtml;
            break;  
        case "blink":
            sendText = '\x1b[5m' + sendText + '\x1b[37m';
            sendHtml = sendHtml;
            break;  
        case "default":
            sendText = '\x1b[37m' + sendText + '\x1b[37m';
            sendHtml = '<span style="color: white">' + sendHtml + '</span>';
    };
    //console.log( sendText );
    console.log( sendPlain );
    sendHtml = sendHtml + '<br>';  

    if ( writeLogFile == true ) {
        fs.appendFile( fileName, sendHtml, encoding='utf8', function (err) {
            if (err) { 
                this.log( 'Unable to write to ' + fileName + '. ERROR: ' + err, 'red', true, false );
                console.log( 'Unable to write to ' + fileName + '. ERROR: ' + err );
                console.error( 'Unable to write to ' + fileName + '. ERROR: ' + err );
            };  
        });
    };

    /*
    //Add logic here to send socket to client(s).
    if ( emit ) {
        //Package data into object to send via websockets
        var logMsg = { 
            text: text,
            color: color,
            timestamp: timestamp
        };

        //Emit logMsg via websockets
        socket.emit( 'logMessage', logMsg );
    };
    */        
}; 

//fileExists() - checks for existence of file.
//  filename - name of file (including path)
//  returns - true (file exists) or false (file does not exist)
exports.fileExists = function( filename ) {
    var retVal = false;
    try {
        fs.accessSync( filename, fs.F_OK );
        retVal = true;
    } catch (e) {
        retVal = false;
    };
    return retVal;
};

//deleteFile() - deletes files
exports.deleteFile = function( fileName, callback ) {
    console.log( 'Deleting file ' + fileName + '...');
    fs.unlink( fileName, function( err ) {
        if ( err ) {
            console.log( 'Unable to delete file ' + fileName + '. ERROR: ' + err );
            return callback( err );
        } else {
            console.log( 'File ' + fileName + ' deleted successfully.' );
            return callback( null );
        }; 
    });
};

//minMax() - returns a number within a range between min and max
//  value - number
//  min - minimum value to return
//  max - maximum value to return
//  returns - number within range
exports.minMax = function( value, min, max ) {
    var retVal = value;
    if ( value > max ) retVal = max; 
    if ( value < min ) retVal = min;
    return retVal;
};

