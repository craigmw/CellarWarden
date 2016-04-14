var gpio = require('gpiojs');
var pin = 12; //GPIO pin number
var toggle = 0; //Toggle between 0 and 1
var delay = 1000;


//Set up port
gpio.setMode( pin, 'out', function(){
  console.log("Port " + pin + " ready for writing");
});


setInterval(function(){
    
    if (toggle == 0 ) {
        toggle = 1;
        gpio.set( pin, 1, function(){
            console.log("Set port " + pin + " to high");
        });
    } else {
        toggle = 0;
        gpio.set( pin, 0, function(){
            console.log("Set port " + pin + " to low");
        });
    };
}, delay );
