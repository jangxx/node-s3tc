var S3TC_Decoder = require('./index.js');
var fs = require('fs');
var PNGEncoder = require('png-stream/encoder');

if(process.argv.length < 6) {
    console.log("Usage: node converter.js <input> <width> <height> <format> [output.png]")
    console.log();
    console.log("NOTE: format is either 'DXT1' or 'DXT5'.");
    process.exit();
}

var input = process.argv[2];
var width = process.argv[3] / 1;
var height = process.argv[4] / 1;
var fmt = process.argv[5];
var output = (process.argv[6] != undefined) ? process.argv[6] : input + '.png';

var instream = fs.createReadStream(input);
var decoder = new S3TC_Decoder(fmt, width, height);
var outstream = fs.createWriteStream(output);

instream.pipe(decoder);
/*decoder.on('data', function(d) {
    console.log(d.length);
});*/
decoder.pipe(new PNGEncoder(width, height, {colorSpace: 'rgba'})).pipe(outstream);

//instream.pipe(new PNGEncoder(width, height, {colorSpace: 'rgba'})).pipe(outstream);
