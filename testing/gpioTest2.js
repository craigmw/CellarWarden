var gpio = require('rpi-gpio');
var pin = 16; 


gpio.setup(pin, gpio.DIR_OUT, write);
gpio.setMode( gpio.MODE_BCM); 

function write() {
    gpio.write(pin, false, function(err) {
        if (err) throw err;
        console.log('Written to pin');
    });
}


