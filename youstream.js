var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var url = require('url');
var es = require('event-stream');


/**
 * Create a stream of video w/ youtube-dl.
 *
 * @param  {String}        video_url   - The url of the video.
 * @param  {Array<String>} [options]   - Options for youtube-dl.
 * @param  {String}        [auth_path] - The path of the JSON file of user info.
 * @return {DuplexStream} - The stream of the video.
 */
var createYouStream = function (video_url, options, auth_path) {

  // Prepare args.
  if (typeof options === 'undefined') {
    options = [];
  }
  if (typeof auth_path === 'undefined') {
    auth_path = './auth.json';
  }

  // Normalize video URL.
  if (url.parse(video_url).protocol === null) {
    if (video_url.match('\A\/[^\/]+')) { video_url = 'http://' + video_url; }
    if (video_url.match('\A\/[^\/]+')) { video_url = 'http:/'  + video_url; }
    else                               { video_url = 'http:'   + video_url; }
  }

  // Create a relay stream.
  var stream = es.through();

  // Read auth info file.
  var prepareAuth;
  if (options.indexOf('--username') != -1 || options.indexOf('--password') != -1)  {
    prepareAuth = (function (cb) {
      cb.bind(this)();
    }).bind(this);
  }
  else {
    prepareAuth = (function (cb) {
      fs.readFile(auth_path, function (err, data) {
        if (err) {
          stream.emit('failed to read auth.json');
        }
        else {
          // Prepare options.
          var sites_auth = JSON.parse(data);    // username, password for websites.
          var opt_auth = getAuthInfo(video_url, sites_auth);
          options = options.concat(opt_auth);
        }
        cb.bind(this)();
      });
    }).bind(this);
  }

  prepareAuth(function () {

    var opt_default = ['-q', '-o', '-', video_url];
    options = options.concat(opt_default);

    // Pipe the stream.
    var script_path = path.join(__dirname, 'bin', 'youtube-dl');
    var youtube_dl = spawn(script_path, options);
    youtube_dl.stdout.pipe(stream);
  });

  return stream;
};


/**
 * Get auth info for the site.
 *
 * @param  {String}        site_url   - The url of the site to log in.
 * @param  {Object}        sites_auth - The hash list of site names and the uesr info.
 * @return {Array<String>} - The user info for the site.
 */
var getAuthInfo = function (site_url, sites_auth) {
  var info = [];

  var hostname = url.parse(site_url).hostname;
  var obj = {};
  for (var site in sites_auth) {
    if (hostname.match(site)) {
      obj = sites_auth[site];
    }
  }

  if (typeof obj.username !== 'undefined') {
    info = info.concat(['--username', obj.username]);
  }
  if (typeof obj.password !== 'undefined') {
    info = info.concat(['--password', obj.password]);
  }
  if (typeof obj.videopassword !== 'undefined') {
    info = info.concat(['--video-password', obj.videopassword]);
  }

  return info;
};

module.exports = createYouStream;
