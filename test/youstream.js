var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var path   = require('path');
var crypto = require('crypto');
var JSON5 = require('json5');
var _ = require('lodash');

var youstream = require('..');


// Helpers
var md5_hex = function (src) {
  var md5hash = crypto.createHash('md5');
  md5hash.update(src, 'binary');
  return md5hash.digest('hex');
};


vows.describe('download').addBatch((function () {

  var tests = {};
  var sites = JSON5.parse('' + fs.readFileSync('./test/sites.json5'));
  var tmpfile_id = 0;

  _.each(sites, function (site, sitename) {
    _.each(site, function (video, i) {

      tests['video from ' + sitename + ': #' + i] = (function(video){

        var filename;
        if (_.has(video, 'file')) {
          filename = video.file;
        }
        else if (_.has(video, 'ext')) {
          filename = tmpfile_id+ + video.ext;
        }
        else {
          filename = tmpfile_id++ + 'tmp';
        }
        var filepath = path.join(__dirname, filename);

        // Prepare options.
        var options = [];
        if (_.has(video, 'params')) {
          if (_.has(video.params, 'videopassword')) {
            options = options.concat(['--video-password', video.params.videopassword]);
          }
          if (_.has(video.params, 'username')) {
            options = options.concat(['--username', video.params.username]);
          }
          if (_.has(video.params, 'password')) {
            options = options.concat(['--password', video.params.password]);
          }
        }

        return {
          topic: function() {
            var dl = youstream(video.url, options);
            var cb = this.callback;

            dl.pipe(fs.createWriteStream(filepath, 'binary'));
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
                var raw = fs.readFileSync(filepath, 'binary');
                var head = raw.substr(0, 10241);
                var md5 = md5_hex(head);
                assert.equal(md5, video.md5, 'md5sum correct.');
              }

              // Check filename.
              if (_.has(video, 'file')) {
                assert.equal(filename, video.file, 'filename correct.');
              }

              // Delete file after each test.
              fs.unlinkSync(filepath);

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
