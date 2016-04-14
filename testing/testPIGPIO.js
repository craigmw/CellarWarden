//testPIGPIO.js - Test the pigpio library to use pwm to control output from a gpio pin.

var pin = 23;

var Gpio = require('pigpio').Gpio;
var led = new Gpio(pin, {mode: Gpio.OUTPUT}),
  dutyCycle = 0;
 
setInterval(function () {
  led.pwmWrite(dutyCycle);
 
  dutyCycle += 5;
  if (dutyCycle > 255) {
    dutyCycle = 0;
  }
}, 20);
