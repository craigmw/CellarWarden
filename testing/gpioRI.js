var gpio = require('rpi-gpio');
var pin1 = 12; //19
var pin2 = 17;
var delay = 1000;
 
gpio.setup(pin1, gpio.DIR_IN, readInput);
gpio.setMode( gpio.MODE_BCM);
 
function readInput() {
    gpio.read(pin1, function(err, value) {
        console.log('The value is ' + value + '. The err is ' + '.');
    });
}

setInterval(function(){
    
    readInput();

}, delay );
