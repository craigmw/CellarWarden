//background.js - Checks background loop functionality.

var tpTime = 500;
var processes = 9;

function background( instance ) {
    var i = 0;
    
    setInterval( function() {
        i++;
        //console.log( i );
        process.stdout.write( '\t' + instance + '-' + i );
        if (instance == (processes-1) ) {
            process.stdout.write( '\n');
        };
    }, tpTime);
     
};

function killBackground( instance ) {
    console.log('killed instance ' + instance );
};

//Make array of background functions.
var bg = [];
for (var n=0; n < processes; n++ ) {
    bg.push( new background( n ) );
};

var m=processes;
setInterval( function() {
    m--;
    console.log( 'bg['+m+'] = ' + JSON.stringify( bg[m] ) );
    //bg.pop(m);
    //delete bg[m];
    bg[m] = new killBackground( m );
    console.log( 'bg['+m+'] = ' + JSON.stringify( bg[m] ) );
}, 2000);