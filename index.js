var util = require('util');
var Transform = require('stream').Transform;

util.inherits(S3TC_Decoder, Transform);

var decoders = {
    'DXT5': {
        buf_size: 16,
        fn: function(in_buf) {
            var out_buf = new Buffer(4 * 4 * 4); //width * height * argb

            var alpha0 = in_buf.readUInt8(0);
            var alpha1 = in_buf.readUInt8(1);
            var a_raw = [in_buf.readUInt8(7), in_buf.readUInt8(6), in_buf.readUInt8(5), in_buf.readUInt8(4), in_buf.readUInt8(3), in_buf.readUInt8(2)];
            var color0 = RGB565_to_RGB888(in_buf.readInt16LE(8));
            var color1 = RGB565_to_RGB888(in_buf.readInt16LE(10));
            var c = [in_buf.readUInt8(12), in_buf.readUInt8(13), in_buf.readUInt8(14), in_buf.readUInt8(15)];

            var a = [
                0x7 & (a_raw[5] >> 0),
                0x7 & (a_raw[5] >> 3),
                0x7 & (((0x1 & a_raw[4]) << 2) + (a_raw[5] >> 6)),
                0x7 & (a_raw[4] >> 1),
                0x7 & (a_raw[4] >> 4),
                0x7 & (((0x3 & a_raw[3]) << 1) + (a_raw[4] >> 7)),
                0x7 & (a_raw[3] >> 2),
                0x7 & (a_raw[3] >> 5),
                0x7 & (a_raw[2] >> 0),
                0x7 & (a_raw[2] >> 3),
                0x7 & (((0x1 & a_raw[1]) << 2) + (a_raw[2] >> 6)),
                0x7 & (a_raw[1] >> 1),
                0x7 & (a_raw[1] >> 4),
                0x7 & (((0x3 & a_raw[0]) << 1) + (a_raw[1] >> 7)),
                0x7 & (a_raw[0] >> 2),
                0x7 & (a_raw[0] >> 5)
            ];

            //console.log(a, a_raw, in_buf.slice(2,8).toString('hex'));

            for(var i = 0; i < 16; i++) {
                var e = Math.floor(i / 4); //current element

                //console.log(3 & (c[e] >> (8-(i+1-e*4)*2)));

                out_buf.writeUInt8(c2value(3 & c[e], color0.r, color1.r) , (i*4)+0); //red
                out_buf.writeUInt8(c2value(3 & c[e], color0.g, color1.g) , (i*4)+1); //blue
                out_buf.writeUInt8(c2value(3 & c[e], color0.b, color1.b) , (i*4)+2); //green
                out_buf.writeUInt8(a2value(a[i]), (i*4)+3); //alpha

                c[e] = c[e] >> 2;
                //console.log(out_buf);
            }

            return out_buf;

            function c2value(code, color0, color1) {
                switch(code) {
                    case 0: return color0;
                    case 1: return color1;
                    case 2: return (color0 + color1 + 1) >> 1;
                    case 3: return (color0 + color1 + 1) >> 1;
                }
            }

            function a2value(code) {
                if(alpha0 > alpha1) {
                    switch(code) {
                        case 0: return alpha0;
                        case 1: return alpha1;
                        case 2: return (6*alpha0 + 1*alpha1)/7;
                        case 3: return (5*alpha0 + 2*alpha1)/7;
                        case 4: return (4*alpha0 + 3*alpha1)/7;
                        case 5: return (3*alpha0 + 4*alpha1)/7;
                        case 6: return (2*alpha0 + 5*alpha1)/7;
                        case 7: return (1*alpha0 + 6*alpha1)/7;
                        default: console.log(code);
                    }
                } else {
                    switch(code) {
                        case 0: return alpha0;
                        case 1: return alpha1;
                        case 2: return (4*alpha0 + 1*alpha1)/5;
                        case 3: return (3*alpha0 + 2*alpha1)/5;
                        case 4: return (2*alpha0 + 3*alpha1)/5;
                        case 5: return (1*alpha0 + 4*alpha1)/5;
                        case 6: return 0;
                        case 7: return 255; //why, what, WHY???
                        default: console.log(code);
                    }
                }
            }
        },
        add_to_buffer: addEXTbufferToOutbuffer
    },
    '__DXT3': {
        buf_size: 16,
        fn: function(in_buf, out_buf) {
            //unfinished
        }
    },
    'DXT1': {
        buf_size: 8,
        fn: function(in_buf) {
            var out_buf = new Buffer(4 * 4 * 4); //width * height * argb

            var color0 = RGB565_to_RGB888(in_buf.readInt16LE(0));
            var color1 = RGB565_to_RGB888(in_buf.readInt16LE(2));
            var c = [in_buf.readUInt8(4), in_buf.readUInt8(5), in_buf.readUInt8(6), in_buf.readUInt8(7)];

            var test = [];

            for(var i = 0; i < 16; i++) {
                var e = Math.floor(i / 4); //current element

                test.push({'r': (color0.r > color1.r), 'g': (color0.g > color1.g), 'b': (color0.b > color1.b)});

                out_buf.writeUInt8(c2value(3 & c[e], color0.r, color1.r) , (i*4)+0); //red
                out_buf.writeUInt8(c2value(3 & c[e], color0.g, color1.g) , (i*4)+1); //blue
                out_buf.writeUInt8(c2value(3 & c[e], color0.b, color1.b) , (i*4)+2); //green
                out_buf.writeUInt8(255, (i*4)+3); //alpha

                c[e] = c[e] >> 2;
            }

            return out_buf;

            function c2value(code, color0, color1) {
                if(color0 > color1) {
                    switch(code) {
                        case 0: return color0;
                        case 1: return color1;
                        case 2: return (2*color0 + color1) / 3;
                        case 3: return (color0 + 2*color1) / 3;
                    }
                } else {
                    switch(code) {
                        case 0: return color0;
                        case 1: return color1;
                        case 2: return (color0 + color1 + 1) >> 1;
                        case 3: return (color0 + color1 + 1) >> 1;
                    }
                }
            }
        },
        add_to_buffer: addEXTbufferToOutbuffer
    }
}

//fmt = 'DXT1', 'DXT3', 'DXT5'
function S3TC_Decoder(fmt, width, height, options) {
    if(!(fmt in decoders)) throw new Error('Invalid format');

    Transform.call(this, options);

    this._width = width;
    this._height = height;
    this._fmt = fmt;
    this.buffer = new Buffer(width * height * 4);
    this._restChunk;
    this._currentX = 0;
    this._currentY = 0;
}

S3TC_Decoder.prototype._transform = function(chunk, encoding, done) {
    console.log(chunk.length);

    if(this._restChunk != undefined) {
        chunk = Buffer.concat([this._restChunk, chunk]);
        this._restChunk = undefined;
    }

    var dec = decoders[this._fmt];

    var pos = 0;
    while(pos < chunk.length) {
        if(this._currentX == this._width && this._currentY == this._height) break;
        //console.log(this._currentX, this._currentY);

        if(chunk.length < pos + dec.buf_size) {
            this._restChunk = new Buffer(chunk.length - pos);
            chunk.copy(this._restChunk, 0, pos);
            break;
        }

        var buf = dec.fn(chunk.slice(pos, pos + dec.buf_size));

        dec.add_to_buffer(this, buf);

        pos += dec.buf_size;
    }

    done();
}

module.exports = S3TC_Decoder;

function addEXTbufferToOutbuffer(scope, buf) {
    var y = scope._currentY;
    buf.copy(scope.buffer, scope._width * 4 * y + 4 * scope._currentX,     0,   4*4);
    y++;
    buf.copy(scope.buffer, scope._width * 4 * y + 4 * scope._currentX,   4*4, 2*4*4);
    y++;
    buf.copy(scope.buffer, scope._width * 4 * y + 4 * scope._currentX, 2*4*4, 3*4*4);
    y++;
    buf.copy(scope.buffer, scope._width * 4 * y + 4 * scope._currentX, 3*4*4, 4*4*4);

    scope._currentX += 4;
    if(scope._currentX + 4 > scope._width) {
        scope.push(scope.buffer.slice(scope._currentY * scope._width * 4, (scope._currentY+4) * scope._width * 4)); //push out four rows

        scope._currentX = 0;
        scope._currentY += 4;
    }
}

function RGB565_to_RGB888(rgb) {
    return {
        r: ((rgb & 0b1111100000000000) >> 11) * 8,
        g: ((rgb & 0b0000011111100000) >> 5) * 4,
        b:  (rgb & 0b0000000000011111) * 8
    };
}
