//CellarW.js - CellarWarden: Cellar monitor with temp/humidity control and alarm functionality.
//Uses DHT22 to detect temp/humidity, plus DS18B20 to check bottle temps. 
//CellarW.js is main server file. Client files are index.html and ...
//Inspiration from https://github.com/evgkib/RaspberryPi-temp, brewpi.com, etc.

var cwVersion = "1.0.2";  //CellarWarden version. Test5.
var cwDEBUG = false;      //Debugging mode? If true, suppresses error catching and allows crash.

//Dependencies
var utils = require('./utils.js');
var ctrl = require('./controller.js');
var tprof = require('./tprofiles.js');
var act = require('./actuators.js');
var tmp = require('./templates.js');
var display1 = require('./display.js');
var shutdown = require( './shutdown.js' );
var sensors = require( './sensors.js' );
var cfg = require( './config.js' );
var alm = require( './alarms.js' );
var log = require( './logging.js' );

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
var CronJob = require('cron').CronJob;



//Settings - defaults: store these in config.json; note: all pins refer to GPIO numbers

//Use relative path instead of hard-coded.
dirName = __dirname;

var logFileDirectory = dirName + '/public/';
var logFileOutName = logFileDirectory + 'logfileOut.csv';  //Name of temp file for file compression routine.
var logFileName = 'logfile.csv';                           //Name of logfile.
var ctrlsFile = logFileDirectory + 'controllers.json';     //Name of controllers file.
var serverLogFile = dirName + '/server.log';               //Name of server log


//utils.log( 'Path: ' + JSON.stringify( path.dirname)  );

//Initialize config object.
var config = cfg.config( dirName );

//Initialize sensorData object.
var sensorData = sensors.sensorData;

// reject variables, used only if config.rejectExtremes is true.
var rejectData = (JSON.parse(JSON.stringify(sensorData)));

//logData object: copy of sensorData used to send to logfile.csv
var logData = (JSON.parse(JSON.stringify( sensorData)));

// averaging variables, used only if config.logAveraging true.
var sumData = (JSON.parse(JSON.stringify( sensorData)));
var sumCount = 0;

//Initialize alarms object.
var alarmsFile = dirName + '/public/alarms.json';
var alarmsLogFile = dirName + '/public/alarmsLog.csv';
var alarms = alm.alm( dirName, alarmsFile, alarmsLogFile );

//******Global variables******
var payLoad = null;           //Use to return multiple variables from a function.
var sampleRate = 2000;        //Number milliseconds between sensor reads
//var gpioInput1 = false;
//var gpioInput2 = false;
var newCtrl = new ctrl.init();
var job0 = null;              //Cron job handle.  
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

//Setup delay to temporarily show IP address on LCD when program starts.
var showIP = true;
var showIPdelay = 60000;
setTimeout( function() {
    showIP = false;
}, showIPdelay );




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
alarms = alm.updateAlarms( alarms, 'init', config );

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
    sensorData = sensors.getSensorData( sensorData, config );

    //Reject extreme values if they exceed threshold
    if ( config.rejectExtremes ) {
        var payLoad = sensors.rejectExtremes( sensorData, rejectData, config );
        sensorData = payLoad.sensorData;
        rejectData = payLoad.rejectData;
    };
   
    //Process sensorData for display on LCD screen and client
    lcdData = display1.processSensorData( sensorData, config, alarms, ctrls, showIP, localIp );

    //Update hardware LCD display
    if (lcdHold === 0 && config.lcdExists ) {
        display1.lcdUpdateScreen( lcdData, config, alarms, 0);
    }; 

    //Sum data if logAveraging true
    if ( config.logAveraging ) {
        payLoad = log.sumAllData( sensorData, sumData, sumCount );
        sumData = payLoad.sumData;
        sumCount = payLoad.sumCount;
    };

    //Send sensorData to logfile after logIncrement reads has elapsed; also check for alarm conditions.
    payLoad = log.writeToLogfile( sensorData, logData, sumData, sumCount, logLast, alarms, config, writeToLog, logFileDirectory, logFileWritten, alarmsLogFile );
    logLast = payLoad.logLast;
    logFileWritten = payLoad.logFileWritten;
    sumCount = payLoad.sumCount;


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

}, sampleRate );
//********************************* END OF MAIN ******************************************

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
        utils.log( 'loadOwDevices socket received...');
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
        alarms = alm.updateAlarms( alarms, 'update', config );
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
        alarms= alm.almClearAll( alarms );
        alarms = alm.updateAlarms( alarms, 'update', config );
        io.sockets.emit( 'initAlarms', alarms );
    });

    //Receive request for alarms log file to be sent to client.
    socket.on( 'showAlarmsLog', function() {
        fs.readFile( alarmsLogFile, 'utf8', function(err, data) {
            if (err) {
                data = 'Could not read alarms history file.';
                utils.log( data );
            };
            socket.emit( 'alarmsLogReturn', data );
        });
    });

    //Receive clearAlarmLogFile
    socket.on( 'clearAlarmLogFile', function() {
        utils.log('Clearing alarms logfile...');
        alm.almClearAlarmLogFile( alarmsLogFile );
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
                        alm.almCreateAlarmLogFile( alarmsLogFile );
                        resetHardware();
                        resetCronJobs();
                    };
                });
            } else {                     //config file does not exist, so make a new one
                fs.writeFile(config.configFile, JSON.stringify(config), function(err) {
                    if (err) {
                        utils.log('Could not write new configuration file ' + config.configFile);
                    } else {
                        utils.log('Wrote configuration file ' + config.configFile);
                        alm.almCreateAlarmLogFile( alarmsLogFile );
                        resetHardware();
                        resetCronJobs();
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
               alm.almCreateAlarmLogFile( alarmsLogFile ); 
               resetHardware();
               resetCronJobs();
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

    //Shut down all actuators.
};  

//resetCronJobs: Sets up or resets cron to run jobs at specified times.
function resetCronJobs() {

    //Kill cron job if it already exists. Prevents recursive cron jobs.
    if ( job0 !== null ) {
        job0.stop();
    };

	//Set up cronjob to compress logfile (if cmpAutoExec true )
    if ( config.cmpAutoExec ) {
	    var cmpTime = config.cmpExecuteTime.split(":");
        var cmpHours = cmpTime[0];
        var cmpMins = cmpTime[1];
        var cronString = cmpMins + ' ' + cmpHours + ' * * *';
	    utils.log( 'Setting up cronjob to compress logfile at ' + config.cmpExecuteTime + '. cron ' + cronString );    
        job0 = new CronJob( cronString, function() {
            compressLogFile ( config );
        }, null, true, null );
    };

    //Set up cronjob to send a status report.

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

/*
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
*/

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


if ( cwDEBUG == false ) {
    //Deal with uncaught exceptions...
    process.on( 'uncaughtException', function( err ) {
        utils.log( 'ERROR: Caught exception in CellarWarden: ' + err, 'red', true );
    });
};    
