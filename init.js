//init.js - initialization routines for CellarWarden

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
                        almCreateAlarmLogFile();
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
                        almCreateAlarmLogFile();
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
               almCreateAlarmLogFile(); 
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