var vows = require('vows');
var assert = require('assert');

var fs = require('fs');
var path   = require('path');
var Promise = require('events').EventEmitter;

var _ = require('lodash');
var crypto = require('crypto');

var youstream = require('..');

vows.describe('download').addBatch((function () {

  var tests = {};
  var sites = JSON.parse(fs.readFileSync('./test/sites.json'));

  _.each(sites, function (site, sitename) {
    _.each(site, function (video, i) {

      tests['video from ' + sitename + ': #' + i] = (function(video){

        var filename;
        if (_.has(video, 'file')) {
          filename = video.file;
        }
        else if (_.has(video, 'id') && _.has(video, 'ext')) {
          filename = video.id + '.' + video.ext;
        }
        else if (_.has(video, 'md5') && _.has(video, 'ext')) {
          filename = video.md5 + '.' + video.ext;
        }
        else {
          filename = Date.now().toString();
        }
        var filepath = path.join(__dirname, filename);

        var md5_hex = function (src) {
          var md5 = crypto.createHash('md5');
          md5.update(src, 'utf8');
          return md5.digest('hex');
        };

        return {
          topic: function() {
            var promise = new Promise();
            var dl = youstream(video.url, []);
            var cb = this.callback;

            dl.pipe(fs.createWriteStream(filepath));
            dl.on('error', cb);
            dl.on('end', function () {
              cb(null, filename, filepath, video);
            });

          },
          'file downloaded correctly': function(err, filename, filepath, expected) {
            if (err) throw err;

            // Check existance.
            var exists = fs.existsSync(filepath);
            assert.isTrue(exists, 'downloaded file exists.');

            if (exists) {

              // Check md5 hash.
              if (_.has(video, 'md5')) {
                var raw = fs.readFileSync(filepath);
                var md5 = md5_hex(raw);
                assert.equal(md5, video.md5, 'md5sum correct.');
              }

              // Check filename.
              if (_.has(video, 'file')) {
                assert.equal(filename, video.file, 'filename correct.');
              }

              // Delete file after each test.
//              fs.unlinkSync(filepath);

            } else {
              assert.isTrue(exists);
            }
          }
        };

      })(video);

    });
  });

  return tests;

}).bind(this)()).export(module);

// Show the error when vows test fails ailently.
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err.stack);
});
