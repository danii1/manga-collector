var cheerio = require('cheerio'),
    request = require('requestretry'),
    async   = require('async'),
    _       = require('underscore');

function MangaUpdatesClient() {

}

MangaUpdatesClient.prototype.getSourcePages = function(callback) {
  var queryString = { 'page': 1, 'perpage': 100 };
  var req = {
    method: 'GET',
    url: 'https://www.mangaupdates.com/series.html',
    qs: queryString,

    maxAttempts: 5,
    retryDelay: 10000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
  };

  console.log('getSourcePages: %s %s - %j', req.method, req.url, req.qs);
  request(req, function(err, response, body) {
    if (err) return callback(err);
    $ = cheerio.load(body);

    lastLink = $('.specialtext').eq(3).find('a').last().attr('href');
    totalPages = lastLink.match(/\d+(?=\&perpage)/)[0];

    pages = [];
    if (totalPages != null)
      for ( var i = 1; i <= totalPages; i++ )
        pages.push(i)

    //console.log('Pages: ', pages);
    return callback(null, pages);
  });
}

MangaUpdatesClient.prototype.getMangaOnPage = function(index, callback) {
  var queryString = { 'page': index, 'perpage': 100 };
  var req = {
    method: 'GET',
    url: 'https://www.mangaupdates.com/series.html',
    qs: queryString,

    maxAttempts: 5,
    retryDelay: 10000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
  };

  console.log('getMangaOnPage: %s %s - %j', req.method, req.url, req.qs);
  request(req, function(err, response, body) {
    if (err) return callback(err);
    $ = cheerio.load(body);

    mangaIds = [];
    $('.col1 a').each(function(index, element){
      id = parseInt($(this).attr('href').replace(/^.+id\=/,""))
      mangaIds.push(id);
    });

    return callback(null, mangaIds);
  });
}


MangaUpdatesClient.prototype.getManga = function(id, callback) {
  var queryString = { 'id': id };
  var req = {
    method: 'GET',
    url: 'https://www.mangaupdates.com/series.html',
    qs: queryString,

    maxAttempts: 5,
    retryDelay: 10000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError    
  };

  var parseMangaLink = function(context) {
    if ($(context).attr('href').indexOf('javascript') > -1)
      return;

    return {
      id: parseInt($(context).attr('href').replace(/^.+id\=/,"")),
      title: $(context).text()
    };
  }


  console.log('getManga: %s %s - %j', req.method, req.url, req.qs);
  request(req, function(err, response, body) {
    if (err) return callback(err);
    $ = cheerio.load(body);

    contentStrings = $('.sContent')
    var manga = {
      id: id,
      title: $('.tabletitle').text().trim(),
      description: contentStrings.eq(0).text().trim(),
      alternativeNames: _.without(contentStrings.eq(3).html().split('<br>'), '', '\n'),
      categories: contentStrings.eq(14).find('a > u').map( function(index, element) {
        return $(this).text();
      }).get(),
      relatedManga: contentStrings.eq(2).find('a').map( function(index, element) {
        return parseMangaLink(this);
      }).get(),
      userRecommendations: contentStrings.eq(16).find('a').map( function(index, element) {
        return parseMangaLink(this);
      }).get(),
      computerRecommendations: $('#div_recom_more').find('a').map( function(index, element) {
        return parseMangaLink(this);
      }).get(),
      authors: contentStrings.eq(18).find('a > u').map( function(index, element) {
        return $(this).text();
      }).get(),
      artists: contentStrings.eq(19).find('a > u').map( function(index, element) {
        return $(this).text();
      }).get(),
      year: parseInt(contentStrings.eq(20).text().trim()),
      rating: parseFloat(contentStrings.eq(11).find('b').text())

    };
    //console.log('%s: ', 'Manga', manga);

    return callback(null, manga);
  });

}

module.exports = function(token) {
  return new MangaUpdatesClient();
};
