//CellarW.js - CellarWarden: Cellar monitor with temp/humidity control and alarm functionality.
//Uses DHT22 to detect temp/humidity, plus DS18B20 to check bottle temps. 
//CellarW.js is main server file. Client files are index.html and ...
//Inspiration from https://github.com/evgkib/RaspberryPi-temp, brewpi.com, etc.

var cwVersion = "1.0.1";  //CellarWarden version.

//Dependencies
var utils = require('./utils.js');
var ctrl = require('./controller.js');
var tprof = require('./tprofiles.js');
var act = require('./actuators.js');
var tmp = require('./templates.js');
var display1 = require('./display.js');
var shutdown = require( './shutdown.js' );

//node_modules
var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var fs2 = require('fs.extra');
var sensorLib = require('node-dht-sensor');
var sensorLib2 = sensorLib;
var OWsensor = require('ds18x20');
var localIp = require('ip');
var gpio = require('rpi-gpio');
var nodemailer = require('nodemailer');
var justify = require('justify');
var cronjob = require('cron-job');


//Settings - defaults: store these in config.json; note: all pins refer to GPIO numbers

//Use relative path instead of hard-coded.
dirName = __dirname;

var logFileDirectory = dirName + '/public/';
var logFileOutName = logFileDirectory + 'logfileOut.csv';  //Name of temp file for file compression routine.
var logFileName = 'logfile.csv';                           //Name of logfile.
var ctrlsFile = logFileDirectory + 'controllers.json';     //Name of controllers file.
var serverLogFile = dirName + '/server.log';               //Name of server log


//utils.log( 'Path: ' + JSON.stringify( path.dirname)  );

var config = {
    pwProtect: false,                       //Protect using password?
    passWord: "cellar",                     //Password, cellar as default
    configTitle: "My wine cellar",
    configFile: dirName + '/public/config.json',
    logFileName: 'logfile.csv', 
    showTooltips: true,                     //Show or hide tooltips  
    logIncrement: 30,                       //Sensor reads to wait before logging data
    logAveraging: false,	            //If true, logfile.csv data is average of reads over logIncrement reads
    rejectExtremes: false,                  //Reject extreme values that vary greater than 
    rejectThreshold: 50,                    //Reject threshold (percent)
    DHTtype1: 22,                           //DHT sensor 1 info; if 0, skip read
    DHTpin1: 5,
    DHTlabel1: 'Cellar',
    DHTshow1: true,                         
    DHToffsetT1: 0,
    DHToffsetH1: 0,
    DHTtype2: 0,                            //DHT sensor 2 info, if 0, skip read
    DHTpin2: 6,
    DHTlabel2: 'Outside',
    DHTshow2: true,
    DHToffsetT2: 0,
    DHToffsetH2: 0,
    oneWirePin: 4,                          //One Wire network on pin 4 (can this be changed?)
    oneWireDevices: '',                     //String of all One Wire devices to display in config dialog
    DS18id1: '',                            //DS18B20 sensor 1 info, if '', skip read
    DS18label1: 'Bottle1',
    DS18show1: true,
    DS18offset1: 0,
    DS18id2: '',                            //DS18B20 sensor 2 info, if '', skip read
    DS18label2: 'Bottle2',
    DS18show2: true,
    DS18offset2: 0,
    DS18id3: '',                            //DS18B20 sensor 3 info, if '', skip read
    DS18label3: '',
    DS18show3: true,
    DS18offset3: 0,
    DS18id4: '',                            //DS18B20 sensor 4 info, if '', skip read
    DS18label4: '',
    DS18show4: true,
    DS18offset4: 0,
    DS18id5: '',                            //DS18B20 sensor 5 info, if '', skip read
    DS18label5: '',
    DS18show5: true,
    DS18offset5: 0,
    DS18id6: '',                            //DS18B20 sensor 6 info, if '', skip read
    DS18label6: '',
    DS18show6: true,
    DS18offset6: 0,
    DS18id7: '',                            //DS18B20 sensor 7 info, if '', skip read
    DS18label7: '',
    DS18show7: true,
    DS18offset7: 0,
    DS18id8: '',                            //DS18B20 sensor 8 info, if '', skip read
    DS18label8: '',
    DS18show8: true,
    DS18offset8: 0,
    tempScale: 'F',                         //C or F?
    lcdExists: false,                       //LCD panel info: does it exist?
    lcdType: 0,                             //LCD type, 0=standard (parallel) or 1=I2C?
    lcdBlPin: null,                         //LCD backlight pin
    lcdBlSwitched: false,                   //LCD backlight pin switched by door switch?
    lcdBlDelay: 0,                          //Delay in seconds to keep backlight on after activated.
    lcdRsPin: 27,                           //Standard (parallel) LCD params: RsPin
    lcdEPin: 22,                            //  E Pin
    lcdDataPin0: 25,                        //  Data pin 0
    lcdDataPin1: 24,                        //  Data pin 1
    lcdDataPin2: 23,                        //  Data pin 2
    lcdDataPin3: 18,                        //  Data pin 3
    lcdI2cBus: 1,                           //LCD I2C bus (1 for rev 2+ boards, 0 for rev 1 boards)    
    lcdI2cAddress: 27,                      //LCD I2C device address in hex (saved as decimal but converted to hex in display.js). 
    lcdCols: 20,
    lcdRows: 4, 
    doorSwitchExists: false,                // True if door switch exits
    doorSwitchPin: 19,                      // GPIO pin for door switch
    doorSwitchExists2: false,               //True if door switch #2 exits
    doorSwitchPin2: 99,                     //GPIO for door switch #2
    doorClosed: 10,                         //Door closed value
    doorOpen: 40,                           //Door open value
    compress: false,                        // Compress logfile?
    cmpPreserve: 4,                         // Days to preserve data, older than this compressed
    cmpGranularity: 60,                     // Compression granularity, e.g. keep 1 record for every 60 minutes of data
    cmpAutoExec: false,                     // Automatically compress logfile?
    cmpExecuteTime: '1:00',                 // Time of day to automatically compress data
    listenAddress: '127.0.0.1',             //IP address to set up server sockets
    listenPort: 8888                        //Port to host index.html on
};

//Alarm variables
//  Alarms based on temp (can pick between temp1/2, OW1/2), door (open or closed), or power (amps low or high)
var alarmsFile = dirName + '/public/alarms.json';
var alarmsLogFile = dirName + '/public/alarmsLog.csv';
var alarms = {
    alarmsOn: false,            //If true, monitor alarm conditions.
    alarmSocket: '',            //If not blank, update client with new alarm info/action via sockets.
    alarmString: '',            //*If an alarm is triggered, display this on notification dialog and in email/SMS.
    alarmLcdString: '',         // Display this on LCD, shorter version of notification.
    alarmSeries: 0,             // Key for series triggering alarm. 0=temp1, 1=humd1, 2=temp2, 3=humd2, 4=OW1, 5=OW2, 6=amps, 7=door1, 8=door2
    tempSensor1: 'temp1',       //* Condition 1 - temp1
    tempMon1: true,             //* Monitor this parameter
    tempNotify1: true,          //* Send emails if alarm triggered
    tempMax1: 100,              //* Max temp threshold for cond1
    tempMin1: 0,                //* Min temp threshold for cond1
    tempTime1: 0,               // Unix timestamp when condition first triggered
    tempDur1: 60,               // Duration of condition before triggering alarm in minutes
    tempDurCount1: 0,           // Minutes elapsed since condition triggered
    tempString1: 'Temp1',       //* String to notify by email or sms 
    tempPost1: '',              //* String to send post event through web to induce action (e.g. Insteon)
    tempSensor2: 'temp2',       // Condition 2 - temp2
    tempMon2: false,
    tempNotify2: true,
    tempMax2: 100,              
    tempMin2: 0,
    tempTime2: 0,                
    tempDur2: 60, 
    tempDurCount2: 0,           
    tempString2: 'Temp2', 
    tempPost2: '',   
    humiSensor1: 'dht1',       // Condition 3 - humidity 1
    humiMon1: false,
    humiNotify1: false,
    humiMax1: 100,              
    humiMin1: 0, 
    humiTime1: 0,               
    humiDur1: 60,               
    humiDurCount1: 0,           
    humiString1: 'Humd1', 
    humiPost1: '', 
    humiSensor2: 'dht2',       // Condition 4 - humidity 2
    humiMon2: false,
    humiNotify2: false,
    humiMax2: 100,              
    humiMin2: 0, 
    humiTime2: 0,               
    humiDur2: 60,               
    humiDurCount2: 0,           
    humiString2: 'Humd2', 
    humiPost2: '', 
    doorSensor1: 'door1',       // Condition 5 - door open
    doorMon1: false,
    doorNotify1: false,
    doorState1: 'closed',                  
    doorTime1: 0,               
    doorDur1: 60,               
    doorDurCount1: 0,           
    doorString1: 'Door1', 
    doorPost1: '',
    doorSensor2: 'door2',       // Condition 6 - door open
    doorMon2: false,
    doorNotify2: false,
    doorState2: 'closed',                  
    doorTime2: 0,               
    doorDur2: 60,               
    doorDurCount2: 60,           
    doorString2: 'Door2', 
    doorPost2: '',  
    powerSensor1: 'power1',     // Condition 7 - power
    powerMon1: false,
    powerNotify: false,
    powerMax1: 0,
    powerMin1: 0,
    powerTime1: 0,
    powerDur1: 0,
    powerDurCount1: 0,
    powerString1: 'Power1 alarm',
    powerPost1:'', 
    mailService: '',            // Email sender service (e.g. Gmail, etc)
    mailUser: '',               // Email sender username
    mailPass: '',               // Email sender password             
    emailAddr1: '',             // Email address 1 to send notifications
    emailAddr2: '',             // Email address 2 to send notifications
    autoclear: true,            // Automatically clear alarms if condition returns to normal
    suppress: true              // Suppress multiple emails. Clears alarm condition when notificatio sent.          
}

//******Global variables******
var sampleRate = 2000;        //Number milliseconds between sensor reads
var gpioInput1 = false;
var gpioInput2 = false;
var newCtrl = new ctrl.init();
//gpio.setup( config.doorSwitchPin, gpio.DIR_IN,gpioReadInput( config.doorSwitchPin ) );
//gpio.setup( config.doorSwitchPin2, gpio.DIR_IN,  );
//gpio.setMode( gpio.MODE_BCM);
var count = 0;
var currentTime = 0;          //Current time determined on each run through main loop.
var logCompressTime = new Date();      //Last time logCompress run; 
var statusTime = new Date();           //Last time status emails sent.
var lcdHold = 0;              //Flag to prevent printing over banner info during delay.
var DHTinitWorks = false;
var logLast = 0;              //Sensor reads since last logData object written to logfile.csv
var writeToLog = true;        //Flag to prevent writing logfile while modules are manipulating it.
var logFileWritten = false;   //Flag set to true after log file written. Sends Sockets to client.
var showCompressBox = false;  //Flag to send socket to client when logfile compression occurs
var closeCompressBox = false; //Flag to send socket to client when logfile compression is done
var sensorData = {            //sensorData object; used to retrieve, print and log sensor data
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

//Setup delay to temporarily show IP address on LCD when program starts.
var showIP = true;
var showIPdelay = 60000;
setTimeout( function() {
    showIP = false;
}, showIPdelay );

//logData object: copy of sensorData used to send to logfile.csv
//var logData = sensorData; //This won't work, only passes a reference. Need duplicate.
var logData = (JSON.parse(JSON.stringify( sensorData)));

// averaging variables, used only if config.logAveraging true.
var sumData = (JSON.parse(JSON.stringify( sensorData)));
var sumCount = 0;


// reject variables, used only if config.rejectExtremes is true.
var rejectData = (JSON.parse(JSON.stringify(sensorData)));


//lcdData object; used to print data and messages to LCD screen
var lcdData = { 
    lcdRow0: '',
    lcdRow1: '',
    lcdRow2: '',
    lcdRow3: ''
};

//*******Global variables end*******

//Note that server is being started for logging purposes.
var timeNow = new Date();
utils.log( '\n\n\n' + timeNow + ' - CellarWarden server is starting...');

//Set up controllers.
var ctrls = [];
ctrls = ctrl.addCtrl( ctrls, new ctrl.init() );
ctrlsTemp = JSON.parse( JSON.stringify( ctrls ) );  //Temporary copy of ctrls used for updating ctrls after editing configuration.
ctrlsConfigUpdate = true;                           //Flag to prevent controller processing when ctrls config has been edited.
ctrlsConfigUpdateSocket = false;                    //Flag to send updated ctrls socket to client.
ctrlsLoaded = false;                                //Flag to send loaded ctrls to client. 
ctrlsLoop = 0;                                      //Increment to send ctrls to client once this = ctrlsSend;
ctrlsSend = 20;

//Load config from config.json
updateConfig( 'init' );

//Load alarms from alarms.json
updateAlarms( 'init', config );

//Load controllers from controllers.json
updateControllers( 'init', ctrls );

//Print local ip address to utils
utils.log('Local IP address: ' + localIp.address());

//Initialize hardware first using existing config values, otherwise waiting to load config will cause problems.
resetHardware();

//**************************** MAIN ***********************************************
//Main event loop.
setInterval(function(){
    
    //Get current time
    currTime = new Date();

    //Load sensor data into JSON object sensorData
    getSensorData(sensorData, config.tempScale);

    //Reject extreme values if they exceed threshold
    if ( config.rejectExtremes ) {
        sensorData = rejectExtremes( sensorData, config.rejectThreshold );
    };

    //Sum data if logAveraging true
    if (config.logAveraging ) {
        sumData = sumAllData( sensorData, sumData );
        sumCount += 1;
    };
    
    //Process sensorData for display on LCD screen and client
    lcdData = display1.processSensorData( sensorData, config, alarms, ctrls, showIP, localIp );

    //Update hardware LCD display
    if (lcdHold === 0 && config.lcdExists ) {
        display1.lcdUpdateScreen( lcdData, config, alarms, 0);
    }; 

    //Send sensorData to logfile after logIncrement reads has elapsed; also check for alarm conditions.
    logLast = writeToLogfile( config.logFileName, sensorData, logData, config.logIncrement, logLast );

    //Process controllers (if on).
    if( ctrlsConfigUpdate == true ) {    //If ctrls has been edited by client, skip processing and copy new version of ctrls.
        //Make sure ctrlsTemp is valid before copying to ctrls.
        if ( ctrl.checkCtrls( ctrlsTemp ) ) {
            
            //Update ctrls using ctrlsTemp. Note: ctrls passed by reference and modified in place by this function.
            //temp1 is not needed. However, since ctrlsConfigUpdateSocket routine copies from ctrlsTemp to file, 
            //controllers.json will not hold updated state variables until next autosave. May need to fix this to
            //allow for program resumption right after saving (e.g. crash after editing of controllers, but before autosave).
            var temp1 = ctrl.updateCtrlsConfig( ctrls, ctrlsTemp );

            //Send a copy of updated ctrls to client.
            ctrlsConfigUpdateSocket = true;  
            //display1.resetPages( config, ctrls );        

        } else {
            utils.log( 'Could not update controller config. tempCtrls: ' + JSON.stringify( ctrlsTemp ) );
        };
        ctrlsConfigUpdate = false;
        utils.log( 'Skipped controller processing.'); 
    } else {
        //Process existing ctrls object. 
        //Processing controllers....
        ctrls = ctrl.process( ctrls, sensorData, config.logIncrement );
    };

    //Run scheduled jobs if correct time of day.
    runJobs( currTime );
    

}, sampleRate );
//********************************* END OF MAIN ******************************************
 

//Get sensor data and pack into sensorData JSON object
function getSensorData(data, tempScale1) {
    
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
    return(data);	       
};

function rejectExtremes( data, thresh ) {
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

function sumAllData( data, aData ) {
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

//Log data to file once per logIncrement (minutes since last log); returns updated loglast
function writeToLogfile( logFileName1, sensorData1, logData1, logIncrement1, logLast1 ) {
    
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
            //Add the rest of the one wire sensors here...
            sensorData1.amps = avgVals( sumData.amps, sumCount);
            //don't change sensorData.door1
            sumCount = 0;
        };
               
        //Check for alarm conditions and send notification(s) if true.
        //utils.log( 'alarmsOn: ' + alarms.alarmsOn + '  tempTime1: ' + alarms.tempTime1 );
        if (alarms.alarmsOn ) {
           if( checkAlarms( alarms, sensorData1 ) ) {
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
    return ( logLast1 ); 
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

//Set up sockets to communicate with client
//  Update lcd graphic, update client graph on new data, and check for changes in config.
io.sockets.on('connection', function( socket ){
    var clientIp = socket.request.connection.remoteAddress;
    var clientPort = socket.request.connection.remotePort;
    var localCounter = 0;
    var timeNow = new Date();
    utils.log( timeNow + ' - User connected at ' + clientIp + ": " + clientPort);
    
    setInterval(function(){
        //Update LCD screen on client each cycle.
        io.sockets.emit('newsensordata', lcdData);

        //Check for new alarm triggered. If so, let client know via socket.
        if ( alarms.alarmSocket == 'trigger' ) {
            alarms.alarmSocket = '';          //prevent multiple notifications from being sent to client.
            tempAlarms = JSON.parse(JSON.stringify (alarms ));
            io.sockets.emit( 'newAlarms', tempAlarms );
            utils.log('Sent newAlarms socket to client.');
        };
                
        //Update client graph after main logfile written. Also updates controller window dygraph.
        if ( logFileWritten ) {
            io.sockets.emit( 'newlogfiledata' );
            io.sockets.emit( 'newctrlsdata', ctrls );
            logFileWritten = false;
        };

        //Send loaded ctrl object to client.
        if ( ctrlsLoaded == true ) {
            utils.log( 'Loaded controllers configuration from file and sent to client.' ); 
            socket.emit( 'initControllers', ctrlsTemp );
            ctrlsLoaded = false;    
        }; 

        //Send updated ctrls array to client.
        if ( ctrlsConfigUpdateSocket == true ) {
            socket.emit( 'initControllers', ctrls );
            utils.log( 'Updated controllers configuration sent to client.' ); 
            //Make temporary copy of ctrls and then save it to the config file.
            ctrlsTemp = JSON.parse( JSON.stringify ( ctrls ) );
            updateControllers( 'update' );
            //Update lcd display
            //utils.log('ctrls.length=' + ctrls.length + ' - Resetting lcd pages after change in controllers configuration...');
            display1.resetPages( config, ctrls );
            ctrlsConfigUpdateSocket = false;
        }; 

        //Send updated ctrls array to client every ctrlsSend times through this loop.
        /*if (ctrlsLoop >= ctrlsSend ) {
            socket.emit( 'initControllers', ctrls );
            ctrlsLoop = 0;
        } else {
            ctrlsLoop += 1;
        };
        */ 
        
    }, 1000);

    //Send initial configuration data to client for editing
    socket.emit( 'initConfig', config );
    socket.emit( 'initAlarms', alarms );
    socket.emit( 'initControllers', ctrls );
    socket.emit( 'sendCtrl', newCtrl );

    //Receive new configuration from client and write to config object. 
    socket.on( 'changeConfig', function( configPassed ) {
        config = JSON.parse( JSON.stringify( configPassed ) );
        utils.log( 'changeConfig socket received.' );
        updateConfig( 'update' );
        //Let client know config has been updated
        socket.emit( 'initConfig', config );
        utils.log('Config changed by client.');
    }); 

    //Receive new ctrls client and write to config object. 
    socket.on( 'changeCtrls', function( ctrlsPassed ) {
        ctrlsTemp = JSON.parse( JSON.stringify( ctrlsPassed ) );
        ctrlsConfigUpdate = true; //Flag to copy tempCtrls to ctrls in main loop.
        utils.log( 'changeCtrls socket received.' );
        
        //updateControllers( 'update' );
        //Let client know ctrls has been updated
        //socket.emit( 'initControllers', ctrls ); //ctrlsTemp );
        //utils.log('Controller configuration changed by client.');
    });

    //Receive testActuator request, so run activator test.
    socket.on( 'testActuator', function( actuator ) {
        //utils.log( 'actuator.pin: ' + actuator.pin + '\tactuator.inverted: ' + actuator.inverted );
        //utils.log( 'Testing actuator gpio pin ' + actuator.pin + ' for writing...' );
        act.testActuator( actuator.pin, actuator.inverted, actuator.pwm );
    });


    //Receive request for server log file to be sent to client.
    socket.on( 'showServerLog', function() {
        fs.readFile( serverLogFile, 'utf8', function(err, data) {
            if (err) {
                data = 'Could not read server log.';
                utils.log( data );
            };
            socket.emit( 'serverLogReturn', data );
        });
    });

    //Receive request to clear out server log.
    socket.on( 'clearServerLog', function() {
        fs.writeFile( serverLogFile, '', function(err) {
            if (err) {
                utils.log( 'Could not clear out server log.' );
            } else {
                utils.log( 'Cleared out server log.' );
            };
        }); 

    });

    //Receive request to reboot the RPi.
    socket.on( 'rebootRPi', function() {
        var args = 'shutdown -r now' 
        var exec = require( 'child_process' ).exec;
        var timeNow = new Date();
        utils.log( timeNow + ': Rebooting RPi...');
        var child = exec( args, [], function (err, stdout, stderr) {
            if ( err ) {
                utils.log( 'Unable to shutdown RPi. Error: ' + err );
            } else {
                utils.log( stdout + '-' + stderr );
            }
        });
    });

    //loadOwDevices: receive request for OneWire device list
    socket.on( 'loadOwDevices', function (configPassed ) {
        config = JSON.parse( JSON.stringify( configPassed ) );
        OWsensor.list(function (err, listOfDeviceIds) {
            config.oneWireDevices = listOfDeviceIds;
        });
        socket.emit( 'newOwDevices', config );
    });

    //resetFile: reset (delete) log files
    //  mainlogfile - deletes main logfile (e.g. logfile.csv)
    //  ctrllogfile - deletes controller logfile.
    //  Note: argument sent is an object with reset type (described above) and
    //  filename in the form: { reset: "ctrllogfile", filename: "temp1.csv"}
    socket.on( 'resetFile', function( data ) {
        var filename = data.filename;
        switch ( data.reset ) {
            case 'mainlogfile':
                filename = dirName + '/public/' + filename;
                break; 
            case 'ctrllogfile':
                filename = dirName + '/public/controls/' + filename;
                break;
            default:
                filename = dirName + filename;
        };

        utils.deleteFile( filename, function( err ) {
            if (err) {
                //socket.emit( 'deleteFileErr', err );
            };
        });  
    });

    //compressLogFile: spawn compressLog.js and return the stdout to the client via a pop up window
    // Don't make a local copy of config though, just use temporarily to run compressLogFile function.
    socket.on( 'compressLogFile', function( configPassed ) {
        utils.log( 'Received compressLogFile socket from client.' );
        configTemp = JSON.parse( JSON.stringify( configPassed ) );
        compressLogFile( configTemp );
    });
        

    //Receive new alarm configuration from client and write to alarms object. 
    socket.on( 'changeAlarms', function( alarmsPassed ) {
        alarms = JSON.parse( JSON.stringify( alarmsPassed ) );
        updateAlarms( 'update', config );
        //Let client know config has been updated
        io.sockets.emit( 'initAlarms', alarms );
        utils.log('Alarm configuration changed by client.');
    }); 

    //Receive 'testEmail' from client, so send test email.
    socket.on( 'testEmail', function( data ) {
        //Unpack data from JSON object.
        var emService1 = data.service;
        var emUser1 = data.user;
        var emPassword1 = data.password;
        var emAddresses1 = data.addresses;
        var emSubject1 = data.subject;
        var emText1 = data.text;
    
        sendEmail( emService1, emUser1, emPassword1, emAddresses1, emSubject1, emText1 );
        utils.log('Sent test email to: ' + emAddresses1 );
    });

    //Receive clearAlarms, so clear all alarms
    socket.on( 'clearAlarms', function( alarmsPassed ) {
        utils.log( 'clearAlarms socket received.' );
        alarms = JSON.parse( JSON.stringify( alarmsPassed ) );
        almClearAll( alarms );
        updateAlarms( 'update', config );
        io.sockets.emit( 'initAlarms', alarms );
    });

    //Receive request for alarms log file to be sent to client.
    socket.on( 'showAlarmsLog', function() {
        fs.readFile( alarmsLogFile, 'utf8', function(err, data) {
            if (err) {
                data = 'Could not alarms history file.';
                utils.log( data );
            };
            socket.emit( 'alarmsLogReturn', data );
        });
    });

    //Receive clearAlarmLogFile
    socket.on( 'clearAlarmLogFile', function() {
        utils.log('Clearing alarms logfile...');
        almClearAlarmLogFile();
        io.sockets.emit ( 'resetAnnotations' );
    });

    //Receive loadTmpListing
    socket.on( 'loadTmpListing', function() {
        tmp.loadTempListing( function( err, data ) {
            if ( err ) {
                utils.log('Unable to get list of templates. ERROR: ' + err, 'red', false, false );
                socket.emit( 'sendTmpListing', { err:err, data:null } );
            } else {
                utils.log('Sent list of template files to client.' );
                socket.emit( 'sendTmpListing', {err:null, data:data } );
            };
        });
    });
  
    //Receive loadTemplate
    socket.on( 'loadTemplate', function( tmpFile ) {
        utils.log( 'loadTemplate socket received. Loading template file ' + tmpFile + '...' );
        tmp.loadTemplate( tmpFile, function( err, data ) {
            if ( err ) {
                utils.log('Unable to load template file ' + tmpFile + '. ERROR: ' + err, 'red', false, false );
                socket.emit( 'sendTemplate', err );
            } else {
                //utils.log( 'Sent template file ' + tmpFile + ' to client.' );
                socket.emit( 'sendTemplate', { err:err, data:data } );
            };
        });
    });

    //Receive saveTemplate
    socket.on( 'saveTemplate', function( data ) {
        utils.log( 'Saving new template file ' + data.fileName + '.' );
        tmp.saveTemplate( data.fileName, data.tmpProf, function( err ) {
            if (err) {
                socket.emit( 'saveTemplateErr', err );
            };
        });
    });

    //Receive deleteTemplate
    socket.on( 'deleteTemplate', function( tmpFileName ) {
        tmp.deleteTemplate( tmpFileName, function( err ) {
            if (err) {
                socket.emit( 'deleteTemplateErr', err );
            };
        });                 
    }); 
});

//Alarm processing stuff
// checkAlarms: checks to see if an alarm has triggered. Returns true if alarm condition met.
function checkAlarms( alarms1, sData ) {
    var retVal = false;
    var series = 0;

    //utils.log( "Checking for alarm condition..." );
    // Check temp1
    if ( alarms1.tempMon1 ) {
        var tempAlarm1 = false;        
        switch( alarms1.tempSensor1 ) {
            case 'temp1':
                tempAlarm1 = almCheckTemp( sData.temp1, alarms1.tempMax1, alarms1.tempMin1 );
                series = 0;
                break;
                 
            case 'temp2':
                tempAlarm1 = almCheckTemp( sData.temp2, alarms1.tempMax1, alarms1.tempMin1 );
                series = 2;
                break;

            case 'onew1':
                tempAlarm1 = almCheckTemp( sData.onew1, alarms1.tempMax1, alarms1.tempMin1 );
                series = 4
                break;

            case 'onew2':
                tempAlarm1 = almCheckTemp( sData.onew2, alarms1.tempMax1, alarms1.tempMin1 );
                series = 5;
                break;

            default:
                //No sensor defined so just ignore
        };

        //If alarm condition met, set this and send notification. 
        if (tempAlarm1 ) {
            var condString = alarms1.tempString1 + " is out of range!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.tempString1;
            var triggerRet = almTrigger( alarms1.tempTime1, alarms1.tempDur1, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.tempTime1 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.tempTime1 = 0;
            }; 
            retval = false;
        };
    };

    // Check temp2
    if ( alarms1.tempMon2 ) {
        var tempAlarm2 = false;        
        switch( alarms1.tempSensor2 ) {
            case 'temp1':
                tempAlarm2 = almCheckTemp( sData.temp1, alarms1.tempMax2, alarms1.tempMin2 );
                series = 0;
                break;
                 
            case 'temp2':
                tempAlarm2 = almCheckTemp( sData.temp2, alarms1.tempMax2, alarms1.tempMin2 );
                series = 2;
                break;

            case 'onew1':
                tempAlarm2 = almCheckTemp( sData.onew1, alarms1.tempMax2, alarms1.tempMin2 );
                series = 4;
                break;

            case 'onew2':
                tempAlarm2 = almCheckTemp( sData.onew2, alarms1.tempMax2, alarms1.tempMin2 );
                series = 5;
                break;

            default:
                //No sensor defined so just ignore
        };
        //If alarm condition met, set this and send notification. 
        if (tempAlarm2 ) {
            var condString = alarms1.tempString2 + " is out of range!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.tempString2;
            var triggerRet = almTrigger( alarms1.tempTime2, alarms1.tempDur2, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.tempTime2 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.tempTime2 = 0;
            }; 
            retval = false;
        };
    };

    // Check humi1
    if ( alarms1.humiMon1 ) {
        var humiAlarm1 = false;        
        switch( alarms1.humiSensor1 ) {
            case 'dht1':
                humiAlarm1 = almCheckTemp( sData.humi1, alarms1.humiMax1, alarms1.humiMin1 );
                series = 1;
                break;
                 
            case 'dht2':
                humiAlarm1 = almCheckTemp( sData.humi2, alarms1.humiMax1, alarms1.humiMin1 );
                series = 3;
                break;

            default:
                //No sensor defined so just ignore
        };
        //If alarm condition met, set this and send notification. 
        if (humiAlarm1 ) {
            var condString = alarms1.humiString1 + " is out of range!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.humiString1;
            var triggerRet = almTrigger( alarms1.humiTime1, alarms1.humiDur1, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.humiTime1 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.humiTime1 = 0;
            }; 
            retval = false;
        };
     
    };

    // Check humi2
    if ( alarms1.humiMon2 ) {
        var humiAlarm2 = false;        
        switch( alarms1.humiSensor2 ) {
            case 'dht1':
                humiAlarm2 = almCheckTemp( sData.humi1, alarms1.humiMax2, alarms1.humiMin2 );
                series = 1;
                break;
                 
            case 'dht2':
                humiAlarm2 = almCheckTemp( sData.humi2, alarms1.humiMax2, alarms1.humiMin2 );
                series = 3;
                break;

            default:
                //No sensor defined so just ignore
        };
        //If alarm condition met, set this and send notification. 
        if (humiAlarm2 ) {
            var condString = alarms1.humiString2 + " is out of range!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.humiString2;
            var triggerRet = almTrigger( alarms1.humiTime2, alarms1.humiDur2, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.humiTime2 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.humiTime2 = 0;
            }; 
            retval = false;
        };
    }; 

    // Check door1
    if ( alarms1.doorMon1 ) {
        var doorAlarm1 = false;      
        doorAlarm1 = almCheckDoor( sData.door1, config.doorOpen );
        series = 7;
        //If alarm condition met, set this and send notification. 
        if ( doorAlarm1 ) {
            var condString = alarms1.doorString1 + " is open!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.doorString1;
            var triggerRet = almTrigger( alarms1.doorTime1, alarms1.doorDur1, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.doorTime1 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.doorTime1 = 0;
            }; 
            retval = false;
        };
    }; 
    // Check door2
    if ( alarms1.doorMon2 ) {
        var doorAlarm2 = false;      
        doorAlarm2 = almCheckDoor( sData.door1, config.doorOpen );
        series = 8;
        //If alarm condition met, set this and send notification. 
        if ( doorAlarm2 ) {
            var condString = alarms1.doorString2 + " is open!";
            alarms1.alarmLcdString = 'ALARM! ' + alarms1.doorString2;
            var triggerRet = almTrigger( alarms1.doorTime2, alarms1.doorDur2, condString, alarms1, series );
            if( triggerRet.trigger ) {
                retVal = true;
            } else {
                alarms1.doorTime2 = triggerRet.timeStamp; 
                retVal = false; 
            };  
        } else {
            if( alarms1.autoclear ) {
                alarms1.doorTime2 = 0;
            }; 
            retval = false;
        };
    }; 
    return retVal;
};          
 
//almCheckTemp: check if temp is out of range, if so, return true.
function almCheckTemp( currentTemp, tempMax, tempMin ) {
    var retVal = false;
    if (currentTemp === NaN ) {
        retVal = false;
    } else {
        if ( currentTemp > tempMax || currentTemp < tempMin ) {
            retVal = true;
        };
    };
    return retVal
};

//almCheckDoor: check to see if door is open, if so, return true.
function almCheckDoor( doorVal, doorOpen ) {
    retVal = false;
    if ( doorVal >= doorOpen ) {
        retVal = true;
    };
    return retVal;
};


//almTrigger: checks to see if condition has been true for duration setting. If true, sends notifications.
function almTrigger( timeStamp, duration, condString, alarms2, series1 ) {
    
    //utils.log( timeStamp + " - Alarm Trigger test..." );
    
    var retVal = {
        trigger: false,
        timeStamp: timeStamp 
    };
    var timeNow = new Date();

    //If timestamp is 0, add current time and return false, else evaluate time difference
    if (timeStamp === 0) {
        retVal.timeStamp = timeNow;
        retVal.trigger = false;
    } else {
        var elapsed = utils.minutesElapsed( timeStamp, timeNow );
        //utils.log( 'timeStamp: ' + Date.parse(timeStamp) + ' timeNow: ' + Date.parse(timeNow) + ' elapsed: ' + elapsed );
        if ( elapsed >= duration ) {

            //Mark which series is affected for plotting annotations 
            //  0=DHT_T1, 1=DHT_H1, 2=DHT_T2, 3=DHT_H2, 4=OW1, 5=OW2, 6=Amps, 7=Door1, 8=Door2 
            alarms2.alarmSeries = series1;

            //Send info to utils
            utils.log( timeStamp + ' - Alarm activated: ' + condString );
             
            //Activate hardware buzzer, if available

            //Place condition into alarms2.alarmString along with timestamp
            alarms2.alarmString = condString + ' (' + timeStamp + ')';
            
            //Update alarms.json
            updateAlarms( 'update', config );
           
            //Update client with alarm.
            alarms2.alarmSocket = 'trigger';

            //Send email 
            if ( alarms2.emailAddr1 !== '' ) {
                var emService = alarms2.mailService;
                var emUser = alarms2.mailUser;
                var emPassword = alarms2.mailPass;
                var emAddresses = (alarms2.emailAddr2 !=='') ? 
                    ( alarms2.emailAddr1 + ', ' + alarms2.emailAddr2) : ( alarms2.emailAddr1);
                var emSubject = 'CellarWarden Alarm Notification';
                var emText = timeStamp + ' - ALARM Activated!\n' +
                    config.configTitle + ': ' + condString; 
                sendEmail( emService, emUser, emPassword, emAddresses, emSubject, emText );
            };      

            //Prevent retriggering alarm by setting condition time to 0.
            retVal.timeStamp = 0; 
            
            //Suppress multiple emails. 
            if( alarms.suppress ) {
                // Turn off alarm checking to prevent multiple emails. Must be reactivated manually. 
                alarms.alarmsOn = false;
                //almClearAll( alarms ); 
            };
           
            //Return true to show that alarm has been triggered.
            retVal.trigger = true;
        } else {
            retVal.trigger = false;
        };
    };
    return retVal;
};

//almClearAll: clears all alarm conditions by zeroing out the timestamps
function almClearAll( almData ) {
    utils.log( 'Clearing all active alarms...' );
    //almData.alarmString = "";
    almData.tempTime1 = 0;
    almData.tempTime2 = 0;
    almData.humiTime1 = 0;
    almData.humiTime2 = 0;
    almData.doorTime1 = 0;
    almData.powerTime1 = 0;
    almData.tempDurCount1 = 0;
    almData.tempDurCount2 = 0;
    almData.humiDurCount1 = 0;
    almData.humiDurCount2 = 0;
    almData.doorDurCount1 = 0;
    almData.powerDurCount1 = 0;
};

//almClearAlarmLogFile: clears out alarm logfile
function almClearAlarmLogFile() {
    //Overwrite alarms logfile by writing blank string.
    fs.writeFile( alarmsLogFile, "", function(err) {
        if (err) {
            utils.log('Could not overwrite alarms logfile ' + alarmsLogFile );
        } else {
            utils.log('Cleared alarms logfile ' + alarmsLogFile );
        };
    });
};

//sendEmail: Sends emails using Nodemailer
function sendEmail( emService, emUser, emPassword, emAddresses, emSubject, emText ) {

    // create reusable transporter object using SMTP transport
    var transporter = nodemailer.createTransport({
        service: emService,
        auth: {
            user: emUser,
            pass: emPassword
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: emUser,          // sender address
        to: emAddresses,       // list of receivers
        subject: emSubject,    // Subject line
        text: emText,          // plaintext body
        html: emText           // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            utils.log(error);
        } else {
            utils.log('Message sent: ' + info.response);
        };
    });
};

//---------------------Initialization functions ---------------------------------------------

//If client has updated config.json (or on startup), reload this file. Also, initialize everything.
function updateConfig( configAction ) {
    //utils.log( 'updating config object...');
    //utils.log( config );
    if ( configAction == 'init' ) {
        //Write config data to config file. If not present, make a new one.
        fs.exists(config.configFile, function(exists) {
            if (exists) {                 //config file exists, so read it into config object
                fs.readFile(config.configFile, 'utf8', function(err, data) {
                    if (err) {
                        utils.log('Could not read config file ' + config.configFile);
                    } else {
                        if ( data.length > 0 ) {
                            utils.log('Loaded config from ' + config.configFile);
                            //config = JSON.parse( data );
                            config = utils.mergeJsonProto( config, JSON.parse( data ) );
                        } else {
                            utils.log('Config.json corrupted. Loading default config...' );
                        };
                        resetHardware();
                    };
                });
            } else {                     //config file does not exist, so make a new one
                fs.writeFile(config.configFile, JSON.stringify(config), function(err) {
                    if (err) {
                        utils.log('Could not write new configuration file ' + config.configFile);
                    } else {
                        utils.log('Wrote configuration file ' + config.configFile);
                        resetHardware();
                    };
                });
            };
        });
    } else {
        //Overwrite config file.
        utils.log( 'Updating config.json...' );
        fs.writeFile(config.configFile, JSON.stringify(config), function(err) {
            if (err) {
               utils.log('Could not write new configuration file ' + config.configFile);
            } else {
                utils.log('Wrote configuration file ' + config.configFile);
               resetHardware();
            };
        });
    };
};
            
//resetHardware: Sets up or resets hardware using data in config object.
function resetHardware() {    
    //Set up LCD panel
    if (config.lcdExists) {
       display1.initializeLcd( config, ctrls );  
    };

    //Set up server
    app.use(express.static(__dirname + '/public'));
    io.on('connection', function(socket){
        //utils.log('User connected');
    });
    http.listen(process.env.PORT || config.listenPort, function(){
        utils.log('Listening on port ' + config.listenPort );
    });

    //Initialize DHT sensors; may wish to move this into main loop.
    if (config.DHTtype1 === 11 || config.DHTtype1 === 22 ) {
        DHTinitWorks = sensorLib.initialize(config.DHTtype1, config.DHTpin1);
        if ( DHTinitWorks ) {
            utils.log('DHT #1 found. Type: ' + config.DHTtype1 + ' Pin: ' + config.DHTpin1);
        } else {
            utils.log('DHT #1 not found.');
            config.DHTtype1 = 0;
        };
    };
    if ( config.DHTtype2 === 11 || config.DHTtype2 === 22 ) {
        DHTinitWorks = sensorLib2.initialize(config.DHTtype2, config.DHTpin2);
        if ( DHTinitWorks ) {
            utils.log('DHT #2 found. Type: ' + config.DHTtype2 + ' Pin: ' + config.DHTpin2);
        } else {
            utils.log('DHT #2 not found.');
            config.DHTtype2 = 0;
        };
    };

    //Initialize One-Wire sensors
    OWsensor.isDriverLoaded( function (err, isLoaded) {
        utils.log('OneWire network driver is loaded?: ' + isLoaded);
    });
    OWsensor.list(function (err, listOfDeviceIds) {
        if (err) {
            config.oneWireDevices = [""];
            utils.log( 'Could not obtain list of OneWire devices.' );
        } else {
            config.oneWireDevices = listOfDeviceIds;
            //utils.log('OneWire IDs: ' + config.oneWireDevices );
            //utils.log('OneWire devices: '+ config.oneWireDevices.length ); 
            utils.log('OW0: ' + config.oneWireDevices[0] + " OW1: " + config.oneWireDevices[1] );
        };
    });

    //Initialize gpio to read door switches
    gpio.setMode( gpio.MODE_BCM);
    if ( config.doorSwitchExists) {
        gpio.setup( config.doorSwitchPin, gpio.DIR_IN, function (error ) {
            if (error) {
                utils.log( 'Door1 - Error setting up GPIO pin ' + config.doorSwitchPin + '. ' + error );
            } else {
                utils.log( 'Door1 - setup on GPIO pin ' + config.doorSwitchPin + '. ');
            };
        });
    };
    if ( config.doorSwitchExists2) {
        gpio.setup( config.doorSwitchPin2, gpio.DIR_IN, function (error ) {
            if (error) {
                utils.log( 'Door2 - Error setting up GPIO pin ' + config.doorSwitchPin2 + '. ' + error );
            } else {
                utils.log( 'Door2 - setup on GPIO pin ' + config.doorSwitchPin2 + '. ');
            };
        });
    };
};  

//If client has updated alarms.json (or on startup), reload this file. Also, initialize alarm process.
function updateAlarms( alarmsAction, cfg ) {
    if ( alarmsAction == 'init' ) {
        //Write config data to config file. If not present, make a new one.
        fs.exists( alarmsFile, function(exists) {
            if (exists) {                 //alarms file exists, so read it into config object
                fs.readFile( alarmsFile, 'utf8', function(err, data) {
                    if (err) {
                        utils.log('Could not read alarm config file ' + alarmsFile );
                    } else {
                        if ( data.length > 0 ) {
                            utils.log('Loaded alarms config from ' + alarmsFile );
                            //alarms = JSON.parse( data );
                            alarms = utils.mergeJsonProto( alarms, JSON.parse( data ) );
                        } else {
                            utils.log( 'Alarms file corrupted. Loading defaults...' );
                        };
                    };
                });
            } else {                     //alarms file does not exist, so make a new one
                fs.writeFile( alarmsFile, JSON.stringify( alarms ), function(err) {
                    if (err) {
                        utils.log('Could not write new alarms configuration file ' + alarmsFile );
                    } else {
                        utils.log('Wrote new alarms configuration file ' + alarmsFile );
                    };
                });
            };
        });
    } else {
        //Overwrite alarms config file.
        //utils.log( 'Updating '+ alarmsFile + "..." );
        fs.writeFile( alarmsFile, JSON.stringify( alarms ), function(err) {
            if (err) {
               utils.log('Could not update alarms configuration file ' + alarmsFile );
            } else {
                utils.log('Updated alarms configuration file ' + alarmsFile );
            };
        });
    };
};

//updateControllers() - loads or saves controllers.json controller config on startup or config change.
function updateControllers( ctrlAction ) {
    if ( ctrlAction == 'init' ) {
        //Write controllers data to controllers file. If not present, make a new one.
        fs.exists( ctrlsFile, function(exists) {
            if (exists) {                 //controllers file exists, so read it into ctrls object
                fs.readFile( ctrlsFile, 'utf8', function(err, data) {
                    if (err) {
                        utils.log('Could not read controllers config file ' + ctrlsFile );
                    } else {
                        if ( data.length > 0 ) {
                            ctrlsConfigUpdate = true;  //Turn off controller processing until tempCtrls copied to ctrls.
                                                       //  This will prevent controller processing until file loaded. 
                            //ctrlsTemp = JSON.parse( data );
                            ctrlsTemp = utils.mergeJsonProto( ctrlsTemp, JSON.parse( data ) );
                            ctrls = utils.mergeJsonProto( ctrls, JSON.parse( data ) );

                            //Let client know that controllers loaded and send these.
                            ctrlsLoaded = true;

                            //ctrls = JSON.parse( data );
                            utils.log('Loaded controllers config from ' + ctrlsFile + ' - Controllers: ' + ctrlsTemp.length );
                        } else {
                            utils.log( 'File ' + ctrlsFile + ' is corrupted. Using default controller configuration...' );
                        };
                    };
                    //Update lcd pages.
                    //utils.log('Updading lcd pages in updateControllers() after ctrls file read.')
                    display1.resetPages( config, ctrlsTemp );
                });
            } else {   //controllers config file does not exist, so make a new one
                fs.writeFile( ctrlsFile, JSON.stringify( ctrlsTemp ), function(err) {
                    if (err) {
                        utils.log('Could not write new controllers configuration file ' + ctrlsFile );
                    } else {
                        utils.log('Wrote new controllers configuration file ' + ctrlsFile + ' - Controllers: ' + ctrlsTemp.length );
                    };
                    //Update lcd pages.
                    //display1.resetPages( config, ctrlsTemp );
                });
            };
        });

    } else {  //Implied that ctrlAction = 'update'.
        //Overwrite controllers config file.
        //utils.log( 'Updating '+ ctrlsFile + "..." );
        fs.writeFile( ctrlsFile, JSON.stringify( ctrlsTemp ), function(err) {
            if (err) {
               utils.log('Could not update controllers configuration file ' + ctrlsFile );
            } else {
                utils.log('Updated controllers configuration file ' + ctrlsFile + ' - Controllers: ' + ctrlsTemp.length );
            };
        });
        //Update the lcd display since number of controllers may have changed.
        //utils.log( 'Updating lcd pages when controllers updated...')
        //display1.resetPages( config, ctrlsTemp );
    };
};

//--------------------------Local Utilities--------------------------------

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

//runJobs: Check if jobs exist at current time, and if so, run them once.
//  Uses the following global variables: logCompressTime (last time logCompress run; statusTime (last time status email sent).
function runJobs( timeNow ) {
    var hoursNow = timeNow.getHours();
    var minsNow = timeNow.getMinutes();

    //Check to see if compressLogFile needs to be run automatically.
    var cmpTime = config.cmpExecuteTime.split(":");
    var cmpHours = cmpTime[0];
    var cmpMins = cmpTime[1];
    
    
    //utils.log( 'hoursNow=' + hoursNow + ' cmpHours=' + cmpHours + ' minsNow=' + minsNow + ' cmpMins=' + cmpMins); 
    if (config.cmpAutoExec ) { 
        if ( hoursNow == cmpHours ) { 
            if ( minsNow == cmpMins ) {
                var lastHours = logCompressTime.getHours();
                var lastMins = logCompressTime.getMinutes();
                //utils.log( 'hoursNow=' + hoursNow + ' lastHours=' + lastHours + ' minsNow=' + minsNow + ' lastMins=' + lastMins);
                if ( minsNow !== lastMins ) {     //Prevent running compressLogFile more than once each day.
                    //utils.log( timeNow + ' - Autocompressing logfile...' );
                    compressLogFile( config );
                    logCompressTime = timeNow;
                };
            };
        };
    };
    

    //Check to see if status report needs to be sent via email/SMS.
    

};

//compressLogFile: compresses or truncates logFile via spawn to process compressLog.js
function compressLogFile ( cfgTemp ) {

    //Cause server to send showCompressBox socket to client
    //showCompressBox = true; 
    io.sockets.emit('showCompressBox'); //If client connected, show popup

    //Use correct filenames:
    var logFileName1 = dirName + '/public/' + cfgTemp.logFileName;
    var alarmsLogFile1 = alarmsLogFile;
    var logFileOutName1 = logFileOutName;
 

    //Shut off logging during file operations to prevent file contentions;
    writeToLog = false;

    //Need to execute process
    //var args = '/usr/local/bin/node /home/pi/CellarW/compressLog.js '; 
    var args = 'node ';                     //node must be available globally.
    args += __dirname + '/compressLog.js '; //Runs compressLog from local directory. 
    args += logFileName1 + ' ' + alarmsLogFile1 + ' ' + logFileOutName1 + ' ' + cfgTemp.cmpPreserve + ' ' + cfgTemp.cmpGranularity;
    var exec = require( 'child_process' ).exec;
    var timeNow = new Date();

    utils.log( timeNow + ': Running compressLog routine...');
    var child = exec( args, [], function (err, stdout, stderr) {
        if (err) {
            utils.log( 'Child process failed...');
            utils.log('Error stack: ' + err.stack);
            utils.log('Error code: ' + err.code);
            utils.log('Signal received: ' + err.signal);
            utils.log( 'stdout: ' + stdout + '\n\n' );
            utils.log( 'stderr: ' + stderr );
            writeToLog = true;
            io.sockets.emit( 'closeCompressBox', err.stack );
            //config.logIncrement = saveLogIncrement;
        } else {
            //utils.log('Finished with child process.');
            utils.log( stdout + '\n\n');
            utils.log( stderr);
        
            //Copy logfileOut.csv back to current logfile 
            fs2.copy( logFileOutName1, logFileName1, {replace: true}, function( err2 ) {
                if (err2) {
                    utils.log( 'Could not copy ' + logFileOutName1 + ' to ' + logFileName1 + ' with error code: ' + err2.code );
                    io.sockets.emit( 'closeCompressBox', err2.stack );
                } else {
                    utils.log( 'Copied ' + logFileOutName1 + ' to ' + logFileName1 + '.' );
                };
                
                
                //Add a CR at end of logfile to prevent it from concatenating next log record. Not sure why this is needed!?!
                fs.appendFile( logFileName1, '\n', function(err3) {
                    if (err3) {
                        utils.log('Could not add a CR to end of ' + logFileName1 );
                        io.sockets.emit( 'closeCompressBox', 'Could not add CR to end of ' + logFileName1 );
                    };
                });
                //Turn logging back on.
                logLast = 0;         //Reset logging increment
                writeToLog = true;   //Allow writes to logfile

                //Send another socket to let client know that logfile has been compressed.
                io.sockets.emit('closeCompressBox', false ); //If client connected, close compress box
            });
        };
     }); 
};

// If ctrl+c is hit, free resources, turn off all actuators and exit.
process.on('SIGINT', function() {
    utils.log( 'CellarWarden is shutting down after Ctrl-C (SIGNINT).', 'white', true );
    shutdown.shutDown( config, ctrls );
    //process.exit();
});

// If process is terminated, free resources, turn off all actuators and exit.
process.on('SIGTERM', function() {
    utils.log( 'CellarWarden is shutting down after termination signal received (SIGTERM).', 'white', true );
    shutdown.shutDown( config, ctrls );    
    //process.exit();
});

//Deal with uncaught exceptions...
process.on( 'uncaughtException', function( err ) {
  utils.log( 'ERROR: Caught exception in CellarWarden: ' + err, 'red', true );
});
