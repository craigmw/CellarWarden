//sockets.js - socket i/o routines for CellarWarden

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
                data = 'Could not read alarms history file.';
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
