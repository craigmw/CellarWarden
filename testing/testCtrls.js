//TestCtrls.js - Test new controller object.
controller = require('./controller.js');

//Test controller initialization.
var ctrls = [];
tprof = require('./tprofiles.js');
utils = require('./utils.js');

var sensorData = {            //sensorData object; used to retrieve, print and log sensor data
    time1: 0,
    temp1: 65.4,              //First DHT
    humi1: 35, 
    temp2: 75.2,              //Second DHT
    humi2: 24,
    onew1: 37,                //First DS18B20 
    onew2: 64,                //Second DS18B20
    amps1: NaN,               //Current sensor
    door1: NaN,               //Door1
    door2: NaN                //Door2 
};

//controller.addCtrl();
ctrls = controller.addCtrl( ctrls, new controller.init() );

//Add a second controller.
ctrls[0].cfg.name = 'Temp Controller1';
var ctrl1 = new controller.init();
controller.addCtrl( ctrls, ctrl1 );

//Add a third controller.
var ctrl2 = new controller.init();
controller.addCtrl( ctrls, ctrl2 );
console.log( 'Testing controller initialization and addition...');
for (i=0; i < ctrls.length; i++ ) {
    console.log( i + ': Name - ' + ctrls[i].cfg.name );
};

//Check if ctrls is valid for empty and full ctrls objects
var ctrls3 = [];
var check2 = controller.checkCtrls( ctrls );
var check3 = controller.checkCtrls( ctrls3 );
console.log( 'Valid ctrls objects - ctrl2: ' + check2 + '\tctrl3: ' + check3 ); 

//Change controllers for testing and logging.
ctrls[1].cfg.type = 'TEMP';
ctrls[1].cfg.name = 'Fermenter1';
ctrls[1].cfg.logFileName = './fermenter1.csv';
ctrls[1].cfg.sensor = 'temp1'; 
ctrls[1].cfg.endSetpoint = 65.4;
ctrls[1].cfg.hysteresis = 0;
ctrls[2].cfg.type = 'TEMP';
ctrls[2].cfg.name = 'Fermenter2';
ctrls[2].cfg.logFileName = './fermenter2.csv';
ctrls[2].cfg.sensor = 'temp2';
ctrls[2].cfg.endSetpoint = 45;

//Check to see if we can merge config data without overwriting state data.
ctrlsNew = JSON.parse( JSON.stringify( ctrls ) );
ctrlsNew[2].cfg.type = 'HUMD';
ctrlsNew[2].cfg.name = 'Humidity';
ctrlsNew[2].cfg.logFileName = './humidity.csv';
ctrlsNew[2].cfg.sensor = 'humi1'; 
ctrlsNew[2].endSetpoint = 75;
console.log( 'MERGE: ctrls.length before updateCtrlsConfig: ' + ctrls.length );
console.log( 'ctrls[2].cfg.name before: ' + ctrls[2].cfg.name );
var ctrlsTemp = controller.updateCtrlsConfig( ctrls, ctrlsNew ); 
ctrls = JSON.parse( JSON.stringify( ctrlsTemp ) );
console.log( 'MERGE: ctrls.length after updateCtrlsConfig: ' + ctrls.length );
console.log( 'ctrls[2].cfg.name after: ' + ctrls[2].cfg.name );

//Check to see if we can add an element.
console.log( 'ADD: ctrls.length before updateCtrlsConfig: ' + ctrls.length );
ctrlsNew = JSON.parse(JSON.stringify( ctrls ) );
var ctrl3 = new controller.init();
controller.addCtrl( ctrlsNew, ctrl3 );
ctrlsTemp = controller.updateCtrlsConfig( ctrls, ctrlsNew );
ctrls = JSON.parse( JSON.stringify( ctrlsTemp ) );
console.log( 'ADD: ctrls.length after updateCtrlsConfig: ' + ctrls.length );

//Check if we can delete an element.
console.log( 'DELETE: ctrls.length before updateCtrlsConfig: ' + ctrls.length );
ctrlsNew = JSON.parse(JSON.stringify( ctrls ) );
ctrlsNew[3].cfg.deleteFlag = true;
ctrlsTemp = controller.updateCtrlsConfig( ctrls, ctrlsNew );
ctrls = JSON.parse( JSON.stringify( ctrlsTemp ) );
console.log( 'DELETE: ctrls.length after updateCtrlsConfig: ' + ctrls.length );

console.log('\nController1.tprof: ' + JSON.stringify( ctrls[1].tprof ) );

//Set up a profile on controller1.
//Add first segment.
//tprof0 = new tprof.init();
//ctrls = tprof.addSegm( ctrls, 1, tprof0 );
ctrls[1].tprof = tprof.updSegm( ctrls[1].tprof, 0, 1, 20, 80, false, false );
//console.log( 'ctrls[1].tprof[0] = ' + JSON.stringify( ctrls[1].tprof[0] ) );

//Add a second segment.
tprof1 = new tprof.init(); 
ctrls = tprof.addSegm( ctrls, 1, tprof1 );
ctrls[1].tprof = tprof.updSegm( ctrls[1].tprof, 1, 1, 80, 40, false, false );
//console.log( 'ctrls[1].tprof[1] = ' + JSON.stringify( ctrls[1].tprof[1] ) );

//Add a third segment.
tprof2 = new tprof.init();
ctrls = tprof.addSegm( ctrls, 1, tprof2 );
ctrls[1].tprof = tprof.updSegm( ctrls[1].tprof, 2, 1, 40, 100, false, false );
//console.log( 'ctrls[1].tprof[2] = ' + JSON.stringify( ctrls[1].tprof[2] ) );

//Add a fourth segment
tprof3 = new tprof.init();
ctrls = tprof.addSegm( ctrls, 1, tprof3 );
ctrls[1].tprof = tprof.updSegm( ctrls[1].tprof, 3, 1, 100, -20, false, false );
//console.log( 'ctrls[1].tprof[3] = ' + JSON.stringify( ctrls[1].tprof[3] ) );

//Add a fifth segment with hold
tprof4 = new tprof.init();
ctrls = tprof.addSegm( ctrls, 1, tprof4 );
ctrls[1].tprof = tprof.updSegm( ctrls[1].tprof, 4, 1, -20, -20, false, false );
//console.log( 'ctrls[1].tprof[4] = ' + JSON.stringify( ctrls[1].tprof[4] ) );

//Turn on profile on controller1.
ctrls[1].cfg.useProfile = true;

//Change timeInc for all three controllers.
ctrls[0].cfg.tprofTimeInc = 4;
ctrls[1].cfg.tprofTimeInc = 3;
ctrls[2].cfg.tprofTimeInc = 2;

//Test writeCtrlsFile
controller.writeCtrlsFile( ctrls, './public/controllers.json' );

//List controllers tprof
//for (var n1 = 0; n1 < ctrls.length; n1++ ) {
//    console.log( n1 + ' tprof = ' + JSON.stringify( ctrls[n1].tprof ) );
//};

//List controller tprof[0].
//console.log( 'ctrls[1].tprof[0]=' + JSON.stringify( ctrls[1].tprof[0] ) );

//Test controller functions in loop.
var loopNum = 0;
setInterval( function() {
  
    //Test state changes on controller2 (fermentor 2).
    if (loopNum == 20 ) {
        sensorData.temp2 = 45; //Same as setpoint.
    };
    if (loopNum == 25) {
        sensorData.temp2 = 85;
    };
    if (loopNum == 40 ) {
        sensorData.temp2 = 35;
    };
   
    //Process the controller
    ctrls = controller.process( ctrls, sensorData );
    loopNum = loopNum + 1;
    console.log( '0: ' + ctrls[0].input + ' SP ' + ctrls[0].currSetpoint +
        '\t1: ' + ctrls[1].input + ' SP ' + ctrls[1].currSetpoint +
        '\t2: ' + ctrls[2].input + ' SP ' + ctrls[2].currSetpoint ); 
    console.log( 'Looping: ' + loopNum + ' - State0: ' + controller.getStateName( ctrls[0].currState ) + 
        ' State1: ' + controller.getStateName( ctrls[1].currState ) + 
        ' State2: ' + controller.getStateName( ctrls[2].currState ) );
}, 5000 );
