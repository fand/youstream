var mocha = require('mocha');
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


describe('download:', function(){

  var tests = {};
  var sites = JSON5.parse('' + fs.readFileSync('./test/sites.json5'));
  var tmpfile_id = 0;

  _.each(sites, function (site, sitename) {

    describe(sitename, function(){

      _.each(site, function (video, i) {

        describe('video #' + i, function () {

          var filename;
          var filepath;
          var expected;

          before(function(done) {

            if (_.has(video, 'file')) {
              filename = video.file;
            }
            else if (_.has(video, 'ext')) {
              filename = tmpfile_id++ + video.ext;
            }
            else {
              filename = tmpfile_id++ + 'tmp';
            }
            filepath = path.join(__dirname, 'tmp', filename);

            // Prepare options.
            var options = ['--test'];
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
              if (_.has(video.params, 'skip_download')) {
                options.push('--skip-download');
              }
            }

            var dl = youstream(video.url, options);

            dl.pipe(fs.createWriteStream(filepath, 'binary'));
            dl.on('error', done);
            dl.on('end', function () {
              expected = video;
              done();
            });

          });

          it('should exist as a file', function(){
            var exists = fs.existsSync(filepath);
            assert(exists, 'downloaded file exists.');
          });

          it('should have right filesize', function(done){
            fs.stat(filepath, function (err, stats) {
              if (err) {
                assert(false, 'fs.stat error');
              }

              if (_.has(video.params, 'skip_download')) {
                assert.equal(stats.size, 0, 'file size is 0.');
              }
              else {
                assert.equal(stats.size, 10241, 'file size is 10kb.');
              }

              done();
            });
          });

          it('should have correct md5sum', function() {
            if (_.has(video, 'md5')) {
              var raw = fs.readFileSync(filepath, 'binary');
              var head = raw.substr(0, 10241);
              var md5 = md5_hex(head);
              assert.equal(md5, video.md5, 'md5sum correct.');
            }
            else {
              assert(true, 'no md5sum info given.');
            }
          });

          it('should have correct filename', function () {
            // Check filename.
            if (_.has(video, 'file')) {
              assert.equal(filename, video.file, 'filename correct.');
            }
          });

          after(function () {
            // Delete file after each test.
            fs.unlinkSync(filepath);
          });

        });
      });
    });
  });
});


// Show the error when vows test fails ailently.
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err.stack);
});
