var spawn = require('child_process').spawn;
var fs = require('fs');
var url = require('url');
var es = require('event-stream');


/**
 * Create a stream of video w/ youtube-dl.
 *
 * @param  {String}        url         - The url of the video.
 * @param  {Array<String>} [options]   - Options for youtube-dl.
 * @param  {String}        [auth_path] - The path of the JSON file of user info.
 * @return {DuplexStream} - The stream of the video.
 */
var createYouStream = function (url, options, auth_path) {

  // Prepare args.
  if (typeof options === 'undefined') {
    options = [];
  }
  if (typeof auth_path === 'undefined') {
    auth_path = './auth.json';
  }

  // Create a relay stream.
  var stream = es.through();

  // Read auth info file.
  fs.readFile(auth_path, function (err, data) {
    if (err) {
      // throw err;
      console.error('failed to read auth.json');
    }
    else {
      // Prepare options.
      var sites_auth = JSON.parse(data);    // username, password for websites.
      var opt_auth = getAuthInfo(url, sites_auth);
      options = options.concat(opt_auth);
    }
    var opt_default = ['-q', '-o', '-', url];
    options = options.concat(opt_default);

    // Pipe the stream.
    var youtube_dl = spawn('./bin/youtube-dl', options);
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
  var hostname = url.parse(site_url).hostname;
  for (var site in sites_auth) {
    if (hostname.match(site)) {
      return sites_auth[site];
    }
  }
  return [];
};

module.exports = createYouStream;
