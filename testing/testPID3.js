// testPID3.js - test pid-controller functions
var PID1 = require('./PID.js');

var temperature = 50,
    temperatureSetpoint = 65,
    heating = 0.001,
    cooling = -0.0005;

var Kp = 500,
    Ki = 200,
    Kd = 10;

var ctr = new PID1( temperature, temperatureSetpoint, Kp, Ki, Kd, PID1.DIRECT );
var PID = new PID1( temperature, temperatureSetpoint, Kp, Ki, Kd, PID1.DIRECT );
var timeframe = 1000;

console.log( 'Initial PID object - PID: ' + JSON.stringify( ctr ) );

PID.setSampleTime( ctr, timeframe );

console.log( 'After setSampleTime() - PID: ' + JSON.stringify( ctr ) );


PID.setOutputLimits(ctr, 0, timeframe);
PID.setMode( ctr, PID1.AUTOMATIC );

var temperaturesimulation = function() {
    if (typeof temperaturesimulation.counter == 'undefined') {
        temperaturesimulation.counter = 0;
    };
    PID.setInput(ctr, temperature);
    PID.compute(ctr);
    temperature += PID.getOutput( ctr ) * heating + (timeframe - PID.getOutput( ctr )) * cooling;
    if (Math.round(temperature * 100) / 100 == 21) {
        temperaturesimulation.counter++;
        if (temperaturesimulation.counter == 5) {
            PID.setMode(ctr, PID.MANUAL );
            PID.setOutput(ctr, 0);
            temperaturesimulation.counter = 0;
        };
    };
    if (Math.round(temperature * 100) / 100 == 1) {
        PID.setMode(ctr,'auto');
    };
    console.log( 'PID Parameters: ' + JSON.stringify( ctr ) );
    console.log("Output : " + PID.getOutput( ctr ) + " ; Temp : " + Math.round(temperature * 100) / 100 + " degrees C");
};
setInterval(temperaturesimulation, timeframe);
