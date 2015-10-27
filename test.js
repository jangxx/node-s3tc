var S3TC_Decoder = require('./index.js');
var fs = require('fs');

var instream = fs.createReadStream(process.argv[2]);
var decoder = new S3TC_Decoder('DXT5', 1024, 1024)
var outstream = fs.createWriteStream(process.argv[3]);

instream.pipe(decoder);
decoder.pipe(outstream);
