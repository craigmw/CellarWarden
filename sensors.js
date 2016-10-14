//sensors.js - Gathers sensor data for CellarWarden

//node_modules
var sensorLib = require('node-dht-sensor');
var sensorLib2 = sensorLib;
var OWsensor = require('ds18x20');
var gpio = require('rpi-gpio');
var justify = require('justify');

//local variables
var gpioInput1 = false;
var gpioInput2 = false;

exports.sensorData = {            //sensorData object; used to retrieve, print and log sensor data
    time1: 0,
    temp1: NaN,                //First DHT
    humi1: NaN, 
    temp2: NaN,                //Second DHT
    humi2: NaN,
    onew1: NaN,                //DS18B20 #1
    onew2: NaN,                //DS18B20 #2
    onew3: NaN,                //DS18B20 #3
    onew4: NaN,                //DS18B20 #4
    onew5: NaN,                //DS18B20 #5
    onew6: NaN,                //DS18B20 #6
    onew7: NaN,                //DS18B20 #7
    onew8: NaN,                //DS18B20 #8
    amps1: NaN,                //Current loop sensor
    door1: NaN,                //Door1
    door2: NaN                 //Door2 
};

//Get sensor data and pack into sensorData JSON object
module.exports.getSensorData = function(data, config ) {
	var tempScale1 = config.tempScale;
    
    //Read DHT sensor(s)
    if (config.DHTtype1 === 11 || config.DHTtype1 === 22) {
        var readout = sensorLib.readSpec( config.DHTtype1, config.DHTpin1);
        if (tempScale1 == 'F') {
            readout.temperature = readout.temperature * 9/5 +32;
        };
        data.temp1 = readout.temperature + config.DHToffsetT1;
        data.humi1 = readout.humidity + config.DHToffsetH1;
    } else {
        data.temp1 = NaN;
        data.humi1 = NaN; 
    };
    if (config.DHTtype2 === 11 || config.DHTtype2 === 22) {
        var readout = sensorLib.read( config.DHTtype2, config.DHTpin2);
        if (tempScale1 == 'F') {
            readout.temperature = readout.temperature * 9/5 +32;
        };
        data.temp2 = readout.temperature + config.DHToffsetT2;
        data.humi2 = readout.humidity + config.DHToffsetH2;
    } else {
        data.temp2 = NaN;
        data.humi2 = NaN; 
    };
 
    //Read OneWire sensor(s), all 8 of them!
    if (config.DS18id1 != 'None') {
        OWsensor.get(config.DS18id1, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew1 = (OWtemp * 9/5 +32) + config.DS18offset1;
            } else { 
                data.onew1 = OWtemp + config.DS18offset1;
            };
        });
    } else {
        data.onew1 = NaN;
    };            
    if (config.DS18id2 != 'None') {
        OWsensor.get(config.DS18id2, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew2 = ( OWtemp * 9/5 +32) + config.DS18offset2;
            } else { 
                data.onew2 = OWtemp + config.DS18offset2;
            };
        });
    } else {
        data.onew2 = NaN;
    };
    if (config.DS18id3 != 'None') {
        OWsensor.get(config.DS18id3, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew3 = ( OWtemp * 9/5 +32) + config.DS18offset3;
            } else { 
                data.onew3 = OWtemp + config.DS18offset3;
            };
        });
    } else {
        data.onew3 = NaN;
    };
    if (config.DS18id4 != 'None') {
        OWsensor.get(config.DS18id4, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew4 = ( OWtemp * 9/5 +32) + config.DS18offset4;
            } else { 
                data.onew4 = OWtemp + config.DS18offset4;
            };
        });
    } else {
        data.onew4 = NaN;
    };
    if (config.DS18id5 != 'None') {
        OWsensor.get(config.DS18id5, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew5 = ( OWtemp * 9/5 +32) + config.DS18offset5;
            } else { 
                data.onew5 = OWtemp + config.DS18offset5;
            };
        });
    } else {
        data.onew5 = NaN;
    }; 
    if (config.DS18id6 != 'None') {
        OWsensor.get(config.DS18id6, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew6 = ( OWtemp * 9/5 +32) + config.DS18offset6;
            } else { 
                data.onew6 = OWtemp + config.DS18offset6;
            };
        });
    } else {
        data.onew6 = NaN;
    };
    if (config.DS18id7 != 'None') {
        OWsensor.get(config.DS18id7, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew7 = ( OWtemp * 9/5 +32) + config.DS18offset7;
            } else { 
                data.onew7 = OWtemp + config.DS18offset7;
            };
        });
    } else {
        data.onew7 = NaN;
    };    
    if (config.DS18id8 != 'None') {
        OWsensor.get(config.DS18id8, function(err, OWtemp) {
            if (tempScale1 == 'F') {
                data.onew8 = ( OWtemp * 9/5 +32) + config.DS18offset8;
            } else { 
                data.onew8 = OWtemp + config.DS18offset8;
            };
        });
    } else {
        data.onew8 = NaN;
    };
    
    //Get power reading; fill with NaN until implemented
    data.amps = NaN;

    //Get door reading; 
    // Door switch is normally closed when door shut. So, in closed
    //    state, gpio pin will be high. Mark as open if pin is low.
    if ( config.doorSwitchExists ) {
        gpioReadInput( config.doorSwitchPin, 'Door1');
        if ( gpioInput1 == -1 ) {
            //data.door1 = config.doorClosed;
            data.door1 = NaN;
            //config.doorSwitchExists = false;
        } else {
            data.door1 = gpioInput1 ? NaN : config.doorOpen;
        };
        
    } else {
        data.door1 = NaN;
    };
    //utils.log( 'Door1 read value: ' + gpioInput1 + ' - data.door1: ' + data.door1 );
    
    //Get door2 reading
    if ( config.doorSwitchExists2 ) {
        gpioReadInput( config.doorSwitchPin2, 'Door2');
        if ( gpioInput2 == -1 ) {
            //data.door2 = config.doorClosed;
            data.door2 = NaN;
            //config.doorSwitchExists2 = false;
        } else {
            data.door2 = gpioInput2 ? NaN : config.doorOpen;
        };
    } else {
        data.door2 = NaN;
    };
    //utils.log( 'Door2 read value: ' + gpioInput2 + ' - data.door2: ' + data.door2 );
    
    //Get timestamp
    //var date1 = new Date();
    data.time1 = utils.getDateTime();
    return( data );	       
};

module.exports.rejectExtremes = function( data, rejectData, config ) {

	var thresh = config.rejectThreshold;
    //Only process if rejectData.time1 != 0 so we only work with real data
    if (rejectData.time1 !== 0 ) {
        data.temp1 = detectExtremes( data.temp1, rejectData.temp1, thresh, "temp1" );
        data.humi1 = detectExtremes( data.humi1, rejectData.humi1, thresh, "humi1" );
        data.temp2 = detectExtremes( data.temp2, rejectData.temp2, thresh, "temp2" );
        data.humi2 = detectExtremes( data.humi2, rejectData.humi2, thresh, "humi2" );
        data.onew1 = detectExtremes( data.onew1, rejectData.onew1, thresh, "onew1" );
        data.onew2 = detectExtremes( data.onew2, rejectData.onew2, thresh, "onew2" );
        data.onew3 = detectExtremes( data.onew3, rejectData.onew3, thresh, "onew3" );
        data.onew4 = detectExtremes( data.onew4, rejectData.onew4, thresh, "onew4" );
        data.onew5 = detectExtremes( data.onew5, rejectData.onew5, thresh, "onew5" );
        data.onew6 = detectExtremes( data.onew6, rejectData.onew6, thresh, "onew6" );
        data.onew7 = detectExtremes( data.onew7, rejectData.onew7, thresh, "onew7" );
        data.onew8 = detectExtremes( data.onew8, rejectData.onew8, thresh, "onew8" );
        data.amps = detectExtremes( data.amps, rejectData.amps, thresh, "amps" );
    } else {
        rejectData.temp1 = data.temp1;
        rejectData.humi1 = data.humi1;
        rejectData.temp2 = data.temp2;
        rejectData.humi2 = data.humi2;
        rejectData.onew1 = data.onew1;
        rejectData.onew2 = data.onew2;
        rejectData.onew3 = data.onew3;
        rejectData.onew4 = data.onew4;
        rejectData.onew5 = data.onew5;
        rejectData.onew6 = data.onew6;
        rejectData.onew7 = data.onew7;
        rejectData.onew8 = data.onew8;
    };
    rejectData.time1 = data.time1;
    return data;
};

function detectExtremes( newData, oldData, thresh, varName ) {
	//if ( isNaN( oldData ) ) return NaN;
    if ( Math.abs( newData - oldData ) > thresh ) {
        utils.log( utils.getDateTime() + " - Rejected " + varName + " newData: " + newData + " oldData: " + oldData + " threshold: " + thresh ); 
        newData = NaN; //oldData;
    } else {
        oldData = newData;
    };
    return newData;
};

function sumAllData( data, aData, sumCount ) {
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

    //utils.log( aData.time1 + ": data.temp1: " + data.temp1 + " aData.temp1: " + aData.temp1 + " sumCount: " + sumCount );
    return aData;
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

// gpioReadInput: reads from GPIO pin using pin and optional label
function gpioReadInput( pin, label ) {
    var retValue = -1; //-1 is error, 0 is low and 1 is high
    
    gpio.read( pin, function(err, value) {
        if (err) {
            utils.log( label + '-Cannot read from GPIO pin ' + pin + '. ' + err );
            if (label == 'Door1' ) {
                gpioInput1 = -1;
            };
            if (label == 'Door2' ) {
                gpioInput2 = -1;
            };
            return ( -1 );
        } else {
            retValue = value ? 1 : 0;
            if (label == 'Door1' ) {
                gpioInput1 = retValue;
            };
            if (label == 'Door2' ) {
                gpioInput2 = retValue;
            };
            //utils.log('Connected ' + label + ' to GPIO pin ' + pin + '. Value: ' + value + ' | retValue: ' + retValue + '  Error: ' + err );
            //return retValue;
        };
    });

    //utils.log( 'retValue: ' + retValue );
    //return retValue;
};