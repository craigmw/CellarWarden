//testPIDtune.js - Test PID autotuning.
var PID = require('pid-controller');
var PID_ATune = require('./atPID.js');

var ATuneModeRemember = 2;
var input = 80; 
var output = 50;
var setpoint = 180;
var kp = 2;
var ki = 0.5;
var kd = 2;

var kpmodel = 1.5;
var taup = 100;
var theta = new Array(50);
var outputStart = 5;
var aTuneStep = 50; 
var aTuneNoise = 1;
var aTuneStartValue = 100;
var aTuneLookBack = 20;

var tuning = true;
var modelTime;
var serialTime;

var loopTime = 400;

var myPID = new PID( input, output, setpoint,kp,ki,kd, PID.DIRECT );
var aTune = new PID_ATune( input, output);

//set to false to connect to the real world
var useSimulation = true;

//Set it up and then run the loop.
setup();
var loop = setInterval(loop, loopTime );

function setup() {
    if( useSimulation) {
        for( var i = 0; i < 50; i++ ) {
            theta[i] = outputStart;
        };
        modelTime = 0;
    };
    //Setup the pid 
    myPID.setMode( PID.AUTOMATIC );

    if( tuning ) {
        tuning = false;
        changeAutoTune();
        tuning = true;
    };
  
    serialTime = 0;
    //Serial.begin(9600);

    //Show initial parameters.
    console.log("Initial parameters...");
    SerialSend( 0 );
    
};

var m = 0;
function loop() {

    m++;
    /*
    //Toggle tuning mode off to view calculated variables.
    if ( m == 50) {
    	m = 0;
    	//tuning = false;
    } else {
        m++;
    	//tuning = true;
    };
    */ 
    var now = myPID.millis();

    if( !useSimulation ) { //pull the input in from the real world
        //input = analogRead(0);
    };
  
    if( tuning ) {
        var val = ( aTune.Runtime() );
        if ( val != 0 ) {
            tuning = false;
        };
        if( !tuning ) { //we're done, set the tuning parameters
            kp = aTune.GetKp();
            ki = aTune.GetKi();
            kd = aTune.GetKd();
            myPID.setTunings(kp,ki,kd);
            AutoTuneHelper(false);

            console.log( 'Tuning completed. kp: ' + kp + '\tki: ' + ki + '\tkd: ' + kd );

            clearInterval( loop );
        };
    } else {
    	myPID.compute();
    };	
  
    if( useSimulation ) {
        theta[30] = output;
        if( now >= modelTime ) {
            modelTime += 100; 
            DoModel();
        };
    } else {
        //analogWrite( 0, output ); 
    };
  
    //send-receive with processing if it's time
    if( myPID.millis() > serialTime ) {
    //    SerialReceive();
        SerialSend( m );
        serialTime += 500;
    };
};

function changeAutoTune() {
    if(!tuning) {
        //Set the output to the desired starting frequency.
        output = aTuneStartValue;
        aTune.SetNoiseBand( aTuneNoise );
        aTune.SetOutputStep( aTuneStep );
        aTune.SetLookbackSec( aTuneLookBack );
        AutoTuneHelper( true );
        tuning = true;
    } else { //cancel autotune
        aTune.Cancel();
        tuning = false;
        AutoTuneHelper( false );
    };
};

function AutoTuneHelper( start ) {
    if( start ) {
        ATuneModeRemember = myPID.getMode();
    } else {
        myPID.setMode(ATuneModeRemember);
    };
};


function SerialSend( index ) {
    console.log( index + " - setpoint: " + setpoint + "\tinput: " + input + "\toutput: " + output );
    console.log( "noiseband: " + aTune.GetLookbackSec() + "\toStep: " + aTune.GetOutputStep() + 
        "\tkp: " + aTune.GetKp() + "\tki: " + aTune.GetKi() + "\tkd: " + aTune.GetKd() );   

    if( tuning ){
        console.log( "tuning mode" );
    } else {
        console.log( "kp: " + myPID.getKp() + "\t\tki: " + myPID.getKi() + "\t\tkd: " + myPID.getKd() );
    };
};

/*
function SerialReceive() {
    if( Serial.available() ) {
        char b = Serial.read(); 
        Serial.flush(); 
       if( ( b == '1' && !tuning ) || ( b != '1' && tuning ) ) changeAutoTune();
  }
}
*/

function DoModel() {
    //cycle the dead time
    for( var i = 0; i < 49; i++) {
        theta[i] = theta[i+1];
    };
    //compute the input
    input = ( kpmodel / taup ) * (theta[0] - outputStart ) + input * ( 1 - 1 / taup ) + ( random( -10, 10) ) / 100;
};

function random( low, high ) {
    return Math.random() * (high - low) + low;
};

