//compressLog.js: Compress logfile.csv to reduce file size. Compresses older data, but does not remove 
//  records that are associated with alarms. 
//  Parameters: 
//      logfile (logfile.csv)
//      alarm log file (alarmLogFile.csv), 
//      output logfile (newLogFile.csv),
//      preserve (in days... records to keep for certain number of days before today's date)
//      granularity (in minutes, discard older records between this number of minutes)

var csv = require("fast-csv");
var fs = require('fs');
var utils = require('./utils.js');

var args = [];

process.argv.forEach(function (val, index, array) {
  //utils.log(index + ': ' + val);
  args[ index ] = val;
});

var logFile =       ( args[2] ) ? args[2] : './public/logfile.csv';
var alarmsLogFile = ( args[3] ) ? args[3] : './public/alarmsLog.csv';
var outLogFile =    ( args[4] ) ? args[4] : './public/logfileOut.csv';
var preserveDays =  ( args[5] ) ? parseInt( args[5] ) : 7; //Preserve records until older than this in days
var gran =          ( args[6] ) ? parseInt( args[6] ) : 60; //Keep one record per gran minutes, if 0, truncate

var verbose = false;
var count = 0;          //Total records parsed
var keepCount = 0;      //Total records kept
record ="";
var field = []; 
var timeStamp = 0;
var timeNow = new Date();
var msDays = 1000 * 60 * 60 * 24;   //Number of milliseconds in a day.
var msMinutes = 1000 * 60;          //Number of milliseconds in a minute. 


var alarmRecords = 0;
var alarmRecord = [""];
var lastKept = 0;

//Load alarms logfile to make sure that these records not deleted.
// If alarms logfile does not exist, ignore.
utils.log('Reading alarms logfile: ' + alarmsLogFile );
if ( utils.fileExists( alarmsLogFile ) ) {
    csv
        .fromPath( alarmsLogFile )
        .on("data", function(data) {
            record = data.toString();
            field = record.split(',');
            timeStamp = Date.parse( field[0] );
            alarmRecord[ alarmRecords ] = field[0];
            //process.stdout.write( alarmRecords + ": " + timeStamp + "-" + record + '\r');
            alarmRecords++;
        })
        .on("end", function(){
            utils.log("\n Done");
            //Display alarm logfile records.
            /* if( verbose ) {
                utils.log( 'Displaying loaded alarm records...');
                for (var i = 0; i < alarmRecords; i++) {
                    utils.log( 'alarmRecord[' + i + ']: ' + alarmRecord[i] );
                };
            }; */
            parseLogFile(); 
    });
} else {
    utils.log('Alarm file does not exist. Skipping...');  
};

//parseLogFile: Parse logfile to copy valid records to temporary logfile
function parseLogFile() {
    utils.log( 'Parsing logfile ' + logFile + ' records...' );
    csv
        .fromPath( logFile, {headers: false} )
        .validate( function(data) {
            record = data.toString();
            field = record.split(',');
            count++;
            return keepRecord( field[0], record, timeNow );
        })
        .on("data", function(data){
            record = data.toString();
            //field = record.split(',');
            //timeStamp = Date.parse( field[0] );
            if (verbose) {
                process.stdout.write( count + '-' + keepCount + " - " + record + '\r');
            };
            keepCount++;
        })
        .on("end", function(){
            fs.appendFile( outLogFile, '\n', function( err1 ) {
                if (err1 ) {
                    utils.log( 'Could not complete writing of ' + outLogFile + '. Error: ' + err1 );
                } else {
                    utils.log("\n Done");
                    utils.log( 'Total records parsed: ' + count );
                    utils.log( 'Total records kept:   ' + keepCount );  
                };
            });    
        }) 
        .pipe(csv.createWriteStream({headers: false}))
        .pipe(fs.createWriteStream( outLogFile, {encoding: "utf8"})) 
};

//keepRecord: keeps records that are not to be excluded.
function keepRecord( tsRec, record, timeNow1 ){
    var keepRet = false;
    if ( daysElapsed( tsRec, timeNow ) < preserveDays ) {
        //Record is new, so keep
        keepRet = true;
    } else {
        //Record is old, so parse it.
        if ( isAlarmSet( tsRec ) ) {
            keepRet = true;    //Record has an associated alarm, so keep it.
            if (verbose ) {
                utils.log( tsRec + ': Alarm found, so record kept.                        ');    
            };
        } else {               //Alarm not set, so only keep one record per time window based on granularity setting
            if (gran == 0 ) {
                keepRet = false;       //If granularity setting = 0, delete record (truncate)
            } else {
                if ( minutesElapsed( lastKept, tsRec ) > gran ) {
                    keepRet = true;
                    lastKept = tsRec;
                } else {
                    //Do averaging here if averaging is on.
                    keepRet = false;
                };
            };  
        };
    };
    return keepRet;
};

//daysElapsed: determines days elapsed from between timeStampOld and timeStampNew
function daysElapsed( tsOld, tsNew ) {
    var elapsed = 0;
    var old1 = Date.parse( tsOld );
    var new1 = Date.parse( tsNew );
    elapsed = (new1 - old1) / msDays;
    /* if (verbose) {    
        process.stdout.write( count + ' - New: ' + new1 + ' Old: ' + old1 + ' Elapsed: ' + elapsed + '\r');
    }; */
    return elapsed;
};

//minutesElapsed: determines minutes elapsed from between timeStampOld and timeStampNew
function minutesElapsed( tsOld, tsNew ) {
    var elapsed = 0;
    var old1 = Date.parse( tsOld );
    var new1 = Date.parse( tsNew );
    elapsed = (new1 - old1) / msMinutes;
    /* if (verbose) {    
        process.stdout.write( count + ' - New: ' + new1 + ' Old: ' + old1 + ' Elapsed: ' + elapsed + '\r');
    }; */
    return elapsed;
};


//isAlarmSet: checks to see if record's timeStamp is present in the alarmRecord array
function isAlarmSet( tsRec1 ) {
     var almSet = false;
    //Cycle through alarms to see if tsRec1 is present
    for ( i=0; i < alarmRecords; i++ ) {
        if ( tsRec1 == alarmRecord[i] ) {
            almSet = true;
        };
    };
    return almSet;
};


