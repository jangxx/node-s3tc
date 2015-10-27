var util = require('util');
var Transform = require('stream').Transform;

util.inherits(S3TC_Decoder, Transform);

var decoders = {
    'DXT5': {
        buf_size: 16,
        fn: function(in_buf, out_buf) {
            var alpha0 = in_buf.readUInt8(0);
            var alpha1 = in_buf.readUInt8(1);
            var a0 = in_buf.readInt16LE(2);
            var a1 = in_buf.readInt16LE(4);
            var a2 = in_buf.readInt16LE(6);
            var color0 = RGB565_to_RGB888(in_buf.readInt16LE(8));
            var color1 = RGB565_to_RGB888(in_buf.readInt16LE(10));
            var c = [in_buf.readUInt8(12), in_buf.readUInt8(13), in_buf.readUInt8(14), in_buf.readUInt8(15)];

            var a = [
                7 & (a0 >> 13), //0
                7 & (a0 >> 10), //1
                7 & (a0 >> 7),  //2
                7 & (a0 >> 4),  //3
                7 & (a0 >> 1),  //4
                (4 & (a0 << 2)) + (3 & (a1 >> 14)), //5
                7 & (a1 >> 11),
                7 & (a1 >> 8),
                7 & (a1 >> 5),
                7 & (a1 >> 2),
                (6 & (a1 << 1)) + (1 & (a2 >> 15)), //10
                7 & (a2 >> 12),
                7 & (a2 >> 9),
                7 & (a2 >> 6),
                7 & (a2 >> 3),
                7 & (a2) //15
            ];

            for(var i = 0; i < 16; i++) {
                out_buf.writeUInt8(Math.round(a2value(a[i])), i+0); //alpha
                out_buf.writeUInt8( c2value(3 & (c[Math.floor(i / 4)] >> (8-(i+1)*2)), color0.r, color1.r) , i+1); //red
                out_buf.writeUInt8( c2value(3 & (c[Math.floor(i / 4)] >> (8-(i+1)*2)), color0.g, color1.g) , i+2); //blue
                out_buf.writeUInt8( c2value(3 & (c[Math.floor(i / 4)] >> (8-(i+1)*2)), color0.b, color1.b), i+3); //green

                console.log(out_buf);
            }

            function c2value(code, color0, color1) {
                if(color0 > color1) {
                    switch(code) {
                        case 0: return color0;
                        case 1: return color1;
                        case 2: return (2*color0 + color1) / 3;
                        case 3: (color0 + 2*color1) / 3;
                    }
                } else {
                    switch(code) {
                        case 0: color0;
                        case 1: color1;
                        case 2: (color0 + color1) / 2;
                        case 3: 0; //black
                    }
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
                        case 7: return 1; //why, what, WHY???
                    }
                }
            }
        }
    },
    'DXT3': {
        buf_size: 16,
        fn: function(in_buf, out_buf) {

        }
    },
    'DXT1': {
        buf_size: 8,
        fn: function(in_buf, out_buf) {

        }
    }
}

//fmt = 'DXT1', 'DXT3', 'DXT5'
function S3TC_Decoder(fmt, width, height, options) {
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

    var dec = decoders[this._fmt];

    var pos = 0;
    while(pos < chunk.length) {
        if(this._currentX == this._width && this._currentY == this._height) break;
        //console.log(this._currentX, this._currentY);

        var buf = new Buffer(4 * 4 * 4); //width * height * argb

        //console.log(pos, chunk.length, chunk.slice(pos, dec.buf_size));
        dec.fn(chunk.slice(pos, pos + dec.buf_size), buf);

        var y = this._currentY;
        buf.copy(this.buffer, this._width * 4 * y + 4 * this._currentX, 0, 4*4);
        y++;
        buf.copy(this.buffer, this._width * 4 * y + 4 * this._currentX, 4*4, 4*4);
        y++;
        buf.copy(this.buffer, this._width * 4 * y + 4 * this._currentX, 2*4*4, 4*4);
        y++;
        buf.copy(this.buffer, this._width * 4 * y + 4 * this._currentX, 3*4*4, 4*4);

        this._currentX += 4;
        if(this._currentX + 4 > this._width) {
            this.push(this.buffer.slice(this._currentY * this._width * 4, this._currentY * 4 * this._width * 4 - 1)); //push out four rows

            this._currentX = 0;
            this._currentY += 4;
        }

        pos += dec.buf_size;
    }

    done();
}

module.exports = S3TC_Decoder;

function RGB565_to_RGB888(rgb) {
    return {
        r: ((rgb & 0b1111100000000000) >> 11) * 8,
        g: ((rgb & 0b0000011111100000) >> 5) * 4,
        b:  (rgb & 0b0000000000011111) * 8
    };
}
