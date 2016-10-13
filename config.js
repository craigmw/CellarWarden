//config.js - controls configuration for CellarWarden

exports.config = function( dirName ) {
    var cfg = {
        pwProtect: false,                       //Protect using password?
        passWord: "cellar",                     //Password, cellar as default
        configTitle: "My wine cellar",
        configFile: dirName + '/public/config.json',
        logFileName: 'logfile.csv', 
        showTooltips: true,                     //Show or hide tooltips  
        logIncrement: 30,                       //Sensor reads to wait before logging data
        logAveraging: false,	                //If true, logfile.csv data is average of reads over logIncrement reads
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
    return cfg;
};
