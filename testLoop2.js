//testLoop2.js - test setInterval handle with looping.

var tpHandle = null;

tpHandle = setInterval( testFunction, 1000, tpHandle );

function testFunction( tpHandle1 ) {
    console.log( 'tpHandle: ' + JSON.stringify( tpHandle ) );
};
