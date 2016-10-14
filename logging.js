//logging.js - routines to log sensor data to main logfile

var utils = require( './utils.js' );
var alm = require( './alarms.js' );

var fs = require( 'fs' );


module.exports.sumAllData = function( data, aData, sumCount ) {
    aData.time1 = data.time1;
    
    
    if (sumCount === 0) {
        //If first time through summing, just load current values into aData. 
        aData.temp1 = data.temp1;
        aData.humi1 = data.humi1;
        aData.temp2 = data.temp2;
        aData.humi2 = data.humi2;
        aData.onew1 = data.onew1;
        aData.onew2 = data.onew2;
        aData.onew3 = data.onew3;
        aData.onew4 = data.onew4;
        aData.onew5 = data.onew5;
        aData.onew6 = data.onew6;
        aData.onew7 = data.onew7;
        aData.onew8 = data.onew8;
        aData.amps = data.amps;
    } else {
        //If not first time, sum each value unless it is an NaN (ignore NaNs)
        aData.temp1 = getSum( data.temp1, aData.temp1 );
        aData.humi1 = getSum( data.humi1, aData.humi1 );
        aData.temp2 = getSum( data.temp2, aData.temp2 );
        aData.humi2 = getSum( data.humi2, aData.humi2 );
        aData.onew1 = getSum( data.onew1, aData.onew1 );
        aData.onew2 = getSum( data.onew2, aData.onew2 );
        aData.onew3 = getSum( data.onew3, aData.onew3 );
        aData.onew4 = getSum( data.onew4, aData.onew4 );
        aData.onew5 = getSum( data.onew5, aData.onew5 );
        aData.onew6 = getSum( data.onew6, aData.onew6 );
        aData.onew7 = getSum( data.onew7, aData.onew7 );
        aData.onew8 = getSum( data.onew8, aData.onew8 );
        aData.amps = getSum( data.amps, aData.amps );
        
    };

    sumCount++;  //Increment the sumCount to reflect new sum added.
    return {sumData: aData, sumCount: sumCount };
};

function getSum( newValue, sumValue ) {
    var retVal = parseFloat(sumValue);

    //Don't add NaNs to sum
    if ( isNaN( newValue ) ) {
        retVal = NaN;
    } else {
        retVal += parseFloat(newValue);
    };
    return retVal;
};

//Log data to file once per logIncrement (minutes since last log); returns updated loglast
module.exports.writeToLogfile = function(sensorData1, logData1, sumData, sumCount, logLast1, alarms, config, writeToLog, logFileDirectory, logFileWritten, alarmsLogFile ) {
    
    var logFileName1 = config.logFileName;
    var logIncrement1 = config.logIncrement;

    //Determine if enough time has passed to log these data to file
    logLast1 = logLast1 + 1;  //Increment the number of calls to this function
    if (logLast1 >= logIncrement1) {
        //Time to execute the write
        logLast1 = 0;
        
        //Average the data if logAverage is true and place into last sensorData object
        if (config.logAveraging ) {
            //Use existing time stamp
            sensorData1.temp1 = avgVals( sumData.temp1, sumCount);
            sensorData1.humi1 = avgVals( sumData.humi1, sumCount);
            sensorData1.temp2 = avgVals( sumData.temp2, sumCount);
            sensorData1.humi2 = avgVals( sumData.humi2, sumCount);
            sensorData1.onew1 = avgVals( sumData.onew1, sumCount);
            sensorData1.onew2 = avgVals( sumData.onew2, sumCount);
            sensorData1.onew3 = avgVals( sumData.onew3, sumCount);
            sensorData1.onew4 = avgVals( sumData.onew4, sumCount);
            sensorData1.onew5 = avgVals( sumData.onew5, sumCount);
            sensorData1.onew6 = avgVals( sumData.onew6, sumCount);
            sensorData1.onew7 = avgVals( sumData.onew7, sumCount);
            sensorData1.onew8 = avgVals( sumData.onew8, sumCount);
            sensorData1.amps = avgVals( sumData.amps, sumCount);
            //don't change sensorData.door1
        };
        sumCount = 0;
            
        //Check for alarm conditions and send notification(s) if true.
        //utils.log( 'alarmsOn: ' + alarms.alarmsOn + '  tempTime1: ' + alarms.tempTime1 );
        if (alarms.alarmsOn ) {
           if( alm.checkAlarms( alarms, sensorData1, config ) ) {
               //Write record to alarmslog.csv
               var alarmsLogRecord = sensorData1.time1 + ',' + alarms.alarmSeries + ',' + alarms.alarmString + '\n';
               fs.appendFile( alarmsLogFile, alarmsLogRecord, function(err) {
                   if (err) {
                       utils.log('File ' + alarmsLogFile + ' cannot be written to: ' + err  );
                   } else {
                       utils.log('Wrote to alarmslog.csv.');
                   };
               });
            } else {
                //Nothing here
            };
        };

        
        
        //Format record and write to logfile.csv 
        var csvrecord = processLogCsvData( sensorData1, logData1 );
        if( writeToLog ) {                           //Only write to file when writeToLog is true.
            fs.appendFile( logFileDirectory + logFileName1, csvrecord, function(err) {
                if (err) {
                    utils.log('File ' + logFileDirectory + logFileName1 + ' cannot be written to: ' + err );
                } else {
                    //utils.log('Wrote to logfile.');
                };
            });
        };
        //Set this flag to true to send sockets to client.
        logFileWritten = true;
    };
    return { logLast: logLast1, logFileWritten: logFileWritten, sumCount: sumCount }; 
};

function avgVals( sumVal, sCount ) {
    var retVal = sumVal / sCount;
    //utils.log(" sumVal: " + sumVal + " sCount: " + sCount + " retVal: " + retVal );
    return retVal;    
};

//Process logfile data object logData
function processLogCsvData( data, returndata ) {
    returndata = data.time1 + ',';
    returndata += (data.temp1).toFixed(2) + ',';
    returndata += (data.humi1).toFixed(2) + ',';
    returndata += (data.temp2).toFixed(2) + ',';
    returndata += (data.humi2).toFixed(2) + ',';
    returndata += (data.onew1).toFixed(2) + ',';
    returndata += (data.onew2).toFixed(2) + ',';
    returndata += (data.onew3).toFixed(2) + ',';
    returndata += (data.onew4).toFixed(2) + ',';
    returndata += (data.onew5).toFixed(2) + ',';
    returndata += (data.onew6).toFixed(2) + ',';
    returndata += (data.onew7).toFixed(2) + ',';
    returndata += (data.onew8).toFixed(2) + ',';
    returndata += (data.amps1).toFixed(2) + ',';
    returndata += (data.door1) + ','
    returndata += (data.door2) + '\n';   
    return (returndata);
};
