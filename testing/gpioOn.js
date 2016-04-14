//gpioOn.js - Turns a GPIO pin high. Specify gpio pin as argument.

var gpio = require('rpi-gpio');
//var pin = 12; 

var args = [];

process.argv.forEach(function (val, index, array) {
  //utils.log(index + ': ' + val);
  args[ index ] = val;
});

var pin = ( args[2] ) ? args[2] : 12;

gpio.setup(pin, gpio.DIR_OUT, write);
gpio.setMode( gpio.MODE_BCM); 

function write() {
    gpio.write(pin, true, function(err) {
        if (err) throw err;
        console.log('Written to pin');
    });
}

