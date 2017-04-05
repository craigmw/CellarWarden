//alarms.js - adds alarm functionality to CellarWarden. Test1

var utils = require( './utils.js' );

var fs = require( 'fs' );
var nodemailer = require('nodemailer');

var alarmsFile = '';
var alarmsLogFile = '';


//Alarm variables
//  Alarms based on temp (can pick between temp1/2, OW1/2), door (open or closed), or power (amps low or high)
exports.alm = function( dirName, almFile, almLogFile ) {
    alarmsFile = almFile;
    alarmsLogFile = almLogFile;
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
    };
    return alarms;          
};


//Alarm processing stuff
// checkAlarms: checks to see if an alarm has triggered. Returns true if alarm condition met.
module.exports.checkAlarms = function( alarms1, sData, config ) {
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
            var triggerRet = almTrigger( alarms1.tempTime1, alarms1.tempDur1, condString, alarms1, series, config );
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
            var triggerRet = almTrigger( alarms1.tempTime2, alarms1.tempDur2, condString, alarms1, series, config );
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
            var triggerRet = almTrigger( alarms1.humiTime1, alarms1.humiDur1, condString, alarms1, series, config );
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
            var triggerRet = almTrigger( alarms1.humiTime2, alarms1.humiDur2, condString, alarms1, series, config );
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
            var triggerRet = almTrigger( alarms1.doorTime1, alarms1.doorDur1, condString, alarms1, series, config );
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
            var triggerRet = almTrigger( alarms1.doorTime2, alarms1.doorDur2, condString, alarms1, series, config );
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
function almTrigger( timeStamp, duration, condString, alarms2, series1, config ) {
    
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
            alarms2 = updateAlms( alarms2, 'update', config );
           
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
            if( alarms2.suppress ) {
                // Turn off alarm checking to prevent multiple emails. Must be reactivated manually. 
                alarms2.alarmsOn = false;
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
module.exports.almClearAll =function( almData ) {
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
    return ( almData );
};

//almCreateAlarmLogFile: creates alarm logfile if it does not exist.
module.exports.almCreateAlarmLogFile = function( almsLogFile ) {
    if (!utils.fileExists( almsLogFile ) ) {
    	fs.writeFile( alsLogFile, "", function(err){
    		if (err ) {
    			utils.log('Unable to create alarms logfile ' + almsLogFile );
    		} else {
    		    utils.log('Created alarms logfile ' + almsLogFile );	
    		};
    	});
    };
};

//almClearAlarmLogFile: clears out alarm logfile
module.exports.almClearAlarmLogFile = function( almsLogFile ) {
    //Overwrite alarms logfile by writing blank string.
    fs.writeFile( almsLogFile, "", function(err) {
        if (err) {
            utils.log('Could not overwrite alarms logfile ' + almsLogFile );
        } else {
            utils.log('Cleared alarms logfile ' + almsLogFile );
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

//If client has updated alarms.json (or on startup), reload this file. Also, initialize alarm process.
module.exports.updateAlarms = function( alarms, alarmsAction, cfg ) {
    return ( updateAlms( alarms, alarmsAction, cfg ) );
};

//Local update alarms function called by exported function.
function updateAlms( alarms, alarmsAction, cfg ) {

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
    return ( alarms );
};
