//tpTest3.js - tests time proportioning with LED output. Multiple controllers with objects stored in array. 
//  Uses actuators.js and tpWindow.js modules.
var gpio = require('rpi-gpio');
var act = require('./actuators.js');
var tpTimer = require('./tpTimer.js');
var utils = require('./utils.js');

var tpWin = 4;
var loopDelay = 12;
var loop = 0;

var ctrls = [
    {
        name : 'Ctrl_0',
        cfg : {
            coolPin : 21,
            coolDelay : 0,
            coolUsePwm : false,
            coolPinInvert : true, 
            coolTpWindow : tpWin,
            heatPin : null,
            heatPinRegd : false,
            heatDelay : 0,
            heatUsePwm : false,
            heatPinInvert : false,
            heatTpWindow : 2
        },
        output : 90,
        coolDelayOn : false,
        heatDelayOn : false,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolPinRegd: false,
        heatPinRegd: false,
    },
    {
        name : 'Ctrl_1',
        cfg : {
            coolPin : 16,
            coolDelay : 0,
            coolUsePwm : false,
            coolPinInvert : true, 
            coolTpWindow : tpWin,
            heatPin : null,
            heatPinRegd : false,
            heatDelay : 0,
            heatUsePwm : false,
            heatPinInvert : false,
            heatTpWindow : 2
        },
        output : 90,
        coolDelayOn : false,
        heatDelayOn : false,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolPinRegd: false,
        heatPinRegd: false,
    },
    {
        name : 'Ctrl_2',
        cfg : {
            coolPin : 12,
            coolDelay : 0,
            coolUsePwm : false,
            coolPinInvert : true, 
            coolTpWindow : tpWin,
            heatPin : null,
            heatPinRegd : false,
            heatDelay : 0,
            heatUsePwm : false,
            heatPinInvert : false,
            heatTpWindow : 2
        },
        output : 90,
        coolDelayOn : false,
        heatDelayOn : false,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolPinRegd: false,
        heatPinRegd: false,
    },
    {
        name : 'Ctrl_3',
        cfg : {
            coolPin : 24,
            coolDelay : 0,
            coolUsePwm : false,
            coolPinInvert : true, 
            coolTpWindow : tpWin,
            heatPin : null,
            heatPinRegd : false,
            heatDelay : 0,
            heatUsePwm : false,
            heatPinInvert : false,
            heatTpWindow : 2
        },
        output : 90,
        coolDelayOn : false,
        heatDelayOn : false,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolPinRegd: false,
        heatPinRegd: false,
    },
    {
        name : 'Ctrl_4',
        cfg : {
            coolPin : 13,
            coolDelay : 0,
            coolUsePwm : false,
            coolPinInvert : true, 
            coolTpWindow : tpWin,
            heatPin : null,
            heatPinRegd : false,
            heatDelay : 0,
            heatUsePwm : false,
            heatPinInvert : false,
            heatTpWindow : 2
        },
        output : 90,
        coolDelayOn : false,
        heatDelayOn : false,
        tpWindowStart : 0,
        tpSampleRate : 0, 
        tpHandle : null,
        coolPinRegd: false,
        heatPinRegd: false,
    }
];

var i = 0;

//Kill all gpio pins, then set them up and call mainLoop.
gpio.destroy( function() {
    utils.log('Turned off all gpio pins');

    //Initialize gpio pins.
    for ( i = 0; i < ctrls.length; i++ ) {
        utils.log( 'ctrls[' + i + '].cfg.coolPin: ' + ctrls[i].cfg.coolPin );
        act.gpioInit( ctrls, i );
    };
    setTimeout( mainLoop, 2000 );
});

//Test each actuator (setActuator) using non-inverted output.
utils.log( 'Non-inverted output: \n\n');
for ( i = 0; i < ctrls.length; i++ ) {
	utils.log( 'Testing non-inverted output on pin ' + ctrls[i].cfg.coolPin );
    ctrls[i].cfg.coolPinInvert = false;  
	act.setActuator( ctrls, i, 'cool', true, false ); 
};

//Now wait and repeat using inverted output.
setTimeout( function() {
	utils.log( 'Inverted output: \n\n'); 
    for ( i = 0; i < ctrls.length; i++ ) {
	    utils.log( 'Testing inverted output on pin ' + ctrls[i].cfg.coolPin );
        ctrls[i].cfg.coolPinInvert = true;  
	    act.setActuator( ctrls, i, 'cool', true, false ); 
    };
}, 4000 );     

//Setup tpHandle array.
tpTimer.tpHandleSetup( ctrls );

//Set up main loop to call tpTimer routine.
function mainLoop() {
    setInterval( function() {
        for (var n = 0; n < ctrls.length; n++ ) {

            ctrls[n].output = randomInt( 0, 100 );
            utils.log( loop + ' - ' + ctrls[n].name + ' output: ' + ctrls[n].output );
            //utils.log( 'ctrls[' + n + ']: ' + JSON.stringify( ctrls[n] ) ); 
            //utils.log( 'Top of main loop.');

            //Setup tpTimer if it doesn't exist.
            tpTimer.tpTimerInit( ctrls, n, 'cool' );
            if (loop == 5) {
                //tpTimer.tpTimerKill( ctrls, n );
            };
            //utils.log( 'ctrls[' + n + ']: ' + JSON.stringify( ctrls[n] ) ); 
        }; 
        if (loop == 5) {
            loop = 0;
        } else {
            loop++;
        };
    }, loopDelay * 1000 ); 
};


function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
};

