#!/usr/bin/env node
var path    = require('path'),
    pkg     = require( path.join(__dirname, 'package.json') ),
    program = require('commander'),
    async   = require('async'),
    fs      = require('fs'),
    _       = require('underscore'),
    mangaupdates = require('./libs/manga-updates')(),
    mangacovers = require('./libs/manga-covers')();

program
  .version(pkg.version)
  .option('-f, --file <file>', 'Output file(JSON format)')
  .parse(process.argv);

if (typeof program.file === 'undefined') {
  program.outputHelp();
  process.exit(1);
};

parallelismLimit = 4;
var operations = []

fileStream = fs.createWriteStream(program.file);
fileStream.write('[');
writtenManga = 0;

mangacovers.prepareCache( function(err, cacheIds) {
  async.waterfall([
    function(callback){
      mangaupdates.getSourcePages(callback);
    },
    function(pages, callback){
      //pages = pages.slice(0, 2);
      //pages = pages.slice(49, 50);
      async.eachSeries(pages, function(page, pageCallback){
        // page processing
        async.waterfall([
          function(callback) {
            mangaupdates.getMangaOnPage(page, callback);
          },
          // get manga info
          function(mangaIds, callback) {
            //mangaIds = mangaIds.slice(0, 3);
            async.mapLimit(mangaIds, parallelismLimit, mangaupdates.getManga, function(error, result){
              return callback(error, result);
            });
          },
          // get manga cover
          function(collection, callback) {
            async.mapLimit(collection, parallelismLimit, function(manga, mangaCallback) {
              mangacovers.getCover(manga.id, function(err, cover){
                if (cover != null) {
                  manga.cover = cover.normal;
                  manga.thumbnail = cover.thumbnail;
                }
                return mangaCallback(null, manga);
              })
            }, function(error, result){
              return callback(error, result);
            })
          },
          // write manga collection to file
          function(collection, callback) {
            for (var i = 0, length = collection.length; i < length; ++i) {
              json = JSON.stringify(collection[i]);
              text = writtenManga == 0 ? json : ',' + json
              fileStream.write(text);
              ++writtenManga;
            }

            return callback(null, 'Page processed successfully.');
          }
        ], function(error, result){
          return pageCallback(error, result);
        });
        //----------------

      }, function(error, result){
        //console.log('page callback', error, result);
        if (error) return callback(error);
        return callback(null, 'Manga collection saved successfully.');
      });
    }], function(err, result) {
      //console.log('manga finish', err, result);
      fileStream.end(']', null, function(err, callback){
        return process.exit(0);
      });

      if (err)
        console.error(err);
      else
        console.log(result);
    });

  });
