'use strict';

var gpio     = require('r-pi-gpio');
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var main = function () {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    var defaultPin = 4;

    rl.question('pin (default ' + defaultPin + '): ', function (response) {
        rl.close();

        var pin     = parseInt(response, 10);
        var trigger = gpio.createOutput(isNaN(pin) ? defaultPin : pin);

        var level;

        setInterval(function () {
            trigger(level = !level);
        }, 500);
    });
};

gpio.init(function (error) {
    if (error) {
        console.log(error);
    } else {
        main();
    }
});
