var S3TC_Decoder = require('./index.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;

var instream = fs.createReadStream(process.argv[2]);
var decoder = new S3TC_Decoder('RGBA', 309, 444);
var outstream = fs.createWriteStream(process.argv[3]);
var outstream2 = fs.createWriteStream(process.argv[4]);

instream.pipe(decoder);
/*decoder.on('data', function(d) {
    //console.log(d.toString('hex'));
});*/
decoder.pipe(outstream2);

decoder.on('end', function() {
    var p = new PNG({width: 309, height: 444});
    decoder.buffer.copy(p.data);
    p.pack().pipe(outstream);
});
