var gpio = require('rpi-gpio');
var pin1 = 19; //19 okay, 17 doesn't work
var pin2 = 12;
var pin3 = 18;
var delay = 1000;
var val1 = NaN;
var val2 = NaN;
var err1 = '';
var err2 = '';
var toggle = false;
 
gpio.setup(pin1, gpio.DIR_IN, gpioRead );
gpio.setup(pin2, gpio.DIR_IN, gpioRead );
gpio.setup(pin3, gpio.DIR_OUT, gpioWrite );
gpio.setMode( gpio.MODE_BCM);
 
function gpioRead() {
    gpio.read(pin1, function(err, value) {
        val1 = value;
        err1 = err;
    });
    gpio.read(pin2, function(err, value) {
        val2 = value;
        err2 = err;
    });
    process.stdout.write('GPIO' + pin1 + ': ' + val1 + ': ' + err1 + '  -  GPIO' + pin2 + ': ' + val2 + ': ' + err2 + ' | ' );
};

function gpioWrite() {
    gpio.write(pin3, toggle ? true : false, function(err) {
        var err1 = err;
    });
    console.log( 'Toggle: ' + toggle + '  -  Error: ' + err1 );
    toggle = toggle ? false: true;
};

setInterval(function(){
    
    gpioRead();
    gpioWrite();

}, delay );
