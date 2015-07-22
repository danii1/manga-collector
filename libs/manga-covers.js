var request = require('requestretry');

function MangaCoversClient() {
  this.existingCoverIds = []
}

MangaCoversClient.prototype.prepareCache = function(callback) {
    var req = {
      method: 'GET',
      url: 'http://mcd.iosphe.re/api/v1/database/'
    };

    _this = this
    console.log('MangaCovers prepareCache: %s %s', req.method, req.url);
    request(req, function(err, response, body) {
      if (err) return callback(err);

      obj = JSON.parse(body);
      for (var key in obj) {
        _this.existingCoverIds.push(parseInt(key));
      }
      return callback(null, _this.existingCoverIds);
    });
}

MangaCoversClient.prototype.getCover = function(id, callback) {
  if (this.existingCoverIds.indexOf(id) < 0) return callback("No cover for manga id: " + id);

  var req = {
    method: 'GET',
    url: 'http://mcd.iosphe.re/api/v1/series/' + id + '/',

    maxAttempts: 5,
    retryDelay: 10000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError    
  };

  _this = this
  console.log('MangaCovers getCover: %s %s', req.method, req.url);
  request(req, function(err, response, body) {
    if (err) return callback(err);

    obj = JSON.parse(body);
    if (!(obj.Covers && obj.Covers.a))
      return callback("No cover for manga id: " + id);

    covers = obj.Covers.a;
    foundCovers = covers.filter(function(cover){
      return cover.Side === 'front'
    });

    if (foundCovers.length > 0) {
      //console.log('Cover found for id:', id, foundCovers[0].Normal);
      return callback(null, foundCovers[0].Normal);
    }
    else
      return callback("No cover for manga id: " + id);
  });
}

module.exports = function(token) {
  return new MangaCoversClient();
};
