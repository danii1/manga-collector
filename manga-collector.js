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

operations.push(
  // get all pages with manga
  function(callback) {
    mangaupdates.getSourcePages(callback);
  },
  // get manga on page, return array of manga on all pages
  function(pages, callback) {
    pages = pages.slice(0, 2);
    async.mapLimit(pages, parallelismLimit, mangaupdates.getMangaOnPage, function(error, result){
      return callback(error, _.flatten(result));
    });
  },
  // get manga info
  function(mangaIds, callback) {
    mangaIds = mangaIds.slice(0, 5);
    async.mapLimit(mangaIds, parallelismLimit, mangaupdates.getManga, function(error, result){
      return callback(error, result);
    });
  },
  // get manga cover
  function(collection, callback) {
    async.mapLimit(collection, parallelismLimit, function(manga, mangaCallback) {
      mangacovers.getCover(manga.id, function(err, cover){
        manga.cover = cover;
        return mangaCallback(null, manga);
      })
    }, function(error, result){
      return callback(error, result);
    })
  },
  // write manga collection to file
  function(collection, callback) {
    fs.writeFile(program.file, JSON.stringify(collection, null, 4), function(err) {
      if (err) return callback(error);
      return callback(null, 'Manga collection saved successfully.');
    });
  }
);

mangacovers.prepareCache( function(err, cacheIds) {
  async.waterfall(operations,
    function(err, result) {
      if (err) {
          console.error(err);
          return process.exit(-1);
      }

      console.log(result);
      return process.exit(0);
    }
  );
});
