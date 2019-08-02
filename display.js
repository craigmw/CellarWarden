//Display.js - Adds LCD display capabilities to CellarWarden.
//  Used to update hardware and virtual LCD displays.

//Requires
var Lcd = require('lcd');
var iLcd = require('lcdi2c');
var justify = require('justify');
var utils = require('./utils.js');

//Local Variables
//lcdData object; used to print data and messages to virtual and hardware LCD screens
var lcdData = { 
    lcdRow0: '',
    lcdRow1: '',
    lcdRow2: '',
    lcdRow3: ''
};
var lcdPage = 0;        //Current lcd page to display (increments each cycle until lcdPages reached)
var lcdPages = 1;       //Total number of pages to display. Calculated by resetPages();  
var lcdCtrlIndex = 0;
var lcdPause = false;
var ctrlPages = 0;
var ctrlsDisplay = [];  //Array of the indexes of valid (active) controllers to display.

//State variables from controller.js //Fix this. Should be able to get these constants from module.exports.
var st_OFF =       0;
var st_IDLE =      1;
var st_COOL =      2;
var st_COOLWAIT =  3;
var st_HEAT =      4;
var st_HEATWAIT =  5;
var st_DEHUM =     6;
var st_DEHUMWAIT = 7;
var st_HUMI =      8;
var st_HUMIWAIT =  9;
var st_PAUSE =     10;
var st_RESET =     11;
var st_atCOOL =    12;
var st_atHEAT =    13;
var st_MANCOOL =   14;
var st_MANHEAT =   15;
var st_INIT =      16;

var st_name = [];
st_name[0] = 'Off';
st_name[1] = 'Idling';
st_name[2] = 'Cooling';
st_name[3] = 'Waiting to Cool';
st_name[4] = 'Heating';
st_name[5] = 'Waiting to Heat';
st_name[6] = 'Dehumidifying';
st_name[7] = 'Waiting to Dehum.';
st_name[8] = 'Humidifying';
st_name[9] = 'Waiting to Hum.';
st_name[10] = 'Paused';
st_name[11] = 'Resetting';
st_name[12] = 'Cool Autotuning'
st_name[13] = 'Heat Autotuning'
st_name[14] = 'Manual Cooling'
st_name[15] = 'Manual Heating'
st_name[16] = 'Initializing'

//initializeLcd - initializes lcd hardware for display
exports.initializeLcd = function( config, ctrls ) {
	switch( config.lcdType ) {
		case 0:
            lcd = new Lcd( {rs: config.lcdRsPin, e: config.lcdEPin, 
                data: [ config.lcdDataPin0, config.lcdDataPin1, config.lcdDataPin2, config.lcdDataPin3 ],
                cols: config.lcdCols, rows:config.lcdRows } );
            break;
        case 1:
            var lcdI_address =  '0x' + config.lcdI2cAddress;
            lcdI = new iLcd( config.lcdI2cBus, lcdI_address, config.lcdCols, config.lcdRows );
            if ( lcdI == null ) {
                utils.log( 'Error: Unable to initiate hardware LCD panel at address 0x' + 
                    config.lcdI2cAddress + ' on I2C bus ' + config.lcdI2cBus + '.' );

                //Turn off LCD and exit.
                config.lcdExists = false;
                return;
            };
            lcdI.on();
            break;
        default:
            lcd = new Lcd( {rs: config.lcdRsPin, e: config.lcdEPin, 
                data: [ config.lcdDataPin0, config.lcdDataPin1, config.lcdDataPin2, config.lcdDataPin3 ],
                cols: config.lcdCols, rows:config.lcdRows } );
    };    
    this.resetPages( config, ctrls );
    utils.log('LCD panel set up.');  
};

//resetPages - resets lcd pages; do on startup and after updating controllers (in of addition or deletion)
//  Also, enumerates number of valid controller pages so that these can be displayed.
//  config - configuration object
//  ctrls - array of controller objects
exports.resetPages = function( config, ctrls ) {
    //Pause display processing so we don't run into a buffer overrun if controller deleted.
    lcdPause = true;
    lcdPage = 0;
    lcdCtrlIndex = 0;
    ctrlsDisplay = [];
    for ( var n1 = 0; n1 < ctrls.length; n1++ ) {
        if ( ctrls[n1].cfg.activate ) {
            ctrlsDisplay.push( n1 );
        }; 
    };
    lcdPages = 1 + ctrlsDisplay.length;
    lcdPause = false;
};

//processSensorData - used to process sensor data for LCD screen and client display
//  data - sensor data object from main program
//  config - configuration object
//  ctrls - array of controller objects
//  showIP - flag to show IP address on 1st page (page 0)
//  localIp - local IP address object
//  returns - lcdData object 
exports.processSensorData = function( data, config, alarms, ctrls, showIP, localIp ) {
    //Don't do lcd processing if display variables have changed.
    if ( lcdPause ) {
        return lcdData;
    };

    //Make an lcdData object to return.
    var returnData = JSON.parse( JSON.stringify ( lcdData ));

    var tempString = '';
    var tempScale1 = config.tempScale;
    var cols = config.lcdCols;
    
    //Print first page; if no controllers to display, always just show page 0.         
    if ( lcdPage == 0 || ctrlsDisplay.length == 0 ) {

        //Line 0 - date/time
        var strings = data.time1.split(' ');
        tempString = justify( strings[0], strings[1], cols );  
        returnData.lcdRow0 = tempString;

        //Line 1 - DHT1 temp.
        tempString = justify( 'Cellar Temp:', data.temp1.toFixed(2) + tempScale1, cols );
        returnData.lcdRow1 = tempString;

        //Line 2 - DHT1 humd.
        tempString = justify( 'Cellar Humd:', data.humi1.toFixed(2) + '%', cols );
        returnData.lcdRow2 = tempString;

        //Line 3 - IP, onew1 or alarm string.
        if ( alarms.alarmString !== "" ) {
            returnData.lcdRow3 = alarms.alarmLcdString;
        } else {
            if ( showIP ) { 
                returnData.lcdRow3 = justify( 'IP: ', localIp.address(), cols );
            } else {
                tempString = (config.DS18label1 == '') ? 'onew1' : config.DS18label1;
                returnData.lcdRow3 = justify( tempString + ':', data.onew1.toFixed(2) + tempScale1, cols );
            };
        };

    } else {

        //Determine index for controller to display.
        var n = ctrlsDisplay[lcdCtrlIndex];
        
        //Line 0 - name
        returnData.lcdRow0 = justify( 'Ctrl ' + n + ':', ctrls[n].cfg.name, cols );
 
        //Line 1 - input and sensor name
        //if (ctrls[n].input == null ) { ctrls[n].input = NaN };
        tempString = ctrls[n].cfg.type == 'TEMP' ? tempScale1 : '%RH';
        returnData.lcdRow1 = justify( 'PV: ' + ctrls[n].input.toFixed(2) + tempString, ctrls[n].cfg.sensor, cols );
                
        //Line 2 - setpoint and output
        if ( ctrls[n].cfg.coolCtrlMode == 'PID' || ctrls[n].cfg.heatCtrlMode == 'PID' ) {
            tempString = 'OutP: ';
        } else {
            tempString = 'OutH: ';
        };
                
        returnData.lcdRow2 = justify( 'SP: ' + ctrls[n].currSetpoint.toFixed(1), tempString + ctrls[n].output.toFixed(0) + '%', cols );   

        //Line 3 - controller type and state
        if (ctrls[n].cfg.type == 'TEMP' ) {
            tempString = justify( st_name[ctrls[n].currState], null, cols );
        } else {
            switch ( ctrls[n].currState ) {
                case st_COOL:
                    tempString = justify( st_name[st_DEHUM], null, cols );
                    break;
                case st_COOLWAIT:
                    tempString = justify( st_name[st_DEHUMWAIT], null, cols );
                    break;
                case st_HEAT:
                    tempString = justify( st_name[st_HUMI], null, cols );
                    break;
                case st_HEATWAIT:
                    tempString = justify( st_name[st_HUMIWAIT], null, cols );
                    break;
                default:
                    tempString = justify( st_name[ ctrls[n].currState ], null, cols );
            };
        };
        if ( ctrls[n].cfg.pidAutoTune !== '' ) {
            tempString = ( ctrls[n].cfg.pidAutoTune == 'cool' ? 'AC ' : 'AH ') + tempString;
        };
        returnData.lcdRow3 = tempString; 
                  
        //Increment lcdCtrlIndex to display next controller on next round. Reset to zero if at end.
        lcdCtrlIndex++;
        if ( lcdCtrlIndex == ctrlsDisplay.length ) {
            lcdCtrlIndex = 0;
        };
    };

    //Increment lcdPage. Reset lcdPage to zero if we reach totalPages.
    lcdPage++;
    if ( lcdPage == lcdPages ) {
        lcdPage = 0;
    };
    
    lcdData = JSON.parse( JSON.stringify( returnData ) );
    return( returnData );
}; 

//lcdUpdateScreen - used to send messages/data to 20 x 4 LCD screen
exports.lcdUpdateScreen = function( data, config, alarms, delay ) {
    if ( lcdPause ) {
        return;
    };

    var cols = config.lcdCols;

    switch ( config.lcdType ) {
        case 0:
    
            //Print line 0
            lcd.setCursor(0, 0);
            lcd.print( data.lcdRow0.substring(0, cols ) );

            //Print line 1
            lcd.once('printed', function() {
                if ( config.lcdRows > 1 ) {
                    lcd.setCursor(0, 1);
                    lcd.print( data.lcdRow1.substring(0, cols ) );
                };

                //Print line 2
                lcd.once('printed', function() {
                    if ( config.lcdRows > 2 ) {
                        lcd.setCursor(0, 2);
                        lcd.print( data.lcdRow2.substring(0, cols ) );
                    };

                    //Print line 3
                    lcd.once('printed', function() {
                        if (config.lcdRows > 3 ) { 
                            lcd.setCursor(0, 3);
                            lcd.print( data.lcdRow3.substring(0, cols ) );
                        };
                    });
                });
            });
            setTimeout(function() {
                //Just wait
            }, delay);
            break;
        case 1:
            //Print line 1
            lcdI.clear();
            if ( lcdI.error ) { 
            	lcdErrorHandler( lcdI.error, config );
            } else {
                lcdI.println( data.lcdRow0, 1 );
                if ( lcdI.error ) {
                	lcdErrorHandler( lcdI.error, config );
                } else {
                    //Print line 2
                    if ( config.lcdRows > 1 ) {
                        lcdI.println( data.lcdRow1, 2 );
                    };
                    if ( lcdI.error ) {
                        lcdErrorHandler( lcdI.error, config ); 
                    } else {
                        //Print line 3
                        if ( config.lcdRows > 2 ) {
                            lcdI.println( data.lcdRow2, 3 );
                        };
                        if( lcdI.error ) {
                        	lcdErrorHandler( lcdI.error, config );
                        } else {
                            //Print line 4  
                            if ( config.lcdRows > 3 ) {
                                lcdI.println( data.lcdRow3, 4 );
                            };
                            if ( lcdI.error ) {
                            	lcdErrorHandler( lcdI.error, config );
                            };
                        };
                    };
                };    
            };                   
            break;
        default:
            utils.log( 'Error: Unable to determine hardware LCD type.');
    };
};

//lcdErrorHandler() - Turns off lcd display processing if error detected.
//  err - error code
//  config - configuration object
function lcdErrorHandler( err, config ) {
	utils.log( 'Unable to connect to LCD over I2C bus ' + config.lcdI2cBus + ' at address ' + 
		config.lcdI2cAddress + '. Error: ' + JSON.stringify( err ), 'red', true, true );

	//Turn off further LCD processing.
	config.lcdExists = false;
};

//killLcd - turns off lcd panel if Ctrl-C pressed
//  config - configuration object
exports.killLcd = function( config ) {
    if (config.lcdExists ) {
        switch( config.lcdType ) {
            case 0:
                lcd.clear();
                lcd.close();
                break;
            case 1:
                lcdI.clear();
                lcdI.off();
                break;
            default:
        };
        utils.log( 'LCD panel turned off.' );
    };
};
